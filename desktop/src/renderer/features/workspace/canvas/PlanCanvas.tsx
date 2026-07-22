import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ChevronDown, PartyPopper } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { normalizePlan, type MarketingPlanSuite } from "@shared/planPlaybooks";
import { useApp } from "@renderer/state/store";
import { ErrorState } from "@renderer/components/ErrorState";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { useSurfaceUnlockProgress } from "@renderer/lib/useSurfaceUnlockProgress";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { Wand2 } from "lucide-react";
import { PLAN_PREVIEW_BADGE, PLAN_AI_BADGE } from "@shared/planLabels";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { heroCrystallize, milestonePop, pageFade } from "@renderer/design/animations";
import { PlanStudioHero } from "./planStudio/PlanStudioHero";
import { HeroReadinessRing } from "./planStudio/HeroReadinessRing";
import { ReadinessVisualization } from "./planStudio/ReadinessVisualization";
import { PlaybookCardGrid } from "./planStudio/PlaybookCardGrid";
import { PlaybookDetailPanel } from "./planStudio/PlaybookDetailPanel";
import { StrategicCallouts } from "./planStudio/StrategicCallouts";
import { ConnectGate } from "@renderer/features/agent/ConnectGate";
import { PlanGenerationStage } from "./planStudio/PlanGenerationStage";
import { PlanStudioOverview } from "./planStudio/PlanStudioOverview";
import { LaunchCommandCenter } from "./planStudio/LaunchCommandCenter";
import { KpiLogCard } from "./planStudio/KpiLogCard";
import { LaunchTimeline } from "./planStudio/LaunchTimeline";
import { SessionLaunchReport } from "./planStudio/SessionLaunchReport";
import { PlanVersionsPanel } from "./planStudio/PlanVersionsPanel";

