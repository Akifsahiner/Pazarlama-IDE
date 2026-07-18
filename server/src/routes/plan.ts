import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  projectProfileSchema,
  type PlanStreamEvent,
  type ProjectProfile,
} from "../schemas/index.js";
import { startSSE } from "../sse.js";
import { persistenceEnabled } from "../db/client.js";
import { assertTierAndQuota } from "../middleware/tierGate.js";
import { sendMeteringError } from "../middleware/meteringErrors.js";
import { classifyError } from "../llm/errors.js";
import * as projects from "../db/repos/projects.js";
import * as plans from "../db/repos/plans.js";
import * as usage from "../db/repos/usage.js";
import * as marketingProfiles from "../db/repos/marketingProfile.js";
import { generatePlanSuite } from "../brain/planSuite.js";
import { estimateCostCents } from "../billing/pricing.js";
import { env } from "../env.js";

const planBody = z.object({
  projectId: z.string().optional(),
  profile: projectProfileSchema.optional(),
  provider: z.enum(["anthropic", "openai"]).optional(),
  persona: z.enum(["marketing", "sales"]).optional(),
  planHorizon: z.union([z.literal(14), z.literal(30)]).optional(),
});

export async function planRoutes(app: FastifyInstance): Promise<void> {
  app.post("/plan", async (req, reply) => {
    const parsed = planBody.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
      return;
    }
    const user = req.user;
    const { projectId, profile: bodyProfile, provider, persona, planHorizon } = parsed.data;

    let profile: ProjectProfile | null = bodyProfile ?? null;
    if (!profile && projectId && persistenceEnabled && user) {
      const project = await projects.get(projectId, user.id);
      if (!project) {
        reply.code(404).send({ error: "project_not_found" });
        return;
      }
      const loaded = projectProfileSchema.safeParse(project.profile_json);
      if (!loaded.success) {
        reply.code(400).send({ error: "project_profile_incomplete" });
        return;
      }
      profile = loaded.data;
    }
    if (!profile) {
      reply.code(400).send({ error: "invalid_request", detail: "profile or projectId required" });
      return;
    }

    if (user) {
      try {
        await assertTierAndQuota(user.id, "plan");
      } catch (err) {
        if (sendMeteringError(reply, err)) return;
        throw err;
      }
    }

    const sse = startSSE(reply);
    const emit = (e: PlanStreamEvent) => sse.send(e);
    const t0 = Date.now();
    const resolvedProvider = provider ?? "anthropic";
    const usageSink = { input: 0, output: 0 };

    if (resolvedProvider === "openai") {
      emit({
        type: "error",
        message:
          "Plan Studio requires Anthropic (structured playbook generation). Switch to Claude in Settings → Provider.",
        code: "model_error",
      });
      sse.end();
      return;
    }

    try {
      let marketingProfile = null;
      if (user && projectId) {
        marketingProfile = await marketingProfiles.get(user.id, projectId);
      }

      const plan = await generatePlanSuite({
        scanProfile: profile,
        marketingProfile,
        persona,
        planHorizon,
        emit,
        signal: sse.signal,
        usageSink,
      });
      if (sse.closed()) return;

      const costCents = estimateCostCents(
        env.ANTHROPIC_MODEL,
        usageSink.input,
        usageSink.output,
      );
      emit({
        type: "usage",
        tokens_in: usageSink.input,
        tokens_out: usageSink.output,
        cost_cents: costCents,
      });
      emit({ type: "done" });

      const durationMs = Date.now() - t0;
      app.log.info(
        {
          route: "/plan",
          provider: resolvedProvider,
          durationMs,
          status: "ok",
          playbooks: plan.playbooks?.length,
          tokens_in: usageSink.input,
          tokens_out: usageSink.output,
          cost_cents: costCents,
        },
        "llm_turn",
      );

      if (persistenceEnabled && user) {
        try {
          if (projectId) await plans.insert(user.id, projectId, plan);
          await usage.insert(user.id, {
            kind: "plan",
            tokens_in: usageSink.input,
            tokens_out: usageSink.output,
            cost_cents: costCents,
          });
        } catch (persistErr) {
          app.log.warn({ err: persistErr }, "failed to persist plan");
        }
      }
    } catch (err) {
      if (sse.closed() || sse.signal.aborted) return;
      const { code, message } = classifyError(err);
      app.log.warn(
        {
          route: "/plan",
          provider: resolvedProvider,
          durationMs: Date.now() - t0,
          status: "error",
          code,
          err,
        },
        "llm_turn_failed",
      );
      emit({ type: "error", message, code });
    } finally {
      sse.end();
    }
  });
}
