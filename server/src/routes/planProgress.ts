import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as planProgress from "../db/repos/planProgress.js";
import * as plans from "../db/repos/plans.js";

const patchBody = z.object({
  planId: z.string().uuid(),
  taskId: z.string().min(1),
  status: z.enum(["pending", "running", "done", "failed", "skipped", "blocked"]),
  lastRunId: z.string().uuid().optional(),
  note: z.string().optional(),
  playbookId: z.string().optional(),
});

export async function planProgressRoutes(app: FastifyInstance): Promise<void> {
  app.get("/projects/:projectId/plan-progress", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { projectId } = req.params as { projectId: string };
    const { planId } = req.query as { planId?: string };
    if (!planId) return reply.code(400).send({ error: "planId required" });

    const planRows = await plans.list(user.id, projectId);
    if (!planRows.some((p) => p.id === planId)) {
      return reply.code(404).send({ error: "plan not found" });
    }

    const rows = await planProgress.listByPlan(user.id, planId);
    return {
      planId,
      rows: rows.map((r) => ({
        taskId: r.task_id,
        status: r.status,
        lastRunId: r.last_run_id ?? undefined,
        startedAt: r.started_at ?? undefined,
        completedAt: r.completed_at ?? undefined,
        note: r.note ?? undefined,
        playbookId: r.playbook_id ?? undefined,
        updatedAt: r.updated_at,
      })),
    };
  });

  app.patch("/projects/:projectId/plan-progress", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { projectId } = req.params as { projectId: string };
    const parsed = patchBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

    const now = new Date().toISOString();
    const row = await planProgress.upsert(user.id, {
      projectId,
      planId: parsed.data.planId,
      taskId: parsed.data.taskId,
      status: parsed.data.status,
      lastRunId: parsed.data.lastRunId,
      note: parsed.data.note,
      playbookId: parsed.data.playbookId,
      startedAt: parsed.data.status === "running" ? now : undefined,
      completedAt: parsed.data.status === "done" ? now : undefined,
    });
    return { ok: true, row };
  });

  app.post("/projects/:projectId/plan-progress/reconcile", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { projectId } = req.params as { projectId: string };
    const { planId, validTaskIds } = req.body as { planId?: string; validTaskIds?: string[] };
    if (!planId) return reply.code(400).send({ error: "planId required" });

    let updated = await planProgress.reconcileFromRuns(user.id, projectId, planId);
    if (validTaskIds?.length) {
      updated += await planProgress.pruneOrphanTasks(user.id, planId, validTaskIds);
    }
    const rows = await planProgress.listByPlan(user.id, planId);
    return {
      updated,
      rows: rows.map((r) => ({
        taskId: r.task_id,
        status: r.status,
        lastRunId: r.last_run_id ?? undefined,
        completedAt: r.completed_at ?? undefined,
        playbookId: r.playbook_id ?? undefined,
        updatedAt: r.updated_at,
      })),
    };
  });
}
