import { DEV_USER_ID } from "../../auth/devBypass.js";
import { eq, persistenceEnabled, sb } from "../client.js";
import { normalizeTier, tierQuotaFor, type TierId } from "../../tier/tiers.js";

export interface ProfileRow {
  id: string;
  tier: string;
  created_at: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
  paddle_price_id?: string | null;
}

export interface QuotaRow {
  user_id: string;
  period_start: string;
  plan_limit: number;
  agent_limit: number;
  browser_min_limit: number;
  cost_budget_cents: number;
}

export const DEFAULT_QUOTA: Omit<QuotaRow, "user_id" | "period_start"> = {
  plan_limit: 20,
  agent_limit: 200,
  browser_min_limit: 30,
  cost_budget_cents: 1500,
};

export interface ProfileBundle {
  profile: ProfileRow;
  quota: QuotaRow;
}

function utcMonthStartDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function periodIsCurrentMonth(periodStart: string): boolean {
  const current = utcMonthStartDate();
  const normalized = periodStart.slice(0, 10);
  return normalized === current;
}

/**
 * Ensure profiles + quotas rows exist for this user, then return them.
 * Lazy-rolls period_start into the current UTC month and syncs limits to tier.
 */
export async function getOrCreate(userId: string, email?: string): Promise<ProfileBundle> {
  const memoryBundle = (): ProfileBundle => {
    const tier: TierId = "pro";
    return {
      profile: { id: userId, tier, created_at: new Date().toISOString() },
      quota: {
        user_id: userId,
        period_start: utcMonthStartDate(),
        ...tierQuotaFor(tier),
      },
    };
  };

  if (!persistenceEnabled || userId === DEV_USER_ID) {
    return memoryBundle();
  }

  await sb("/profiles", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify([{ id: userId }]),
  });

  const profiles = await sb<ProfileRow[]>(`/profiles?id=${eq(userId)}&limit=1`);
  const profile: ProfileRow =
    profiles?.[0] ?? { id: userId, tier: "free", created_at: new Date().toISOString() };
  const tier = normalizeTier(profile.tier);
  const tierQuota = tierQuotaFor(tier);

  await sb("/quotas", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify([
      {
        user_id: userId,
        period_start: utcMonthStartDate(),
        ...tierQuota,
      },
    ]),
  });

  let quotas = await sb<QuotaRow[]>(`/quotas?user_id=${eq(userId)}&limit=1`);
  let quota: QuotaRow =
    quotas?.[0] ?? {
      user_id: userId,
      period_start: utcMonthStartDate(),
      ...tierQuota,
    };

  if (quota.cost_budget_cents == null) {
    quota = { ...quota, cost_budget_cents: tierQuota.cost_budget_cents };
  }

  quota = await ensureQuotaPeriod(userId, tier, quota);

  void email;
  return { profile: { ...profile, tier }, quota };
}

/** Roll period_start + sync limits to the user's tier when needed. */
export async function ensureQuotaPeriod(
  userId: string,
  tier: TierId,
  quota: QuotaRow,
): Promise<QuotaRow> {
  if (!persistenceEnabled || userId === DEV_USER_ID) return quota;

  const desired = tierQuotaFor(tier);
  const monthOk = periodIsCurrentMonth(quota.period_start);
  const limitsOk =
    quota.plan_limit === desired.plan_limit &&
    quota.agent_limit === desired.agent_limit &&
    quota.browser_min_limit === desired.browser_min_limit &&
    Number(quota.cost_budget_cents) === desired.cost_budget_cents;

  if (monthOk && limitsOk) return quota;

  const next: QuotaRow = {
    user_id: userId,
    period_start: utcMonthStartDate(),
    ...desired,
  };

  await sb(`/quotas?user_id=${eq(userId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({
      period_start: next.period_start,
      plan_limit: next.plan_limit,
      agent_limit: next.agent_limit,
      browser_min_limit: next.browser_min_limit,
      cost_budget_cents: next.cost_budget_cents,
    }),
  });

  return next;
}

export interface StripeBillingFields {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
}

export interface PaddleBillingFields {
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
  paddle_price_id?: string | null;
}

export type BillingFields = StripeBillingFields & PaddleBillingFields;

/** Update tier + quota limits (billing webhook / admin). */
export async function updateTier(
  userId: string,
  tier: TierId,
  billing?: BillingFields,
): Promise<ProfileBundle> {
  if (!persistenceEnabled || userId === DEV_USER_ID) {
    const q = tierQuotaFor(tier);
    return {
      profile: {
        id: userId,
        tier,
        created_at: new Date().toISOString(),
        ...billing,
      },
      quota: { user_id: userId, period_start: utcMonthStartDate(), ...q },
    };
  }

  const patch: Record<string, unknown> = { tier };
  if (billing) {
    if (billing.stripe_customer_id !== undefined) {
      patch.stripe_customer_id = billing.stripe_customer_id;
    }
    if (billing.stripe_subscription_id !== undefined) {
      patch.stripe_subscription_id = billing.stripe_subscription_id;
    }
    if (billing.stripe_price_id !== undefined) {
      patch.stripe_price_id = billing.stripe_price_id;
    }
    if (billing.paddle_customer_id !== undefined) {
      patch.paddle_customer_id = billing.paddle_customer_id;
    }
    if (billing.paddle_subscription_id !== undefined) {
      patch.paddle_subscription_id = billing.paddle_subscription_id;
    }
    if (billing.paddle_price_id !== undefined) {
      patch.paddle_price_id = billing.paddle_price_id;
    }
  }

  await sb(`/profiles?id=${eq(userId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify(patch),
  });

  const desired = tierQuotaFor(tier);
  await sb(`/quotas?user_id=${eq(userId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({
      period_start: utcMonthStartDate(),
      ...desired,
    }),
  });

  return getOrCreate(userId);
}

export async function setStripeCustomerId(userId: string, customerId: string): Promise<void> {
  if (!persistenceEnabled || userId === DEV_USER_ID) return;
  await sb(`/profiles?id=${eq(userId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ stripe_customer_id: customerId }),
  });
}

export async function setPaddleCustomerId(userId: string, customerId: string): Promise<void> {
  if (!persistenceEnabled || userId === DEV_USER_ID) return;
  await sb(`/profiles?id=${eq(userId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ paddle_customer_id: customerId }),
  });
}

export async function findByStripeCustomerId(customerId: string): Promise<ProfileRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<ProfileRow[]>(
    `/profiles?stripe_customer_id=${eq(customerId)}&limit=1`,
  );
  return rows?.[0] ?? null;
}

export async function findByPaddleCustomerId(customerId: string): Promise<ProfileRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<ProfileRow[]>(
    `/profiles?paddle_customer_id=${eq(customerId)}&limit=1`,
  );
  return rows?.[0] ?? null;
}
