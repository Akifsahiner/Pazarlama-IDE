import type { MarketingPlan, PlanTask } from "./types";
import { LEGACY_PLAYBOOK_ID } from "./planPlaybooks";
import { isAwaitingCompletion, shouldReconcileArchiveToDone } from "./planTaskCompletion";

export type PlanTaskStatus =
  | "pending"
  | "running"
  | "awaiting_apply"
  | "awaiting_review"
  | "partial"
  | "done"
  | "failed"
  | "skipped"
  | "blocked";

export interface PlanTaskProgressRow {
  taskId: string;
  status: PlanTaskStatus;
  lastRunId?: string;
  startedAt?: string;
  completedAt?: string;
  note?: string;
  playbookId?: string;
  updatedAt?: string;
}

export interface PlanProgressComputed {
  done: number;
  /** Tasks in a terminal state (done or skipped). */
  terminal: number;
  total: number;
  failed: number;
  skipped: number;
  running: number;
  /** Tasks waiting on apply, review confirm, or partial closure. */
  awaiting: number;
  weekDone: Record<number, number>;
  weekTotal: Record<number, number>;
  playbookDone: Record<string, number>;
  byPlaybookId: Record<string, { done: number; total: number }>;
}

export interface PlanProgressSnapshot {
  planId: string;
  byTaskId: Record<string, PlanTaskProgressRow>;
  computed: PlanProgressComputed;
  /** ISO timestamp when the first task entered running/done — anchors the timeline "Today" marker. */
  launchAnchorAt?: string;
}

/** Dependency satisfied when predecessor finished or was explicitly skipped. */
export function isDepSatisfied(st?: PlanTaskStatus): boolean {
  return st === "done" || st === "skipped";
}

/** Task reached a terminal outcome (done or skipped). */
export function isTaskTerminal(st?: PlanTaskStatus): boolean {
  return isDepSatisfied(st);
}

export function weekForDay(day: number, maxWeeks = 4): number {
  return Math.min(maxWeeks, Math.max(1, Math.ceil(day / 7)));
}

export function computePlanProgress(
  plan: MarketingPlan,
  byTaskId: Record<string, PlanTaskProgressRow>,
): PlanProgressComputed {
  const weekDone: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const weekTotal: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const playbookDone: Record<string, number> = {};
  const byPlaybookId: Record<string, { done: number; total: number }> = {};
  let done = 0;
  let terminal = 0;
  let failed = 0;
  let skipped = 0;
  let running = 0;
  let awaiting = 0;

  for (const task of plan.taskGraph) {
    const w = weekForDay(task.day);
    weekTotal[w] = (weekTotal[w] ?? 0) + 1;
    const st = byTaskId[task.id]?.status ?? "pending";
    if (st === "done") {
      done += 1;
      terminal += 1;
      weekDone[w] = (weekDone[w] ?? 0) + 1;
    } else if (st === "skipped") {
      skipped += 1;
      terminal += 1;
      weekDone[w] = (weekDone[w] ?? 0) + 1;
    } else if (st === "failed") failed += 1;
    else if (st === "running") running += 1;
    else if (isAwaitingCompletion(st)) awaiting += 1;

    const pbId = task.playbookId ?? LEGACY_PLAYBOOK_ID;
    if (!byPlaybookId[pbId]) byPlaybookId[pbId] = { done: 0, total: 0 };
    byPlaybookId[pbId].total += 1;
    if (isTaskTerminal(st)) playbookDone[pbId] = (playbookDone[pbId] ?? 0) + 1;
  }

  for (const [pbId, counts] of Object.entries(byPlaybookId)) {
    byPlaybookId[pbId] = { ...counts, done: playbookDone[pbId] ?? 0 };
  }

  return {
    done,
    terminal,
    total: plan.taskGraph.length,
    failed,
    skipped,
    running,
    awaiting,
    weekDone,
    weekTotal,
    playbookDone,
    byPlaybookId,
  };
}

export function emptyProgressSnapshot(plan: MarketingPlan): PlanProgressSnapshot {
  const byTaskId: Record<string, PlanTaskProgressRow> = {};
  for (const t of plan.taskGraph) {
    byTaskId[t.id] = { taskId: t.id, status: "pending" };
  }
  return {
    planId: plan.id,
    byTaskId,
    computed: computePlanProgress(plan, byTaskId),
  };
}

export function taskStatusFromSnapshot(
  snapshot: PlanProgressSnapshot | null,
  taskId: string,
): PlanTaskStatus {
  return snapshot?.byTaskId[taskId]?.status ?? "pending";
}

/** First non-done task on a plan day with satisfied dependencies (NL "day 3" / "gün 3"). */
export function firstActionableTaskOnDay(
  plan: MarketingPlan,
  byTaskId: Record<string, PlanTaskProgressRow>,
  day: number,
): PlanTask | null {
  const onDay = [...plan.taskGraph]
    .filter((t) => t.day === day)
    .sort((a, b) => a.title.localeCompare(b.title));
  for (const task of onDay) {
    const st = byTaskId[task.id]?.status ?? "pending";
    if (st === "done" || st === "skipped") continue;
    if (isTaskBlocked(task, byTaskId)) continue;
    return task;
  }
  return null;
}

/** First pending task with satisfied dependencies. */
export function nextActionableTask(
  plan: MarketingPlan,
  byTaskId: Record<string, PlanTaskProgressRow>,
): PlanTask | null {
  const sorted = [...plan.taskGraph].sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  for (const task of sorted) {
    const st = byTaskId[task.id]?.status ?? "pending";
    if (st !== "pending") continue;
    const blocked = task.dependsOn.some(
      (dep) => !isDepSatisfied(byTaskId[dep]?.status),
    );
    if (blocked) continue;
    return task;
  }
  return null;
}

export function isTaskBlocked(
  task: PlanTask,
  byTaskId: Record<string, PlanTaskProgressRow>,
): boolean {
  if (!task.dependsOn.length) return false;
  return task.dependsOn.some((dep) => !isDepSatisfied(byTaskId[dep]?.status));
}

export function mergeReconciledRuns(
  plan: MarketingPlan,
  byTaskId: Record<string, PlanTaskProgressRow>,
  completedTaskIds: string[],
  runIdByTask: Record<string, string>,
): Record<string, PlanTaskProgressRow> {
  const next = { ...byTaskId };
  for (const taskId of completedTaskIds) {
    if (!plan.taskGraph.some((t) => t.id === taskId)) continue;
    const cur = next[taskId]?.status ?? "pending";
    if (!shouldReconcileArchiveToDone(cur)) continue;
    if (cur === "running" || cur === "pending" || cur === "failed") {
      next[taskId] = {
        taskId,
        status: "done",
        lastRunId: runIdByTask[taskId] ?? next[taskId]?.lastRunId,
        completedAt: new Date().toISOString(),
      };
    }
  }
  return next;
}

/** Legacy RAM map compatibility during migration. */
export function legacyMapFromSnapshot(
  snapshot: PlanProgressSnapshot | null,
): Record<string, "running" | "done" | "failed"> {
  if (!snapshot) return {};
  const out: Record<string, "running" | "done" | "failed"> = {};
  for (const [id, row] of Object.entries(snapshot.byTaskId)) {
    if (
      row.status === "running" ||
      row.status === "done" ||
      row.status === "failed" ||
      row.status === "awaiting_apply" ||
      row.status === "awaiting_review" ||
      row.status === "partial"
    ) {
      out[id] =
        row.status === "awaiting_apply" ||
        row.status === "awaiting_review" ||
        row.status === "partial"
          ? "running"
          : row.status;
    }
  }
  return out;
}
