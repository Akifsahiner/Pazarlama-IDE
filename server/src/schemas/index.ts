import { z } from "zod";
import { planPlaybookSchema, marketingPlanSuiteSchema } from "./planPlaybooks.js";

export const projectSourceSchema = z.union([
  z.object({ kind: z.literal("folder"), path: z.string() }),
  z.object({ kind: z.literal("repo"), url: z.string() }),
  z.object({ kind: z.literal("url"), url: z.string() }),
]);

export const projectProfileSchema = z.object({
  id: z.string(),
  source: projectSourceSchema,
  name: z.string(),
  productType: z.string().optional(),
  framework: z.string().optional(),
  readmeSummary: z.string().optional(),
  routes: z.array(z.string()),
  hasAnalytics: z.boolean(),
  excludedPaths: z.array(z.string()),
  scannedFileCount: z.number(),
});
export type ProjectProfile = z.infer<typeof projectProfileSchema>;

export const readinessScoreSchema = z.object({
  label: z.string(),
  score: z.number().min(0).max(100),
});

export const planTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  dependsOn: z.array(z.string()),
  metric: z.string().optional(),
  day: z.number(),
  deliverable: z.string().optional(),
  acceptance_criteria: z.string().optional(),
  action_type: z.enum(["edit_files", "browser_research", "draft_copy", "analyze"]).optional(),
  playbookId: z.string().optional(),
  phaseLabel: z.string().optional(),
});

export const contentItemSchema = z.object({
  day: z.number(),
  channel: z.string(),
  title: z.string(),
  type: z.enum(["post", "email", "article", "ad"]),
});

export const marketingPlanSchema = z.object({
  id: z.string(),
  positioning: z.string(),
  icp: z.string(),
  readiness: z.array(readinessScoreSchema),
  taskGraph: z.array(planTaskSchema),
  contentCalendar: z.array(contentItemSchema),
  strategyNote: z.string(),
  schemaVersion: z.union([z.literal(1), z.literal(2)]).optional(),
  thesis: z.string().optional(),
  narrativeHook: z.string().optional(),
  antiPatterns: z.array(z.string()).optional(),
  playbooks: z.array(planPlaybookSchema).optional(),
});
export type MarketingPlan = z.infer<typeof marketingPlanSchema>;

export const marketingAssetSchema = z.object({
  id: z.string(),
  type: z.enum(["landing-copy", "tweet", "email", "ad"]),
  targetFile: z.string().optional(),
  before: z.string().optional(),
  after: z.string(),
});
export type MarketingAsset = z.infer<typeof marketingAssetSchema>;

export const planRequestSchema = z.object({
  profile: projectProfileSchema,
  provider: z.enum(["anthropic", "openai"]).optional(),
});

export const planProgressSummarySchema = z.object({
  done: z.number(),
  total: z.number(),
  nextTaskTitle: z.string().optional(),
  nextTaskId: z.string().optional(),
  nextPlaybookId: z.string().optional(),
  activePlaybookId: z.string().optional(),
  activePlaybookTitle: z.string().optional(),
  byPlaybook: z
    .record(z.string(), z.object({ done: z.number(), total: z.number() }))
    .optional(),
});
export type PlanProgressSummary = z.infer<typeof planProgressSummarySchema>;

export const agentTurnContextSchema = z.object({
  last_run_summary: z.string().optional(),
  pending_files: z.array(z.string()).optional(),
  campaign_phase: z.string().optional(),
  plan_progress: z
    .object({
      done: z.number(),
      total: z.number(),
      next_task_title: z.string().optional(),
    })
    .optional(),
  proactive_trigger: z
    .enum(["apply_complete", "plan_task_done", "measuring_phase"])
    .optional(),
  /** Local ContextPack markdown from desktop index (hybrid retrieve + facts + @mentions). */
  local_context_pack: z.string().max(12_000).optional(),
});
export type AgentTurnContext = z.infer<typeof agentTurnContextSchema>;

export const proactiveSuggestionActionSchema = z.object({
  kind: z.enum(["continue_plan", "log_kpi", "focus_run", "open_plan", "generate_plan"]),
  taskId: z.string().optional(),
  playbookId: z.string().optional(),
  presetId: z.string().optional(),
});
export type ProactiveSuggestionAction = z.infer<typeof proactiveSuggestionActionSchema>;

export const agentRequestSchema = z
  .object({
    sessionId: z.string().optional(),
    profile: projectProfileSchema.optional(),
    message: z.string().default(""),
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
      .default([]),
    provider: z.enum(["anthropic", "openai"]).optional(),
    persona: z.enum(["marketing", "sales"]).optional(),
    planProgressSummary: planProgressSummarySchema.optional(),
    activeSurface: z.string().optional(),
    context: agentTurnContextSchema.optional(),
    planSnapshot: marketingPlanSuiteSchema.optional(),
  })
  .refine((v) => v.message.trim().length > 0 || !!v.context?.proactive_trigger, {
    message: "message or context.proactive_trigger required",
  });

