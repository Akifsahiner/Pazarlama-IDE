#!/usr/bin/env node
/**
 * Structural smoke for the developer golden path — no Electron required.
 * Validates key modules, exports, and trust contracts exist after refactors.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const mustExist = [
  "src/shared/measurementMerge.ts",
  "src/shared/connectorFeedPlaceholder.ts",
  "src/shared/leadExport.ts",
  "src/shared/outreachPack.ts",
  "src/shared/adExportPack.ts",
  "src/shared/sessionReport.ts",
  "src/shared/downloadZip.ts",
  "src/renderer/lib/exportDownload.ts",
  "src/shared/planDiff.ts",
  "src/shared/planProgressReconcile.ts",
  "src/shared/messageOutbox.ts",
  "src/shared/executionQueue.ts",
  "src/renderer/features/workspace/ExecutionQueuePanel.tsx",
  "src/renderer/features/agent/cards/PlanRevisionCard.tsx",
  "src/renderer/features/workspace/canvas/planStudio/PlanVersionsPanel.tsx",
  "src/renderer/features/assets/OutreachDispatchPanel.tsx",
  "src/shared/fileSearch.ts",
  "src/shared/editorLinks.ts",
  "src/shared/personaValue.ts",
  "src/shared/canvasLinks.ts",
  "src/shared/planNavigation.ts",
  "src/shared/conversationIntent.ts",
  "src/shared/assetActions.ts",
  "src/renderer/components/AssetActionBar.tsx",
  "src/shared/intentPreview.ts",
  "src/shared/campaignSession.ts",
  "src/shared/agentTurnContext.ts",
  "src/renderer/features/agent/cards/ProactiveSuggestionCard.tsx",
  "src/renderer/features/agent/CampaignTimeline.tsx",
  "src/renderer/features/agent/IntentPreviewChip.tsx",
  "src/shared/workspaceHandoff.ts",
  "src/renderer/components/HandoffConfirmModal.tsx",
  "src/renderer/features/workspace/canvas/planStudio/KpiLogCard.tsx",
  "src/renderer/features/workspace/canvas/planStudio/LaunchCommandCenter.tsx",
  "src/renderer/features/workspace/canvas/PreviewCanvas.tsx",
  "src/renderer/components/CommandPalette.tsx",
  "src/main/git/worktree.ts",
  "src/main/project/urlScan.ts",
  "src/main/git/status.ts",
  "e2e/handoff.spec.ts",
  "e2e/outreach.spec.ts",
  "e2e/execution-queue.spec.ts",
  "e2e/smoke.spec.ts",
  "playwright.config.ts",
  "src/renderer/features/settings/ConnectorMarketplaceSection.tsx",
  "src/renderer/features/settings/TeamSettingsSection.tsx",
  "src/renderer/features/settings/QualityDashboardSection.tsx",
  "src/renderer/components/TierGateBanner.tsx",
  "src/renderer/components/FeedbackThumbs.tsx",
  "src/shared/tierFeatures.ts",
  "scripts/wow-checklist.md",
];

const exportChecks = [
  { file: "src/shared/measurementMerge.ts", needle: "resolveChannelActuals" },
  { file: "src/shared/connectorFeedPlaceholder.ts", needle: "connectorFeedPlaceholderItem" },
  { file: "src/shared/leadExport.ts", needle: "leadsToCsv" },
  { file: "src/shared/outreachPack.ts", needle: "buildOutreachPack" },
  { file: "src/shared/adExportPack.ts", needle: "buildAdExportPack" },
  { file: "src/renderer/lib/exportDownload.ts", needle: "downloadAdExportZip" },
  { file: "src/renderer/lib/exportDownload.ts", needle: "downloadSessionReportPdf" },
  { file: "src/shared/ipc.ts", needle: "saveHtmlAsPdf" },
  { file: "src/shared/sessionReport.ts", needle: "buildSessionReportMarkdown" },
  { file: "src/renderer/state/store.ts", needle: "dispatchOutreachWebhook" },
  { file: "src/shared/executionQueue.ts", needle: "canDrainExecutionQueue" },
  { file: "src/renderer/state/store.ts", needle: "lastQueueDrainGoal" },
  { file: "src/renderer/state/store.ts", needle: "transitionAfterConnectorReadNoOAuth" },
  { file: "src/renderer/state/store.ts", needle: "flushMessageOutbox" },
  { file: "src/renderer/components/StatusBar.tsx", needle: "outboxCount" },
  { file: "src/shared/planTaskCompletion.ts", needle: "connector-pending" },
  { file: "src/shared/fileSearch.ts", needle: "rankFilePaths" },
  { file: "src/shared/runs.ts", needle: "runChangedFiles" },
  { file: "src/renderer/features/settings/UsageQuotaSection.tsx", needle: "UsageQuotaSection" },
  { file: "src/shared/personaValue.ts", needle: "personaValue" },
  { file: "src/shared/canvasLinks.ts", needle: "parseCanvasLink" },
  { file: "src/shared/planNavigation.ts", needle: "resolvePlanDeepLink" },
  { file: "src/shared/conversationIntent.ts", needle: "resolveIntent" },
  { file: "src/shared/conversationIntent.ts", needle: "buildIntegrateAssetGoal" },
  { file: "src/shared/planDiff.ts", needle: "diffPlanVersions" },
  { file: "src/shared/planProgressReconcile.ts", needle: "reconcileProgressAfterPlanChange" },
  { file: "src/renderer/state/store.ts", needle: "setPlanCompareBaseline" },
  { file: "src/shared/conversationIntent.ts", needle: "revise_plan" },
  { file: "src/renderer/features/workspace/canvas/work/PerformanceTableCanvas.tsx", needle: "Sync GA4" },
  { file: "src/shared/intentPreview.ts", needle: "describeResolvedIntent" },
  { file: "src/shared/campaignSession.ts", needle: "applyCampaignPhaseEvent" },
  { file: "src/renderer/state/store.ts", needle: "requestProactiveSuggestion" },
  { file: "src/shared/agentTurnContext.ts", needle: "buildAgentTurnContext" },
  { file: "src/renderer/state/store.ts", needle: "submitComposerText" },
  { file: "src/shared/workspaceHandoff.ts", needle: "handoffFromResolved" },
  { file: "src/renderer/state/store.ts", needle: "executeIntent" },
  { file: "src/renderer/lib/backgroundError.ts", needle: "reportBackgroundError" },
  { file: "src/renderer/state/store.ts", needle: "tierFeatures" },
  { file: "src/renderer/features/settings/SettingsPage.tsx", needle: "ConnectorMarketplaceSection" },
  { file: "src/renderer/features/workspace/canvas/planStudio/SessionLaunchReport.tsx", needle: "share-client-report" },
  { file: "src/renderer/features/agent/MarketingDecisionCard.tsx", needle: "FeedbackThumbs" },
  { file: "src/renderer/components/NextActionBar.tsx", needle: "workspaceHandoff" },
  { file: "src/renderer/components/BundledLocalServerCard.tsx", needle: "Start local stack" },
];

let failed = false;

for (const rel of mustExist) {
  const abs = path.join(desktopRoot, rel);
  try {
    await access(abs);
  } catch {
    console.error(`[golden-path] Missing required file: ${rel}`);
    failed = true;
  }
}

for (const { file, needle } of exportChecks) {
  const abs = path.join(desktopRoot, file);
  try {
    const text = await readFile(abs, "utf8");
    if (!text.includes(needle)) {
      console.error(`[golden-path] ${file} missing export/symbol: ${needle}`);
      failed = true;
    }
  } catch {
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("[golden-path] OK — structural golden path modules present");
