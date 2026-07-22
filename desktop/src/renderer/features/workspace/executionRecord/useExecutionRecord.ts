import { useMemo } from "react";
import { countApplyPendingGates } from "@shared/feed";
import { runChangedFiles } from "@shared/runs";
import {
  buildActiveExecutionRecord,
  buildExecutionHistory,
  type ActiveRunSnapshot,
  type BuildActiveExecutionRecordInput,
  type ExecutionHistoryEntry,
  type ExecutionRecordView,
} from "@shared/executionRecord";
import { useApp } from "@renderer/state/store";
import { resolveDelegateOperator } from "@shared/cmoDelegateOperator";
import { isDistributionOperatorGate } from "@shared/cmoDistributionOperator";
import { isInfluencerOperatorGate } from "@shared/cmoInfluencerOperator";

function useExecutionRecordInput(): BuildActiveExecutionRecordInput {
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const laneBWorkspace = useApp((s) => s.laneBWorkspace ?? s.marketingProfile?.lane_b_workspace);
  const laneDWorkspace = useApp((s) => s.laneDWorkspace ?? s.marketingProfile?.lane_d_workspace);
  const monetizationWorkspace = useApp(
    (s) => s.monetizationWorkspace ?? s.marketingProfile?.monetization_workspace,
  );
  const channelThesis = useApp((s) => s.channelThesis ?? s.marketingProfile?.channel_thesis);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const cmoContinuous = useApp((s) => s.cmoContinuous ?? s.marketingProfile?.cmo_continuous);
  const growthMemory = useApp((s) => s.growthMemory ?? s.marketingProfile?.growth_memory);
  const campaignSession = useApp((s) => s.marketingProfile?.campaign_session ?? null);
  const growthControlPlane = useApp(
    (s) => s.growthControlPlane ?? s.marketingProfile?.growth_control_plane,
  );
  const distributionOperator = useApp(
    (s) => s.distributionOperator ?? s.marketingProfile?.distribution_operator,
  );
  const influencerOperator = useApp(
    (s) => s.influencerOperator ?? s.marketingProfile?.influencer_operator,
  );
  const delegateRaw = useApp(
    (s) =>
      s.delegateOperator ??
      s.delegateWorkspace ??
      s.marketingProfile?.delegate_operator ??
      s.marketingProfile?.lane_c_workspace,
  );
  const run = useApp((s) => s.run);
  const feedItems = useApp((s) => s.feedItems);
  const shipPipeline = useApp((s) => s.shipPipeline);
  const lastShipReceipt = useApp((s) => s.lastShipReceipt);
  const firstShipAt = useApp((s) => s.firstShipAt);
  const wedgePhase = useApp((s) => s.wedgePhase);
  const project = useApp((s) => s.project);

  const delegateOperator = useMemo(
    () => resolveDelegateOperator(delegateRaw, channelThesis),
    [delegateRaw, channelThesis],
  );

  const executionKernel = useApp(
    (s) => s.executionKernel ?? s.marketingProfile?.execution_kernel,
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

  const activeRun: ActiveRunSnapshot | null = run
    ? {
        runId: run.runId,
        goal: run.goal,
        status: run.status,
        kind: run.kind,
        events: run.events,
        pendingApproval: run.pendingApproval,
        planTaskId: run.planTaskId,
      }
    : null;

  const hasPendingApply =
    countApplyPendingGates(feedItems) > 0 ||
    shipPipeline?.stage === "apply" ||
    shipPipeline?.stage === "approval";

  const approvalFileCount = run
    ? runChangedFiles(run.events).length
    : shipPipeline?.patchCount;

  const pendingVerify =
    Boolean(lastShipReceipt?.verifyStatus === "running") ||
    shipPipeline?.stage === "verify";

  return useMemo(
    () => ({
      plane: growthControlPlane ?? undefined,
      cadence: opsCadence,
      laneBWorkspace,
      laneDWorkspace,
      monetizationWorkspace,
      distributionOperator: distOperatorActive ? distributionOperator : null,
      influencerOperator: infOperatorActive ? influencerOperator : null,
      delegateOperator,
      continuous: cmoContinuous,
      campaignPhase: campaignSession?.phase,
      growthMemory,
      campaignSession,
      channelThesis,
      activeRun,
      hasPendingApply,
      firstShipAt,
      wedgePhase,
      narrativeOneLiner: marketingProfile?.growth_narrative?.one_liner,
      shipReceipt: lastShipReceipt,
      pendingVerify,
      approvalFileCount,
      marketingProfile,
      project,
      executionKernel,
    }),
    [
      growthControlPlane,
      opsCadence,
      laneBWorkspace,
      laneDWorkspace,
      monetizationWorkspace,
      distOperatorActive,
      distributionOperator,
      infOperatorActive,
      influencerOperator,
      delegateOperator,
      cmoContinuous,
      campaignSession,
      growthMemory,
      channelThesis,
      activeRun,
      hasPendingApply,
      firstShipAt,
      wedgePhase,
      marketingProfile?.growth_narrative?.one_liner,
      lastShipReceipt,
      pendingVerify,
      approvalFileCount,
      marketingProfile,
      project,
      executionKernel,
    ],
  );
}

export function useActiveExecutionRecord(): ExecutionRecordView {
  const input = useExecutionRecordInput();
  return useMemo(() => buildActiveExecutionRecord(input), [input]);
}

export function useExecutionHistory(): ExecutionHistoryEntry[] {
  const input = useExecutionRecordInput();
  return useMemo(() => buildExecutionHistory(input), [input]);
}
