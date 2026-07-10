/** Client mirror of server tier features (Faz 12A). */

export type TierId = "free" | "pro" | "team" | "enterprise";

export type TierFeature =
  | "ai_plan"
  | "ai_agent"
  | "ai_browser"
  | "team_collab"
  | "connector_meta"
  | "client_reports";

export function normalizeTier(raw?: string | null): TierId {
  if (raw === "pro" || raw === "team" || raw === "enterprise") return raw;
  return "free";
}

export function tierHasFeature(features: string[] | undefined, feature: TierFeature): boolean {
  return features?.includes(feature) ?? false;
}

export function tierUpgradeLabel(tier: TierId): string {
  if (tier === "free") return "Pro";
  if (tier === "pro") return "Team";
  return "Enterprise";
}

export function tierBlockedMessage(feature: TierFeature, tier: TierId): string {
  const upgrade = tierUpgradeLabel(tier);
  const labels: Record<TierFeature, string> = {
    ai_plan: "AI plan generation",
    ai_agent: "Ask & agent runs",
    ai_browser: "Browser research",
    team_collab: "Team collaboration",
    connector_meta: "Meta Ads connector",
    client_reports: "Client report sharing",
  };
  return `${labels[feature]} requires ${upgrade}. Upgrade in Settings → Account.`;
}
