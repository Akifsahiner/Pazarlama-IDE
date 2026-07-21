import { useMemo } from "react";
import { useApp } from "@renderer/state/store";
import { ResizablePanel } from "@renderer/components/ResizablePanel";
import { ContextSidebar } from "@renderer/features/workspace/ContextSidebar";
import { SessionHistory } from "@renderer/features/history/SessionHistory";
import { ExecutionFeed } from "@renderer/features/workspace/ExecutionFeed";
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
import { ExecutionRecordStage } from "@renderer/features/workspace/executionRecord/ExecutionRecordStage";
import { WorkspaceCommandDock } from "@renderer/features/workspace/executionRecord/WorkspaceCommandDock";

export function Workspace() {
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed);
  const historyOpen = useApp((s) => s.historyOpen);
  const toggleHistory = useApp((s) => s.toggleHistory);
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

      {!sidebarCollapsed && (
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

        {warRoomExpanded && growthControlPlane && opsCadence && (
          <div className="absolute inset-x-0 top-[var(--next-action-h,0px)] z-[var(--z-overlay)] max-h-[70vh] overflow-y-auto border-b border-line bg-bg shadow-[var(--shadow-3)]">
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
          </div>
        )}

        {/* Center stack: Record + artifact (flex-1) · command dock (bottom) */}
        <div className="flex min-h-0 flex-1 flex-col">
          <ExecutionRecordStage />
          <WorkspaceCommandDock />
        </div>

        {!feedCollapsed && <ExecutionFeed mini />}
      </div>
    </div>
  );
}
