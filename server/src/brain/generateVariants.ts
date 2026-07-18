import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../env.js";
import { decisionAssetSchema } from "../schemas/decision.js";
import { marketingAssetSchema } from "../schemas/index.js";
import type { MarketingProfile } from "../schemas/marketingProfile.js";
import { withRetry, isModelUnavailable } from "../llm/retry.js";
import { modelFor, type BrainProvider } from "./modelTier.js";
import { addMessageUsage, type TokenUsageSink } from "./tokenUsage.js";
import type { ComposerSuggestedMode } from "../schemas/index.js";
import { GA4_QUERY_TOOL, executeGa4Query, type Ga4QueryArgs } from "../connectors/ga4Query.js";
import {
  META_ADS_QUERY_TOOL,
  executeMetaAdsQuery,
  type MetaAdsQueryArgs,
} from "../connectors/metaAdsQuery.js";
import OpenAI from "openai";
import { forcedToolCall, openaiChatRoundWithTools, streamTextAnswer, type ForcedToolDef } from "./llmClient.js";
import {
  EXECUTABLE_ACTIONS_TOOL,
  executableActionsBundleSchema,
  type ExecutableAction,
} from "./executionClassifier.js";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

const draftSchema = z.object({
  summary: z.string().min(8),
  suggested_mode: z.enum(["edit", "browse"]).optional(),
  assets: z.array(decisionAssetSchema).default([]),
});
export type DraftResult = z.infer<typeof draftSchema>;

const researchSchema = z.object({
  summary: z.string().min(8),
  research_queries: z.array(z.string()).min(1).max(5),
  suggested_mode: z.literal("browse").default("browse"),
});
export type ResearchBrief = z.infer<typeof researchSchema>;

const DRAFT_TOOL = {
  name: "marketing_draft",
  description: "Emit finished marketing copy/assets for the user.",
  input_schema: {
    type: "object",
    required: ["summary", "assets"],
    properties: {
      summary: { type: "string", description: "2-3 sentence rationale tied to the product." },
      suggested_mode: {
        type: "string",
        enum: ["edit", "browse"],
        description: "Suggest edit if files should change; browse for external research.",
      },
      assets: {
        type: "array",
        items: {
          type: "object",
          required: ["kind", "title", "content"],
          properties: {
            kind: { type: "string", enum: ["copy", "email", "post", "checklist", "doc", "ad"] },
            title: { type: "string" },
            content: { type: "string" },
            suggested_target_file: { type: "string" },
            apply_mode: { type: "string", enum: ["sidecar", "integrate", "clipboard"] },
          },
        },
      },
    },
  },
} as const;

const RESEARCH_TOOL = {
  name: "research_brief",
  description: "Outline a browser research task with concrete queries.",
  input_schema: {
    type: "object",
    required: ["summary", "research_queries"],
    properties: {
      summary: { type: "string" },
      research_queries: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      suggested_mode: { type: "string", enum: ["browse"] },
    },
  },
} as const;

export interface VariantGenerateOpts {
  system: string;
  userMessage: string;
  history?: { role: "user" | "assistant"; content: string }[];
  provider?: BrainProvider;
  onStatus?: (text: string) => void;
  signal?: AbortSignal;
  usageSink?: TokenUsageSink;
}

export async function generateDraft(opts: VariantGenerateOpts): Promise<DraftResult> {
  const runOnce = async (): Promise<DraftResult> => {
    const parsed = await forcedToolCall<DraftResult>({
      provider: opts.provider,
      tier: "main",
      kind: "decision",
      system: opts.system,
      userMessage: opts.userMessage,
      history: opts.history,
      tool: DRAFT_TOOL,
      signal: opts.signal,
      usageSink: opts.usageSink,
      onPartial: () => opts.onStatus?.("Drafting copy…"),
    });
    return draftSchema.parse(parsed);
  };
  try {
    return await withRetry(runOnce, { signal: opts.signal });
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    if (!isModelUnavailable(err) || opts.provider === "openai") throw err;
    const choice = modelFor("main", "decision");
    if (env.ANTHROPIC_FALLBACK_MODEL && env.ANTHROPIC_FALLBACK_MODEL !== choice.model) {
      return forcedToolCall<DraftResult>({
        provider: "anthropic",
        tier: "main",
        kind: "decision",
        system: opts.system,
        userMessage: opts.userMessage,
        history: opts.history,
        tool: DRAFT_TOOL,
        signal: opts.signal,
        usageSink: opts.usageSink,
      }).then((p) => draftSchema.parse(p));
    }
    throw err;
  }
}

