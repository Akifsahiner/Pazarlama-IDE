import { DEV_USER_ID } from "../../auth/devBypass.js";
import { eq, persistenceEnabled, sb } from "../client.js";

export interface ProfileRow {
  id: string;
  tier: string;
  created_at: string;
}

export interface QuotaRow {
  user_id: string;
  period_start: string;
  plan_limit: number;
  agent_limit: number;
  browser_min_limit: number;
}

import { normalizeTier, tierQuotaFor } from "../../tier/tiers.js";

export const DEFAULT_QUOTA: Omit<QuotaRow, "user_id" | "period_start"> = {
  plan_limit: 20,
  agent_limit: 200,
  browser_min_limit: 30,
};

export interface ProfileBundle {
  profile: ProfileRow;
  quota: QuotaRow;
}

/**
 * Ensure profiles + quotas rows exist for this user, then return them.
 * No-ops gracefully (returns an in-memory default bundle) when persistence is off.
 */
export async function getOrCreate(userId: string, email?: string): Promise<ProfileBundle> {
  const memoryBundle = (): ProfileBundle => ({
    profile: { id: userId, tier: "free", created_at: new Date().toISOString() },
    quota: { user_id: userId, period_start: new Date().toISOString().slice(0, 10), ...DEFAULT_QUOTA },
  });

  if (!persistenceEnabled || userId === DEV_USER_ID) {
    return memoryBundle();
  }

  // Insert-if-absent (ignore duplicates), then read back.
  await sb("/profiles", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify([{ id: userId }]),
  });
  await sb("/quotas", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify([{ user_id: userId }]),
  });

  const profiles = await sb<ProfileRow[]>(`/profiles?id=${eq(userId)}&limit=1`);
  const quotas = await sb<QuotaRow[]>(`/quotas?user_id=${eq(userId)}&limit=1`);

  const profile: ProfileRow =
    profiles?.[0] ?? { id: userId, tier: "free", created_at: new Date().toISOString() };
  const tier = normalizeTier(profile.tier);
  const tierQuota = tierQuotaFor(tier);
  const quota: QuotaRow =
    quotas?.[0] ?? {
      user_id: userId,
      period_start: new Date().toISOString().slice(0, 10),
      ...tierQuota,
    };
  void email; // reserved for future profile enrichment
  return { profile, quota };
}
