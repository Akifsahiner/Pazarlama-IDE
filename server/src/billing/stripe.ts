import Stripe from "stripe";
import { env } from "../env.js";
import type { TierId } from "../tier/tiers.js";

let _stripe: Stripe | null = null;

export function billingConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_PRO);
}

export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export function priceIdForTier(tier: "pro" | "team"): string | null {
  if (tier === "pro") return env.STRIPE_PRICE_PRO || null;
  if (tier === "team") return env.STRIPE_PRICE_TEAM || null;
  return null;
}

export function tierFromPriceId(priceId: string | null | undefined): TierId {
  if (!priceId) return "free";
  if (env.STRIPE_PRICE_TEAM && priceId === env.STRIPE_PRICE_TEAM) return "team";
  if (env.STRIPE_PRICE_PRO && priceId === env.STRIPE_PRICE_PRO) return "pro";
  return "free";
}

export function checkoutUrls(): { success: string; cancel: string } {
  return {
    success: env.STRIPE_SUCCESS_URL || "marketingide://billing/success",
    cancel: env.STRIPE_CANCEL_URL || "marketingide://billing/cancel",
  };
}
