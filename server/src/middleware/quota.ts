import { persistenceEnabled } from "../db/client.js";
import * as profiles from "../db/repos/profiles.js";
import * as usage from "../db/repos/usage.js";

export type QuotaResource = "plan" | "agent" | "browser_min";

export class QuotaExceededError extends Error {
  readonly code = "quota_exceeded" as const;

  constructor(public readonly resource: QuotaResource) {
    super(`Monthly quota exceeded for ${resource}`);
    this.name = "QuotaExceededError";
  }
}

/** Throws {@link QuotaExceededError} when the user has hit their monthly limit. */
export async function assertQuota(userId: string, resource: QuotaResource): Promise<void> {
  if (!persistenceEnabled) return;

  const { quota } = await profiles.getOrCreate(userId);
  const used = await usage.summary(userId);

  const limit =
    resource === "plan"
      ? quota.plan_limit
      : resource === "agent"
        ? quota.agent_limit
        : quota.browser_min_limit;

  const current =
    resource === "plan" ? used.plan : resource === "agent" ? used.agent : used.browser_min;

  if (current >= limit) throw new QuotaExceededError(resource);
}
