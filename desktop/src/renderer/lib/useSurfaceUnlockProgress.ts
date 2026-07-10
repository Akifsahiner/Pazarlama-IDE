import { useMemo } from "react";
import { useApp } from "@renderer/state/store";
import {
  surfaceUnlockProgress,
  type SurfaceUnlockProgressInput,
} from "@shared/surfaceUnlockProgress";
import type { WorkSurface } from "@shared/workSurfaces";

export function useSurfaceUnlockProgress(surface: WorkSurface) {
  const plan = useApp((s) => s.plan);
  const planLoading = useApp((s) => s.planLoading);
  const planPreviewMode = useApp((s) => s.planPreviewMode);
  const planProgress = useApp((s) => s.planProgress);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const browserFindingsCount = useApp((s) => s.browser.findings.length);
  const thread = useApp((s) => s.thread);
  const serverAssets = useApp((s) => s.serverAssets);

  return useMemo(() => {
    const threadAssets = thread.filter((e) => e.kind === "asset" && e.asset).map((e) => e.asset!);
    const adLikeAssetsCount = threadAssets.filter((a) => a.type === "ad" || a.type === "tweet").length;
    const input: SurfaceUnlockProgressInput = {
      plan,
      planLoading,
      planPreviewMode,
      planProgress,
      marketingProfile,
      browserFindingsCount,
      threadAssetsCount: threadAssets.length,
      serverAssetsCount: serverAssets.length,
      adLikeAssetsCount,
    };
    return surfaceUnlockProgress(surface, input);
  }, [
    surface,
    plan,
    planLoading,
    planPreviewMode,
    planProgress,
    marketingProfile,
    browserFindingsCount,
    thread,
    serverAssets,
  ]);
}
