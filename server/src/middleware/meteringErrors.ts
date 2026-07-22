import type { TierFeature, TierId } from "../tier/tiers.js";
import { TierRequiredError } from "./tierGate.js";
import { CostBudgetExceededError, QuotaExceededError } from "./quota.js";

export interface TierErrorBody {
  error: "tier_required" | "quota_exceeded" | "cost_budget_exceeded";
  feature?: TierFeature;
  tier?: TierId;
  upgradeTo?: TierId;
  resource?: string;
  message: string;
}

export function sendMeteringError(
  reply: { code: (n: number) => { send: (b: unknown) => void } },
  err: unknown,
): boolean {
  if (err instanceof TierRequiredError) {
    reply.code(403).send({
      error: "tier_required",
      feature: err.feature,
      tier: err.tier,
      upgradeTo: err.upgradeTo,
      message: `Upgrade to ${err.upgradeTo} to use this feature.`,
    } satisfies TierErrorBody);
    return true;
  }
  if (err instanceof QuotaExceededError) {
    reply.code(429).send({
      error: "quota_exceeded",
      resource: err.resource,
      message: err.message,
    } satisfies TierErrorBody);
    return true;
  }
  if (err instanceof CostBudgetExceededError) {
    reply.code(429).send({
      error: "cost_budget_exceeded",
      message:
        "Monthly included API usage reached. Upgrade your plan or wait until next billing cycle.",
    } satisfies TierErrorBody);
    return true;
  }
  return false;
}
