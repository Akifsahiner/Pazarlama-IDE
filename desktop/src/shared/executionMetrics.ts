/**
 * Local execution metrics rollup for Quick Start wedge (privacy-first).
 */
export type ExecutionMetricEvent =
  | "quick_start_begin"
  | "run_started"
  | "run_completed"
  | "preview_ready"
  | "apply_completed"
  | "first_ship";

export interface ExecutionMetricRow {
  event: ExecutionMetricEvent;
  at: number;
  runId?: string;
  durationMs?: number;
  patchCount?: number;
  success?: boolean;
}

export interface ExecutionMetricsRollup {
  projectId: string;
  projectOpenedAt?: number;
  rows: ExecutionMetricRow[];
  firstShipAt?: number;
}

const MAX_ROWS = 200;

export function appendExecutionMetric(
  rollup: ExecutionMetricsRollup,
  row: Omit<ExecutionMetricRow, "at"> & { at?: number },
): ExecutionMetricsRollup {
  const next: ExecutionMetricRow = { ...row, at: row.at ?? Date.now() };
  const rows = [...rollup.rows, next].slice(-MAX_ROWS);
  let firstShipAt = rollup.firstShipAt;
  if (row.event === "first_ship") firstShipAt = next.at;
  return { ...rollup, rows, firstShipAt };
}

export function computeFstMs(rollup: ExecutionMetricsRollup): number | undefined {
  if (!rollup.projectOpenedAt || !rollup.firstShipAt) return undefined;
  return rollup.firstShipAt - rollup.projectOpenedAt;
}

export function computeRunSuccessRate(rollup: ExecutionMetricsRollup): number | undefined {
  const completed = rollup.rows.filter((r) => r.event === "run_completed");
  if (completed.length === 0) return undefined;
  const ok = completed.filter((r) => r.success !== false && (r.patchCount ?? 0) > 0).length;
  return Math.round((ok / completed.length) * 100);
}

export function computeApplyRate(rollup: ExecutionMetricsRollup): number | undefined {
  const runs = rollup.rows.filter((r) => r.event === "run_completed" && (r.patchCount ?? 0) > 0);
  if (runs.length === 0) return undefined;
  const applies = rollup.rows.filter((r) => r.event === "apply_completed").length;
  return Math.min(100, Math.round((applies / runs.length) * 100));
}

export function timeToPreviewMs(rollup: ExecutionMetricsRollup): number | undefined {
  const run = [...rollup.rows].reverse().find((r) => r.event === "run_started");
  const preview = [...rollup.rows].reverse().find((r) => r.event === "preview_ready");
  if (!run || !preview) return undefined;
  return preview.at - run.at;
}
