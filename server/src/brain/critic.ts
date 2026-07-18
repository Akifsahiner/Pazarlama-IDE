import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../env.js";
import type { MarketingDecision } from "../schemas/decision.js";
import { modelFor } from "./modelTier.js";
import { addMessageUsage, type TokenUsageSink } from "./tokenUsage.js";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export const critiqueSchema = z.object({
  product_specificity: z.number().min(0).max(10),
  actionability: z.number().min(0).max(10),
  strategic_depth: z.number().min(0).max(10),
  realism: z.number().min(0).max(10),
  brand_voice_match: z.number().min(0).max(10),
  generality_penalty: z.number().min(0).max(10),
  tactic_density: z.number().min(0).max(10).default(5),
  ethics_compliance: z.number().min(0).max(10).default(8),
  aggression_honesty: z.number().min(0).max(10).default(5),
  total: z.number().min(0).max(90),
  revisions: z.array(z.string()).max(5).default([]),
  approve: z.boolean(),
});
export type Critique = z.infer<typeof critiqueSchema>;

/** Shorter rubric for draft copy — max 40 points (Faz 7). */
export const draftCritiqueSchema = z.object({
  specificity: z.number().min(0).max(10),
  actionability: z.number().min(0).max(10),
  brand_voice: z.number().min(0).max(10),
  generality_penalty: z.number().min(0).max(10),
  total: z.number().min(0).max(40),
  revisions: z.array(z.string()).max(3).default([]),
  approve: z.boolean(),
});
export type DraftCritique = z.infer<typeof draftCritiqueSchema>;

/** Warn badge threshold — maps to ~35/60 on decision scale. */
export const DRAFT_QUALITY_WARN_THRESHOLD = 23;
/** Auto-revise threshold. */
export const DRAFT_QUALITY_REVISE_THRESHOLD = 20;

export function shouldWarnDraftQuality(critique: DraftCritique): boolean {
  return !critique.approve && critique.total < DRAFT_QUALITY_WARN_THRESHOLD;
}

export function shouldReviseDraft(critique: DraftCritique): boolean {
  return !critique.approve && critique.total < DRAFT_QUALITY_REVISE_THRESHOLD;
}

const DRAFT_TOOL = {
  name: "critique_draft",
  description: "Score draft copy for specificity and paste-readiness.",
  input_schema: {
    type: "object",
    required: [
      "specificity",
      "actionability",
      "brand_voice",
      "generality_penalty",
      "total",
      "approve",
    ],
    properties: {
      specificity: { type: "number", minimum: 0, maximum: 10 },
      actionability: { type: "number", minimum: 0, maximum: 10 },
      brand_voice: { type: "number", minimum: 0, maximum: 10 },
      generality_penalty: {
        type: "number",
        minimum: 0,
        maximum: 10,
        description: "Higher = more generic filler copy.",
      },
      total: { type: "number", minimum: 0, maximum: 40 },
      revisions: { type: "array", items: { type: "string" }, maxItems: 3 },
      approve: {
        type: "boolean",
        description: "true iff total >= 26 and copy is paste-ready.",
      },
    },
  },
} as const;

const DRAFT_SYSTEM = [
  "You are a senior marketing editor. Score draft copy for specificity to THIS product.",
  "Penalize placeholders, generic SaaS filler, and vague CTAs. Use `critique_draft` tool.",
].join(" ");

