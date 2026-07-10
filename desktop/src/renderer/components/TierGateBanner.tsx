import { presentError } from "@renderer/lib/errorPresenter";
import { useApp } from "@renderer/state/store";
import { normalizeTier, tierHasFeature, tierUpgradeLabel, type TierFeature } from "@shared/tierFeatures";

function BannerAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 underline underline-offset-2 transition-opacity hover:opacity-80"
    >
      {label}
    </button>
  );
}

/** Surfaces hosted free-tier limits and upgrade path (Faz 12A). */
export function TierGateBanner() {
  const runtime = useApp((s) => s.runtime);
  const auth = useApp((s) => s.auth);
  const tierFeatures = useApp((s) => s.tierFeatures);
  const navigate = useApp((s) => s.navigate);

  if (runtime !== "connected" || !auth.authEnabled || auth.state !== "signed-in") return null;

  const tier = normalizeTier(auth.user?.tier);
  const aiBlocked =
    !tierHasFeature(tierFeatures, "ai_plan") && !tierHasFeature(tierFeatures, "ai_agent");

  if (!aiBlocked) return null;

  const upgrade = tierUpgradeLabel(tier);

  return (
    <div
      className="border-b border-accent/30 bg-accent-soft/20 px-3 py-1.5 text-center text-mini text-text-2"
      data-testid="tier-gate-banner"
    >
      {presentError("tier_free_scan_preview").message}
      <BannerAction label={`Upgrade to ${upgrade}`} onClick={() => navigate("settings", "account")} />
    </div>
  );
}

export function tierFeatureBlocked(
  tierFeatures: string[] | undefined,
  feature: TierFeature,
): boolean {
  return !tierHasFeature(tierFeatures, feature);
}
