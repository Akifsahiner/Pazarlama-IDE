import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { env } from "../env.js";
import { marketingAssetSchema, marketingPlanSchema, type MarketingPlan } from "../schemas/index.js";
import {
  ASSET_TOOL_SCHEMA,
  chatSystemPrompt,
  planSystemPrompt,
  type ChatArgs,
  type ChatCallbacks,
  type LLMProvider,
  type PlanCallbacks,
} from "./types.js";
import { withRetry } from "./retry.js";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: env.LLM_TIMEOUT_MS });
  return _client;
}

const PLAN_SHAPE_HINT = `Return ONLY a JSON object with this shape:
{ "positioning": string, "icp": string,
  "readiness": [{ "label": string, "score": number }],
  "taskGraph": [{ "id": string, "title": string, "dependsOn": string[], "metric"?: string, "day": number }],
  "contentCalendar": [{ "day": number, "channel": string, "title": string, "type": "post"|"email"|"article"|"ad" }],
  "strategyNote": string }`;

export const openaiProvider: LLMProvider = {
  id: "openai",

  async generatePlan(profile, cb: PlanCallbacks, signal?: AbortSignal): Promise<MarketingPlan> {
    cb.onStatus("Reading product profile");
    const completion = await withRetry(
      () =>
        client().chat.completions.create(
          {
            model: env.OPENAI_MODEL,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: `${planSystemPrompt(profile)}\n\n${PLAN_SHAPE_HINT}` },
              { role: "user", content: "Generate the launch plan now as JSON." },
            ],
          },
          { signal },
        ),
      { signal },
    );
    cb.onStatus("Structuring 30-day plan");
    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("OpenAI returned malformed plan JSON");
    }
    return marketingPlanSchema.parse({ id: randomUUID(), ...(parsed as object) });
  },

  async chat(args: ChatArgs, cb: ChatCallbacks): Promise<void> {
    // Enable propose_asset parity via OpenAI tool calling. Stream text deltas and
    // accumulate any tool-call arguments, then emit the asset at the end.
    const stream = await client().chat.completions.create(
      {
        model: env.OPENAI_MODEL,
        stream: true,
        tools: [
          {
            type: "function",
            function: {
              name: "propose_asset",
              description: "Propose a concrete marketing asset for the user to review as a diff.",
              parameters: ASSET_TOOL_SCHEMA as unknown as Record<string, unknown>,
            },
          },
        ],
        messages: [
          { role: "system", content: chatSystemPrompt(args.profile) },
          ...args.history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: args.message },
        ],
      },
      { signal: args.signal },
    );

    const toolArgs = new Map<number, string>();
    let sawTool = false;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const delta = choice?.delta;
      if (delta?.content) cb.onToken(delta.content);
      for (const tc of delta?.tool_calls ?? []) {
        sawTool = true;
        const idx = tc.index ?? 0;
        toolArgs.set(idx, (toolArgs.get(idx) ?? "") + (tc.function?.arguments ?? ""));
      }
    }

    if (sawTool) {
      for (const argStr of toolArgs.values()) {
        try {
          const input = JSON.parse(argStr) as object;
          cb.onTool("propose_asset", "done");
          cb.onAsset(marketingAssetSchema.parse({ id: randomUUID(), ...input }));
        } catch {
          // ignore malformed tool args
        }
      }
    }
  },
};
