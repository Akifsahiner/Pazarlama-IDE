import * as profiles from "../db/repos/profiles.js";
import { billingProvider, checkoutUrls } from "./provider.js";
import {
  createPaddleCheckout,
  createPaddlePortal,
  priceIdForTier as paddlePriceId,
} from "./paddle.js";
import {
  getStripe,
  priceIdForTier as stripePriceId,
} from "./stripe.js";

export async function createCheckoutSession(input: {
  userId: string;
  email?: string;
  tier: "pro" | "team";
}): Promise<{ url: string; sessionId?: string }> {
  const urls = checkoutUrls();
  const provider = billingProvider();

  if (provider === "paddle") {
    const priceId = paddlePriceId(input.tier);
    if (!priceId) throw new Error(`Missing Paddle price for ${input.tier}`);

    const { profile } = await profiles.getOrCreate(input.userId, input.email);
    const { url, customerId } = await createPaddleCheckout({
      priceId,
      userId: input.userId,
      email: input.email,
      customerId: profile.paddle_customer_id ?? undefined,
      successUrl: urls.success,
      cancelUrl: urls.cancel,
      tier: input.tier,
    });
    if (!profile.paddle_customer_id) {
      await profiles.setPaddleCustomerId(input.userId, customerId);
    }
    return { url };
  }

  const stripe = getStripe();
  if (!stripe) throw new Error("stripe_not_configured");
  const priceId = stripePriceId(input.tier);
  if (!priceId) throw new Error(`Missing Stripe price for ${input.tier}`);

  const { profile } = await profiles.getOrCreate(input.userId, input.email);
  let customerId = profile.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.email,
      metadata: { user_id: input.userId },
    });
    customerId = customer.id;
    await profiles.setStripeCustomerId(input.userId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: urls.success,
    cancel_url: urls.cancel,
    client_reference_id: input.userId,
    metadata: { user_id: input.userId, tier: input.tier },
    subscription_data: {
      metadata: { user_id: input.userId, tier: input.tier },
    },
  });
  if (!session.url) throw new Error("checkout_url_missing");
  return { url: session.url, sessionId: session.id };
}

export async function createPortalSession(input: {
  userId: string;
  email?: string;
}): Promise<{ url: string }> {
  const urls = checkoutUrls();
  const provider = billingProvider();

  if (provider === "paddle") {
    const { profile } = await profiles.getOrCreate(input.userId, input.email);
    if (!profile.paddle_customer_id) throw new Error("no_paddle_customer");
    const url = await createPaddlePortal(profile.paddle_customer_id, urls.success);
    return { url };
  }

  const stripe = getStripe();
  if (!stripe) throw new Error("stripe_not_configured");
  const { profile } = await profiles.getOrCreate(input.userId, input.email);
  if (!profile.stripe_customer_id) throw new Error("no_stripe_customer");
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: urls.success,
  });
  return { url: portal.url };
}
