import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as teamRepo from "../db/repos/team.js";
import { assertTierFeature } from "../middleware/tierGate.js";
import { sendMeteringError } from "../middleware/meteringErrors.js";
import { buildSessionReportHtml } from "../reports/sessionReportHtml.js";

const shareBody = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  reportMd: z.string().min(1),
  ttlDays: z.number().int().positive().max(90).optional(),
});

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.post("/reports/share", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    try {
      await assertTierFeature(user.id, "client_reports");
    } catch (err) {
      if (sendMeteringError(reply, err)) return;
      throw err;
    }
    const parsed = shareBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const share = await teamRepo.createReportShare({
      projectId: parsed.data.projectId,
      userId: user.id,
      title: parsed.data.title,
      reportMd: parsed.data.reportMd,
      ttlDays: parsed.data.ttlDays,
    });
    if (!share) return reply.code(500).send({ error: "share_failed" });
    return {
      share: {
        id: share.id,
        token: share.token,
        expiresAt: share.expires_at,
        urlPath: `/reports/shared/${share.token}`,
      },
    };
  });

  /** Public read-only client report — no auth. */
  app.get("/reports/shared/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const share = await teamRepo.getReportShareByToken(token);
    if (!share) return reply.code(404).send({ error: "not_found_or_expired" });
    const html = buildSessionReportHtml(share.report_md, share.title);
    reply.type("text/html").send(html);
  });
}
