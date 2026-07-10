/**
 * Provider-aware LLM facade for Marketing Brain (Faz 11).
 * Plan Studio stays on direct Anthropic in planSuite.ts.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env, hasOpenAI } from "../env.js";
import { withRetry } from "../llm/retry.js";
import { modelFor, modelForProvider, type BrainProvider } from "./modelTier.js";
import { addMessageUsage, type TokenUsageSink } from "./tokenUsage.js";

export type { BrainProvider };

let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

function anthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _anthropic;
}

function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: env.LLM_TIMEOUT_MS });
  return _openai;
}

export interface ForcedToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ForcedToolCallOpts {
  provider?: BrainProvider;
  tier: "fast" | "main" | "deep";
  kind?: "router" | "chat" | "decision" | "critique" | "asset";
  system: string;
  userMessage: string;
  history?: { role: "user" | "assistant"; content: string }[];
  tool: ForcedToolDef;
  signal?: AbortSignal;
  usageSink?: TokenUsageSink;
  onPartial?: () => void;
}

export function resolveBrainProvider(requested?: BrainProvider): BrainProvider {
  if (requested === "openai" && hasOpenAI) return "openai";
  return "anthropic";
}

/** Forced structured tool call — Anthropic or OpenAI function calling. */
export async function forcedToolCall<T>(opts: ForcedToolCallOpts): Promise<T> {
  const provider = resolveBrainProvider(opts.provider);
  if (provider === "openai") {
    return openaiForcedToolCall<T>(opts);
  }
  return anthropicForcedToolCall<T>(opts);
}

async function anthropicForcedToolCall<T>(opts: ForcedToolCallOpts): Promise<T> {
  const choice = modelFor(opts.tier, opts.kind ?? "chat");
  return withRetry(
    async () => {
      const stream = anthropic().messages.stream(
        {
          model: choice.model,
          max_tokens: choice.maxTokens,
          system: opts.system,
          tools: [
            {
              name: opts.tool.name,
              description: opts.tool.description,
              input_schema: opts.tool.input_schema as Anthropic.Tool.InputSchema,
            },
          ],
          tool_choice: { type: "tool", name: opts.tool.name },
          messages: [
            ...(opts.history ?? []).map((m) => ({ role: m.role, content: m.content })),
            { role: "user" as const, content: opts.userMessage },
          ],
        },
        { signal: opts.signal, timeout: env.LLM_TIMEOUT_MS },
      );
      let partial = false;
      stream.on("inputJson", () => {
        if (!partial) {
          partial = true;
          opts.onPartial?.();
        }
      });
      const final = await stream.finalMessage();
      addMessageUsage(opts.usageSink, final);
      const block = final.content.find((c) => c.type === "tool_use");
      if (!block || block.type !== "tool_use") throw new Error(`Missing tool: ${opts.tool.name}`);
      return block.input as T;
    },
    { signal: opts.signal },
  );
}

async function openaiForcedToolCall<T>(opts: ForcedToolCallOpts): Promise<T> {
  const choice = modelForProvider("openai", opts.tier, opts.kind ?? "chat");
  const completion = await withRetry(
    () =>
      openai().chat.completions.create(
        {
          model: choice.model,
          max_tokens: choice.maxTokens,
          messages: [
            { role: "system", content: opts.system },
            ...(opts.history ?? []).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "user", content: opts.userMessage },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: opts.tool.name,
                description: opts.tool.description,
                parameters: opts.tool.input_schema,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: opts.tool.name } },
        },
        { signal: opts.signal },
      ),
    { signal: opts.signal },
  );
  opts.onPartial?.();
  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.type !== "function" || !call.function?.arguments) {
    throw new Error(`OpenAI missing tool: ${opts.tool.name}`);
  }
  if (opts.usageSink && completion.usage) {
    opts.usageSink.input += completion.usage.prompt_tokens ?? 0;
    opts.usageSink.output += completion.usage.completion_tokens ?? 0;
  }
  return JSON.parse(call.function.arguments) as T;
}

export interface StreamTextOpts {
  provider?: BrainProvider;
  tier: "fast" | "main" | "deep";
  kind?: "router" | "chat" | "decision" | "critique" | "asset";
  system: string;
  userMessage: string;
  history?: { role: "user" | "assistant"; content: string }[];
  tools?: ForcedToolDef[];
  signal?: AbortSignal;
  usageSink?: TokenUsageSink;
  onToken: (text: string) => void;
}

