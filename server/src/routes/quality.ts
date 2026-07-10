import type { FastifyInstance } from "fastify";
import * as feedbackRepo from "../db/repos/feedback.js";

export async function qualityRoutes(app: FastifyInstance): Promise<void> {
  app.get("/quality/summary", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const days = Number((req.query as { days?: string }).days ?? 30);
    const skills = await feedbackRepo.aggregateBySkill(user.id, Number.isFinite(days) ? days : 30);
    const totalUp = skills.reduce((n, s) => n + s.up, 0);
    const totalDown = skills.reduce((n, s) => n + s.down, 0);
    const total = totalUp + totalDown;
    return {
      windowDays: days,
      totals: {
        up: totalUp,
        down: totalDown,
        total,
        score: total > 0 ? Math.round((totalUp / total) * 100) : null,
      },
      bySkill: skills,
    };
  });
}
