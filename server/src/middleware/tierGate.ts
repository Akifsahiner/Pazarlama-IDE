import { persistenceEnabled } from "../db/client.js";
import { DEV_USER_ID, devAuthBypass } from "../auth/devBypass.js";
import * as profiles from "../db/repos/profiles.js";
import {
  normalizeTier,
  tierFeatureForResource,
  tierHasFeature,
  type TierFeature,
  type TierId,
} from "../tier/tiers.js";

export class TierRequiredError extends Error {
  readonly code = "tier_required" as const;

  constructor(
    public readonly tier: TierId,
    public readonly feature: TierFeature,
    public readonly upgradeTo: TierId = "pro",
  ) {
    super(`Tier ${tier} does not include ${feature}`);
    this.name = "TierRequiredError";
  }
}

/** Throws when the user's tier lacks a feature (hosted billing gate). */
export async function assertTierFeature(userId: string, feature: TierFeature): Promise<TierId> {
  if (!persistenceEnabled || userId === DEV_USER_ID || devAuthBypass()) {
    return "pro";
  }
  const { profile } = await profiles.getOrCreate(userId);
  const tier = normalizeTier(profile.tier);
  if (!tierHasFeature(tier, feature)) {
    throw new TierRequiredError(tier, feature);
  }
  return tier;
}

/** Combined tier + monthly quota check for AI resources. */
export async function assertTierAndQuota(
  userId: string,
  resource: "plan" | "agent" | "browser_min",
): Promise<void> {
  const feature = tierFeatureForResource(resource);
  await assertTierFeature(userId, feature);
  const { assertQuota } = await import("./quota.js");
  await assertQuota(userId, resource);
}
