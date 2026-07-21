#!/usr/bin/env node
/**
 * Structural smoke for wow-checklist critical paths — no Electron required.
 * Validates that key UX surfaces exist so manual QA doesn't regress silently.
 */
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** [file, needle, label] — file must contain needle */
const MARKERS = [
  ["src/renderer/features/onboarding/ScanTheater.tsx", "ScanTheater", "Scan theater onboarding"],
  ["src/renderer/features/onboarding/Welcome.tsx", "Your first hour", "Welcome journey preview"],
  ["src/renderer/features/onboarding/ProjectReveal.tsx", "beginFirstHour", "One-click first hour CTA"],
  ["src/renderer/features/onboarding/ProjectReveal.tsx", "ProjectReveal", "Project reveal"],
  ["src/renderer/state/store.ts", "beginFirstHour", "First hour store action"],
  ["src/renderer/features/home/HomePage.tsx", "first-hour-progress-card", "Home first hour hub"],
  ["src/shared/firstHour.ts", "FIRST_HOUR_MILESTONES", "First hour milestones copy"],
  ["src/renderer/features/workspace/canvas/planStudio/PlanGenerationStage.tsx", "PlanGenerationStage", "Plan generation theater"],
  ["src/renderer/features/workspace/canvas/planStudio/LaunchTimeline.tsx", "Retry", "Timeline failed-task retry"],
  ["src/renderer/components/WorkspaceHandoffBanner.tsx", "execute_intent", "Handoff execute_intent action"],
  ["src/renderer/components/HandoffConfirmModal.tsx", "handoff-confirm-modal", "Edit run confirm modal"],
  ["src/renderer/components/AssetActionBar.tsx", "integrate_run", "Asset integrate primary CTA"],
  ["src/renderer/features/workspace/canvas/work/PerformanceTableCanvas.tsx", "Sync GA4", "GA4 sync button"],
  ["src/renderer/features/workspace/canvas/work/ExperimentResultCanvas.tsx", "Evidence (last run)", "Experiment evidence auto-fill"],
  ["src/shared/conversationIntent.ts", "record_experiment", "Record experiment intent"],
  ["src/shared/conversationIntent.ts", "resolveIntent", "Conversation intent resolver"],
  ["src/shared/intentPreview.ts", "describeResolvedIntent", "Auto intent preview chip"],
  ["src/shared/campaignSession.ts", "applyCampaignPhaseEvent", "Campaign session phase engine"],
  ["src/renderer/features/agent/CampaignTimeline.tsx", "campaign-timeline", "Thread campaign timeline"],
  ["src/renderer/features/home/HomePage.tsx", "active-campaign-card", "Home active campaign card"],
  ["src/shared/agentTurnContext.ts", "buildAgentTurnContext", "Agent turn context builder"],
  ["src/renderer/features/agent/cards/ProactiveSuggestionCard.tsx", "proactive-suggestion-card", "Proactive suggestion card"],
  ["src/renderer/components/DraftQualityBadge.tsx", "draft-quality-badge", "Draft quality badge"],
  ["src/renderer/features/agent/IntentPreviewChip.tsx", "intent-preview-chip", "Composer intent preview"],
  ["src/renderer/features/agent/MessageList.tsx", "message-run-link", "Message-run correlation link"],
  ["e2e/handoff.spec.ts", "@handoff", "Handoff e2e spec"],
  ["e2e/outreach.spec.ts", "@outreach", "Outreach dispatch e2e"],
  ["e2e/execution-queue.spec.ts", "@execution-queue", "Execution queue e2e"],
  ["src/renderer/components/GuidedEmptyState.tsx", "GuidedEmptyState", "Guided empty states"],
  ["src/renderer/features/workspace/canvas/PlanCanvas.tsx", "Plan generation failed", "Plan failure UX"],
  ["src/renderer/features/agent/MarketingDecisionCard.tsx", "DecisionQualityBadge", "Decision quality badge"],
  ["src/renderer/features/agent/MarketingDecisionCard.tsx", "EffortBadge", "Decision effort badge"],
  ["src/renderer/features/workspace/canvas/planStudio/LaunchTimeline.tsx", "PeakDayWarning", "Launch peak day warning"],
  ["src/renderer/components/CodeHighlight.tsx", "CodeHighlight", "Shiki syntax highlighting"],
  ["src/renderer/features/workspace/operator/Operator.tsx", "Operator", "Browser operator"],
  ["src/renderer/features/runs/RunReplayBanner.tsx", "Archived run", "Run replay banner"],
  ["src/renderer/features/settings/UsageQuotaSection.tsx", "UsageQuotaSection", "Usage quota panel"],
  ["src/shared/personaValue.ts", "honestyNote", "Persona honesty notes"],
  ["src/shared/planLabels.ts", "PLAN_PREVIEW_BADGE", "Plan preview badge"],
  ["src/renderer/components/ConnectionSetupWizard.tsx", "Connection setup wizard", "Connection setup wizard"],
  ["src/renderer/components/HelpPage.tsx", "What to expect", "Help expectations section"],
  ["src/shared/planNavigation.ts", "resolvePlanDeepLink", "Plan deep links"],
  ["src/renderer/features/workspace/canvas/work/PerformanceTableCanvas.tsx", "Log KPI manually", "Manual KPI path"],
  ["src/renderer/features/workspace/ExecutionQueuePanel.tsx", "execution-queue-panel", "Execution queue panel"],
  ["src/renderer/features/assets/OutreachDispatchPanel.tsx", "outreach-dispatch-confirm", "Outreach confirm modal"],
  ["src/renderer/features/agent/cards/PlanRevisionCard.tsx", "plan-revision-card", "Plan revision diff card"],
  ["src/shared/planDiff.ts", "diffPlanVersions", "Plan version diff"],
  ["src/renderer/features/workspace/canvas/planStudio/PlanVersionsPanel.tsx", "plan-versions-panel", "Plan versions panel"],
  ["src/shared/planProgressReconcile.ts", "reconcileProgressAfterPlanChange", "Plan progress reconcile"],
  ["src/renderer/features/workspace/canvas/work/AdPreviewCanvas.tsx", "Export pack", "Ad export pack zip"],
  ["src/renderer/features/workspace/canvas/planStudio/SessionLaunchReport.tsx", "Download PDF", "Session report PDF export"],
  ["src/renderer/components/StatusBar.tsx", "queued", "Offline message outbox indicator"],
  ["e2e/smoke.spec.ts", "test(", "E2E smoke spec"],
  ["e2e/wow.spec.ts", "@wow", "WOW e2e journey"],
  ["src/shared/surfaceUnlockProgress.ts", "surfaceUnlockStepDone", "Surface unlock progress"],
  ["src/renderer/components/TierGateBanner.tsx", "tier-gate-banner", "Hosted free-tier gate banner"],
  ["src/renderer/features/settings/ConnectorMarketplaceSection.tsx", "connector-marketplace", "Connector marketplace settings"],
  ["src/renderer/features/settings/TeamSettingsSection.tsx", "team-settings", "Team settings section"],
  ["src/renderer/features/settings/QualityDashboardSection.tsx", "quality-dashboard", "Quality dashboard section"],
  ["src/renderer/components/FeedbackThumbs.tsx", "ThumbsUp", "Decision feedback thumbs"],
  ["src/renderer/components/BundledLocalServerCard.tsx", "bundled-local-server", "Bundled local stack in connect"],
  ["src/renderer/components/Navigator.tsx", "Dashboard", "Workspace-first nav"],
  ["src/renderer/features/workspace/canvas/planStudio/SessionLaunchReport.tsx", "share-client-report", "Client report share CTA"],
  // CMO P0–P5 (wow-checklist §CMO Intake … Lane C)
  ["src/shared/cmoIntake.ts", "buildCmoIntake", "P0 CMO intake engine"],
  ["src/renderer/state/store.ts", "runCmoIntake", "P0 runCmoIntake + tracking"],
  ["src/renderer/features/onboarding/CmoIntakeCard.tsx", "cmo-intake-card", "P0 CmoIntakeCard"],
  ["src/renderer/features/onboarding/ProjectReveal.tsx", "beginCmoWeek1", "P0 Start Week 1 CTA"],
  ["src/renderer/features/workspace/CmoOpsBoard.tsx", "cmo-ops-board", "P1 CmoOpsBoard"],
  ["src/shared/cmoOpsCadence.ts", "tryAutoCompleteSystemTask", "P1 system auto-complete"],
  ["src/renderer/features/workspace/OpsTaskProofModal.tsx", "Pull GA4", "P2 GA4 pull in proof"],
  ["src/shared/cmoProofLoop.ts", "canCompleteWeekReview", "P2 week review KPI gate"],
  ["src/renderer/features/workspace/CmoPivotCard.tsx", "cmo-pivot-card", "P2 pivot suggestion card"],
  ["src/renderer/features/workspace/LaneBPanel.tsx", "lane-b-panel", "P3 LaneBPanel"],
  ["src/shared/nextAction.ts", "opsQueueBlocksLaneWork", "P3/P5 ops-gated lane work"],
  ["src/renderer/features/workspace/CmoCyclePanel.tsx", "cmo-cycle-panel", "P4 CmoCyclePanel"],
  ["src/renderer/state/store.ts", "startNextCmoCycle", "P4 start next cycle"],
  ["src/shared/cmoContinuous.ts", "archiveCompletedCycle", "P4 cycle archive"],
  ["src/renderer/features/workspace/DelegatePanel.tsx", "delegate-panel", "P5 DelegatePanel"],
  ["src/renderer/features/workspace/DelegatePanel.tsx", "delegate-brief-modal", "P5 DelegateBriefModal"],
  ["src/renderer/features/workspace/LaneBPanel.tsx", "outreach-export-csv", "P5 outreach CSV export"],
  ["src/shared/cmoMeasurement.ts", "planGa4SyncOnCycleStart", "P5 GA4 on cycle start"],
  ["src/renderer/state/store.ts", "handOffDelegateBrief", "P5 delegate handoff"],
  ["src/shared/cmoLaneA.ts", "resolveLaneARunPlan", "P6 Lane A run resolver"],
  ["src/shared/cmoLaneA.ts", "createLaneAWorkspaceFromThesis", "P6 Lane A workspace"],
  ["src/renderer/features/workspace/LaneAPanel.tsx", "lane-a-panel", "P6 LaneAPanel"],
  ["src/renderer/state/store.ts", "startLaneARun", "P6 thesis-aware IDE run"],
  ["src/shared/types.ts", "lane_a_workspace", "P6 Lane A profile schema"],
  ["src/shared/cmoGrowthPlane.ts", "buildGrowthControlPlane", "P7 growth plane engine"],
  ["src/shared/cmoGrowthPlane.ts", "resolveBindingBottleneck", "P7 binding bottleneck"],
  ["src/renderer/features/workspace/GrowthCommandSurface.tsx", "growth-command-surface", "P12 command surface"],
  ["src/shared/types.ts", "growth_control_plane", "P7 growth plane profile schema"],
  ["src/renderer/state/store.ts", "recomputeGrowthPlane", "P7 growth plane recompute"],
  ["src/renderer/state/store.ts", "toggleWarRoomExpanded", "P7 war room expand"],
  ["src/shared/cmoCommandSurface.ts", "isCommandSurfaceActive", "P12 command-surface visibility"],
  // CMO P8 — Distribution Operator
  ["src/shared/cmoDistributionOperator.ts", "buildDistributionOperator", "P8 distribution operator engine"],
  ["src/shared/cmoDistributionOperator.ts", "evaluateHookPerformance", "P8 hook scale/kill rules"],
  ["src/renderer/features/workspace/DistributionOperatorPanel.tsx", "distribution-operator-panel", "P8 hook grid panel"],
  ["src/renderer/state/store.ts", "completeDistributionSlot", "P8 distribution proof action"],
  ["src/shared/types.ts", "distribution_operator", "P8 distribution operator profile schema"],
  // CMO P9 — Influencer Operator
  ["src/shared/cmoInfluencerOperator.ts", "buildInfluencerOperator", "P9 influencer operator engine"],
  ["src/shared/cmoInfluencerOperator.ts", "evaluatePitchPerformance", "P9 pitch scale/kill rules"],
  ["src/renderer/features/workspace/InfluencerOperatorPanel.tsx", "influencer-operator-panel", "P9 pipeline board panel"],
  ["src/renderer/state/store.ts", "completeInfluencerTouch", "P9 influencer proof action"],
  ["src/shared/types.ts", "influencer_operator", "P9 influencer operator profile schema"],
  // CMO P10 — Delegation Operator
  ["src/shared/cmoDelegateOperator.ts", "buildDelegateOperator", "P10 delegation operator engine"],
  ["src/shared/cmoDelegateOperator.ts", "evaluateDelegatePerformance", "P10 delegate verdict rules"],
  ["src/renderer/features/workspace/DelegateOperatorPanel.tsx", "delegate-operator-panel", "P10 delegation panel"],
  ["src/renderer/state/store.ts", "completeDelegateRubricDay", "P10 rubric proof action"],
  ["src/shared/types.ts", "delegate_operator", "P10 delegate operator profile schema"],
  // CMO P11 — Growth Memory
  ["src/shared/cmoGrowthMemory.ts", "harvestMemoryFromCycle", "P11 experiment harvest"],
  ["src/shared/cmoGrowthMemory.ts", "buildReplanPreview", "P11 memory-aware replan"],
  ["src/renderer/features/workspace/GrowthMemoryPanel.tsx", "growth-memory-panel", "P11 growth memory panel"],
  ["src/renderer/features/workspace/ReplanPreviewCard.tsx", "replan-preview-card", "P11 replan preview"],
  // CMO P12 — Command Surface Simplification
  ["src/shared/cmoCommandSurface.ts", "resolveTodayWhy", "P12 deterministic why"],
  ["src/shared/cmoCommandSurface.ts", "isCommandSurfaceOwnedAction", "P12 action ownership"],
  ["src/renderer/features/workspace/GrowthCommandSurface.tsx", "growth-command-surface", "P12 four-field surface"],
  ["src/renderer/features/workspace/CommandSurfaceGovernanceBanner.tsx", "command-surface-governance", "P12 governance banner"],
  ["src/shared/cmoHumanExecutionBind.ts", "bindHumanExecutionForCadence", "Faz 3 human execution bind"],
  ["src/renderer/features/workspace/ReplanPreviewStrip.tsx", "replan-preview-strip", "Faz 3 replan strip"],
  ["src/shared/cmoCommandSurface.ts", "command-surface-start-next-cycle", "Faz 3 replan primary CTA"],
  ["e2e/cmo-multi-week.spec.ts", "@cmo-multi", "Faz 3 multi-week E2E"],
  ["src/renderer/features/workspace/CmoBackstage.tsx", "cmo-backstage", "P12 backstage"],
  // Part 0 — Execution Record Center
  ["src/shared/executionRecord.ts", "buildBottleneckSentence", "Part 0 bottleneck sentence"],
  ["src/shared/executionRecord.ts", "buildActiveExecutionRecord", "Part 0 record view-model"],
  ["src/renderer/features/workspace/executionRecord/ExecutionRecordStage.tsx", "execution-record-stage", "Part 0 workspace center"],
  ["src/renderer/features/workspace/executionRecord/BottleneckSentence.tsx", "bottleneck-sentence", "Part 0 bottleneck UI"],
  ["src/renderer/features/workspace/executionRecord/ExecutionRecordCard.tsx", "execution-record-card", "Part 0 accountability card"],
  ["src/renderer/app/Workspace.tsx", "ExecutionRecordStage", "Part 0 workspace shell"],
  // Part 10 — Execution Kernel
  ["src/shared/executionKernel.ts", "dispatchExecutionTask", "Part 10 kernel dispatch"],
  ["src/shared/executionKernel.ts", "bootstrapExecutionKernel", "Part 10 kernel bootstrap"],
  ["src/shared/executionHandlers.ts", "EXECUTION_HANDLER_REGISTRY", "Part 10 handler registry"],
  ["src/shared/executionGraph.ts", "isTaskGraphReady", "Part 10 dependency graph"],
  ["src/shared/executionKernelBridge.ts", "planKernelDispatch", "Part 10 store bridge"],
  ["src/shared/cmoCommandSurface.ts", "getNextExecutionAction", "Part 10 command surface kernel"],
  ["src/renderer/features/workspace/executionRecord/ExecutionDetailPanel.tsx", "execution-kernel-replay", "Part 10 kernel replay strip"],
  ["src/renderer/state/store.ts", "dispatchExecutionTask", "Part 10 store dispatch wrapper"],
  ["../CMO_EXECUTION_KERNEL_SPEC.md", "Unified lifecycle", "Part 10 spec"],
  ["src/shared/types.ts", "growth_memory", "P11 growth memory profile schema"],
  // CMO P13 — Founder-Fit + Strategic Options
  ["src/shared/cmoFounderFit.ts", "FOUNDER_FIT_QUESTIONS", "P13 seven-question founder fit"],
  ["src/shared/cmoGrowthNarrative.ts", "synthesizeGrowthNarrative", "P13 narrative synthesis"],
  ["src/shared/cmoStrategicOptions.ts", "buildStrategicDecision", "P13 A/B/C strategy engine"],
  ["src/shared/cmoStrategicOptions.ts", "sealStrategicDecision", "P13 decision seal"],
  ["src/renderer/features/onboarding/FounderFitWizard.tsx", "founder-fit-wizard", "P13 founder-fit wizard"],
  ["src/renderer/features/onboarding/StrategicDecisionCard.tsx", "strategic-decision-card", "P13 strategic decision card"],
  ["src/renderer/state/store.ts", "Complete the founder-fit decision", "P13 Week 1 gate"],
  ["src/shared/cmoNarrativeContext.ts", "withNarrativePrefix", "P13 narrative inheritance"],
  // CMO P14 — Budget Plane
  ["src/shared/cmoBudgetPlane.ts", "buildBudgetAllocation", "P14 deterministic allocation"],
  ["src/shared/cmoBudgetPlane.ts", "rollupBudgetActuals", "P14 honest actual rollup"],
  ["src/shared/cmoGrowthMemory.ts", "harvestBudgetFromCycle", "P14 money memory"],
  ["src/renderer/features/onboarding/BudgetSetupCard.tsx", "budget-setup-card", "P14 budget setup"],
  ["src/renderer/features/workspace/BudgetPlanePanel.tsx", "budget-plane-panel", "P14 budget backstage"],
  ["src/renderer/features/workspace/ReplanPreviewCard.tsx", "budget_mutations", "P14 reallocation preview"],
  // CMO P15 — Product Loop / Lane D
  ["src/shared/cmoLaneD.ts", "detectProductBinding", "P15 deterministic product binding"],
  ["src/shared/cmoLaneD.ts", "buildProductIssueMarkdown", "P15 issue export contract"],
  ["src/renderer/features/onboarding/ProductActivationCard.tsx", "product-activation-card", "P15 activation intake"],
  ["src/renderer/features/workspace/LaneDPanel.tsx", "lane-d-panel", "P15 Lane D panel"],
  ["src/renderer/features/workspace/ProductRequestProofModal.tsx", "product-request-proof-modal", "P15 product proof"],
  ["src/renderer/features/workspace/ProductIssueExportModal.tsx", "product-issue-export-modal", "P15 issue handoff"],
  ["src/shared/cmoGrowthMemory.ts", "harvestProductFixesFromCycle", "P15 product memory"],
  ["src/renderer/state/store.ts", "resumeMarketingAfterProductLoop", "P15 human resume gate"],
  // CMO P16 — Revenue Plane
  ["src/shared/cmoRevenuePlane.ts", "detectRevenueBinding", "P16 deterministic revenue binding"],
  ["src/shared/cmoRevenuePlane.ts", "rollupRevenueAttribution", "P16 honest CAC join"],
  ["src/shared/cmoGrowthMemory.ts", "harvestRevenueFromCycle", "P16 revenue memory"],
  ["src/renderer/features/onboarding/RevenueSetupCard.tsx", "revenue-setup-card", "P16 revenue intake"],
  ["src/renderer/features/workspace/RevenuePlanePanel.tsx", "revenue-plane-panel", "P16 revenue backstage"],
  ["src/renderer/features/workspace/MonetizationPanel.tsx", "monetization-panel", "P16 monetization P0"],
  ["src/shared/cmoCommandSurface.ts", "revenue_focus", "P16 command governance"],
  ["src/shared/cmoProofLoop.ts", "buildRevenueWeekReviewNudge", "P16 week review nudge"],
  // CMO P17 — Growth Mechanism Intelligence
  ["src/shared/cmoGrowthMechanismKnowledge.ts", "GROWTH_MECHANISM_IDS", "P17 mechanism corpus"],
  ["src/shared/cmoGrowthEngine.ts", "assessGrowthMechanisms", "P17 mechanism assessment"],
  ["src/shared/cmoGrowthEngine.ts", "applyMechanismToChannelThesis", "P17 thesis materialization"],
  ["src/renderer/features/onboarding/PublicPresenceCard.tsx", "public-presence-card", "P17 presence intake"],
  ["src/renderer/features/workspace/GrowthMechanismPanel.tsx", "growth-mechanism-panel", "P17 backstage rationale"],
  ["src/shared/cmoGrowthPlane.ts", "mechanism_anti_pattern", "P17 plane mechanism fields"],
  ["src/shared/cmoGrowthMemory.ts", "engine_signal", "P17 engine memory source"],
];

