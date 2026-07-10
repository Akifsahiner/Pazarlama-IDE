import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as teamRepo from "../db/repos/team.js";
import { assertTierFeature } from "../middleware/tierGate.js";
import { sendMeteringError } from "../middleware/meteringErrors.js";

export async function teamRoutes(app: FastifyInstance): Promise<void> {
  app.get("/team/org", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    try {
      await assertTierFeature(user.id, "team_collab");
    } catch (err) {
      if (sendMeteringError(reply, err)) return;
      throw err;
    }
    const org = await teamRepo.getOrCreateOrg(user.id, "My team");
    if (!org) return reply.code(500).send({ error: "org_create_failed" });
    const members = await teamRepo.listOrgMembers(org.id);
    return { org, members };
  });

  app.get("/team/approvals", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    try {
      await assertTierFeature(user.id, "team_collab");
    } catch (err) {
      if (sendMeteringError(reply, err)) return;
      throw err;
    }
    const projectId = (req.query as { projectId?: string }).projectId;
    const pending = await teamRepo.listPendingApprovals(user.id, projectId);
    return { approvals: pending };
  });

  const approvalBody = z.object({
    projectId: z.string(),
    reviewerId: z.string().optional(),
    runId: z.string().optional(),
    planTaskId: z.string().optional(),
    goal: z.string().min(3),
  });

  app.post("/team/approvals", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    try {
      await assertTierFeature(user.id, "team_collab");
    } catch (err) {
      if (sendMeteringError(reply, err)) return;
      throw err;
    }
    const parsed = approvalBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const row = await teamRepo.createApprovalRequest({
      projectId: parsed.data.projectId,
      requestedBy: user.id,
      reviewerId: parsed.data.reviewerId,
      runId: parsed.data.runId,
      planTaskId: parsed.data.planTaskId,
      goal: parsed.data.goal,
    });
    return { approval: row };
  });

  app.patch("/team/approvals/:id", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const { id } = req.params as { id: string };
    const body = z
      .object({
        status: z.enum(["approved", "rejected"]),
        note: z.string().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_request" });
    const row = await teamRepo.resolveApproval(id, user.id, body.data.status, body.data.note);
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { approval: row };
  });

  app.post("/team/project-members", async (req, reply) => {
    const user = req.user;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    try {
      await assertTierFeature(user.id, "team_collab");
    } catch (err) {
      if (sendMeteringError(reply, err)) return;
      throw err;
    }
    const body = z
      .object({
        projectId: z.string(),
        memberUserId: z.string(),
        role: z.enum(["editor", "approver", "viewer"]),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_request" });
    const row = await teamRepo.addProjectMember(
      body.data.projectId,
      body.data.memberUserId,
      body.data.role,
    );
    return { member: row };
  });
}
