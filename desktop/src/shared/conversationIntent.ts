import type { ComposerSuggestedMode, MarketingDecision } from "./types";
import type { QuickActionId } from "./quickActions";
import { QUICK_ACTION_GOALS, resolveQuickAction } from "./quickActions";
import type { SurfaceUnlockAction } from "./surfaceUnlock";
import {
  firstActionableTaskOnDay,
  type PlanProgressSnapshot,
} from "./planProgress";
import { firstAwaitingApplyTask } from "./planTaskCompletion";
import type { MarketingPlan } from "./types";
import { inferIntegrateRoute } from "./assetTarget";
import { integrateRunGoal } from "./assetActions";

export type ConversationIntent =
  | { kind: "run_plan_task"; taskId: string }
  | { kind: "run_next_plan_task" }
  | { kind: "apply_pending"; runId: string; taskId?: string }
  | { kind: "start_edit_run"; goal: string; planTaskId?: string }
  | { kind: "start_browser_task"; goal: string; planTaskId?: string }
  | { kind: "integrate_asset"; assetId: string; route?: string }
  | { kind: "generate_plan" }
  | { kind: "revise_plan"; instruction: string }
  | { kind: "preview_plan" }
  | { kind: "log_kpi"; presetId: string }
  | { kind: "record_experiment"; experimentId?: string }
  | { kind: "ask_only"; message: string };

export type IntentResolveSource =
  | "ui"
  | "quick_action"
  | "suggested_mode"
  | "decision"
  | "awaiting_apply"
  | "heuristic";

export interface ResolvedConversationIntent {
  intent: ConversationIntent;
  source: IntentResolveSource;
  confidence: "high" | "medium" | "low";
  label?: string;
  reason?: string;
}

export interface ResolveIntentInput {
  /** Highest priority — explicit button / handoff payload. */
  uiIntent?: ConversationIntent;
  quickActionId?: QuickActionId;
  message?: string;
  suggestedMode?: ComposerSuggestedMode;
  suggestedModeReason?: string;
  lastAgentText?: string;
  decision?: MarketingDecision;
  plan?: MarketingPlan | null;
  planProgress?: PlanProgressSnapshot | null;
  activePlaybookId?: string;
  activeRunId?: string;
  /** Resolved plan task id for decision / apply context. */
  planTaskId?: string;
}

const EDIT_KEYWORDS =
  /\b(edit|fix|change|update|rewrite|improve|hero|cta|copy|landing|page|file|repo|implement|düzelt|düzenle|güncelle|yaz|kopya|sayfa|dosya)\b/i;
const BROWSER_KEYWORDS =
  /\b(research|competitor|browse|browser|scan|leads?|prospect|verify|check site|rakip|araştır|tara|incele)\b/i;
const NEXT_TASK_KEYWORDS =
  /\b(next task|continue plan|sıradaki|sonraki görev|devam et)\b/i;
const DAY_RUN_KEYWORDS =
  /\b(?:day|gün)\s*(\d{1,2})\b|(?:gün)\s*(\d{1,2})['']?(?:i|ü|u)?\s*(?:çalıştır|yap|başlat)/i;
const GENERATE_PLAN_KEYWORDS =
  /\b(generate plan|launch plan|create plan|plan oluştur|plan üret|planı üret)\b/i;
const PREVIEW_PLAN_KEYWORDS =
  /\b(preview plan|outline plan|plan önizle|taslak plan|outline göster|plan taslağı)\b/i;
const REVISE_PLAN_KEYWORDS =
  /\b(add|ekle|include|remove|çıkar|shift|revise|update plan|plan[aı]?\s*(güncelle|değiştir)|channel|kanal|görev ekle)\b/i;