const REGRESSION = [
  {
    label: "No raw ANTHROPIC_API_KEY in renderer errors",
    globHint: "src/renderer",
    forbidden: "ANTHROPIC_API_KEY in server",
    allowFiles: ["HelpPage.tsx"],
  },
  {
    label: "No fake Google Ads account read copy",
    globHint: "src",
    forbidden: "Google Ads account read",
    allowFiles: ["feedMock.ts"],
  },
];

async function fileContains(rel, needle) {
  const abs = path.join(desktopRoot, rel);
  try {
    await access(abs);
    const text = await readFile(abs, "utf8");
    return text.includes(needle);
  } catch {
    return false;
  }
}

async function scanDirForForbidden(dirRel, forbidden, allowFiles) {
  const { readdir, readFile: rf } = await import("node:fs/promises");
  const hits = [];

  async function walk(rel) {
    const abs = path.join(desktopRoot, rel);
    let entries;
    try {
      entries = await readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const child = path.join(rel, ent.name).replace(/\\/g, "/");
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === "out") continue;
        await walk(child);
        continue;
      }
      if (!/\.(tsx?|jsx?|css)$/.test(ent.name)) continue;
      if (allowFiles.some((a) => child.endsWith(a))) continue;
      const text = await rf(path.join(desktopRoot, child), "utf8");
      if (text.includes(forbidden)) hits.push(child);
    }
  }

  await walk(dirRel);
  return hits;
}

let failed = false;

for (const [file, needle, label] of MARKERS) {
  const ok = await fileContains(file, needle);
  if (!ok) {
    console.error(`[wow-checklist] Missing marker "${needle}" in ${file} (${label})`);
    failed = true;
  }
}

for (const rule of REGRESSION) {
  const hits = await scanDirForForbidden("src/renderer", rule.forbidden, rule.allowFiles);
  if (hits.length > 0) {
    console.error(`[wow-checklist] ${rule.label}:`);
    for (const h of hits) console.error(`  - ${h}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`[wow-checklist] OK — ${MARKERS.length} structural markers present`);
