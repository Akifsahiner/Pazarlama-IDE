/**
 * P5 — Measurement hooks: GA4 auto-sync on cycle start when connected.
 */
import { hasGa4Connected } from "./cmoProofLoop";
import type { MarketingProfile } from "./types";

export interface Ga4CycleSyncPlan {
  shouldSync: boolean;
  reason: string;
}

/** Pull fresh GA4 metrics when a new ops week starts — honest empty if not connected. */
export function planGa4SyncOnCycleStart(
  profile: MarketingProfile | null | undefined,
  opts?: { week_index?: number },
): Ga4CycleSyncPlan {
  const week = opts?.week_index ?? 1;
  if (!profile?.ga4_oauth?.refresh_token && !hasGa4Connected(profile)) {
    return {
      shouldSync: false,
      reason: `Week ${week} — GA4 not connected; log KPIs manually in ops proof.`,
    };
  }
  return {
    shouldSync: true,
    reason: `Week ${week} — syncing GA4 baseline before ops execution.`,
  };
}

export function ga4SyncStatusMessage(
  ok: boolean,
  weekIndex = 1,
): string {
  if (ok) {
    return `Week ${weekIndex} — GA4 metrics synced for KPI proof.`;
  }
  return `Week ${weekIndex} — GA4 sync skipped; log KPIs manually.`;
}
