import { useState } from "react";
import { Lock } from "lucide-react";
import { WORK_SURFACE_META, WORK_SURFACES, type WorkSurface } from "@shared/workSurfaces";
import { shouldBlockPlanStudio } from "@shared/northStarFunnel";
import { SURFACE_UNLOCK, lockedSurfaceCount, surfaceUnlockHint } from "@shared/surfaceUnlock";
import { useApp } from "@renderer/state/store";
import { StageBreadcrumb } from "@renderer/features/workspace/stage/StageBreadcrumb";
import { SurfaceUnlockPanel } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { useSurfaceUnlockProgress } from "@renderer/lib/useSurfaceUnlockProgress";
import { computeSurfaceAvailability } from "./work/surfaceData";

export function WorkSurfaceShell({
  active,
  children,
}: {
  active: WorkSurface;
  children: React.ReactNode;
}) {
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const connected = useApp((s) => s.runtime === "connected");
  const plan = useApp((s) => s.plan);
  const planLoading = useApp((s) => s.planLoading);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const findings = useApp((s) => s.browser.findings);
  const thread = useApp((s) => s.thread);
  const serverAssets = useApp((s) => s.serverAssets);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const [peekSurface, setPeekSurface] = useState<WorkSurface | null>(null);

  const week1Ops = shouldBlockPlanStudio({ opsCadence });

  const threadAssets = thread.filter((e) => e.kind === "asset" && e.asset).map((e) => e.asset!);
  const availability = computeSurfaceAvailability({
    plan,
    planLoading,
    marketingProfile,
    browserFindings: findings,
    threadAssets,
    serverAssets,
  });

  const locked = lockedSurfaceCount(availability);
  const meta = WORK_SURFACE_META[active];
  const peekGuide = peekSurface ? SURFACE_UNLOCK[peekSurface] : null;
  const peekProgress = useSurfaceUnlockProgress(peekSurface ?? active);

  const runGuidePrimary = (surface: WorkSurface) => {
    const guide = SURFACE_UNLOCK[surface];
    if (guide.primaryAction === "generate_plan" && !connected) {
      runSurfaceUnlockAction("preview_plan");
    } else {
      runSurfaceUnlockAction(guide.primaryAction);
    }
    setPeekSurface(null);
  };

  const runGuideSecondary = (surface: WorkSurface) => {
    const guide = SURFACE_UNLOCK[surface];
    if (guide.secondaryAction) runSurfaceUnlockAction(guide.secondaryAction);
    setPeekSurface(null);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur-sm">
        <StageBreadcrumb className="mb-2" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[15px] font-medium text-text">{meta.label}</h1>
            <p className="mt-0.5 text-mini text-text-2">{meta.description}</p>
          </div>
          {locked.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] text-text-3">
              <Lock size={10} /> {locked.length} locked
            </span>
          )}
        </div>
        <nav
          className="mt-3 flex gap-1 overflow-x-auto pb-0.5"
          role="tablist"
          aria-label="Work surfaces"
        >
          {WORK_SURFACES.map((surface) => {
            if (week1Ops && surface === "campaign-plan") return null;
            const sm = WORK_SURFACE_META[surface];
            const enabled = availability[surface];
            const isActive = surface === active;
            const isPeek = peekSurface === surface;
            return (
              <button
                key={surface}
                role="tab"
                aria-selected={isActive}
                title={enabled ? sm.description : surfaceUnlockHint(surface)}
                onClick={() => {
                  if (enabled) {
                    setPeekSurface(null);
                    setWorkSurface(surface);
                  } else {
                    setPeekSurface(isPeek ? null : surface);
                  }
                }}
                className={`shrink-0 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-micro font-medium transition-colors ${
                  isActive
                    ? "bg-accent-soft text-accent ring-1 ring-accent/30"
                    : isPeek
                      ? "bg-warn/10 text-warn ring-1 ring-warn/30"
                      : enabled
                        ? "text-text-2 hover:bg-elevated hover:text-text"
                        : "text-text-3 hover:bg-surface-2 hover:text-text-2"
                }`}
              >
                {!enabled && <Lock size={10} className="mr-1 inline opacity-60" />}
                {sm.shortLabel}
              </button>
            );
          })}
        </nav>
      </header>
      {peekGuide && (
        <SurfaceUnlockPanel
          guide={peekGuide}
          stepDone={peekSurface ? peekProgress.stepDone : undefined}
          onPrimary={() => runGuidePrimary(peekSurface!)}
          onSecondary={
            peekGuide.secondaryAction ? () => runGuideSecondary(peekSurface!) : undefined
          }
          onDismiss={() => setPeekSurface(null)}
        />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