const CHANNEL_NUDGE = /\b(tiktok|linkedin|youtube|instagram|newsletter)\s*(ekle|add)\b/i;
const APPLY_KEYWORDS = /\b(apply changes|apply pending|review diff|uygula|değişiklikleri uygula)\b/i;
const KPI_KEYWORDS = /\b(log kpi|kpi log|record metric|metrik kaydet|sonuç kaydet)\b/i;
const RECORD_EXPERIMENT_KEYWORDS =
  /\b(bu testi kaydet|record (this )?experiment|save (this )?test|deneyi kaydet|experiment kaydet|testi kaydet|save experiment)\b/i;

function trimMessage(msg?: string): string {
  return (msg ?? "").trim();
}

function parsePlanDay(msg: string): number | null {
  const m =
    msg.match(/\b(?:day|gün)\s*(\d{1,2})\b/i) ??
    msg.match(/\bgün\s*(\d{1,2})['']?(?:i|ü|u)?\s*(?:çalıştır|yap|başlat)/i);
  if (!m?.[1]) return null;
  const day = Number.parseInt(m[1], 10);
  return Number.isFinite(day) && day > 0 ? day : null;
}

function heuristicIntent(input: ResolveIntentInput): ResolvedConversationIntent | null {
  const msg = trimMessage(input.message);
  if (!msg) return null;

  if (APPLY_KEYWORDS.test(msg) && input.activeRunId) {
    return {
      intent: {
        kind: "apply_pending",
        runId: input.activeRunId,
        taskId: input.planTaskId,
      },
      source: "heuristic",
      confidence: "medium",
      label: "Apply pending changes",
      reason: "Review diff and apply to complete the plan task.",
    };
  }

  const planDay = parsePlanDay(msg);
  if (planDay != null && input.plan && input.planProgress && DAY_RUN_KEYWORDS.test(msg)) {
    const task = firstActionableTaskOnDay(input.plan, input.planProgress.byTaskId, planDay);
    if (task) {
      return {
        intent: { kind: "run_plan_task", taskId: task.id },
        source: "heuristic",
        confidence: "high",
        label: `Day ${task.day} · ${task.title}`,
        reason: `Run the first actionable task on day ${planDay}.`,
      };
    }
  }

  if (NEXT_TASK_KEYWORDS.test(msg) && input.plan && input.planProgress) {
    return {
      intent: { kind: "run_next_plan_task" },
      source: "heuristic",
      confidence: "high",
      label: "Run next plan task",
      reason: "Continue your launch plan from the next actionable task.",
    };
  }

  if (GENERATE_PLAN_KEYWORDS.test(msg)) {
    return {
      intent: { kind: "generate_plan" },
      source: "heuristic",
      confidence: "high",
      label: "Generate launch plan",
    };
  }

  if (
    input.plan &&
    (CHANNEL_NUDGE.test(msg) ||
      (REVISE_PLAN_KEYWORDS.test(msg) &&
        /\b(plan|playbook|task|gün|day|channel|kanal|görev)\b/i.test(msg)))
  ) {
    return {
      intent: { kind: "revise_plan", instruction: msg },
      source: "heuristic",
      confidence: "high",
      label: "Revise launch plan",
      reason: "Update your active plan with a version diff.",
    };
  }

  if (PREVIEW_PLAN_KEYWORDS.test(msg)) {
    return {
      intent: { kind: "preview_plan" },
      source: "heuristic",
      confidence: "high",
      label: "Preview plan outline",
    };
  }

  if (KPI_KEYWORDS.test(msg)) {
    const preset = /waitlist|signup/i.test(msg) ? "waitlist_signups" : "launch_week_signups";
    return {
      intent: { kind: "log_kpi", presetId: preset },
      source: "heuristic",
      confidence: "medium",
      label: "Log KPI",
    };
  }

  if (RECORD_EXPERIMENT_KEYWORDS.test(msg)) {
    return {
      intent: { kind: "record_experiment" },
      source: "heuristic",
      confidence: "high",
      label: "Record experiment",
      reason: "Save this test with evidence from your last run.",
    };
  }

  if (BROWSER_KEYWORDS.test(msg) && !EDIT_KEYWORDS.test(msg)) {
    return {
      intent: { kind: "start_browser_task", goal: msg, planTaskId: input.planTaskId },
      source: "heuristic",
      confidence: "medium",
      label: "Run browser research",
      reason: "Live research in the operator sandbox.",
    };
  }

  if (EDIT_KEYWORDS.test(msg)) {
    return {
      intent: { kind: "start_edit_run", goal: msg, planTaskId: input.planTaskId },
      source: "heuristic",
      confidence: "medium",
      label: "Run in project",
      reason: "Agent will edit files in an isolated worktree.",
    };
  }

  return {
    intent: { kind: "ask_only", message: msg },
    source: "heuristic",
    confidence: "low",
  };
}

