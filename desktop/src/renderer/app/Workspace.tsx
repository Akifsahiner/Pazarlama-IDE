import { PanelRightOpen } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@renderer/state/store";
import { isCommandSurfaceActive } from "@shared/cmoCommandSurface";
import { ResizablePanel } from "@renderer/components/ResizablePanel";
import { ResizableVerticalPanel } from "@renderer/components/ResizableVerticalPanel";
import { ContextSidebar } from "@renderer/features/workspace/ContextSidebar";
import { SessionHistory } from "@renderer/features/history/SessionHistory";
import { Canvas } from "@renderer/features/workspace/Canvas";
import { AgentThread } from "@renderer/features/agent/AgentThread";
import { ExecutionFeed } from "@renderer/features/workspace/ExecutionFeed";
import { StageBreadcrumb } from "@renderer/features/workspace/stage/StageBreadcrumb";
import { Composer } from "@renderer/features/agent/Composer";
import { SalesExportBar } from "@renderer/features/workspace/SalesExportBar";
import { ExecutionQueuePanel } from "@renderer/features/workspace/ExecutionQueuePanel";
import { NextActionBar } from "@renderer/components/NextActionBar";
import { WorkspaceHandoffBanner } from "@renderer/components/WorkspaceHandoffBanner";
import { HandoffConfirmModal } from "@renderer/components/HandoffConfirmModal";
import { OpsTaskProofModal } from "@renderer/features/workspace/OpsTaskProofModal";
import { LaneBItemProofModal } from "@renderer/features/workspace/LaneBItemProofModal";
import { ProductRequestProofModal } from "@renderer/features/workspace/ProductRequestProofModal";
import { ProductIssueExportModal } from "@renderer/features/workspace/ProductIssueExportModal";
import { RevenueAttributionProofModal } from "@renderer/features/workspace/RevenueAttributionProofModal";
import { DelegateBriefModal } from "@renderer/features/workspace/DelegatePanel";
import { DelegateHireModal } from "@renderer/features/workspace/DelegateHireModal";
import { DelegateRubricModal } from "@renderer/features/workspace/DelegateRubricModal";
import { GrowthCommandSurface } from "@renderer/features/workspace/GrowthCommandSurface";
import { CmoBackstage } from "@renderer/features/workspace/CmoBackstage";
import { DistributionProofModal } from "@renderer/features/workspace/DistributionProofModal";
import { InfluencerProofModal } from "@renderer/features/workspace/InfluencerProofModal";
import { InfluencerDealModal } from "@renderer/features/workspace/InfluencerDealModal";
import { isDistributionOperatorGate } from "@shared/cmoDistributionOperator";
import { isInfluencerOperatorGate } from "@shared/cmoInfluencerOperator";
import { isDelegateOperatorGate, resolveDelegateOperator } from "@shared/cmoDelegateOperator";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";
import { assessMeasurementBaseline, isMeasurementGateHard } from "@shared/measurementBaseline";
import { BudgetSetupCard } from "@renderer/features/onboarding/BudgetSetupCard";
import { ProductActivationCard } from "@renderer/features/onboarding/ProductActivationCard";
import { RevenueSetupCard } from "@renderer/features/onboarding/RevenueSetupCard";