export function PlanCanvas() {
  const {
    rawPlan,
    loading,
    status,
    error,
    generatePlan,
    previewPlanOutline,
    settings,
    activePlaybookId,
    setActivePlaybook,
    startPlaybook,
    planGenerationPhase,
    planOutlinePlaybooks,
    planStreamingPlaybooks,
    planStreamingThesis,
    planStreamingNarrative,
    planStreamingReadiness,
    planStatusLog,
    planLoadingPlaybookIds,
    planJustGenerated,
    planMilestones,
    planDetailScrollNonce,
    clearPlanMilestone,
    highlightPlanTaskId,
    reducedMotion,
    connected,
    runtime,
    capabilityMatrix,
    openConnectFlow,
    navigate,
    workspaceHandoff,
  } = useApp(
    useShallow((s) => ({
      rawPlan: s.plan,
      loading: s.planLoading,
      status: s.planStatus,
      error: s.planError,
      generatePlan: s.generatePlan,
      previewPlanOutline: s.previewPlanOutline,
      settings: s.settings,
      activePlaybookId: s.activePlaybookId,
      setActivePlaybook: s.setActivePlaybook,
      startPlaybook: s.startPlaybook,
      planGenerationPhase: s.planGenerationPhase,
      planOutlinePlaybooks: s.planOutlinePlaybooks,
      planStreamingPlaybooks: s.planStreamingPlaybooks,
      planStreamingThesis: s.planStreamingThesis,
      planStreamingNarrative: s.planStreamingNarrative,
      planStreamingReadiness: s.planStreamingReadiness,
      planStatusLog: s.planStatusLog,
      planLoadingPlaybookIds: s.planLoadingPlaybookIds,
      planJustGenerated: s.planJustGenerated,
      planMilestones: s.planMilestones,
      planDetailScrollNonce: s.planDetailScrollNonce,
      clearPlanMilestone: s.clearPlanMilestone,
      highlightPlanTaskId: s.highlightPlanTaskId,
      reducedMotion: s.settings.reducedMotion,
      connected: s.runtime === "connected",
      runtime: s.runtime,
      capabilityMatrix: s.capabilityMatrix,
      openConnectFlow: s.openConnectFlow,
      navigate: s.navigate,
      workspaceHandoff: s.workspaceHandoff,
    })),
  );

  const plan = useMemo(() => (rawPlan ? normalizePlan(rawPlan) : null), [rawPlan]);

  useEffect(() => {
    if (!highlightPlanTaskId || !plan) return;
    const task = plan.taskGraph.find((t) => t.id === highlightPlanTaskId);
    if (task?.playbookId && task.playbookId !== activePlaybookId) {
      setActivePlaybook(task.playbookId);
    }
  }, [highlightPlanTaskId, plan, activePlaybookId, setActivePlaybook]);

  // Crystallize moment fires once after a fresh generation, then resets.
  useEffect(() => {
    if (!planJustGenerated || loading) return;
    const t = setTimeout(() => useApp.setState({ planJustGenerated: false }), 1200);
    return () => clearTimeout(t);
  }, [planJustGenerated, loading]);

  useEffect(() => {
    if (!planMilestones.planJustCompleted) return;
    const t = setTimeout(() => clearPlanMilestone("planJustCompleted"), 1200);
    return () => clearTimeout(t);
  }, [planMilestones.planJustCompleted, clearPlanMilestone]);

  const showGeneration =
    loading && (planGenerationPhase !== "idle" || planOutlinePlaybooks.length > 0);
  const openAiBlocked = settings.provider === "openai";
  const planUnlockProgress = useSurfaceUnlockProgress("campaign-plan");
  const deferPlanCta = !!workspaceHandoff;

  return (
    <div className="px-6 py-6">
      {openAiBlocked && !plan && (
        <div className="mx-auto mb-4 max-w-4xl rounded-[var(--radius-md)] border border-warn-border bg-warn-soft px-4 py-3 text-body-sm text-text-2">
          Plan Studio requires Anthropic (Claude). Switch provider in Settings to generate playbooks.
        </div>
      )}

      {error && !loading && (
        <div className="mx-auto mb-5 max-w-4xl space-y-3">
          {planOutlinePlaybooks.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-4 py-3 text-body-sm text-text-2">
              Partial progress saved — {planOutlinePlaybooks.length} playbook outline
              {planOutlinePlaybooks.length === 1 ? "" : "s"} received before the failure. Retry to
              finish, or preview an offline outline while you reconnect.
            </div>
          )}
          <ErrorState
            title="Plan generation failed"
            message={
              error.includes("longer than usual") || error.includes("Still working")
                ? error
                : `${error} You can retry generation, preview a scan-based outline offline, or check connection settings.`
            }
            onRetry={() => void generatePlan()}
            retryLabel="Retry generation"
            onSecondary={
              connected
                ? () => navigate("settings", "connection")
                : () => previewPlanOutline()
            }
            secondaryLabel={connected ? "Open connection settings" : "Preview outline offline"}
          />
        </div>
      )}

      <LayoutGroup>
        <AnimatePresence mode={planJustGenerated ? "popLayout" : "wait"}>
          {showGeneration ? (
            <motion.div
              key="generation"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={pageFade.transition}
            >
              {runtime !== "connected" ? (
                <ConnectGate
                  feature="plan"
                  capability={runtime}
                  matrix={capabilityMatrix}
                  onConnect={openConnectFlow}
                />
              ) : (
                <PlanGenerationStage
                  status={status}
                  phase={planGenerationPhase}
                  thesis={planStreamingThesis}
                  narrativeHook={planStreamingNarrative}
                  stubs={planOutlinePlaybooks}
                  streamingPlaybooks={planStreamingPlaybooks}
                  streamingReadiness={planStreamingReadiness}
                  statusLog={planStatusLog}
                  loadingPlaybookIds={planLoadingPlaybookIds}
                />
              )}
            </motion.div>
          ) : plan ? (
            <motion.div
              key="studio"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={pageFade.transition}
            >
              <PlanStudioBody
                plan={plan}
                activePlaybookId={activePlaybookId}
                onSelectPlaybook={setActivePlaybook}
                onStartPlaybook={startPlaybook}
                crystallizeBeat={planJustGenerated}
                planCompleteBeat={planMilestones.planJustCompleted}
                detailScrollNonce={planDetailScrollNonce}
                celebratePlaybookId={planMilestones.lastPlaybookId}
              />
            </motion.div>
          ) : !loading && !error ? (
          <motion.div key="empty" className="mx-auto flex max-w-4xl justify-center py-16">
            <GuidedEmptyState
              icon={Wand2}
              title={SURFACE_UNLOCK["campaign-plan"].unlockTitle}
              description={
                openAiBlocked
                  ? "Switch to Anthropic (Claude) in Settings to generate a Plan Studio suite."
                  : SURFACE_UNLOCK["campaign-plan"].unlockReason
              }
              steps={SURFACE_UNLOCK["campaign-plan"].steps}
              stepDone={planUnlockProgress.stepDone}
              primaryAction={
                deferPlanCta || openAiBlocked
                  ? undefined
                  : connected
                    ? {
                        label: SURFACE_UNLOCK["campaign-plan"].primaryLabel,
                        onClick: () => runSurfaceUnlockAction("generate_plan"),
                      }
                    : {
                        label: SURFACE_UNLOCK["campaign-plan"].secondaryLabel ?? "Preview outline",
                        onClick: () => runSurfaceUnlockAction("preview_plan"),
                      }
              }
              secondaryAction={
                deferPlanCta || connected || openAiBlocked
                  ? undefined
                  : { label: "Enable AI", onClick: () => openConnectFlow() }
              }
            />
          </motion.div>
        ) : null}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}

