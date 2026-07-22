import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  billingConfigured,
  billingProvider,
  createCheckoutSession,
  createPortalSession,
  handleBillingWebhook,
} from "../billing/provider.js";

const checkoutBody = z.object({
  tier: z.enum(["pro", "team"]).default("pro"),
});

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.post("/billing/checkout", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    if (!billingConfigured()) {
      reply.code(503).send({ error: "billing_not_configured" });
      return;
    }

    const parsed = checkoutBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
      return;
    }

    try {
      const result = await createCheckoutSession({
        userId: user.id,
        email: user.email,
        tier: parsed.data.tier,
      });
      return { url: result.url, sessionId: result.sessionId, provider: billingProvider() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Missing") && msg.includes("price")) {
        reply.code(503).send({ error: "billing_not_configured", detail: msg });
        return;
      }
      app.log.error({ err }, "billing_checkout_failed");
      reply.code(500).send({ error: "checkout_failed", detail: msg });
    }
  });

  app.post("/billing/portal", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    if (!billingConfigured()) {
      reply.code(503).send({ error: "billing_not_configured" });
      return;
    }

    try {
      const result = await createPortalSession({
        userId: user.id,
        email: user.email,
      });
      return { url: result.url, provider: billingProvider() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("no_paddle_customer") || msg.includes("no_stripe_customer")) {
        reply.code(400).send({ error: msg });
        return;
      }
      app.log.error({ err }, "billing_portal_failed");
      reply.code(500).send({ error: "portal_failed", detail: msg });
    }
  });
}

/**
 * Billing webhook with raw body. Registered as a scoped plugin so the JSON
 * parser does not consume the payload before signature verification.
 */
export async function billingWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post("/billing/webhook", async (req, reply) => {
    if (!billingConfigured()) {
      reply.code(503).send({ error: "billing_not_configured" });
      return;
    }

    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      reply.code(400).send({ error: "invalid_body" });
      return;
    }

    const provider = billingProvider();
    const signature =
      provider === "paddle"
        ? (req.headers["paddle-signature"] as string | undefined)
        : (req.headers["stripe-signature"] as string | undefined);

    try {
      await handleBillingWebhook({ rawBody, signature, provider });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invalid") && msg.includes("signature")) {
        reply.code(400).send({ error: "invalid_signature" });
        return;
      }
      app.log.error({ err, provider }, "billing_webhook_handler_failed");
      reply.code(500).send({ error: "handler_failed" });
      return;
    }

    return { received: true };
  });
}

/** Legacy export for tests that import handleStripeEvent — now unified in webhook module. */
export { handleBillingWebhook };
