import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as feedbackRepo from "../db/repos/feedback.js";

const feedbackBody = z.object({
  projectId: z.string().optional(),
  targetKind: z.enum(["decision", "draft", "run", "plan_task"]),
  targetId: z.string().min(1),
  rating: z.union([z.literal(-1), z.literal(1)]),
  comment: z.string().max(2000).optional(),
  skillId: z.string().optional(),
  discipline: z.string().optional(),
});

export async function feedbackRoutes(app: FastifyInstance): Promise<void> {
  app.post("/feedback", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const parsed = feedbackBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const row = await feedbackRepo.insert(user.id, {
      projectId: parsed.data.projectId,
      targetKind: parsed.data.targetKind,
      targetId: parsed.data.targetId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      skillId: parsed.data.skillId,
      discipline: parsed.data.discipline,
    });
    return { ok: true, feedback: row };
  });
}
