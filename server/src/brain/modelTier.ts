import { env } from "../env.js";

/** Logical model tiers — concrete model id resolved here. */
export type Tier = "fast" | "main" | "deep";
export type BrainProvider = "anthropic" | "openai";

export interface ModelChoice {
  model: string;
  /** max_tokens for this call — from env defaults (override in server/.env). */
  maxTokens: number;
}

/**
 * Single source of truth for "which model + how many tokens" per task.
 * Keeps env-based overrides in one place so route code never references env
 * directly for model selection.
 */
export function modelFor(tier: Tier, kind: "router" | "chat" | "decision" | "critique" | "asset" = "chat"): ModelChoice {
  return modelForProvider("anthropic", tier, kind);
}

export function modelForProvider(
  provider: BrainProvider,
  tier: Tier,
  kind: "router" | "chat" | "decision" | "critique" | "asset" = "chat",
): ModelChoice {
  if (provider === "openai") {
    const model = env.OPENAI_MODEL;
    const maxTokens =
      tier === "fast"
        ? env.ANTHROPIC_MAX_TOKENS_ROUTER
        : tier === "deep"
          ? env.ANTHROPIC_MAX_TOKENS_DEEP
          : kind === "decision"
            ? env.ANTHROPIC_MAX_TOKENS_DECISION
            : env.ANTHROPIC_MAX_TOKENS_CHAT;
    return { model, maxTokens };
  }
  if (tier === "fast") {
    const fast = env.ANTHROPIC_MODEL_FAST || env.ANTHROPIC_MODEL;
    return { model: fast, maxTokens: env.ANTHROPIC_MAX_TOKENS_ROUTER };
  }
  if (tier === "deep") {
    const deep = env.ANTHROPIC_MODEL_DEEP || env.ANTHROPIC_MODEL;
    return { model: deep, maxTokens: env.ANTHROPIC_MAX_TOKENS_DEEP };
  }
  // main
  switch (kind) {
    case "router":
      return {
        model: env.ANTHROPIC_MODEL_FAST || env.ANTHROPIC_MODEL,
        maxTokens: env.ANTHROPIC_MAX_TOKENS_ROUTER,
      };
    case "chat":
      return { model: env.ANTHROPIC_MODEL, maxTokens: env.ANTHROPIC_MAX_TOKENS_CHAT };
    case "asset":
      return { model: env.ANTHROPIC_MODEL, maxTokens: env.ANTHROPIC_MAX_TOKENS_CHAT };
    case "decision":
      return { model: env.ANTHROPIC_MODEL, maxTokens: env.ANTHROPIC_MAX_TOKENS_DECISION };
    case "critique":
      return { model: env.ANTHROPIC_MODEL, maxTokens: env.ANTHROPIC_MAX_TOKENS_CRITIQUE };
  }
}
