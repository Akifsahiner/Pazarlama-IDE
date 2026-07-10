import type { PlanTaskProgressRow, PlanTaskStatus } from "./planProgress";

const STATUS_RANK: Record<PlanTaskStatus, number> = {
  done: 9,
  partial: 8,
  awaiting_apply: 7,
  awaiting_review: 7,
  running: 6,
  failed: 5,
  skipped: 4,
  blocked: 3,
  pending: 2,
};

function rowTimestamp(row: PlanTaskProgressRow): number {
  const raw = row.updatedAt ?? row.completedAt ?? row.startedAt;
  return raw ? new Date(raw).getTime() : 0;
}

/** Last-write-wins per task; tie-break by status precedence. */
export function mergeProgressRows(
  local: PlanTaskProgressRow,
  server: PlanTaskProgressRow,
): PlanTaskProgressRow {
  const localTs = rowTimestamp(local);
  const serverTs = rowTimestamp(server);

  if (localTs > serverTs) return { ...local, updatedAt: local.updatedAt ?? new Date(localTs).toISOString() };
  if (serverTs > localTs) return { ...server, updatedAt: server.updatedAt ?? new Date(serverTs).toISOString() };

  const winner = STATUS_RANK[local.status] >= STATUS_RANK[server.status] ? local : server;
  return {
    ...winner,
    lastRunId: winner.lastRunId ?? local.lastRunId ?? server.lastRunId,
    playbookId: winner.playbookId ?? local.playbookId ?? server.playbookId,
    updatedAt: winner.updatedAt ?? local.updatedAt ?? server.updatedAt,
  };
}

export function mergeProgressMaps(
  base: Record<string, PlanTaskProgressRow>,
  overlay: Record<string, PlanTaskProgressRow>,
): Record<string, PlanTaskProgressRow> {
  const out = { ...base };
  for (const [taskId, row] of Object.entries(overlay)) {
    out[taskId] = out[taskId] ? mergeProgressRows(out[taskId], row) : row;
  }
  return out;
}
