/**
 * Hosted tier definitions (Faz 12A).
 * Free = scan + preview only — no AI routes.
 */

export type TierId = "free" | "pro" | "team" | "enterprise";

export type TierFeature =
  | "ai_plan"
  | "ai_agent"
  | "ai_browser"
  | "team_collab"
  | "connector_meta"
  | "client_reports";

export interface TierDefinition {
  id: TierId;
  label: string;
  features: ReadonlySet<TierFeature>;
  quota: { plan_limit: number; agent_limit: number; browser_min_limit: number };
}

const FREE: TierDefinition = {
  id: "free",
  label: "Free",
  features: new Set(),
  quota: { plan_limit: 0, agent_limit: 0, browser_min_limit: 0 },
};

const PRO: TierDefinition = {
  id: "pro",
  label: "Pro",
  features: new Set<TierFeature>(["ai_plan", "ai_agent", "ai_browser", "connector_meta"]),
  quota: { plan_limit: 20, agent_limit: 200, browser_min_limit: 30 },
};

const TEAM: TierDefinition = {
  id: "team",
  label: "Team",
  features: new Set<TierFeature>([
    "ai_plan",
    "ai_agent",
    "ai_browser",
    "team_collab",
    "connector_meta",
    "client_reports",
  ]),
  quota: { plan_limit: 60, agent_limit: 600, browser_min_limit: 90 },
};

const ENTERPRISE: TierDefinition = {
  id: "enterprise",
  label: "Enterprise",
  features: new Set<TierFeature>([
    "ai_plan",
    "ai_agent",
    "ai_browser",
    "team_collab",
    "connector_meta",
    "client_reports",
  ]),
  quota: { plan_limit: 200, agent_limit: 2000, browser_min_limit: 300 },
};

const TIERS: Record<TierId, TierDefinition> = {
  free: FREE,
  pro: PRO,
  team: TEAM,
  enterprise: ENTERPRISE,
};

export function normalizeTier(raw?: string | null): TierId {
  if (raw === "pro" || raw === "team" || raw === "enterprise") return raw;
  return "free";
}

export function tierDefinition(tier: TierId): TierDefinition {
  return TIERS[tier];
}

export function tierHasFeature(tier: TierId, feature: TierFeature): boolean {
  return tierDefinition(tier).features.has(feature);
}

export function tierQuotaFor(tier: TierId): TierDefinition["quota"] {
  return { ...tierDefinition(tier).quota };
}

/** Map AI route resource to tier feature. */
export function tierFeatureForResource(
  resource: "plan" | "agent" | "browser_min",
): TierFeature {
  if (resource === "plan") return "ai_plan";
  if (resource === "agent") return "ai_agent";
  return "ai_browser";
}