const TOOL = {
  name: "critique_decision",
  description: "Score a marketing decision against nine dimensions and decide if it ships.",
  input_schema: {
    type: "object",
    required: [
      "product_specificity",
      "actionability",
      "strategic_depth",
      "realism",
      "brand_voice_match",
      "generality_penalty",
      "tactic_density",
      "ethics_compliance",
      "aggression_honesty",
      "total",
      "approve",
    ],
    properties: {
      product_specificity: { type: "number", minimum: 0, maximum: 10 },
      actionability: { type: "number", minimum: 0, maximum: 10 },
      strategic_depth: { type: "number", minimum: 0, maximum: 10 },
      realism: { type: "number", minimum: 0, maximum: 10 },
      brand_voice_match: { type: "number", minimum: 0, maximum: 10 },
      generality_penalty: {
        type: "number",
        minimum: 0,
        maximum: 10,
        description: "Higher = more generic 'evergreen' advice (subtract).",
      },
      tactic_density: {
        type: "number",
        minimum: 0,
        maximum: 10,
        description: "≥5 measurable tactic steps? Higher = denser.",
      },
      ethics_compliance: {
        type: "number",
        minimum: 0,
        maximum: 10,
        description: "10 = no PH/ads manipulation or ToS risks.",
      },
      aggression_honesty: {
        type: "number",
        minimum: 0,
        maximum: 10,
        description: "Ceiling stated when aggressive goals are unrealistic?",
      },
      total: { type: "number", minimum: 0, maximum: 90 },
      revisions: { type: "array", items: { type: "string" }, maxItems: 5 },
      approve: {
        type: "boolean",
        description: "true iff total >= 65, ethics_compliance >= 7, and no critical issue.",
      },
    },
  },
} as const;

const SYSTEM = [
  "You are a senior marketing critic. Score the proposed marketing decision against",
  "the user's product profile. Be strict — penalize generic SaaS advice, vague metrics,",
  "and placeholder copy. Score tactic_density (≥5 measurable steps), ethics_compliance",
  "(PH upvote farms / undisclosed ads = fail), aggression_honesty (state ceiling when",
  "aggressive goals lack assets). Use the `critique_decision` tool.",
].join(" ");

/** Critique a decision; never throws (returns null on failure). */
export async function critique(
  profileJson: string,
  decision: MarketingDecision,
  signal?: AbortSignal,
  usageSink?: TokenUsageSink,
): Promise<Critique | null> {
  const choice = modelFor("main", "critique");
  try {
    const msg = await client().messages.create(
      {
        model: choice.model,
        max_tokens: choice.maxTokens,
        system: SYSTEM,
        tools: [TOOL as unknown as Anthropic.Tool],
        tool_choice: { type: "tool", name: "critique_decision" },
        messages: [
          {
            role: "user",
            content: `PRODUCT PROFILE:\n\`\`\`json\n${profileJson}\n\`\`\`\n\nDECISION TO CRITIQUE:\n\`\`\`json\n${JSON.stringify(decision, null, 2)}\n\`\`\``,
          },
        ],
      },
      { signal, timeout: 20_000 },
    );
    addMessageUsage(usageSink, msg);
    const tool = msg.content.find((c) => c.type === "tool_use");
    if (!tool || tool.type !== "tool_use") return null;
    return critiqueSchema.parse(tool.input as object);
  } catch {
    return null;
  }
}

/** Critique draft assets; never throws (returns null on failure). */
export async function critiqueDraft(
  profileJson: string,
  draft: { summary: string; assets: Array<{ title: string; content: string }> },
  signal?: AbortSignal,
  usageSink?: TokenUsageSink,
): Promise<DraftCritique | null> {
  const choice = modelFor("fast", "critique");
  try {
    const msg = await client().messages.create(
      {
        model: choice.model,
        max_tokens: choice.maxTokens,
        system: DRAFT_SYSTEM,
        tools: [DRAFT_TOOL as unknown as Anthropic.Tool],
        tool_choice: { type: "tool", name: "critique_draft" },
        messages: [
          {
            role: "user",
            content: `PRODUCT PROFILE:\n\`\`\`json\n${profileJson}\n\`\`\`\n\nDRAFT TO CRITIQUE:\n\`\`\`json\n${JSON.stringify(draft, null, 2)}\n\`\`\``,
          },
        ],
      },
      { signal, timeout: 15_000 },
    );
    addMessageUsage(usageSink, msg);
    const tool = msg.content.find((c) => c.type === "tool_use");
    if (!tool || tool.type !== "tool_use") return null;
    return draftCritiqueSchema.parse(tool.input as object);
  } catch {
    return null;
  }
}
