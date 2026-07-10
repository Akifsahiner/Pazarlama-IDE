import type { MarketingPlan, MarketingProfile } from "./types";
import type { PlanProgressSnapshot } from "./planProgress";
import type { WorkSurface } from "./workSurfaces";
import { SURFACE_UNLOCK } from "./surfaceUnlock";

export interface SurfaceUnlockProgressInput {
  plan: MarketingPlan | null;
  planLoading: boolean;
  planPreviewMode: boolean;
  planProgress: PlanProgressSnapshot | null;
  marketingProfile: MarketingProfile | null;
  browserFindingsCount: number;
  threadAssetsCount: number;
  serverAssetsCount: number;
  adLikeAssetsCount: number;
}

function competitorsCount(profile: MarketingProfile | null): number {
  return profile?.competitors?.length ?? 0;
}

function experimentsCount(profile: MarketingProfile | null): number {
  return profile?.previous_experiments?.length ?? 0;
}

function manualKpiCount(profile: MarketingProfile | null): number {
  return profile?.manual_kpis?.length ?? 0;
}

/** Per-step completion for unlock guides — drives "Step 2 of 3" UX. */
export function surfaceUnlockStepDone(
  surface: WorkSurface,
  input: SurfaceUnlockProgressInput,
): boolean[] {
  const done = input.planProgress?.computed.done ?? 0;
  const total = input.planProgress?.computed.total ?? input.plan?.taskGraph.length ?? 0;
  const hasPlan = !!input.plan || input.planLoading || input.planPreviewMode;
  const hasAssets = input.threadAssetsCount > 0 || input.serverAssetsCount > 0;
  const hasResearch =
    input.browserFindingsCount > 0 || competitorsCount(input.marketingProfile) > 0;
  const hasMetrics =
    manualKpiCount(input.marketingProfile) > 0 ||
    experimentsCount(input.marketingProfile) > 0 ||
    (input.plan?.taskGraph.some((t) => !!t.metric) ?? false);

  switch (surface) {
    case "campaign-plan":
      return [hasPlan, done > 0, total > 0 && done >= total];
    case "funnel":
      return [hasPlan, (input.plan?.taskGraph.length ?? 0) >= 1, done > 0];
    case "research-map":
      return [
        input.browserFindingsCount > 0 || competitorsCount(input.marketingProfile) > 0,
        hasResearch,
        hasResearch && input.browserFindingsCount > 0,
      ];
    case "content-set":
      return [input.threadAssetsCount > 0, hasAssets, hasAssets && !!input.plan];
    case "ad-preview":
      return [input.adLikeAssetsCount > 0, input.adLikeAssetsCount > 0, false];
    case "performance":
      return [manualKpiCount(input.marketingProfile) > 0, hasMetrics, hasMetrics];
    case "experiment":
      return [hasPlan, experimentsCount(input.marketingProfile) > 0, experimentsCount(input.marketingProfile) > 0];
    case "marketing-diff":
      return [input.threadAssetsCount > 0, input.threadAssetsCount > 0, false];
  }
}

export function surfaceUnlockProgress(
  surface: WorkSurface,
  input: SurfaceUnlockProgressInput,
): { completed: number; total: number; stepDone: boolean[] } {
  const stepDone = surfaceUnlockStepDone(surface, input);
  const total = SURFACE_UNLOCK[surface].steps.length;
  const completed = stepDone.filter(Boolean).length;
  return { completed, total, stepDone };
}