export async function generateResearchBrief(opts: VariantGenerateOpts): Promise<ResearchBrief> {
  const parsed = await forcedToolCall<ResearchBrief>({
    provider: opts.provider,
    tier: "fast",
    kind: "router",
    system: opts.system,
    userMessage: opts.userMessage,
    history: opts.history,
    tool: RESEARCH_TOOL,
    signal: opts.signal,
    usageSink: opts.usageSink,
  });
  return researchSchema.parse(parsed);
}

export interface AnswerCallbacks {
  onToken: (text: string) => void;
  onAsset?: (asset: ReturnType<typeof marketingAssetSchema.parse>) => void;
  onExecutableActions?: (actions: ExecutableAction[]) => void;
  onTool?: (name: string, status: "start" | "done", detail?: string) => void;
}

export interface AnswerConnectorContext {
  userId: string;
  projectId?: string;
  profile: MarketingProfile;
}

function ga4Connected(profile: MarketingProfile): boolean {
  return !!profile.ga4_oauth?.refresh_token;
}

function metaConnected(profile: MarketingProfile): boolean {
  return !!profile.meta_oauth?.access_token;
}

function openAiConnectorTools(profile: MarketingProfile): ForcedToolDef[] {
  const tools: ForcedToolDef[] = [];
  if (ga4Connected(profile)) tools.push(GA4_QUERY_TOOL);
  if (metaConnected(profile)) tools.push(META_ADS_QUERY_TOOL);
  return tools;
}

function anthropicConnectorTools(profile: MarketingProfile): Anthropic.Tool[] {
  const tools: Anthropic.Tool[] = [];
  if (ga4Connected(profile)) tools.push(GA4_QUERY_TOOL as unknown as Anthropic.Tool);
  if (metaConnected(profile)) tools.push(META_ADS_QUERY_TOOL as unknown as Anthropic.Tool);
  return tools;
}

async function runConnectorTool(
  name: string,
  rawArgs: unknown,
  connectorCtx: AnswerConnectorContext,
  cb: AnswerCallbacks,
): Promise<string> {
  if (name === "ga4_query") {
    cb.onTool?.("ga4_query", "start", "Fetching GA4 metrics…");
    const args = (typeof rawArgs === "object" && rawArgs !== null ? rawArgs : { range: "28d" }) as Ga4QueryArgs;
    const result = await executeGa4Query(args, {
      userId: connectorCtx.userId,
      projectId: connectorCtx.projectId,
    });
    cb.onTool?.(
      "ga4_query",
      "done",
      result.ok ? `${result.metrics.length} metrics` : result.error,
    );
    return JSON.stringify(result);
  }
  if (name === "meta_ads_read") {
    cb.onTool?.("meta_ads_read", "start", "Fetching Meta Ads insights…");
    const args = (typeof rawArgs === "object" && rawArgs !== null ? rawArgs : { range: "28d" }) as MetaAdsQueryArgs;
    const result = await executeMetaAdsQuery(args, {
      userId: connectorCtx.userId,
      projectId: connectorCtx.projectId,
    });
    cb.onTool?.(
      "meta_ads_read",
      "done",
      result.ok ? `${result.metrics.length} metrics` : result.error,
    );
    return JSON.stringify(result);
  }
  return JSON.stringify({ ok: false, error: `Unknown connector tool: ${name}` });
}

