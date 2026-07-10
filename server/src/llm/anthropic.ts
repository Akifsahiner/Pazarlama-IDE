import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";
import { marketingAssetSchema, marketingPlanSchema, type MarketingPlan } from "../schemas/index.js";
import {
  ASSET_TOOL_SCHEMA,
  PLAN_JSON_SCHEMA,
  chatSystemPrompt,
  planSystemPrompt,
  type ChatArgs,
  type ChatCallbacks,
  type LLMProvider,
  type PlanCallbacks,
} from "./types.js";
import { withRetry, isModelUnavailable } from "./retry.js";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Plan generation via streaming. The Anthropic SDK keeps the connection warm
 * which gives faster first-response than `messages.create`; we still consume
 * the final tool_use input as a single structured payload at the end.
 * Status updates are emitted at meaningful phase boundaries so the user always
 * sees motion instead of a 30-second silence.
 */
async function planWithModel(
  model: string,
  profile: Parameters<LLMProvider["generatePlan"]>[0],
  cb: PlanCallbacks,
  signal?: AbortSignal,
): Promise<MarketingPlan> {
  return withRetry(
    async () => {
      cb.onStatus("Reading product profile");
      const stream = client().messages.stream(
        {
          model,
          max_tokens: env.ANTHROPIC_MAX_TOKENS_PLAN,
          system: planSystemPrompt(profile),
          tools: [
            {
              name: "emit_marketing_plan",
              description: "Emit the complete structured launch plan.",
              input_schema: PLAN_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
            },
          ],
          tool_choice: { type: "tool", name: "emit_marketing_plan" },
          messages: [{ role: "user", content: "Generate the launch plan now." }],
        },
        { signal, timeout: env.LLM_TIMEOUT_MS },
      );

      // Surface phase progress as soon as the model starts streaming so the UI
      // never goes silent. These fire only once each per turn.
      let firstChunk = false;
      stream.on("inputJson", () => {
        if (!firstChunk) {
          firstChunk = true;
          cb.onStatus("Structuring 30-day plan");
        }
      });

      const final = await stream.finalMessage();
      const toolUse = final.content.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("Model did not return a structured plan");
      }
      return marketingPlanSchema.parse({ id: randomUUID(), ...(toolUse.input as object) });
    },
    { signal },
  );
}

async function chatWithModel(model: string, args: ChatArgs, cb: ChatCallbacks): Promise<void> {
  const stream = client().messages.stream(
    {
      model,
      max_tokens: env.ANTHROPIC_MAX_TOKENS_CHAT,
      system: chatSystemPrompt(args.profile),
      tools: [
        {
          name: "propose_asset",
          description: "Propose a concrete marketing asset for the user to review as a diff.",
          input_schema: ASSET_TOOL_SCHEMA as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      messages: [
        ...args.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: args.message },
      ],
    },
    { signal: args.signal, timeout: env.LLM_TIMEOUT_MS },
  );

  // Emit a tool "start" event the first time the model begins drafting an asset
  // — gives the UI an immediate "Writing landing copy…" chip instead of waiting
  // for the entire stream to finish before showing tool activity.
  let toolStartSent = false;
  stream.on("contentBlock", (block) => {
    if (block.type === "tool_use" && block.name === "propose_asset" && !toolStartSent) {
      toolStartSent = true;
      cb.onTool("propose_asset", "start", "Drafting asset…");
    }
  });

  stream.on("text", (delta) => cb.onToken(delta));

  const final = await stream.finalMessage();
  for (const block of final.content) {
    if (block.type === "tool_use" && block.name === "propose_asset") {
      cb.onTool("propose_asset", "done");
      const asset = marketingAssetSchema.parse({ id: randomUUID(), ...(block.input as object) });
      cb.onAsset(asset);
    }
  }
}

export const anthropicProvider: LLMProvider = {
  id: "anthropic",

  async generatePlan(profile, cb: PlanCallbacks, signal?: AbortSignal): Promise<MarketingPlan> {
    try {
      return await planWithModel(env.ANTHROPIC_MODEL, profile, cb, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      // ONLY fall back when the primary model is truly unavailable; otherwise
      // we just double the wall-clock time without changing the outcome.
      if (!isModelUnavailable(err) || env.ANTHROPIC_FALLBACK_MODEL === env.ANTHROPIC_MODEL) {
        throw err;
      }
      cb.onStatus(`Primary model unavailable — using ${env.ANTHROPIC_FALLBACK_MODEL}`);
      return await planWithModel(env.ANTHROPIC_FALLBACK_MODEL, profile, cb, signal);
    }
  },

  async chat(args: ChatArgs, cb: ChatCallbacks): Promise<void> {
    try {
      await chatWithModel(env.ANTHROPIC_MODEL, args, cb);
    } catch (err) {
      if (args.signal?.aborted) throw err;
      if (!isModelUnavailable(err) || env.ANTHROPIC_FALLBACK_MODEL === env.ANTHROPIC_MODEL) {
        throw err;
      }
      await chatWithModel(env.ANTHROPIC_FALLBACK_MODEL, args, cb);
    }
  },
};
