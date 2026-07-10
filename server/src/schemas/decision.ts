import { z } from "zod";

/**
 * The Marketing Brain's structured output. Every strategic answer is a
 * DECISION (diagnose → decide → deliver), not a free-form advice list.
 */

export const decisionAssetSchema = z.object({
  kind: z.enum(["copy", "email", "post", "checklist", "doc", "ad"]),
  title: z.string(),
  content: z.string(),
  suggested_target_file: z.string().optional(),
  apply_mode: z.enum(["sidecar", "integrate", "clipboard"]).optional(),
});

export const decisionStepSchema = z.object({
  step: z.string(),
  owner: z.string().optional(),
  eta: z.string().optional(),
});

export const decisionOptionSchema = z.object({
  name: z.string(),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  fit_score: z.number().min(0).max(10),
});

export const marketingDecisionSchema = z.object({
  diagnosis: z.string().min(8),
  bottleneck: z.string().min(4),
  gtm_bottleneck: z
    .enum(["awareness", "conversion", "distribution", "revenue", "measurement"])
    .optional(),
  primary_playbook_id: z.string().optional(),
  bottleneck_why: z.string().optional(),
  channel_priority: z.array(z.string()).max(3).default([]),
  next_playbook: z.string().optional(),
  tactic_you_may_not_know: z.string().optional(),
  options_compared: z.array(decisionOptionSchema).min(1).max(4),
  decision: z.string().min(4),
  rationale: z.string().min(8),
  ready_to_use_assets: z.array(decisionAssetSchema).default([]),
  next_steps: z.array(decisionStepSchema).min(1),
  success_metric: z.object({ name: z.string(), target: z.string() }),
  when_to_reconsider: z.string().default(""),
  missing_info: z.array(z.string()).max(3).default([]),
});

export type MarketingDecision = z.infer<typeof marketingDecisionSchema>;

/** JSON-Schema (for Anthropic tool_use input_schema). */
export const DECISION_JSON_SCHEMA = {
  type: "object",
  required: [
    "diagnosis",
    "bottleneck",
    "options_compared",
    "decision",
    "rationale",
    "next_steps",
    "success_metric",
  ],
  properties: {
    diagnosis: { type: "string", description: "What the current state actually is, tied to the profile." },
    bottleneck: { type: "string", description: "The single biggest obstacle to address right now." },
    gtm_bottleneck: {
      type: "string",
      enum: ["awareness", "conversion", "distribution", "revenue", "measurement"],
      description: "Primary GTM constraint category.",
    },
    primary_playbook_id: {
      type: "string",
      description: "Recommended playbook id from plan catalog (e.g. waitlist-hype, ph-number-one).",
    },
    bottleneck_why: {
      type: "string",
      description: "One sentence why this bottleneck is primary.",
    },
    channel_priority: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
      description: "Up to 3 playbook ids in priority order — no more.",
    },
    next_playbook: {
      type: "string",
      description: "Playbook to start after primary completes.",
    },
    tactic_you_may_not_know: {
      type: "string",
      description: "Name one specific tactic the founder may not know (e.g. PH supporter comment cadence).",
    },
    options_compared: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "fit_score"],
        properties: {
          name: { type: "string" },
          pros: { type: "array", items: { type: "string" } },
          cons: { type: "array", items: { type: "string" } },
          fit_score: { type: "number", description: "0-10 how well this option fits the product profile." },
        },
      },
      minItems: 1,
      maxItems: 4,
    },
    decision: { type: "string", description: "Which option you chose." },
    rationale: { type: "string", description: "Why, citing the profile + skill principles." },
    ready_to_use_assets: {
      type: "array",
      items: {
        type: "object",
        required: ["kind", "title", "content"],
        properties: {
          kind: { type: "string", enum: ["copy", "email", "post", "checklist", "doc", "ad"] },
          title: { type: "string" },
          content: { type: "string", description: "Final, copy-paste-ready text. Not a template with placeholders." },
          suggested_target_file: {
            type: "string",
            description: "Optional relative path e.g. marketing/hero.md — never a TSX page path for plain copy.",
          },
          apply_mode: {
            type: "string",
            enum: ["sidecar", "integrate", "clipboard"],
            description: "How the client should persist this asset.",
          },
        },
      },
    },
    next_steps: {
      type: "array",
      items: {
        type: "object",
        required: ["step"],
        properties: {
          step: { type: "string" },
          owner: { type: "string" },
          eta: { type: "string" },
        },
      },
      minItems: 1,
    },
    success_metric: {
      type: "object",
      required: ["name", "target"],
      properties: {
        name: { type: "string", description: "One specific metric (no vague engagement)." },
        target: { type: "string", description: "Concrete numeric target with timeframe." },
      },
    },
    when_to_reconsider: { type: "string" },
    missing_info: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
      description: "If required inputs are missing, list ≤ 3 specific questions to ask the user.",
    },
  },
} as const;