async function runOpenAiConnectorAnswerLoop(
  opts: VariantGenerateOpts,
  cb: AnswerCallbacks,
  connectorCtx: AnswerConnectorContext,
): Promise<string> {
  const tools = openAiConnectorTools(connectorCtx.profile);
  if (tools.length === 0) {
    return streamTextAnswer({
      provider: "openai",
      tier: "main",
      kind: "chat",
      system: opts.system,
      userMessage: opts.userMessage,
      history: opts.history,
      signal: opts.signal,
      usageSink: opts.usageSink,
      onToken: (t) => cb.onToken(t),
    });
  }

  const baseMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    ...(opts.history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: opts.userMessage },
  ];
  let messages = baseMessages;
  let rounds = 0;
  let accumulated = "";

  while (rounds < 3) {
    const round = await openaiChatRoundWithTools({
      provider: "openai",
      tier: "main",
      kind: "chat",
      system: opts.system,
      userMessage: opts.userMessage,
      history: opts.history,
      signal: opts.signal,
      usageSink: opts.usageSink,
      onToken: (t) => cb.onToken(t),
      tools,
      messages,
    });
    accumulated += round.text;

    const connectorCalls = round.toolCalls.filter((t) =>
      ["ga4_query", "meta_ads_read"].includes(t.name),
    );
    if (connectorCalls.length === 0) {
      return accumulated;
    }

    const toolMessages: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];
    for (const tool of connectorCalls) {
      let args: unknown = {};
      try {
        args = JSON.parse(tool.arguments || "{}");
      } catch {
        /* use defaults */
      }
      const content = await runConnectorTool(tool.name, args, connectorCtx, cb);
      toolMessages.push({
        role: "tool",
        tool_call_id: tool.id,
        content,
      });
    }

    messages = [...baseMessages, round.assistantMessage, ...toolMessages];
    rounds += 1;
  }

  return accumulated;
}

const OPENAI_ASSET_TOOL: ForcedToolDef = {
  name: "propose_asset",
  description: "Propose a concrete marketing asset for review.",
  input_schema: {
    type: "object",
    required: ["type", "after"],
    properties: {
      type: { type: "string", enum: ["landing-copy", "tweet", "email", "ad"] },
      targetFile: { type: "string" },
      before: { type: "string" },
      after: { type: "string" },
    },
  },
};

async function runOpenAiAnswerWithTools(
  opts: VariantGenerateOpts,
  cb: AnswerCallbacks,
): Promise<string> {
  const baseMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...(opts.history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: opts.userMessage },
  ];
  let messages = baseMessages;
  let accumulated = "";
  let rounds = 0;

  while (rounds < 3) {
    const round = await openaiChatRoundWithTools({
      provider: "openai",
      tier: "main",
      kind: "chat",
      system: opts.system,
      userMessage: opts.userMessage,
      history: opts.history,
      signal: opts.signal,
      usageSink: opts.usageSink,
      onToken: (t) => cb.onToken(t),
      tools: [OPENAI_ASSET_TOOL, EXECUTABLE_ACTIONS_TOOL],
      messages,
    });
    accumulated += round.text;

    for (const tool of round.toolCalls) {
      if (tool.name === "propose_asset") {
        try {
          const input = JSON.parse(tool.arguments || "{}");
          const asset = marketingAssetSchema.parse({ id: randomUUID(), ...input });
          cb.onAsset?.(asset);
        } catch {
          /* skip invalid asset */
        }
      }
      if (tool.name === "propose_executable_actions") {
        try {
          const input = JSON.parse(tool.arguments || "{}");
          const bundle = executableActionsBundleSchema.parse(input);
          cb.onExecutableActions?.(bundle.actions);
        } catch {
          /* skip invalid actions */
        }
      }
    }

    if (round.toolCalls.length === 0) return accumulated;

    const toolMessages: OpenAI.Chat.ChatCompletionToolMessageParam[] = round.toolCalls.map((tool) => ({
      role: "tool",
      tool_call_id: tool.id,
      content: JSON.stringify({ ok: true }),
    }));
    messages = [...baseMessages, round.assistantMessage, ...toolMessages];
    rounds += 1;
  }

  return accumulated;
}

