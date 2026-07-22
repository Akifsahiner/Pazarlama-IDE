import type { TierId } from "../tier/tiers.js";
import * as profiles from "../db/repos/profiles.js";
import { billingProvider } from "./provider.js";
import {
  verifyPaddleWebhook,
  tierFromPriceId as paddleTierFromPrice,
  paddleSubscriptionActive,
  extractUserIdFromPaddleEvent,
  extractPriceIdFromPaddleEvent,
  type PaddleWebhookEvent,
} from "./paddle.js";
import { getStripe, tierFromPriceId as stripeTierFromPrice, priceIdForTier } from "./stripe.js";

export async function handleBillingWebhook(input: {
  rawBody: Buffer;
  signature: string | undefined;
  provider?: "paddle" | "stripe";
}): Promise<void> {
  const provider = input.provider ?? billingProvider();

  if (provider === "paddle") {
    if (!input.signature || !verifyPaddleWebhook(input.rawBody, input.signature)) {
      throw new Error("invalid_paddle_signature");
    }
    const event = JSON.parse(input.rawBody.toString("utf8")) as PaddleWebhookEvent;
    await handlePaddleEvent(event);
    return;
  }

  await handleStripeWebhook(input.rawBody, input.signature);
}

async function handlePaddleEvent(event: PaddleWebhookEvent): Promise<void> {
  let userId = extractUserIdFromPaddleEvent(event);
  if (!userId && event.data.customer_id) {
    const row = await profiles.findByPaddleCustomerId(event.data.customer_id);
    userId = row?.id;
  }
  if (!userId) return;

  const priceId = extractPriceIdFromPaddleEvent(event);
  const active = paddleSubscriptionActive(event);
  const tier: TierId = active
    ? paddleTierFromPrice(priceId) === "free"
      ? event.data.custom_data?.tier === "team"
        ? "team"
        : "pro"
      : paddleTierFromPrice(priceId)
    : "free";

  await profiles.updateTier(userId, tier, {
    paddle_customer_id: event.data.customer_id,
    paddle_subscription_id: active ? event.data.subscription_id ?? event.data.id : null,
    paddle_price_id: active ? priceId : null,
  });
}

async function handleStripeWebhook(rawBody: Buffer, sig: string | undefined): Promise<void> {
  const { env } = await import("../env.js");
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET || !sig) {
    throw new Error("stripe_webhook_not_configured");
  }

  const event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const userId =
        session.client_reference_id || session.metadata?.user_id || undefined;
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

      if (stripe && subscriptionId && !priceId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        priceId = sub.items.data[0]?.price?.id ?? null;
      }

      const tier =
        stripeTierFromPrice(priceId) === "free"
          ? session.metadata?.tier === "team"
            ? "team"
            : "pro"
          : stripeTierFromPrice(priceId);

      await profiles.updateTier(userId, tier, {
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

      const mapped = stripeTierFromPrice(priceId);
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
