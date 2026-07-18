import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import * as profiles from "../db/repos/profiles.js";
import {
  billingConfigured,
  checkoutUrls,
  getStripe,
  priceIdForTier,
  tierFromPriceId,
} from "../billing/stripe.js";

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
    const stripe = getStripe();
    if (!stripe) {
      reply.code(503).send({ error: "billing_not_configured" });
      return;
    }

    const parsed = checkoutBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
      return;
    }

    const priceId = priceIdForTier(parsed.data.tier);
    if (!priceId) {
      reply.code(503).send({
        error: "billing_not_configured",
        detail: `Missing Stripe price for ${parsed.data.tier}`,
      });
      return;
    }

    const { profile } = await profiles.getOrCreate(user.id, user.email);
    let customerId = profile.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await profiles.setStripeCustomerId(user.id, customerId);
    }

    const urls = checkoutUrls();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: urls.success,
      cancel_url: urls.cancel,
      client_reference_id: user.id,
      metadata: { user_id: user.id, tier: parsed.data.tier },
      subscription_data: {
        metadata: { user_id: user.id, tier: parsed.data.tier },
      },
    });

    if (!session.url) {
      reply.code(500).send({ error: "checkout_url_missing" });
      return;
    }
    return { url: session.url, sessionId: session.id };
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
    const stripe = getStripe();
    if (!stripe) {
      reply.code(503).send({ error: "billing_not_configured" });
      return;
    }

    const { profile } = await profiles.getOrCreate(user.id, user.email);
    if (!profile.stripe_customer_id) {
      reply.code(400).send({ error: "no_stripe_customer" });
      return;
    }

    const urls = checkoutUrls();
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: urls.success,
    });
    return { url: portal.url };
  });
}

/**
 * Stripe webhook with raw body. Registered as a scoped plugin so the JSON
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
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      reply.code(503).send({ error: "billing_not_configured" });
      return;
    }
    const stripe = getStripe();
    if (!stripe) {
      reply.code(503).send({ error: "billing_not_configured" });
      return;
    }

    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string") {
      reply.code(400).send({ error: "missing_signature" });
      return;
    }

    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      reply.code(400).send({ error: "invalid_body" });
      return;
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      app.log.warn({ err }, "stripe_webhook_signature_failed");
      reply.code(400).send({ error: "invalid_signature" });
      return;
    }

    try {
      await handleStripeEvent(event);
    } catch (err) {
      app.log.error({ err, type: event.type }, "stripe_webhook_handler_failed");
      reply.code(500).send({ error: "handler_failed" });
      return;
    }

    return { received: true };
  });
}

async function handleStripeEvent(event: import("stripe").Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const userId =
        session.client_reference_id ||
        session.metadata?.user_id ||
        undefined;
      if (!userId) return;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;

      let priceId: string | null = session.metadata?.tier
        ? priceIdForTier(session.metadata.tier === "team" ? "team" : "pro")
        : null;

      const stripe = getStripe();
      if (stripe && subscriptionId && !priceId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        priceId = sub.items.data[0]?.price?.id ?? null;
      }

      const tier = tierFromPriceId(priceId) === "free"
        ? (session.metadata?.tier === "team" ? "team" : "pro")
        : tierFromPriceId(priceId);

      await profiles.updateTier(userId, tier === "free" ? "pro" : tier, {
        stripe_customer_id: customerId ?? undefined,
        stripe_subscription_id: subscriptionId ?? undefined,
        stripe_price_id: priceId,
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

      let resolvedUserId: string | undefined = sub.metadata?.user_id;
      if (!resolvedUserId && customerId) {
        const row = await profiles.findByStripeCustomerId(customerId);
        resolvedUserId = row?.id;
      }
      if (!resolvedUserId) return;

      const priceId = sub.items.data[0]?.price?.id ?? null;
      const active =
        event.type !== "customer.subscription.deleted" &&
        (sub.status === "active" || sub.status === "trialing");

      const mapped = tierFromPriceId(priceId);
      const tier = active ? (mapped === "free" ? "pro" : mapped) : "free";
      await profiles.updateTier(resolvedUserId, tier, {
        stripe_customer_id: customerId,
        stripe_subscription_id: active ? sub.id : null,
        stripe_price_id: active ? priceId : null,
      });
      break;
    }
    default:
      break;
  }
}