/** Stable error codes consumers can switch on (UI translates to user copy). */
export type StreamErrorCode =
  | "rate_limited"
  | "quota_exceeded"
  | "model_error"
  | "timeout"
  | "missing_info"
  | "internal";

export type PlanStreamEvent =
  | { type: "status"; message: string }
  | {
      type: "plan.outline";
      thesis: string;
      narrativeHook: string;
      playbooks: import("./planPlaybooks.js").PlaybookStub[];
      primaryBottleneck?: import("../brain/bottleneck.js").GtmBottleneck;
      primaryPlaybookId?: string;
      bottleneckWhy?: string;
    }
  | {
      type: "plan.playbook";
      playbook: import("./planPlaybooks.js").PlanPlaybook;
      index: number;
      total: number;
    }
  | {
      type: "plan.readiness";
      readiness: import("./planPlaybooks.js").ReadinessScoreWithRationale[];
    }
  | {
      type: "plan.revision";
      summary: string;
      diff: import("../brain/planDiff.js").PlanRevisionDiff;
      sourcePlanId: string;
      plan: MarketingPlan & { playbooks?: import("./planPlaybooks.js").PlanPlaybook[] };
    }
  | { type: "plan"; plan: MarketingPlan & { playbooks?: import("./planPlaybooks.js").PlanPlaybook[] } }
  | { type: "error"; message: string; code?: StreamErrorCode }
  | {
      type: "usage";
      tokens_in: number;
      tokens_out: number;
      cost_cents: number;
    }
  | { type: "done" };

import type { MarketingDecision } from "./decision.js";
import type { Critique, DraftCritique } from "../brain/critic.js";
import type { AnswerCritique } from "../brain/answerCritic.js";
import type { Discipline, TaskKind } from "../brain/router.js";

export type { MarketingDecision, Critique, DraftCritique };

export type MarketingDraftAsset = {
  kind: "copy" | "email" | "post" | "checklist" | "doc" | "ad";
  title: string;
  content: string;
};

export type ComposerSuggestedMode = "edit" | "browse";

export type AgentStreamEvent =
  | { type: "token"; text: string }
  | {
      type: "brain.intent";
      discipline: Discipline;
      task_kind: TaskKind;
      urgency: "fast" | "deep";
    }
  | { type: "brain.status"; phase: string; text: string; skills?: string[] }
  | { type: "brain.retrieved"; skills: string[]; playbookId?: string; tacticCount?: number; aggressionLevel?: string }
  | { type: "brain.profile"; gaps: string[] }
  | { type: "brain.critique"; critique: Critique }
  | { type: "brain.answer_critique"; critique: AnswerCritique; quality_warn?: boolean }
  | {
      type: "decision";
      decision: MarketingDecision;
      critique?: Critique;
      summary?: string;
    }
  | {
      type: "draft";
      summary: string;
      assets: MarketingDraftAsset[];
      suggested_mode?: ComposerSuggestedMode;
      draft_critique?: DraftCritique;
      quality_warn?: boolean;
    }
  | {
      type: "proactive_suggestion";
      title: string;
      body: string;
      action?: ProactiveSuggestionAction;
      buttonLabel?: string;
      source: "apply_complete" | "plan_task_done" | "measuring_phase" | "brain";
    }
  | { type: "missing_info"; questions: string[] }
  | { type: "suggested_mode"; mode: ComposerSuggestedMode; reason?: string }
  | {
      type: "executable_action";
      primary?: import("../brain/executionClassifier.js").ExecutableAction;
      secondary?: import("../brain/executionClassifier.js").ExecutableAction[];
      actions?: import("../brain/executionClassifier.js").ExecutableAction[];
    }
  | { type: "tool"; name: string; status: "start" | "done"; detail?: string }
  | { type: "asset"; asset: MarketingAsset }
  | {
      type: "plan_revision";
      summary: string;
      diff: import("../brain/planDiff.js").PlanRevisionDiff;
      plan: import("./planPlaybooks.js").MarketingPlanSuite;
      sourcePlanId: string;
    }
  | { type: "error"; message: string; code?: StreamErrorCode }
  | {
      type: "usage";
      tokens_in: number;
      tokens_out: number;
      cost_cents: number;
    }
  | { type: "done" };

/** Persisted agent turn payload (messages.content_json). */
export type AgentTurnPersist = {
  kind: "decision" | "draft" | "answer" | "missing_info";
  text?: string;
  summary?: string;
  decision?: MarketingDecision;
  draftAssets?: MarketingDraftAsset[];
  critique?: Critique;
  questions?: string[];
  suggested_mode?: ComposerSuggestedMode;
  assets?: MarketingAsset[];
  proactive?: {
    title: string;
    body: string;
    action?: ProactiveSuggestionAction;
    source: string;
  };
  draft_critique?: DraftCritique;
  answer_critique?: AnswerCritique;
};
