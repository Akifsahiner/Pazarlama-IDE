import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as assets from "../db/repos/assets.js";
import { persistenceEnabled } from "../db/client.js";

const applyBody = z.object({
  appliedCommit: z.string().optional(),
  appliedPath: z.string().optional(),
});

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  app.get("/assets", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { projectId } = req.query as { projectId?: string };
    return { assets: await assets.list(user.id, projectId) };
  });

  app.post("/assets/:id/apply", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { id } = req.params as { id: string };
    const parsed = applyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const { appliedCommit } = parsed.data;
    if (!persistenceEnabled) {
      return {
        asset: { id, applied_at: new Date().toISOString(), applied_commit: appliedCommit ?? null },
      };
    }
    const updated = await assets.markApplied(id, user.id, appliedCommit ?? "local-apply");
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { asset: updated };
  });
}
