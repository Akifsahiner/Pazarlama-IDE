import type { AgentTurnContext, ProactiveSuggestionAction } from "../schemas/index.js";
import type { PlanProgressSummary } from "./prompts.js";

export interface ProactiveSuggestionPayload {
  title: string;
  body: string;
  action?: ProactiveSuggestionAction;
  source: "apply_complete" | "plan_task_done" | "measuring_phase" | "brain";
}

/** Fast rule-based next-step suggestion — no LLM (≤5s path). */
export function buildProactiveSuggestion(
  context: AgentTurnContext,
  planProgressSummary?: PlanProgressSummary,
): ProactiveSuggestionPayload {
  const trigger = context.proactive_trigger ?? "brain";
  const pp = context.plan_progress;
  const summary = planProgressSummary;
  const nextTitle =
    pp?.next_task_title ?? summary?.nextTaskTitle ?? context.last_run_summary?.slice(0, 80);
  const nextTaskId = summary?.nextTaskId;
  const nextPlaybookId = summary?.nextPlaybookId;
  const done = pp?.done ?? summary?.done;
  const total = pp?.total ?? summary?.total;

  if (trigger === "measuring_phase" || context.campaign_phase === "measuring") {
    return {
      title: "Log your first KPI",
      body:
        "Your launch cycle is in the measurement phase. Log at least one KPI so the agent can calibrate the next experiment.",
      action: { kind: "log_kpi", presetId: "waitlist" },
      source: "measuring_phase",
    };
  }

  if (trigger === "apply_complete") {
    const dayHint = nextTitle ? `**${nextTitle}**` : "the next launch task";
    return {
      title: nextTitle ? `Next: ${nextTitle}` : "Next launch task",
      body: `Changes applied successfully.${context.last_run_summary ? ` ${context.last_run_summary}` : ""} Ready to continue with ${dayHint}.`,
      action:
        nextTaskId && nextPlaybookId
          ? { kind: "continue_plan", taskId: nextTaskId, playbookId: nextPlaybookId }
          : nextTaskId
            ? { kind: "continue_plan", taskId: nextTaskId }
            : { kind: "open_plan" },
      source: "apply_complete",
    };
  }

  if (trigger === "plan_task_done") {
    const progressLine =
      done != null && total != null && total > 0 ? ` (${done}/${total} tasks done)` : "";
    if (nextTitle && nextTaskId) {
      return {
        title: `Next: ${nextTitle}`,
        body: `Task complete${progressLine}. Continue with **${nextTitle}** when you're ready.`,
        action: {
          kind: "continue_plan",
          taskId: nextTaskId,
          playbookId: nextPlaybookId,
        },
        source: "plan_task_done",
      };
    }
    if (done != null && total != null && done >= total) {
      return {
        title: "Launch plan complete",
        body: "All plan tasks are done. Log KPIs and review outcomes before the next cycle.",
        action: { kind: "log_kpi", presetId: "waitlist" },
        source: "plan_task_done",
      };
    }
    return {
      title: "Pick up your launch plan",
      body: `Task complete${progressLine}. Open Plan Studio to see what's next.`,
      action: { kind: "open_plan" },
      source: "plan_task_done",
    };
  }

  if (context.pending_files?.length) {
    return {
      title: "Review pending changes",
      body: `${context.pending_files.length} file(s) still have unapplied edits. Review the diff and apply when ready.`,
      action: { kind: "focus_run" },
      source: "brain",
    };
  }

  return {
    title: nextTitle ? `Next: ${nextTitle}` : "Continue your campaign",
    body: context.last_run_summary
      ? context.last_run_summary
      : "Keep momentum — run the next task in your launch plan.",
    action: nextTaskId
      ? { kind: "continue_plan", taskId: nextTaskId, playbookId: nextPlaybookId }
      : { kind: "open_plan" },
    source: "brain",
  };
}
