import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as sessions from "../db/repos/sessions.js";
import * as messages from "../db/repos/messages.js";
import { persistenceEnabled } from "../db/client.js";

const createBody = z.object({
  projectId: z.string().min(1),
  title: z.string().optional(),
});

const updateBody = z.object({ title: z.string().min(1) });

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/sessions", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { projectId } = req.query as { projectId?: string };
    return { sessions: await sessions.list(user.id, projectId) };
  });

  app.post("/sessions", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const created = await sessions.create(user.id, parsed.data.projectId, parsed.data.title);
    if (!persistenceEnabled) {
      return reply.code(201).send({
        session: {
          id: "local",
          project_id: parsed.data.projectId,
          user_id: user.id,
          title: parsed.data.title ?? "New session",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
    return reply.code(201).send({ session: created });
  });

  app.patch("/sessions/:id", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { id } = req.params as { id: string };
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const updated = await sessions.update(id, user.id, parsed.data.title);
    if (persistenceEnabled && !updated) return reply.code(404).send({ error: "not_found" });
    return { session: updated };
  });

  app.delete("/sessions/:id", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { id } = req.params as { id: string };
    await sessions.remove(id, user.id);
    return reply.code(204).send();
  });

  app.get("/sessions/:id/messages", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { id } = req.params as { id: string };
    if (persistenceEnabled) {
      // Verify ownership before exposing messages.
      const session = await sessions.get(id, user.id);
      if (!session) return reply.code(404).send({ error: "not_found" });
    }
    return { messages: await messages.list(id) };
  });
}
