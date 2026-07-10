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
  ["src/renderer/features/onboarding/Welcome.tsx", "Your first 10 minutes", "Welcome journey preview"],
  ["src/renderer/features/onboarding/ProjectReveal.tsx", "ProjectReveal", "Project reveal"],
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
