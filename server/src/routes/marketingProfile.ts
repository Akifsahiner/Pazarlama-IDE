import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DEV_USER_ID, devAuthBypass } from "../auth/devBypass.js";
import * as repo from "../db/repos/marketingProfile.js";
import { manualKpiSchema } from "../schemas/marketingProfile.js";

const patchBody = z.object({
  patch: z.record(z.string(), z.unknown()),
});

const outcomeBody = z.object({
  outcome: z.enum(["pending", "success", "failure", "inconclusive"]),
  metric: z.object({ name: z.string(), value: z.number() }).optional(),
  learning: z.string().optional(),
  evidence_urls: z.array(z.string()).optional(),
});

const experimentBody = z.object({
  id: z.string(),
  date: z.string(),
  hypothesis: z.string(),
  discipline: z.string(),
  outcome: z.enum(["pending", "success", "failure", "inconclusive"]).default("pending"),
  metric: z.object({ name: z.string(), value: z.number() }).optional(),
  learning: z.string().optional(),
  evidence_urls: z.array(z.string()).optional(),
});

export async function marketingProfileRoutes(app: FastifyInstance): Promise<void> {
  function resolveUserId(req: { user?: { id: string } }): string | null {
    if (devAuthBypass()) return DEV_USER_ID;
    return req.user?.id ?? null;
  }

  app.get("/projects/:id/marketing-profile", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const projectId = (req.params as { id: string }).id;
    return repo.get(userId, projectId);
  });

  app.patch("/projects/:id/marketing-profile", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const parsed = patchBody.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "invalid_request" });
      return;
    }
    const projectId = (req.params as { id: string }).id;
    return repo.upsert(userId, projectId, parsed.data.patch);
  });

  app.post("/projects/:id/marketing-profile/experiments/:expId/outcome", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const parsed = outcomeBody.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "invalid_request" });
      return;
    }
    const { id: projectId, expId } = req.params as { id: string; expId: string };
    return repo.markExperimentOutcome(
      userId,
      projectId,
      expId,
      parsed.data.outcome,
      parsed.data.metric,
      parsed.data.learning,
      parsed.data.evidence_urls,
    );
  });

  app.post("/projects/:id/marketing-profile/experiments", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const parsed = experimentBody.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "invalid_request" });
      return;
    }
    const projectId = (req.params as { id: string }).id;
    return repo.recordExperiment(userId, projectId, parsed.data);
  });

  app.put("/projects/:id/marketing-profile/kpis/:kpiId", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const parsed = manualKpiSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "invalid_request" });
      return;
    }
    const { id: projectId, kpiId } = req.params as { id: string; kpiId: string };
    if (parsed.data.id !== kpiId) {
      reply.code(400).send({ error: "id_mismatch" });
      return;
    }
    return repo.upsertManualKpi(userId, projectId, parsed.data);
  });

  app.delete("/projects/:id/marketing-profile/kpis/:kpiId", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const { id: projectId, kpiId } = req.params as { id: string; kpiId: string };
    return repo.deleteManualKpi(userId, projectId, kpiId);
  });
}
