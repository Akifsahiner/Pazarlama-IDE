import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as projects from "../db/repos/projects.js";
import { persistenceEnabled } from "../db/client.js";
import { profileFromRepo } from "../ingest/repo.js";
import { profileFromUrl } from "../ingest/url.js";

const createBody = z.object({
  name: z.string().min(1),
  source: z.object({
    kind: z.enum(["folder", "repo", "url"]),
    ref: z.string().min(1),
  }),
  framework: z.string().optional(),
  productType: z.string().optional(),
  profileJson: z.unknown().optional(),
});

const updateBody = z.object({
  name: z.string().min(1).optional(),
  source: z.object({ kind: z.enum(["folder", "repo", "url"]), ref: z.string().min(1) }).optional(),
  framework: z.string().optional(),
  productType: z.string().optional(),
  profileJson: z.unknown().optional(),
});

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.get("/projects", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return { projects: await projects.list(user.id) };
  });

  app.post("/projects", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const { name, source, framework, productType, profileJson } = parsed.data;
    const created = await projects.create(user.id, {
      name,
      source_kind: source.kind,
      source_ref: source.ref,
      framework,
      product_type: productType,
      profile_json: profileJson,
    });
    if (!persistenceEnabled) {
      // No DB: echo a transient shape so the client flow still works.
      return reply.code(201).send({
        project: {
          id: "local",
          user_id: user.id,
          name,
          source_kind: source.kind,
          source_ref: source.ref,
          framework: framework ?? null,
          product_type: productType ?? null,
          profile_json: profileJson ?? {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
    return reply.code(201).send({ project: created });
  });

  app.patch("/projects/:id", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { id } = req.params as { id: string };
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const { name, source, framework, productType, profileJson } = parsed.data;
    const patch: projects.UpdateProjectPatch = {};
    if (name !== undefined) patch.name = name;
    if (source !== undefined) {
      patch.source_kind = source.kind;
      patch.source_ref = source.ref;
    }
    if (framework !== undefined) patch.framework = framework;
    if (productType !== undefined) patch.product_type = productType;
    if (profileJson !== undefined) patch.profile_json = profileJson;
    const updated = await projects.update(id, user.id, patch);
    if (persistenceEnabled && !updated) return reply.code(404).send({ error: "not_found" });
    return { project: updated };
  });

  app.delete("/projects/:id", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { id } = req.params as { id: string };
    await projects.remove(id, user.id);
    return reply.code(204).send();
  });

  app.post("/projects/:id/scan", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { id } = req.params as { id: string };
    const project = await projects.get(id, user.id);
    if (!project) return reply.code(404).send({ error: "not_found" });

    let profileJson: unknown;
    try {
      if (project.source_kind === "repo") {
        profileJson = await profileFromRepo(project.source_ref);
      } else if (project.source_kind === "url") {
        profileJson = await profileFromUrl(project.source_ref);
      } else {
        return reply.code(400).send({ error: "scan_not_supported", detail: "folder scans run on the desktop" });
      }
    } catch (err) {
      return reply.code(502).send({
        error: "scan_failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    const pj = profileJson as { framework?: string; productType?: string };
    const updated = await projects.update(id, user.id, {
      profile_json: profileJson,
      framework: pj.framework,
      product_type: pj.productType,
    });
    return { project: updated ?? { ...project, profile_json: profileJson } };
  });
}
