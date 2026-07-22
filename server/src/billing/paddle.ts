/**
 * Paddle Billing API v2 — checkout, portal, webhooks.
 * @see https://developer.paddle.com/
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";
import type { TierId } from "../tier/tiers.js";

const PADDLE_API =
  env.PADDLE_ENVIRONMENT === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

export function billingConfigured(): boolean {
  return Boolean(env.PADDLE_API_KEY && env.PADDLE_PRICE_PRO);
}

export function priceIdForTier(tier: "pro" | "team"): string | null {
  if (tier === "pro") return env.PADDLE_PRICE_PRO || null;
  if (tier === "team") return env.PADDLE_PRICE_TEAM || null;
  return null;
}

export function tierFromPriceId(priceId: string | null | undefined): TierId {
  if (!priceId) return "free";
  if (env.PADDLE_PRICE_TEAM && priceId === env.PADDLE_PRICE_TEAM) return "team";
  if (env.PADDLE_PRICE_PRO && priceId === env.PADDLE_PRICE_PRO) return "pro";
  return "free";
}

async function paddleFetch<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.PADDLE_API_KEY}`,
    "Content-Type": "application/json",
  };
  const { body, ...rest } = init ?? {};
  const res = await fetch(`${PADDLE_API}${path}`, {
    ...rest,
    headers: { ...headers, ...(rest.headers as Record<string, string>) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { data?: T; error?: { detail?: string } };
  if (!res.ok) {
    throw new Error(json.error?.detail ?? `Paddle API ${res.status}`);
  }
  return json.data as T;
}

export async function createPaddleCustomer(input: {
  email?: string;
  userId: string;
}): Promise<string> {
  const data = await paddleFetch<{ id: string }>("/customers", {
    method: "POST",
    body: {
      email: input.email,
      custom_data: { user_id: input.userId },
    },
  });
  return data.id;
}

export async function createPaddleCheckout(input: {
  priceId: string;
  userId: string;
  email?: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  tier: "pro" | "team";
}): Promise<{ url: string; customerId: string }> {
  let customerId = input.customerId;
  if (!customerId) {
    customerId = await createPaddleCustomer({ email: input.email, userId: input.userId });
  }

  const data = await paddleFetch<{ checkout?: { url?: string } }>("/transactions", {
    method: "POST",
    body: {
      items: [{ price_id: input.priceId, quantity: 1 }],
      customer_id: customerId,
      custom_data: { user_id: input.userId, tier: input.tier },
      collection_mode: "automatic",
      checkout: {
        url: input.successUrl,
      },
    },
  });

  const url = data.checkout?.url;
  if (!url) throw new Error("paddle_checkout_url_missing");
  return { url, customerId };
}

export async function createPaddlePortal(customerId: string, returnUrl: string): Promise<string> {
  const data = await paddleFetch<{ urls?: { general?: { overview?: string } } }>(
    `/customers/${customerId}/portal-sessions`,
    {
      method: "POST",
      body: { return_url: returnUrl },
    },
  );
  const url = data.urls?.general?.overview;
  if (!url) throw new Error("paddle_portal_url_missing");
  return url;
}

/** Verify Paddle-Signature header (ts=h1). */
export function verifyPaddleWebhook(rawBody: Buffer, signatureHeader: string): boolean {
  if (!env.PADDLE_WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const payload = `${ts}:${rawBody.toString("utf8")}`;
  const expected = createHmac("sha256", env.PADDLE_WEBHOOK_SECRET).update(payload).digest("hex");
  try {
    return (
      expected.length === h1.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(h1))
    );
  } catch {
    return false;
  }
}

export interface PaddleWebhookEvent {
  event_type: string;
  data: {
    id?: string;
    status?: string;
    customer_id?: string;
    subscription_id?: string;
    custom_data?: { user_id?: string; tier?: string };
    items?: Array<{ price?: { id?: string } }>;
  };
}

export function extractUserIdFromPaddleEvent(event: PaddleWebhookEvent): string | undefined {
  return event.data.custom_data?.user_id;
}

export function extractPriceIdFromPaddleEvent(event: PaddleWebhookEvent): string | null {
  return event.data.items?.[0]?.price?.id ?? null;
}

export function paddleSubscriptionActive(event: PaddleWebhookEvent): boolean {
  const t = event.event_type;
  if (t === "subscription.canceled" || t === "subscription.past_due") return false;
  if (t === "subscription.activated" || t === "subscription.updated") {
    return event.data.status === "active" || event.data.status === "trialing";
  }
  if (t === "transaction.completed") return true;
  return false;
}
