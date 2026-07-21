/**
 * Part 10 — Task graph dependency reducer.
 */
import type { ExecutionInstance, ExecutionTaskStatus } from "./executionKernel";

const TERMINAL_FOR_DEPS: ExecutionTaskStatus[] = [
  "completed",
  "measuring",
  "cancelled",
];

export function isDepStatusSatisfied(status?: ExecutionTaskStatus): boolean {
  if (!status) return false;
  return TERMINAL_FOR_DEPS.includes(status);
}

/** True when all explicit depends_on predecessors are terminal. */
export function isTaskGraphReady(
  instances: Record<string, ExecutionInstance>,
  dependsOn: string[],
): boolean {
  if (dependsOn.length === 0) return true;
  return dependsOn.every((depId) => isDepStatusSatisfied(instances[depId]?.status));
}

/** Compute blocked_by cache for a task. */
export function computeBlockedBy(
  instances: Record<string, ExecutionInstance>,
  _taskId: string,
  dependsOn: string[],
): string[] {
  if (dependsOn.length === 0) return [];
  return dependsOn.filter((depId) => !isDepStatusSatisfied(instances[depId]?.status));
}

/** Recompute blocked_by for all instances. */
export function recomputeBlockedBy(
  instances: Record<string, ExecutionInstance>,
): Record<string, ExecutionInstance> {
  const next: Record<string, ExecutionInstance> = {};
  for (const [id, inst] of Object.entries(instances)) {
    const blocked = computeBlockedBy(instances, id, inst.depends_on);
    next[id] = { ...inst, blocked_by: blocked.length > 0 ? blocked : undefined };
  }
  return next;
}

/** Resolve proposed vs ready from graph state. */
export function resolveGraphStatus(
  instances: Record<string, ExecutionInstance>,
  inst: ExecutionInstance,
): ExecutionTaskStatus {
  if (
    inst.status === "cancelled" ||
    inst.status === "completed" ||
    inst.status === "measuring" ||
    inst.status === "failed" ||
    inst.status === "running" ||
    inst.status === "awaiting_approval" ||
    inst.status === "applied" ||
    inst.status === "verifying" ||
    inst.status === "paused"
  ) {
    return inst.status;
  }
  const ready = isTaskGraphReady(instances, inst.depends_on);
  return ready ? "ready" : "proposed";
}
