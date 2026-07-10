import { isBrowserPlanTask } from "./planPlaybooks";
import type { PlanTaskStatus } from "./planProgress";
import { runChangedFiles } from "./runs";
import type { PlanTask, RunEvent } from "./types";

/** Gate surfaced in feed / next-action when a plan task needs user closure. */
export type PlanTaskCompletionGate =
  | "apply-pending"
  | "review-pending"
  | "research-pending"
  | "connector-pending"
  | "partial-apply";

export type PlanTaskExecutionMode = NonNullable<PlanTask["execution_mode"]> | "repo";

export interface PlanTaskCompletionTransition {
  status: PlanTaskStatus;
  gate?: PlanTaskCompletionGate;
  /** When true the active plan task id can be cleared (terminal or abandoned). */
  clearActiveTask: boolean;
}

export function resolveTaskExecutionMode(task: PlanTask): PlanTaskExecutionMode {
  if (task.execution_mode) return task.execution_mode;
  if (isBrowserPlanTask(task)) return "browser";
  if (task.action_type === "browser_research") return "browser";
  if (task.action_type === "draft_copy") return "asset";
  return "repo";
}

export function countPendingPatches(events: RunEvent[]): number {
  return runChangedFiles(events).length;
}

/** Repo / run / asset agent run finished — value not delivered until apply or explicit confirm. */
export function transitionAfterRepoRunComplete(
  events: RunEvent[],
): PlanTaskCompletionTransition {
  const patches = countPendingPatches(events);
  if (patches > 0) {
    return { status: "awaiting_apply", gate: "apply-pending", clearActiveTask: false };
  }
  return { status: "awaiting_review", gate: "review-pending", clearActiveTask: false };
}

/** connector_read without GA4 — performance surface + manual KPI, not browser fallback. */
export function transitionAfterConnectorReadNoOAuth(): PlanTaskCompletionTransition {
  return { status: "awaiting_review", gate: "connector-pending", clearActiveTask: false };
}

/** Browser operator session ended — findings prove research value. */
export function transitionAfterBrowserComplete(
  findingsCount: number,
): PlanTaskCompletionTransition {
  if (findingsCount >= 1) {
    return { status: "done", clearActiveTask: true };
  }
  return { status: "awaiting_review", gate: "research-pending", clearActiveTask: false };
}

/** User applied a subset or all pending worktree patches. */
export function transitionAfterApply(
  appliedCount: number,
  remainingPatchCount: number,
): PlanTaskCompletionTransition {
  if (appliedCount <= 0) {
    return { status: "awaiting_apply", gate: "apply-pending", clearActiveTask: false };
  }
  if (remainingPatchCount > 0) {
    return { status: "partial", gate: "partial-apply", clearActiveTask: false };
  }
  return { status: "done", clearActiveTask: true };
}

export function isAwaitingCompletion(status?: PlanTaskStatus): boolean {
  return (
    status === "awaiting_apply" ||
    status === "awaiting_review" ||
    status === "partial"
  );
}

export function shouldReconcileArchiveToDone(status?: PlanTaskStatus): boolean {
  if (!status) return true;
  if (status === "skipped" || status === "done") return false;
  if (isAwaitingCompletion(status)) return false;
  return status === "running" || status === "pending" || status === "failed";
}

export interface AwaitingApplyTask {
  task: PlanTask;
  status: "awaiting_apply" | "partial";
  lastRunId?: string;
}

/** First plan task waiting on apply (lowest day wins). */
export function firstAwaitingApplyTask(
  plan: { taskGraph: PlanTask[] },
  byTaskId: Record<string, { status: PlanTaskStatus; lastRunId?: string }>,
): AwaitingApplyTask | null {
  const sorted = [...plan.taskGraph].sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  for (const task of sorted) {
    const row = byTaskId[task.id];
    const st = row?.status;
    if (st === "awaiting_apply" || st === "partial") {
      return { task, status: st, lastRunId: row?.lastRunId };
    }
  }
  return null;
}

export function firstAwaitingReviewTask(
  plan: { taskGraph: PlanTask[] },
  byTaskId: Record<string, { status: PlanTaskStatus }>,
): PlanTask | null {
  const sorted = [...plan.taskGraph].sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  for (const task of sorted) {
    if (byTaskId[task.id]?.status === "awaiting_review") return task;
  }
  return null;
}
