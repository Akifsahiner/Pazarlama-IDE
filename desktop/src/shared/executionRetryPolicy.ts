/**
 * Part 10 — Retry policy and attempt ledger.
 */
import type { ExecutionInstance, ExecutionTaskStatus } from "./executionKernel";

export const MAX_EXECUTION_ATTEMPTS = 3;

const RETRY_ELIGIBLE: ExecutionTaskStatus[] = ["failed"];

export function canRetryExecution(inst: ExecutionInstance | undefined): boolean {
  if (!inst) return false;
  if (!RETRY_ELIGIBLE.includes(inst.status)) return false;
  return inst.attempt < MAX_EXECUTION_ATTEMPTS;
}

export function buildIdempotencyKey(projectId: string, taskId: string, attempt: number): string {
  return `${projectId}:${taskId}:${attempt}`;
}

export function buildRunIdempotencyKey(idempotencyKey: string): string {
  return `${idempotencyKey}:run`;
}

export function buildExportIdempotencyKey(idempotencyKey: string): string {
  return `${idempotencyKey}:export`;
}

export function buildAssetIdempotencyKey(taskId: string): string {
  return `${taskId}:asset:v1`;
}

/** Retry clears run/proof but preserves attempt root and frozen assets. */
export function nextAttemptState(inst: ExecutionInstance): Pick<
  ExecutionInstance,
  "attempt" | "status" | "run_id" | "proof" | "partial" | "last_error" | "paused_at"
> {
  const attempt = inst.attempt + 1;
  return {
    attempt,
    status: "ready",
    run_id: undefined,
    proof: undefined,
    partial: undefined,
    last_error: undefined,
    paused_at: undefined,
  };
}
