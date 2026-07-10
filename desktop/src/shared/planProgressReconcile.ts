import type { MarketingPlan, PlanTask } from "./types";
import type { PlanTaskProgressRow } from "./planProgress";

export interface ProgressReconcileResult {
  byTaskId: Record<string, PlanTaskProgressRow>;
  carried: number;
  remapped: number;
  dropped: number;
  initialized: number;
}

function progressMatchKey(task: Pick<PlanTask, "title" | "day" | "playbookId">): string {
  return `${task.title.trim().toLowerCase()}|${task.day}|${task.playbookId ?? ""}`;
}

/**
 * Carry task progress across a plan revision when task IDs may change.
 * - Same task id → keep status
 * - Removed id with matching title/day/playbook → remap to new id
 * - New tasks → pending
 * - Orphan rows (removed tasks with no match) are dropped from the snapshot
 */
export function reconcileProgressAfterPlanChange(
  beforePlan: MarketingPlan,
  afterPlan: MarketingPlan,
  prevByTaskId: Record<string, PlanTaskProgressRow>,
): ProgressReconcileResult {
  const afterIds = new Set(afterPlan.taskGraph.map((t) => t.id));
  const beforeIds = new Set(beforePlan.taskGraph.map((t) => t.id));

  const removedTasks = beforePlan.taskGraph.filter((t) => !afterIds.has(t.id));
  const fuzzyIndex = new Map<string, string>();
  for (const task of removedTasks) {
    const key = progressMatchKey(task);
    if (!fuzzyIndex.has(key)) fuzzyIndex.set(key, task.id);
  }
  const usedRemovedIds = new Set<string>();

  const byTaskId: Record<string, PlanTaskProgressRow> = {};
  let carried = 0;
  let remapped = 0;
  let initialized = 0;

  for (const task of afterPlan.taskGraph) {
    const direct = prevByTaskId[task.id];
    if (direct && beforeIds.has(task.id)) {
      byTaskId[task.id] = {
        ...direct,
        taskId: task.id,
        playbookId: task.playbookId ?? direct.playbookId,
      };
      carried += 1;
      continue;
    }

    const removedId = fuzzyIndex.get(progressMatchKey(task));
    if (removedId && !usedRemovedIds.has(removedId) && prevByTaskId[removedId]) {
      const row = prevByTaskId[removedId];
      byTaskId[task.id] = {
        ...row,
        taskId: task.id,
        playbookId: task.playbookId ?? row.playbookId,
      };
      usedRemovedIds.add(removedId);
      remapped += 1;
      continue;
    }

    byTaskId[task.id] = { taskId: task.id, status: "pending" };
    initialized += 1;
  }

  let dropped = 0;
  for (const taskId of Object.keys(prevByTaskId)) {
    if (afterIds.has(taskId)) continue;
    if (usedRemovedIds.has(taskId)) continue;
    dropped += 1;
  }

  return { byTaskId, carried, remapped, dropped, initialized };
}

/** Task ids that exist in the current plan graph (for server orphan pruning). */
export function validPlanTaskIds(plan: MarketingPlan): string[] {
  return plan.taskGraph.map((t) => t.id);
}