function intentFromQuickAction(id: QuickActionId): ResolvedConversationIntent | null {
  const action = resolveQuickAction(id);
  switch (id) {
    case "plan":
      return {
        intent: { kind: "generate_plan" },
        source: "quick_action",
        confidence: "high",
        label: "Generate launch plan",
      };
    case "launch":
    case "scan":
    case "icp":
      return {
        intent: { kind: "start_edit_run", goal: action.draft },
        source: "quick_action",
        confidence: "high",
        label: id === "launch" ? "Prepare for launch" : id === "scan" ? "Scan product" : "Build ICP",
        reason: "Runs the local agent on your project files.",
      };
    case "competitors":
    case "leads":
      return {
        intent: { kind: "start_browser_task", goal: action.draft },
        source: "quick_action",
        confidence: "high",
        label: id === "competitors" ? "Research competitors" : "Research leads",
      };
    case "landing_copy":
      return {
        intent: { kind: "start_edit_run", goal: QUICK_ACTION_GOALS.LANDING_COPY },
        source: "quick_action",
        confidence: "high",
        label: "Write landing copy",
        reason: "Agent can draft and apply copy to your repo.",
      };
    case "outreach":
      return {
        intent: { kind: "ask_only", message: action.draft },
        source: "quick_action",
        confidence: "high",
        label: "Draft outreach",
      };
    default:
      return null;
  }
}

function intentFromSuggestedMode(input: ResolveIntentInput): ResolvedConversationIntent | null {
  if (!input.suggestedMode) return null;
  const goal =
    trimMessage(input.message) ||
    trimMessage(input.lastAgentText) ||
    trimMessage(input.decision?.next_steps[0]?.step) ||
    "Continue from the last agent response.";

  if (input.suggestedMode === "edit") {
    return {
      intent: { kind: "start_edit_run", goal, planTaskId: input.planTaskId },
      source: "suggested_mode",
      confidence: "high",
      label: "Run in project",
      reason: input.suggestedModeReason ?? "This may need file edits in your repo.",
    };
  }
  return {
    intent: { kind: "start_browser_task", goal, planTaskId: input.planTaskId },
    source: "suggested_mode",
    confidence: "high",
    label: "Run in browser",
    reason: input.suggestedModeReason ?? "This needs live browser research.",
  };
}

function intentFromDecision(input: ResolveIntentInput): ResolvedConversationIntent | null {
  const decision = input.decision;
  if (!decision) return null;

  const asset = decision.ready_to_use_assets[0];
  if (asset?.content && asset.suggested_target_file) {
    return {
      intent: {
        kind: "start_edit_run",
        goal: `Integrate this copy into ${asset.suggested_target_file}:\n\n${asset.content}`,
        planTaskId: input.planTaskId,
      },
      source: "decision",
      confidence: "high",
      label: `Integrate ${asset.title}`,
      reason: decision.decision.slice(0, 120),
    };
  }

  const step = decision.next_steps[0]?.step?.trim();
  if (!step) return null;

  const owner = decision.next_steps[0]?.owner?.toLowerCase() ?? "";
  const browserish = BROWSER_KEYWORDS.test(step) && !EDIT_KEYWORDS.test(step);
  const editish =
    EDIT_KEYWORDS.test(step) ||
    owner.includes("project") ||
    owner.includes("implement") ||
    owner.includes("engineer");

  if (browserish && !editish) {
    return {
      intent: { kind: "start_browser_task", goal: step, planTaskId: input.planTaskId },
      source: "decision",
      confidence: "high",
      label: "Research in browser",
      reason: decision.decision.slice(0, 120),
    };
  }

  return {
    intent: { kind: "start_edit_run", goal: step, planTaskId: input.planTaskId },
    source: "decision",
    confidence: "high",
    label: "Run in project",
    reason: decision.decision.slice(0, 120),
  };
}