export async function generateAnswer(
  opts: VariantGenerateOpts,
  cb: AnswerCallbacks,
  connectorCtx?: AnswerConnectorContext,
): Promise<string> {
  const hasConnectors =
    connectorCtx &&
    (ga4Connected(connectorCtx.profile) || metaConnected(connectorCtx.profile));

  if (opts.provider === "openai") {
    if (hasConnectors && connectorCtx) {
      return runOpenAiConnectorAnswerLoop(opts, cb, connectorCtx);
    }
    return runOpenAiAnswerWithTools(opts, cb);
  }

  const choice = modelFor("main", "decision");
  const ASSET_TOOL = {
    name: "propose_asset",
    description: "Propose a concrete marketing asset for review.",
    input_schema: {
      type: "object",
      required: ["type", "after"],
      properties: {
        type: { type: "string", enum: ["landing-copy", "tweet", "email", "ad"] },
        targetFile: { type: "string" },
        before: { type: "string" },
        after: { type: "string" },
      },
    },
  } as const;

  const connectorTools =
    connectorCtx && hasConnectors ? anthropicConnectorTools(connectorCtx.profile) : [];

  const runOnce = async (model: string, messages: Anthropic.MessageParam[]): Promise<{
    text: string;
    final: Anthropic.Message;
  }> => {
    const stream = client().messages.stream(
      {
        model,
        max_tokens: env.ANTHROPIC_MAX_TOKENS_CHAT,
        system: opts.system,
        tools: [ASSET_TOOL as unknown as Anthropic.Tool, EXECUTABLE_ACTIONS_TOOL as unknown as Anthropic.Tool, ...connectorTools],
        messages,
      },
      { signal: opts.signal, timeout: env.LLM_TIMEOUT_MS },
    );
    let text = "";
    stream.on("text", (delta) => {
      text += delta;
      cb.onToken(delta);
    });
    const final = await stream.finalMessage();
    addMessageUsage(opts.usageSink, final);
    for (const block of final.content) {
      if (block.type === "tool_use" && block.name === "propose_asset") {
        const asset = marketingAssetSchema.parse({ id: randomUUID(), ...(block.input as object) });
        cb.onAsset?.(asset);
      }
      if (block.type === "tool_use" && block.name === "propose_executable_actions") {
        const bundle = executableActionsBundleSchema.parse(block.input);
        cb.onExecutableActions?.(bundle.actions);
      }
    }
    return { text, final };
  };

  const runWithConnectors = async (model: string): Promise<string> => {
    const baseMessages: Anthropic.MessageParam[] = [
      ...(opts.history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: opts.userMessage },
    ];
    let messages = baseMessages;
    let rounds = 0;
    let accumulated = "";

    while (rounds < 3) {
      const { text, final } = await runOnce(model, messages);
      accumulated += text;
      const toolUses = final.content.filter(
        (b): b is Anthropic.ToolUseBlock =>
          b.type === "tool_use" && (b.name === "ga4_query" || b.name === "meta_ads_read"),
      );
      if (!connectorCtx || connectorTools.length === 0 || toolUses.length === 0) {
        return accumulated;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tool of toolUses) {
        const content = await runConnectorTool(tool.name, tool.input, connectorCtx, cb);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content,
        });
      }

      messages = [
        ...baseMessages,
        { role: "assistant", content: final.content },
        { role: "user", content: toolResults },
      ];
      rounds += 1;
    }

    return accumulated;
  };

  try {
    return await withRetry(() => runWithConnectors(choice.model), { signal: opts.signal });
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    if (!isModelUnavailable(err)) throw err;
    if (env.ANTHROPIC_FALLBACK_MODEL && env.ANTHROPIC_FALLBACK_MODEL !== choice.model) {
      return runWithConnectors(env.ANTHROPIC_FALLBACK_MODEL);
    }
    throw err;
  }
}

export function draftSuggestedMode(draft: DraftResult): ComposerSuggestedMode | undefined {
  return draft.suggested_mode;
}