export function Workspace() {
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed);
  const historyOpen = useApp((s) => s.historyOpen);
  const toggleHistory = useApp((s) => s.toggleHistory);
  const focusMode = useApp((s) => s.focusMode);
  const toggleFocusMode = useApp((s) => s.toggleFocusMode);
  const feedCollapsed = useApp((s) => s.feedCollapsed);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const laneBWorkspace = useApp((s) => s.laneBWorkspace ?? s.marketingProfile?.lane_b_workspace);
  const laneAWorkspace = useApp((s) => s.laneAWorkspace ?? s.marketingProfile?.lane_a_workspace);
  const laneDWorkspace = useApp((s) => s.laneDWorkspace ?? s.marketingProfile?.lane_d_workspace);
  const monetizationWorkspace = useApp(
    (s) => s.monetizationWorkspace ?? s.marketingProfile?.monetization_workspace,
  );
  const revenueProfile = useApp((s) => s.revenueProfile ?? s.marketingProfile?.revenue_profile);
  const project = useApp((s) => s.project);
  const channelThesis = useApp((s) => s.channelThesis ?? s.marketingProfile?.channel_thesis);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const productActivation = useApp(
    (s) => s.productActivation ?? s.marketingProfile?.product_activation,
  );
  const cmoContinuous = useApp((s) => s.cmoContinuous ?? s.marketingProfile?.cmo_continuous);
  const growthMemory = useApp((s) => s.growthMemory ?? s.marketingProfile?.growth_memory);
  const campaignSession = useApp((s) => s.marketingProfile?.campaign_session ?? null);
  const delegateRaw = useApp(
    (s) => s.delegateOperator ?? s.delegateWorkspace ?? s.marketingProfile?.delegate_operator ?? s.marketingProfile?.lane_c_workspace,
  );
  const delegateWorkspace = useMemo(
    () => resolveDelegateOperator(delegateRaw, channelThesis),
    [delegateRaw, channelThesis],
  );
  const growthControlPlane = useApp(
    (s) => s.growthControlPlane ?? s.marketingProfile?.growth_control_plane,
  );
  const warRoomExpanded = useApp((s) => s.warRoomExpanded);
  const distributionOperator = useApp(
    (s) => s.distributionOperator ?? s.marketingProfile?.distribution_operator,
  );
  const influencerOperator = useApp(
    (s) => s.influencerOperator ?? s.marketingProfile?.influencer_operator,
  );

  const commandSurfaceActive = isCommandSurfaceActive({ growthControlPlane, opsCadence });
  const distOperatorActive =
    !!distributionOperator &&
    isDistributionOperatorGate({
      thesis: channelThesis,
      opsCadence,
      growthPlane: growthControlPlane,
    });
  const infOperatorActive =
    !!influencerOperator &&
    isInfluencerOperatorGate({
      thesis: channelThesis,
      opsCadence,
      growthPlane: growthControlPlane,
    });
  const delegateOperatorActive =
    !!delegateWorkspace &&
    isDelegateOperatorGate({
      thesis: channelThesis,
      opsCadence,
    });
  const week1Ready = Boolean(
    productActivation &&
      revenueProfile &&
      (!isMeasurementGateHard() ||
        assessMeasurementBaseline(marketingProfile, project).ready),
  );
  const needsPreWeek1Setup =
    Boolean(channelThesis) &&
    !opsCadence &&
    isStrategicDecisionSealed(marketingProfile) &&
    !week1Ready;
  return (
    <div className="relative flex h-full min-h-0 flex-1">
      <HandoffConfirmModal />
      <OpsTaskProofModal />
      <DelegateBriefModal />
      <DelegateHireModal />
      <DelegateRubricModal />
      <LaneBItemProofModal />
      <ProductRequestProofModal />
      <ProductIssueExportModal />
      <RevenueAttributionProofModal />
      <DistributionProofModal />
      <InfluencerProofModal />
      <InfluencerDealModal />
      {historyOpen && (
        <div className="absolute left-0 top-0 z-[var(--z-overlay)] h-full w-64 border-r border-line shadow-[var(--shadow-3)]">
          <SessionHistory onClose={() => toggleHistory(false)} />
        </div>
      )}

      {!sidebarCollapsed && !focusMode && (
        <ResizablePanel
          side="left"
          storageKey="panel.project-rail"
          defaultWidth={280}
          min={240}
          max={360}
        >
          <ContextSidebar />
        </ResizablePanel>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHandoffBanner />
        <NextActionBar scope="workspace" />
        {needsPreWeek1Setup && (
          <div className="shrink-0 space-y-3 border-b border-line px-4 py-3">
            <p className="text-mini text-warn">
              Complete product activation and revenue intake before Week 1 starts.
            </p>
            <BudgetSetupCard />
            <ProductActivationCard />
            <RevenueSetupCard />
          </div>
        )}
        {commandSurfaceActive && growthControlPlane && opsCadence && (
          <div className="shrink-0 border-b border-line px-4 py-3">
            <GrowthCommandSurface
              plane={growthControlPlane}
              cadence={opsCadence}
              laneBWorkspace={laneBWorkspace}
              laneDWorkspace={laneDWorkspace}
              monetizationWorkspace={monetizationWorkspace}
              revenueProfile={revenueProfile}
              distributionOperator={distOperatorActive ? distributionOperator : null}
              influencerOperator={infOperatorActive ? influencerOperator : null}
              delegateOperator={delegateOperatorActive ? delegateWorkspace : null}
              continuous={cmoContinuous}
              campaignSession={campaignSession}
              growthMemory={growthMemory}
              compact
            />
          </div>
        )}
        {commandSurfaceActive && warRoomExpanded && growthControlPlane && opsCadence && (
          <CmoBackstage
            cadence={opsCadence}
            thesis={channelThesis}
            plane={growthControlPlane}
            laneAWorkspace={laneAWorkspace}
            laneBWorkspace={laneBWorkspace}
            laneDWorkspace={laneDWorkspace}
            monetizationWorkspace={monetizationWorkspace}
            distributionOperator={distOperatorActive ? distributionOperator : null}
            influencerOperator={infOperatorActive ? influencerOperator : null}
            delegateOperator={delegateOperatorActive ? delegateWorkspace : null}
            continuous={cmoContinuous}
            campaignSession={campaignSession}
            growthMemory={growthMemory}
            compact
          />
        )}
        {!commandSurfaceActive && growthControlPlane && opsCadence && (
          <CmoBackstage
            cadence={opsCadence}
            thesis={channelThesis}
            plane={growthControlPlane}
            laneAWorkspace={laneAWorkspace}
            laneBWorkspace={laneBWorkspace}
            laneDWorkspace={laneDWorkspace}
            monetizationWorkspace={monetizationWorkspace}
            distributionOperator={distOperatorActive ? distributionOperator : null}
            influencerOperator={infOperatorActive ? influencerOperator : null}
            delegateOperator={delegateOperatorActive ? delegateWorkspace : null}
            continuous={cmoContinuous}
            campaignSession={campaignSession}
            growthMemory={growthMemory}
            compact
          />
        )}
        <SalesExportBar />
        <ExecutionQueuePanel />
        <div className="relative flex min-h-0 flex-1">
          <div className="relative flex h-full min-h-0 min-w-0 flex-1">
            <Canvas />
            {focusMode && (
              <button
                onClick={() => toggleFocusMode(false)}
                title="Exit focus mode"
                className="app-no-drag absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line bg-surface/90 px-2.5 py-1 text-label text-text-2 backdrop-blur-sm transition-colors hover:bg-elevated hover:text-text"
              >
                <PanelRightOpen size={13} /> Show conversation
              </button>
            )}
          </div>

          {!focusMode && (
            <ResizablePanel
              side="right"
              storageKey="panel.agent"
              defaultWidth={380}
              min={320}
              max={560}
            >
              <AgentThread />
            </ResizablePanel>
          )}
        </div>

        {focusMode && (
          <div className="shrink-0 border-t border-line bg-surface">
            <div className="px-4 pt-2">
              <StageBreadcrumb />
            </div>
            <Composer />
          </div>
        )}

        {focusMode || feedCollapsed ? (
          <ExecutionFeed mini={focusMode} />
        ) : (
          <ResizableVerticalPanel
            storageKey="panel.execution-feed"
            defaultHeight={200}
            min={120}
            max={320}
          >
            <ExecutionFeed />
          </ResizableVerticalPanel>
        )}
      </div>
    </div>
  );
}
