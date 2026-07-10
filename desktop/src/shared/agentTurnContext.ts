import type { CampaignSession, MarketingPlan } from "./types";
import type { PlanProgressSnapshot } from "./planProgress";
import { runChangedFiles } from "./runs";
import { nextActionableTask } from "./planProgress";
import { normalizePlan } from "./planPlaybooks";

export type ProactiveTrigger = "apply_complete" | "plan_task_done" | "measuring_phase";

export interface AgentTurnContext {
  last_run_summary?: string;
  pending_files?: string[];
  campaign_phase?: string;
  plan_progress?: { done: number; total: number; next_task_title?: string };
  proactive_trigger?: ProactiveTrigger;
}

export interface ProactiveSuggestionAction {
  kind: "continue_plan" | "log_kpi" | "focus_run" | "open_plan";
  taskId?: string;
  playbookId?: string;
  presetId?: string;
}

export interface AgentTurnContextInput {
  run?: {
    goal: string;
    events: import("./types").RunEvent[];
  } | null;
  plan?: MarketingPlan | null;
  planProgress?: PlanProgressSnapshot | null;
  campaignSession?: CampaignSession | null;
  proactive_trigger?: ProactiveTrigger;
  lastAppliedSummary?: string;
}

/** Assemble enrichment payload for /agent context (Faz 7). */
export function buildAgentTurnContext(input: AgentTurnContextInput): AgentTurnContext | undefined {
  const ctx: AgentTurnContext = {};
  if (input.proactive_trigger) ctx.proactive_trigger = input.proactive_trigger;

  if (input.lastAppliedSummary) {
    ctx.last_run_summary = input.lastAppliedSummary;
  } else if (input.run?.goal) {
    ctx.last_run_summary = `Run: ${input.run.goal.slice(0, 160)}`;
  }

  if (input.run?.events?.length) {
    const pending = runChangedFiles(input.run.events);
    if (pending.length) ctx.pending_files = pending.slice(0, 12);
  }

  if (input.campaignSession?.phase) {
    ctx.campaign_phase = input.campaignSession.phase;
  }

  const suite = input.plan ? normalizePlan(input.plan) : null;
  const progress = input.planProgress;
  if (progress?.computed.total) {
    const next = suite ? nextActionableTask(suite, progress.byTaskId) : null;
    ctx.plan_progress = {
      done: progress.computed.done,
      total: progress.computed.total,
      next_task_title: next?.title,
    };
  }

  const hasData =
    ctx.proactive_trigger ||
    ctx.last_run_summary ||
    ctx.pending_files?.length ||
    ctx.campaign_phase ||
    ctx.plan_progress;
  return hasData ? ctx : undefined;
}
