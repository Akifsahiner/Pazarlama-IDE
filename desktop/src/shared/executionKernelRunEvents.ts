/**
 * Part 10 — Map kernel lifecycle events to RunEvent bus payloads (ADR-4 extend).
 */
import type { ExecutionKernelEvent, ExecutionInstance } from "./executionKernel";
import type { RunEvent, RunEventType } from "./types";

const KERNEL_TO_RUN: Record<ExecutionKernelEvent["type"], RunEventType> = {
  dispatched: "task.dispatched",
  status_changed: "task.status_changed",
  proof_submitted: "task.proof_submitted",
  partial_applied: "task.partial_applied",
  retry_scheduled: "task.retry_scheduled",
  paused: "task.paused",
  resumed: "task.resumed",
  cancelled: "task.cancelled",
};

export function kernelEventToRunEventType(type: ExecutionKernelEvent["type"]): RunEventType {
  return KERNEL_TO_RUN[type];
}

export function buildTaskRunEvent(input: {
  kernelEvent: ExecutionKernelEvent;
  instance: ExecutionInstance;
  runId?: string;
  seq: number;
}): RunEvent {
  const { kernelEvent, instance, runId, seq } = input;
  const correlationRunId = runId ?? instance.run_id ?? `task-${instance.id}`;
  return {
    id: `task-ev-${kernelEvent.id}`,
    runId: correlationRunId,
    seq,
    timestamp: kernelEvent.at,
    type: kernelEventToRunEventType(kernelEvent.type),
    status:
      instance.status === "failed"
        ? "failed"
        : instance.status === "completed" || instance.status === "measuring"
          ? "success"
          : "running",
    title: `Task ${kernelEvent.type.replace(/_/g, " ")}`,
    summary: kernelEvent.detail ?? `${instance.execution_mode} → ${kernelEvent.status}`,
    payload: {
      taskId: kernelEvent.task_id,
      execution_mode: instance.execution_mode,
      status: kernelEvent.status,
      attempt: kernelEvent.attempt,
      idempotency_key: instance.idempotency_key,
      provenance: kernelEvent.provenance,
      scope: instance.scope,
    },
  };
}

/** Latest kernel ring event for a task (read-only replay slice). */
export function sliceKernelEventsForTask(
  events: ExecutionKernelEvent[],
  taskId: string,
): ExecutionKernelEvent[] {
  return events.filter((e) => e.task_id === taskId);
}