function intentFromAwaitingApply(input: ResolveIntentInput): ResolvedConversationIntent | null {
  if (!input.plan || !input.planProgress) return null;
  const awaiting = firstAwaitingApplyTask(input.plan, input.planProgress.byTaskId);
  if (!awaiting) return null;
  const runId = input.activeRunId ?? awaiting.lastRunId;
  if (!runId) return null;
  return {
    intent: {
      kind: "apply_pending",
      runId,
      taskId: awaiting.task.id,
    },
    source: "awaiting_apply",
    confidence: "high",
    label: `Apply to complete Day ${awaiting.task.day}`,
    reason: `${awaiting.task.title} — review diff, then apply.`,
  };
}

/** Resolve what the user wants to do next — no network calls. */
export function resolveIntent(input: ResolveIntentInput): ResolvedConversationIntent | null {
  if (input.uiIntent) {
    return {
      intent: input.uiIntent,
      source: "ui",
      confidence: "high",
    };
  }

  if (input.quickActionId) {
    const fromQuick = intentFromQuickAction(input.quickActionId);
    if (fromQuick) return fromQuick;
  }

  const fromAwaiting = intentFromAwaitingApply(input);
  if (fromAwaiting && APPLY_KEYWORDS.test(trimMessage(input.message))) {
    return fromAwaiting;
  }

  if (input.suggestedMode) {
    const fromMode = intentFromSuggestedMode(input);
    if (fromMode) return fromMode;
  }

  if (input.decision) {
    const fromDecision = intentFromDecision(input);
    if (fromDecision) return fromDecision;
  }

  return heuristicIntent(input);
}

export function quickActionToIntent(id: QuickActionId): ConversationIntent | null {
  return resolveIntent({ quickActionId: id })?.intent ?? null;
}

export function surfaceActionToIntent(action: SurfaceUnlockAction): ConversationIntent | null {
  switch (action) {
    case "generate_plan":
      return { kind: "generate_plan" };
    case "preview_plan":
      return { kind: "preview_plan" };
    case "browser_research":
      return { kind: "start_browser_task", goal: QUICK_ACTION_GOALS.COMPETITORS };
    case "draft_copy":
      return { kind: "ask_only", message: QUICK_ACTION_GOALS.LANDING_COPY };
    case "log_kpi":
      return { kind: "log_kpi", presetId: "waitlist_signups" };
    case "open_plan":
    case "connect_ga4":
    case "run_agent":
      return null;
    default:
      return null;
  }
}

export function intentRequiresConfirm(intent: ConversationIntent): boolean {
  return intent.kind === "start_edit_run" || intent.kind === "integrate_asset";
}

/** Goal for integrate_asset → start_edit_run handoff (copy into a code route). */
export function buildIntegrateAssetGoal(copy: string, route: string): string {
  return integrateRunGoal(copy, route);
}

/** Build integrate intent when a landing route is known (or inferable from scan). */
export function integrateAssetIntent(
  assetId: string,
  opts?: { route?: string; routes?: string[] },
): ConversationIntent | null {
  const route = opts?.route ?? inferIntegrateRoute(opts?.routes ?? []);
  if (!route) return null;
  return { kind: "integrate_asset", assetId, route };
}
