import { eq, persistenceEnabled, sb } from "../client.js";

export type PlanTaskStatusRow =
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
  id: string;
  user_id: string;
  project_id: string;
  plan_id: string;
  task_id: string;
  playbook_id: string | null;
  status: PlanTaskStatusRow;
  last_run_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  note: string | null;
  updated_at: string;
}

export interface UpsertProgressInput {
  projectId: string;
  planId: string;
  taskId: string;
  status: PlanTaskStatusRow;
  lastRunId?: string;
  note?: string;
  playbookId?: string;
  startedAt?: string;
  completedAt?: string;
}

export async function listByPlan(
  userId: string,
  planId: string,
): Promise<PlanTaskProgressRow[]> {
  if (!persistenceEnabled) return [];
  return (
    (await sb<PlanTaskProgressRow[]>(
      `/plan_task_progress?user_id=${eq(userId)}&plan_id=${eq(planId)}`,
    )) ?? []
  );
}

export async function upsert(
  userId: string,
  input: UpsertProgressInput,
): Promise<PlanTaskProgressRow | null> {
  if (!persistenceEnabled) return null;

  const existing = await sb<PlanTaskProgressRow[]>(
    `/plan_task_progress?user_id=${eq(userId)}&plan_id=${eq(input.planId)}&task_id=${eq(input.taskId)}&limit=1`,
  );
  const now = new Date().toISOString();
  const body = {
    user_id: userId,
    project_id: input.projectId,
    plan_id: input.planId,
    task_id: input.taskId,
    playbook_id: input.playbookId ?? null,
    status: input.status,
    last_run_id: input.lastRunId ?? null,
    note: input.note ?? null,
    started_at: input.startedAt ?? null,
    completed_at: input.completedAt ?? null,
    updated_at: now,
  };

  if (existing?.[0]) {
    const rows = await sb<PlanTaskProgressRow[]>(
      `/plan_task_progress?id=${eq(existing[0].id)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return rows?.[0] ?? null;
  }

  const rows = await sb<PlanTaskProgressRow[]>("/plan_task_progress", {
    method: "POST",
    body: JSON.stringify([body]),
  });
  return rows?.[0] ?? null;
}

/** Mark progress rows whose tasks no longer exist on the plan graph (post-revision cleanup). */
export async function pruneOrphanTasks(
  userId: string,
  planId: string,
  validTaskIds: string[],
): Promise<number> {
  if (!persistenceEnabled) return 0;
  const valid = new Set(validTaskIds);
  const existing = await listByPlan(userId, planId);
  let pruned = 0;
  for (const row of existing) {
    if (valid.has(row.task_id)) continue;
    await sb<PlanTaskProgressRow[]>(`/plan_task_progress?id=${eq(row.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "skipped",
        note: "orphaned_after_plan_revision",
        updated_at: new Date().toISOString(),
      }),
    });
    pruned += 1;
  }
  return pruned;
}

export async function reconcileFromRuns(
  userId: string,
  projectId: string,
  planId: string,
): Promise<number> {
  if (!persistenceEnabled) return 0;

  const runs =
    (await sb<{ id: string; plan_task_id: string | null; status: string }[]>(
      `/runs?user_id=${eq(userId)}&project_id=${eq(projectId)}&status=${eq("completed")}&select=id,plan_task_id,status`,
    )) ?? [];

  let updated = 0;
  const existing = await listByPlan(userId, planId);
  const byTask = new Map(existing.map((r) => [r.task_id, r]));

  for (const run of runs) {
    if (!run.plan_task_id) continue;
    const cur = byTask.get(run.plan_task_id);
    if (
      cur &&
      (cur.status === "skipped" ||
        cur.status === "done" ||
        cur.status === "awaiting_apply" ||
        cur.status === "awaiting_review" ||
        cur.status === "partial")
    ) {
      continue;
    }
    await upsert(userId, {
      projectId,
      planId,
      taskId: run.plan_task_id,
      status: "done",
      lastRunId: run.id,
      completedAt: new Date().toISOString(),
    });
    updated += 1;
  }
  return updated;
}
