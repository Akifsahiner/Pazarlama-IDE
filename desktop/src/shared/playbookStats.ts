import type { MarketingPlanSuite } from "./planPlaybooks";
import type { PlanTaskProgressRow } from "./planProgress";

export interface PlaybookRollupStats {
  started: number;
  completed: number;
  inProgress: number;
  total: number;
  taskDone: number;
  taskTotal: number;
}

export function computePlaybookRollupStats(
  plan: MarketingPlanSuite,
  byTaskId: Record<string, PlanTaskProgressRow>,
): PlaybookRollupStats {
  let started = 0;
  let completed = 0;
  let inProgress = 0;
  let taskDone = 0;
  let taskTotal = 0;

  for (const pb of plan.playbooks) {
    const tasks = pb.tasks;
    taskTotal += tasks.length;
    let pbDone = 0;
    let pbStarted = false;
    let pbAllTerminal = tasks.length > 0;

    for (const t of tasks) {
      const st = byTaskId[t.id]?.status ?? "pending";
      if (st === "done") {
        pbDone += 1;
        taskDone += 1;
      }
      if (st !== "pending" && st !== "blocked") pbStarted = true;
      if (st !== "done" && st !== "skipped") pbAllTerminal = false;
    }

    if (pbStarted) started += 1;
    if (pbAllTerminal && tasks.length > 0) completed += 1;
    else if (pbStarted && !pbAllTerminal) inProgress += 1;
  }

  return {
    started,
    completed,
    inProgress,
    total: plan.playbooks.length,
    taskDone,
    taskTotal,
  };
}

export function formatPlaybookRollupLabel(stats: PlaybookRollupStats): string {
  return `${stats.inProgress}/${stats.total} in progress · ${stats.taskDone}/${stats.taskTotal} tasks`;
}
