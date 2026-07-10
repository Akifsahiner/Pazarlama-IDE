import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DEV_USER_ID, devAuthBypass } from "../auth/devBypass.js";

const dispatchBody = z.object({
  webhook_url: z.string().url(),
  provider: z.enum(["lemlist", "instantly", "generic"]).optional(),
  project: z.string().optional(),
  generated_at: z.string().optional(),
  leads: z.array(z.record(z.string(), z.unknown())).optional(),
  messages: z.array(z.record(z.string(), z.unknown())).optional(),
  markdown: z.string().optional(),
  /** Provider-specific payload (Lemlist leads array, Instantly campaign block). */
  provider_payload: z.record(z.string(), z.unknown()).optional(),
});

export type OutreachDispatchResult =
  | {
      ok: true;
      dispatched_at: string;
      lead_count: number;
      message_count: number;
      provider: string;
      status: number;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      detail?: string;
      hint?: string;
    };

function providerHint(provider?: string): string {
  switch (provider) {
    case "lemlist":
      return "Verify your Lemlist webhook URL accepts JSON POST with a leads array.";
    case "instantly":
      return "Verify your Instantly webhook URL and API key permissions.";
    default:
      return "Check webhook URL in Settings — endpoint must accept application/json POST.";
  }
}

export async function outreachRoutes(app: FastifyInstance): Promise<void> {
  function resolveUserId(req: { user?: { id: string } }): string | null {
    if (devAuthBypass()) return DEV_USER_ID;
    return req.user?.id ?? null;
  }

  app.post("/projects/:id/outreach/dispatch", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ ok: false, error: "unauthorized" } satisfies OutreachDispatchResult);
      return;
    }

    const parsed = dispatchBody.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({
        ok: false,
        error: "invalid_request",
        hint: "webhook_url must be a valid HTTPS URL.",
      } satisfies OutreachDispatchResult);
      return;
    }

    const { webhook_url, provider, provider_payload, ...payload } = parsed.data;
    const leadCount = payload.leads?.length ?? 0;
    const messageCount = payload.messages?.length ?? 0;

    if (leadCount === 0 && messageCount === 0 && !payload.markdown) {
      reply.code(400).send({
        ok: false,
        error: "empty_pack",
        hint: "Run lead research and draft outreach before dispatching.",
      } satisfies OutreachDispatchResult);
      return;
    }

    const body = provider_payload ?? { provider: provider ?? "generic", ...payload };

    try {
      const res = await fetch(webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MarketingIDE-Outreach/1.0",
          ...(provider === "lemlist" ? { "X-Provider": "lemlist" } : {}),
          ...(provider === "instantly" ? { "X-Provider": "instantly" } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        reply.code(502).send({
          ok: false,
          error: "webhook_failed",
          status: res.status,
          detail: detail.slice(0, 500),
          hint: providerHint(provider),
        } satisfies OutreachDispatchResult);
        return;
      }

      return {
        ok: true,
        dispatched_at: new Date().toISOString(),
        lead_count: leadCount,
        message_count: messageCount,
        provider: provider ?? "generic",
        status: res.status,
      } satisfies OutreachDispatchResult;
    } catch (err) {
      reply.code(502).send({
        ok: false,
        error: "webhook_error",
        detail: err instanceof Error ? err.message : String(err),
        hint: providerHint(provider),
      } satisfies OutreachDispatchResult);
    }
  });
}
