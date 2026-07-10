import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { PlanStreamEvent } from "../schemas/index.js";
import { marketingPlanSuiteSchema } from "../schemas/planPlaybooks.js";
import { startSSE } from "../sse.js";
import { persistenceEnabled } from "../db/client.js";
import { assertTierAndQuota } from "../middleware/tierGate.js";
import { sendMeteringError } from "../middleware/meteringErrors.js";
import { classifyError } from "../llm/errors.js";
import * as plans from "../db/repos/plans.js";
import * as usage from "../db/repos/usage.js";
import { revisePlanSuite } from "../brain/planSuite.js";

const reviseBody = z.object({
  instruction: z.string().min(3),
  currentPlan: marketingPlanSuiteSchema,
  sourcePlanRowId: z.string().optional(),
  persona: z.enum(["marketing", "sales"]).optional(),
});

export async function planListRoutes(app: FastifyInstance): Promise<void> {
  app.get("/plans", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { projectId } = req.query as { projectId?: string };
    const rows = await plans.list(user.id, projectId);
    return { plans: rows, latest: rows[0] ?? null };
  });

  /** Chat / UI plan revision — SSE stream, append-only version (Faz 11). Anthropic only. */
  app.patch("/projects/:projectId/plans/revise", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });

    const parsed = reviseBody.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
      return;
    }

    try {
      await assertTierAndQuota(user.id, "plan");
    } catch (err) {
      if (sendMeteringError(reply, err)) return;
      throw err;
    }

    const { projectId } = req.params as { projectId: string };
    const { instruction, currentPlan, persona } = parsed.data;
    const sse = startSSE(reply);
    const emit = (e: PlanStreamEvent) => sse.send(e);

    try {
      const result = await revisePlanSuite({
        currentPlan,
        instruction,
        persona,
        emit,
        signal: sse.signal,
      });
      if (sse.closed()) return;
      emit({ type: "done" });

      if (persistenceEnabled) {
        try {
          await plans.insert(user.id, projectId, result.plan);
          await usage.insert(user.id, { kind: "plan" });
        } catch (persistErr) {
          app.log.warn({ err: persistErr }, "failed to persist revised plan");
        }
      }
    } catch (err) {
      if (sse.closed() || sse.signal.aborted) return;
      const { code, message } = classifyError(err);
      emit({ type: "error", message, code });
    } finally {
      sse.end();
    }
  });
}
