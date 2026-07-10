import type { FastifyInstance } from "fastify";
import {
  agentRequestSchema,
  type AgentStreamEvent,
} from "../schemas/index.js";
import { startSSE } from "../sse.js";
import { persistenceEnabled } from "../db/client.js";
import { assertTierAndQuota } from "../middleware/tierGate.js";
import { sendMeteringError } from "../middleware/meteringErrors.js";
import { classifyError } from "../llm/errors.js";
import { runTurn } from "../brain/turn.js";
import * as marketingProfileRepo from "../db/repos/marketingProfile.js";
import * as sessions from "../db/repos/sessions.js";
import * as messages from "../db/repos/messages.js";
import * as assets from "../db/repos/assets.js";
import * as plans from "../db/repos/plans.js";
import * as usage from "../db/repos/usage.js";

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  app.post("/agent", async (req, reply) => {
    const parsed = agentRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
      return;
    }
    const user = req.user;
    const {
      sessionId,
      message,
      history,
      provider,
      persona,
      planProgressSummary,
      activeSurface,
      context,
      planSnapshot,
    } = parsed.data;

    let projectId: string | null = null;
    if (sessionId && persistenceEnabled && user) {
      const session = await sessions.get(sessionId, user.id);
      if (!session) {
        reply.code(404).send({ error: "session_not_found" });
        return;
      }
      projectId = session.project_id;
    }

    if (user) {
      try {
        await assertTierAndQuota(user.id, "agent");
      } catch (err) {
        if (sendMeteringError(reply, err)) return;
        throw err;
      }
    }

    const sse = startSSE(reply);
    const emit = (e: AgentStreamEvent) => sse.send(e);
    const t0 = Date.now();
    const resolvedProvider = provider ?? "anthropic";
    const usageSink = { input: 0, output: 0 };

    try {
      const brainProfile =
        projectId && user ? await marketingProfileRepo.get(user.id, projectId) : undefined;

      const result = await runTurn({
        userId: user?.id ?? "anon",
        projectId: projectId ?? undefined,
        message,
        history,
        profile: brainProfile,
        persona: persona ?? "marketing",
        planProgressSummary,
        activeSurface,
        context,
        planSnapshot,
        provider: resolvedProvider,
        emit,
        signal: sse.signal,
        usageSink,
      });

      if (sse.closed()) return;
      emit({ type: "done" });

      const persist = result.persist;
      const collectedAssets = result.collectedAssets;

      if (result.revisedPlan && persistenceEnabled && user && projectId) {
        try {
          await plans.insert(user.id, projectId, result.revisedPlan);
          await usage.insert(user.id, { kind: "plan" });
        } catch (persistErr) {
          app.log.warn({ err: persistErr }, "failed to persist revised plan");
        }
      }

      app.log.info(
        {
          route: "/agent",
          provider: resolvedProvider,
          durationMs: Date.now() - t0,
          status: "ok",
          kind: persist.kind,
          discipline: result.intent.discipline,
          assets: collectedAssets.length,
        },
        "llm_turn",
      );

      if (persistenceEnabled && user && sessionId) {
        try {
          if (message.trim() || !context?.proactive_trigger) {
            await messages.insert(sessionId, {
              role: "user",
              kind: "chat",
              content_json: { text: message.trim() || "[proactive]" },
            });
          }
          await messages.insert(sessionId, {
            role: "agent",
            kind: persist.kind ?? "chat",
            content_json: persist,
          });
          if (projectId) {
            for (const asset of collectedAssets) {
              await assets.insert(user.id, {
                projectId,
                sessionId,
                type: asset.type,
                targetFile: asset.targetFile,
                beforeText: asset.before,
                afterText: asset.after,
              });
            }
          }
          await usage.insert(user.id, {
            kind: "agent",
            tokens_in: usageSink.input,
            tokens_out: usageSink.output,
          });
        } catch (persistErr) {
          app.log.warn({ err: persistErr }, "failed to persist agent turn");
        }
      }
    } catch (err) {
      if (sse.closed() || sse.signal.aborted) return;
      const { code, message: errMsg } = classifyError(err);
      app.log.warn(
        {
          route: "/agent",
          provider: resolvedProvider,
          durationMs: Date.now() - t0,
          status: "error",
          code,
          err,
        },
        "llm_turn_failed",
      );
      emit({ type: "error", message: errMsg, code });
    } finally {
      sse.end();
    }
  });
}
