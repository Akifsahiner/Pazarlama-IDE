import { useMemo } from "react";
import {
  Globe,
  Mail,
  Play,
  Rocket,
  Search,
} from "lucide-react";
import type { MarketingDecision } from "@shared/types";
import { resolveIntent } from "@shared/conversationIntent";
import { prepareMarketingAssetFromDecision } from "@shared/assetActions";
import { useApp } from "@renderer/state/store";
import { AssetActionBar } from "@renderer/components/AssetActionBar";

export function DecisionActions({ decision }: { decision: MarketingDecision }) {
  const executeIntent = useApp((s) => s.executeIntent);
  const setComposerDraft = useApp((s) => s.setComposerDraft);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const resolvePlanDeepLink = useApp((s) => s.resolvePlanDeepLink);
  const plan = useApp((s) => s.plan);
  const planProgress = useApp((s) => s.planProgress);
  const activePlaybookId = useApp((s) => s.activePlaybookId);
  const settings = useApp((s) => s.settings);
  const project = useApp((s) => s.project);
  const hasFolder = project?.source.kind === "folder";
  const isSales = settings.persona === "sales";

  const nextStep = decision.next_steps[0]?.step;
  const copyAsset = decision.ready_to_use_assets[0];
  const nextOwner = decision.next_steps[0]?.owner?.toLowerCase() ?? "";

  const resolved = useMemo(() => {
    if (!plan) return null;
    return resolvePlanDeepLink({ playbookId: activePlaybookId ?? undefined });
  }, [plan, activePlaybookId, resolvePlanDeepLink]);

  const previewAsset = useMemo(
    () => (copyAsset ? prepareMarketingAssetFromDecision(copyAsset) : null),
    [copyAsset],
  );

  const runFromDecision = () => {
    const intent = resolveIntent({
      decision,
      plan: plan ?? undefined,
      planProgress,
      planTaskId: resolved?.taskId,
    });
    if (intent) executeIntent(intent.intent);
    else if (nextStep) executeIntent({ kind: "start_edit_run", goal: nextStep, planTaskId: resolved?.taskId });
    setActiveCanvas("run");
  };

  const openPlanTask = () => {
    if (!resolved) return;
    focusPlanTask({ playbookId: resolved.playbookId, taskId: resolved.taskId });
  };

  const researchBrowse = () => {
    const q = decision.diagnosis.slice(0, 120);
    executeIntent({
      kind: "start_browser_task",
      goal: isSales ? `Research leads for: ${q}` : `Research for: ${q}`,
    });
  };

  const draftOutreach = () => {
    setComposerDraft(`Draft outreach based on: ${decision.decision.slice(0, 200)}`);
    executeIntent({
      kind: "ask_only",
      message: `Draft outreach based on: ${decision.decision.slice(0, 200)}`,
    });
  };

  const planCtaLabel = resolved ? `Open ${resolved.label}` : "Open plan";
  const prioritizeRun =
    nextStep && (!isSales || nextOwner.includes("project") || nextOwner.includes("implement"));
  const showSalesResearch = isSales && !prioritizeRun && nextStep;

  return (
    <div className="space-y-3 border-t border-line pt-3">
      {copyAsset && previewAsset && (
        <AssetActionBar
          asset={previewAsset}
          project={project}
          title={copyAsset.title}
          decisionKind={copyAsset.kind}
          compact
        />
      )}
      <div className="flex flex-wrap gap-2">
        {nextStep && prioritizeRun && (
          <button
            type="button"
            onClick={runFromDecision}
            disabled={!hasFolder}
            title={hasFolder ? undefined : "Open a local folder to edit project files."}
            className="btn-accent inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini disabled:opacity-40"
          >
            <Rocket size={12} /> Run in project
          </button>
        )}
        {showSalesResearch && (
          <>
            <button
              type="button"
              onClick={researchBrowse}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text"
            >
              <Search size={12} /> Research leads
            </button>
            <button
              type="button"
              onClick={draftOutreach}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text"
            >
              <Mail size={12} /> Draft outreach
            </button>
          </>
        )}
        {resolved && (
          <button
            type="button"
            onClick={openPlanTask}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            <Play size={12} /> {planCtaLabel}
          </button>
        )}
        {nextStep && !prioritizeRun && (
          <button
            type="button"
            onClick={runFromDecision}
            disabled={!hasFolder}
            title={hasFolder ? undefined : "Open a local folder to edit project files."}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text disabled:opacity-40"
          >
            <Rocket size={12} /> Run in project
          </button>
        )}
        {!isSales && (
          <button
            type="button"
            onClick={researchBrowse}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            <Globe size={12} /> Research in browser
          </button>
        )}
      </div>
    </div>
  );
}