/** Plan-complete milestone banner. */
function PlanCompleteBanner({
  plan,
  scrollIntoView,
}: {
  plan: MarketingPlanSuite;
  scrollIntoView?: boolean;
}) {
  const planProgress = useApp((s) => s.planProgress);
  const computed = planProgress?.computed;
  const complete =
    !!computed && computed.total > 0 && computed.terminal >= computed.total;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!complete || !scrollIntoView) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [complete, scrollIntoView]);

  if (!complete) return null;
  return (
    <motion.div
      ref={ref}
      variants={milestonePop}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-ok-border bg-ok-soft px-5 py-4"
    >
      <PartyPopper size={22} className="shrink-0 text-ok" />
      <div>
        <div className="text-body font-semibold text-text">Launch plan complete</div>
        <p className="text-body-sm text-text-2">
          All {computed.total} tasks across {plan.playbooks.length} playbooks are done. Time to
          measure, iterate, and scale what worked.
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Single vertical narrative — no nested tabs:
 * Hero (+ readiness ring) → Timeline → Progress → Playbooks (+detail) → Strategy sheet → Report.
 */
function PlanStudioBody({
  plan,
  activePlaybookId,
  onSelectPlaybook,
  onStartPlaybook,
  crystallizeBeat,
  planCompleteBeat,
  detailScrollNonce,
  celebratePlaybookId,
}: {
  plan: MarketingPlanSuite;
  activePlaybookId?: string;
  onSelectPlaybook: (id?: string) => void;
  onStartPlaybook: (id: string) => void;
  crystallizeBeat?: boolean;
  planCompleteBeat?: boolean;
  detailScrollNonce: number;
  celebratePlaybookId?: string;
}) {
  const [strategyOpen, setStrategyOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const planPreviewMode = useApp((s) => s.planPreviewMode);
  const openConnectFlow = useApp((s) => s.openConnectFlow);
  const generatePlan = useApp((s) => s.generatePlan);
  const runtime = useApp((s) => s.runtime);
  const connected = runtime === "connected";
  const kpiLogDefaultPresetId = useApp((s) => s.kpiLogDefaultPresetId);
  const clearKpiLogDefaultPreset = useApp((s) => s.clearKpiLogDefaultPreset);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!kpiLogDefaultPresetId) return;
    const t = setTimeout(() => clearKpiLogDefaultPreset(), 8000);
    return () => clearTimeout(t);
  }, [kpiLogDefaultPresetId, clearKpiLogDefaultPreset]);

  useEffect(() => {
    if (!detailScrollNonce || !activePlaybookId) return;
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }, [detailScrollNonce, activePlaybookId, reducedMotion]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PlanCompleteBanner plan={plan} scrollIntoView={planCompleteBeat} />

      {planPreviewMode && (
        <div className="sticky top-0 z-20 -mx-0 mb-4 rounded-[var(--radius-md)] border border-warn-border bg-warn-soft px-4 py-3 shadow-[var(--shadow-1)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warn">{PLAN_PREVIEW_BADGE}</Badge>
                <span className="text-mini font-medium text-warn">Not AI-generated</span>
              </div>
              <p className="text-body-sm text-text-2">
                Scan-based outline for navigation only. Connect and generate a personalized AI plan when ready.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => (connected ? void generatePlan() : openConnectFlow())}
              >
                {connected ? "Generate AI plan" : "Enable AI plan"}
              </Button>
              <Button variant="ghost" size="sm" onClick={openConnectFlow}>
                Connection setup
              </Button>
            </div>
          </div>
        </div>
      )}

      {!planPreviewMode && (
        <div className="mb-3">
          <Badge tone="accent">{PLAN_AI_BADGE}</Badge>
        </div>
      )}

      <motion.div variants={crystallizeBeat && !reducedMotion ? heroCrystallize : undefined}>
        <PlanStudioHero plan={plan} crystallizeBeat={crystallizeBeat} previewMode={planPreviewMode} />
      </motion.div>

      <HeroReadinessRing
        plan={plan}
        crystallizeBeat={crystallizeBeat}
        onOpenStrategy={() => setStrategyOpen(true)}
      />

      <LaunchTimeline plan={plan} />

      <PlanVersionsPanel />

      <div>
        <h3 className="mb-3 text-mini font-semibold uppercase tracking-wider text-text-3">Progress</h3>
        <LaunchCommandCenter plan={plan} activePlaybookId={activePlaybookId} />
        <div className="mt-4">
          <KpiLogCard defaultPresetId={kpiLogDefaultPresetId} />
        </div>
      </div>

      <PlaybookCardGrid
        plan={plan}
        activePlaybookId={activePlaybookId}
        celebratePlaybookId={celebratePlaybookId}
        onSelect={(id) => onSelectPlaybook(activePlaybookId === id ? undefined : id)}
        onStart={onStartPlaybook}
      />

      {activePlaybookId && (
        <div ref={detailRef}>
          <PlaybookDetailPanel
            plan={plan}
            playbookId={activePlaybookId}
            onClose={() => onSelectPlaybook(undefined)}
          />
        </div>
      )}

      <section className="rounded-[var(--radius-lg)] border border-line bg-surface">
        <button
          type="button"
          onClick={() => setStrategyOpen((v) => !v)}
          aria-expanded={strategyOpen}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <span className="text-mini font-semibold uppercase tracking-wider text-text-3">
            Strategy sheet — positioning, ICP, calendar, readiness
          </span>
          <ChevronDown
            size={14}
            className={`text-text-3 transition-transform duration-[var(--dur-fast)] ${strategyOpen ? "rotate-180" : ""}`}
          />
        </button>
        {strategyOpen && (
          <div className="space-y-4 border-t border-line p-5">
            <PlanStudioOverview plan={plan} />
            <ReadinessVisualization readiness={plan.readiness} plan={plan} />
            <StrategicCallouts plan={plan} />
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius-lg)] border border-line bg-surface">
        <button
          type="button"
          onClick={() => setExportOpen((v) => !v)}
          aria-expanded={exportOpen}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
          data-testid="plan-ops-snapshot-toggle"
        >
          <span className="text-mini font-semibold uppercase tracking-wider text-text-3">
            {opsCadence
              ? "Export ops snapshot (optional — daily work lives on Ops board)"
              : "Export ops snapshot (optional)"}
          </span>
          <ChevronDown
            size={14}
            className={`text-text-3 transition-transform duration-[var(--dur-fast)] ${exportOpen ? "rotate-180" : ""}`}
          />
        </button>
        {exportOpen && (
          <div id="session-launch-report" className="border-t border-line p-5">
            <SessionLaunchReport />
          </div>
        )}
      </section>
    </div>
  );
}
