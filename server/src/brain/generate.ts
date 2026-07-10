import { randomUUID } from "node:crypto";
import { env } from "../env.js";import {
  DECISION_JSON_SCHEMA,
  marketingDecisionSchema,
  type MarketingDecision,
} from "../schemas/decision.js";
import { withRetry, isModelUnavailable } from "../llm/retry.js";
import { modelFor, type BrainProvider } from "./modelTier.js";
import { enrichDecision } from "./bottleneck.js";
import { forcedToolCall } from "./llmClient.js";
import type { TokenUsageSink } from "./tokenUsage.js";

export interface GenerateOpts {
  system: string;
  userMessage: string;
  /** Prior conversation history (chat threads). */
  history?: { role: "user" | "assistant"; content: string }[];
  /** "main" for everyday tasks, "deep" for strategic critique. */
  tier?: "main" | "deep";
  provider?: BrainProvider;
  /** Streamed lifecycle hooks. */
  onStatus?: (text: string) => void;
  signal?: AbortSignal;
  usageSink?: TokenUsageSink;
}

/**
 * Marketing Brain primary generation: forces a structured `marketing_decision`
 * tool call, streams a "first chunk" signal so the UI can collapse the
 * thinking dots quickly, then parses + validates the final structured output.
 */
export async function generateDecision(opts: GenerateOpts): Promise<MarketingDecision> {
  const tier = opts.tier ?? "main";
  const runOnce = async (): Promise<MarketingDecision> => {
    const parsed = await forcedToolCall<MarketingDecision>({
      provider: opts.provider,
      tier,
      kind: "decision",
      system: opts.system,
      userMessage: opts.userMessage,
      history: opts.history,
      tool: {
        name: "marketing_decision",
        description:
          "Emit a structured marketing decision (diagnosis → options → decision → assets → next steps → metric).",
        input_schema: DECISION_JSON_SCHEMA as unknown as Record<string, unknown>,
      },
      signal: opts.signal,
      usageSink: opts.usageSink,
      onPartial: () => opts.onStatus?.("Drafting decision…"),
    });
    return enrichDecision(marketingDecisionSchema.parse(parsed));
  };

  try {
    return await withRetry(runOnce, { signal: opts.signal });
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    if (!isModelUnavailable(err) || opts.provider === "openai") throw err;
    const choice = modelFor(tier, "decision");
    if (env.ANTHROPIC_FALLBACK_MODEL && env.ANTHROPIC_FALLBACK_MODEL !== choice.model) {
      opts.onStatus?.(`Primary model unavailable — using ${env.ANTHROPIC_FALLBACK_MODEL}`);
      return forcedToolCall<MarketingDecision>({
        provider: "anthropic",
        tier,
        kind: "decision",
        system: opts.system,
        userMessage: opts.userMessage,
        history: opts.history,
        tool: {
          name: "marketing_decision",
          description: "Emit a structured marketing decision.",
          input_schema: DECISION_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
        signal: opts.signal,
        usageSink: opts.usageSink,
      }).then((p) => enrichDecision(marketingDecisionSchema.parse(p)));
    }
    throw err;
  }
}
/** Helper so callers can quickly forge synthetic experiment records. */
export function newExperimentId(): string {
  return randomUUID();
}