/** Streaming text answer — Anthropic supports optional auto-tools; OpenAI is plain text. */
export async function streamTextAnswer(opts: StreamTextOpts): Promise<string> {
  const provider = resolveBrainProvider(opts.provider);
  if (provider === "openai") {
    return openaiStreamText(opts);
  }
  return anthropicStreamText(opts);
}

export interface OpenAiToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface OpenAiChatRoundResult {
  text: string;
  toolCalls: OpenAiToolCall[];
  assistantMessage: OpenAI.Chat.ChatCompletionAssistantMessageParam;
}

function toOpenAiTools(tools: ForcedToolDef[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

/** One OpenAI chat round with streaming text + accumulated function tool calls. */
export async function openaiChatRoundWithTools(
  opts: StreamTextOpts & { tools: ForcedToolDef[]; messages: OpenAI.Chat.ChatCompletionMessageParam[] },
): Promise<OpenAiChatRoundResult> {
  const choice = modelForProvider("openai", opts.tier, opts.kind ?? "chat");
  const stream = await openai().chat.completions.create(
    {
      model: choice.model,
      max_tokens: choice.maxTokens,
      stream: true,
      messages: opts.messages,
      tools: toOpenAiTools(opts.tools),
      tool_choice: "auto",
    },
    { signal: opts.signal },
  );

  let text = "";
  const toolAcc = new Map<number, { id: string; name: string; arguments: string }>();

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      text += delta.content;
      opts.onToken(delta.content);
    }
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index;
        let acc = toolAcc.get(idx);
        if (!acc) {
          acc = { id: tc.id ?? "", name: tc.function?.name ?? "", arguments: "" };
          toolAcc.set(idx, acc);
        }
        if (tc.id) acc.id = tc.id;
        if (tc.function?.name) acc.name = tc.function.name;
        if (tc.function?.arguments) acc.arguments += tc.function.arguments;
      }
    }
    if (opts.usageSink && chunk.usage) {
      opts.usageSink.input += chunk.usage.prompt_tokens ?? 0;
      opts.usageSink.output += chunk.usage.completion_tokens ?? 0;
    }
  }

  const toolCalls = [...toolAcc.values()].filter((t) => t.id && t.name);
  const assistantMessage: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
    role: "assistant",
    content: text || null,
    ...(toolCalls.length
      ? {
          tool_calls: toolCalls.map((t) => ({
            id: t.id,
            type: "function" as const,
            function: { name: t.name, arguments: t.arguments },
          })),
        }
      : {}),
  };

  return { text, toolCalls, assistantMessage };
}

async function anthropicStreamText(opts: StreamTextOpts): Promise<string> {
  const choice = modelFor(opts.tier, opts.kind ?? "chat");
  const tools = (opts.tools ?? []).map(
    (t) =>
      ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      }) as Anthropic.Tool,
  );
  const stream = anthropic().messages.stream(
    {
      model: choice.model,
      max_tokens: choice.maxTokens,
      system: opts.system,
      ...(tools.length ? { tools, tool_choice: { type: "auto" as const } } : {}),
      messages: [
        ...(opts.history ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: opts.userMessage },
      ],
    },
    { signal: opts.signal, timeout: env.LLM_TIMEOUT_MS },
  );
  let text = "";
  stream.on("text", (delta) => {
    text += delta;
    opts.onToken(delta);
  });
  const final = await stream.finalMessage();
  addMessageUsage(opts.usageSink, final);
  return text;
}

async function openaiStreamText(opts: StreamTextOpts): Promise<string> {
  const choice = modelForProvider("openai", opts.tier, opts.kind ?? "chat");
  const stream = await openai().chat.completions.create(
    {
      model: choice.model,
      max_tokens: choice.maxTokens,
      stream: true,
      messages: [
        { role: "system", content: opts.system },
        ...(opts.history ?? []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: opts.userMessage },
      ],
    },
    { signal: opts.signal },
  );
  let text = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      text += delta;
      opts.onToken(delta);
    }
  }
  return text;
}
