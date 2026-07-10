import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as runs from "../db/repos/runs.js";

const runKindSchema = z.enum(["edit", "browse", "ask"]);

const createBody = z.object({
  projectId: z.string().optional(),
  goal: z.string().min(1),
  kind: runKindSchema.optional(),
  localRunId: z.string().optional(),
  sessionId: z.string().optional(),
  planTaskId: z.string().optional(),
});

const listQuery = z.object({
  projectId: z.string().optional(),
  kind: runKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  before: z.string().optional(),
});

const updateBody = z.object({
  status: z.string().optional(),
  lastSeq: z.number().int().optional(),
  summaryJson: z
    .object({
      filesChanged: z.number().optional(),
      findingsCount: z.number().optional(),
      durationMs: z.number().optional(),
      intentPreview: z.string().optional(),
      browserSteps: z.number().optional(),
      planTaskId: z.string().optional(),
    })
    .optional(),
});

const eventsBody = z.object({
  events: z.array(
    z.object({
      seq: z.number().int(),
      stepId: z.string().optional(),
      type: z.string().min(1),
      status: z.string().optional(),
      title: z.string().min(1),
      summary: z.string().optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

export async function runRoutes(app: FastifyInstance): Promise<void> {
  app.get("/runs", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const rows = await runs.listRuns(user.id, {
      projectId: parsed.data.projectId,
      kind: parsed.data.kind,
      limit: parsed.data.limit,
      before: parsed.data.before,
    });
    return { runs: rows };
  });

  app.post("/runs", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const run = await runs.createRun(user.id, {
      projectId: parsed.data.projectId,
      goal: parsed.data.goal,
      kind: parsed.data.kind,
      localRunId: parsed.data.localRunId,
      sessionId: parsed.data.sessionId,
      planTaskId: parsed.data.planTaskId,
    });
    return reply.code(201).send({ run });
  });

  app.get("/runs/:id", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const { id } = req.params as { id: string };
    const run = await runs.getRun(user.id, id);
    if (!run) return reply.code(404).send({ error: "not_found" });
    let summary = run.summary_json ?? {};
    if (!summary.filesChanged && summary.filesChanged !== 0) {
      summary = { ...summary, ...(await runs.aggregateRunSummary(user.id, id)) };
    }
    return { run: { ...run, summary_json: summary } };
  });

  app.patch("/runs/:id", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const patch: runs.UpdateRunPatch = {};
    if (parsed.data.status !== undefined) patch.status = parsed.data.status;
    if (parsed.data.lastSeq !== undefined) patch.last_seq = parsed.data.lastSeq;
    if (parsed.data.summaryJson !== undefined) patch.summary_json = parsed.data.summaryJson;
    await runs.updateRun(user.id, id, patch);
    return reply.code(204).send();
  });

  app.post("/runs/:id/events", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = eventsBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    await runs.insertEvents(user.id, id, parsed.data.events);
    const maxSeq = parsed.data.events.reduce((m, e) => Math.max(m, e.seq), 0);
    if (maxSeq > 0) {
      await runs.updateRun(user.id, id, { last_seq: maxSeq });
    }
    return reply.code(204).send();
  });

  app.get("/runs/:id/events", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const { id } = req.params as { id: string };
    const { afterSeq } = req.query as { afterSeq?: string };
    const after = afterSeq !== undefined ? Number(afterSeq) : 0;
    const events = await runs.listEvents(user.id, id, Number.isFinite(after) ? after : 0);
    return { events };
  });
}
