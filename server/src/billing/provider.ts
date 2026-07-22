/**
 * Unified billing provider — Paddle (production default) or Stripe (legacy).
 */
import { env } from "../env.js";
import { billingConfigured as stripeConfigured } from "./stripe.js";
import { billingConfigured as paddleConfigured } from "./paddle.js";

export type BillingProviderId = "paddle" | "stripe";

export function billingProvider(): BillingProviderId {
  if (env.BILLING_PROVIDER === "stripe") return "stripe";
  if (env.BILLING_PROVIDER === "paddle") return "paddle";
  if (paddleConfigured()) return "paddle";
  if (stripeConfigured()) return "stripe";
  return "paddle";
}

export function billingConfigured(): boolean {
  return billingProvider() === "paddle" ? paddleConfigured() : stripeConfigured();
}

export function checkoutUrls(): { success: string; cancel: string } {
  return {
    success: env.BILLING_SUCCESS_URL || "marketingide://billing/success",
    cancel: env.BILLING_CANCEL_URL || "marketingide://billing/cancel",
  };
}

export { createCheckoutSession, createPortalSession } from "./checkout.js";
export { handleBillingWebhook } from "./webhook.js";
