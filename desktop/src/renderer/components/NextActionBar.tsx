import { ArrowRight, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  resolveNextAction,
  type NextActionDispatch,
  type NextActionScope,
} from "@shared/nextAction";
import { runChangedFiles } from "@shared/runs";
import { executableActionToIntent } from "@shared/executableAction";
import { normalizeCanvasMode, normalizeToWorkSurface } from "@shared/workSurfaces";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";

function projectAgentCwd(project: ReturnType<typeof useApp.getState>["project"]): boolean {
  if (!project) return false;
  if (project.source.kind === "folder") return true;
  return Boolean(project.localPath);
}

function dispatchAction(dispatch: NextActionDispatch) {
  const s = useApp.getState();
  switch (dispatch.type) {
    case "open_project":
      void s.openProjectPicker();
      break;
    case "connect":
      s.openConnectFlow();
      break;
    case "open_feed_gate":
      s.openFeedItem(dispatch.feedItemId);
      s.setFeedFilter("needs-you");
      s.toggleFeedCollapsed(false);
      break;
    case "focus_run":
      s.navigate("workspace");
      s.setActiveCanvas("run");
      break;
    case "focus_browser":
      s.navigate("workspace");
      s.setActiveCanvas("browser");
      break;
    case "continue_plan":
      s.focusPlanTask({
        playbookId: dispatch.playbookId,
        taskId: dispatch.taskId,
        startRun: true,
      });
      break;
    case "view_plan_task":
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      s.focusPlanTask({ playbookId: dispatch.playbookId, taskId: dispatch.taskId });
      break;
    case "generate_plan":
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      void s.generatePlan();
      break;
    case "preview_plan":
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      s.previewPlanOutline();
      break;
    case "start_playbook":
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      s.startPlaybook(dispatch.playbookId);
      break;
    case "retry_failed_task":
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      s.focusPlanTask({
        playbookId: dispatch.playbookId,
        taskId: dispatch.taskId,
        startRun: true,
      });
      break;
    case "apply_plan_changes":
      s.navigate("workspace");
      s.setActiveCanvas("run");
      if (s.run?.planTaskId === dispatch.taskId || s.activePlanTaskId === dispatch.taskId) {
        s.setActiveCanvas("preview");
      } else {
        s.focusPlanTask({ playbookId: dispatch.playbookId, taskId: dispatch.taskId });
        s.setActiveCanvas("preview");
      }
      break;
    case "confirm_plan_review":
      s.confirmPlanTaskWithoutApply(dispatch.taskId);
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      s.focusPlanTask({ playbookId: dispatch.playbookId, taskId: dispatch.taskId });
      break;
    case "composer_focus":
      s.navigate("workspace");
      document.getElementById("agent-composer")?.focus();
      break;
    case "open_workspace":
      s.navigate("workspace");
      break;
    case "draft_landing_copy": {
      const persona = s.settings.persona;
      const draft =
        persona === "sales"
          ? "Draft a personalized first-touch outreach email for my ICP — I will review and send it myself."
          : "Write landing page copy for this product.";
      s.launchComposerAction({ mode: "ask", draft });
      s.navigate("workspace");
      break;
    }
    case "open_plan_surface":
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      break;
    case "start_edit_from_receipt": {
      const action = s.lastTurnReceipt?.primaryAction;
      if (action?.kind === "edit_run") {
        const intent = executableActionToIntent(action);
        if (intent) void s.executeIntent(intent);
      }
      break;
    }
    case "apply_from_receipt":
      s.navigate("workspace");
      s.setActiveCanvas("preview");
      if (s.run?.runId) s.setActiveCanvas("preview");
      else s.setActiveCanvas("run");
      break;
    case "open_ops_proof":
      s.openOpsProofModal(dispatch.taskId);
      s.navigate("workspace");
      break;
    case "run_ops_system_task":
      s.navigate("workspace");
      s.startOpsSystemTask(dispatch.taskId);
      break;
    case "focus_ops_board":
      s.navigate("workspace");
      s.focusWarRoomAnchor("cmo-ops-board");
      break;
    case "open_week_review":
      s.openWeekReviewModal();
      s.navigate("workspace");
      break;
    case "start_next_cmo_cycle": {
      const err = s.startNextCmoCycle({
        thesisId: dispatch.thesisId as import("@shared/cmoIntake").ChannelThesisId | undefined,
        mode: dispatch.mode,
      });
      s.navigate("workspace");
      if (err) s.appendEvent({ role: "system", kind: "error", text: err });
      break;
    }
    case "complete_lane_b_item":
      s.openLaneBProofModal(dispatch.itemId);
      s.navigate("workspace");
      break;
    case "focus_lane_b_panel":
      s.navigate("workspace");
      s.focusWarRoomAnchor("lane-b-panel");
      break;
    case "open_delegate_brief":
      s.openDelegateBriefModal(dispatch.briefId);
      s.navigate("workspace");
      break;
    case "open_delegate_rubric":
      s.openDelegateRubricModal(dispatch.rubricId);
      s.navigate("workspace");
      break;
    case "focus_delegate_panel":
      s.navigate("workspace");
      s.focusWarRoomAnchor("delegate-panel");
      break;
    default:
      break;
  }
}

export function NextActionBar({ scope }: { scope: NextActionScope }) {
  const workspaceHandoff = useApp((s) => s.workspaceHandoff);
  const input = useApp(
    useShallow((s) => {
      const canvasMode = normalizeCanvasMode(s.canvas.mode);
      const workSurface = normalizeToWorkSurface(canvasMode);
      const run = s.run;
      const runActive =
        !!run &&
        (run.status === "running" || run.status === "planning" || run.status === "created");
      return {
        route: s.route,
        hasProject: !!s.project,
        connected: s.runtime === "connected",
        persona: s.settings.persona,
        hasAgentCwd: projectAgentCwd(s.project),
        canvasMode,
        workSurface,
        activePlaybookId: s.activePlaybookId,
        plan: s.plan,
        planLoading: s.planLoading,
        planPreviewMode: s.planPreviewMode,
        planProgress: s.planProgress,
        campaignSession: s.marketingProfile?.campaign_session ?? null,
        opsCadence: s.opsCadence ?? s.marketingProfile?.ops_cadence ?? null,
        firstShipAt: s.firstShipAt,
        onboardingTrack: s.onboardingTrack,
        laneBWorkspace: s.laneBWorkspace ?? s.marketingProfile?.lane_b_workspace ?? null,
        channelThesis: s.channelThesis ?? s.marketingProfile?.channel_thesis ?? null,
        cmoContinuous: s.cmoContinuous ?? s.marketingProfile?.cmo_continuous ?? null,
        growthMemory: s.growthMemory ?? s.marketingProfile?.growth_memory ?? null,
        delegateWorkspace: s.delegateWorkspace ?? s.marketingProfile?.lane_c_workspace ?? null,
        growthControlPlane:
          s.growthControlPlane ?? s.marketingProfile?.growth_control_plane ?? null,
        runActive,
        runNeedsApproval: !!run?.pendingApproval,
        browserActive: s.browser.running,
        browserNeedsApproval: !!s.browser.pendingApprovalId,
        feedItems: s.feedItems,
        runsCount: s.runsArchive.length,
        assetsCount: s.serverAssets.length,
        lastTurnReceipt: s.lastTurnReceipt,
        pendingRunApply:
          run && runChangedFiles(run.events).length
            ? { runId: run.runId, files: runChangedFiles(run.events) }
            : null,
      };
    }),
  );

  const action = useMemo(
    () => resolveNextAction({ scope, ...input }),
    [scope, input],
  );

  // Handoff banner is the single next-step surface until dismissed.
  if (workspaceHandoff) return null;

  if (!action) return null;

  const toneBorder =
    action.tone === "warn"
      ? "border-warn/30 bg-warn-soft/20"
      : action.tone === "ok"
        ? "border-ok/25 bg-ok/10"
        : action.tone === "accent"
          ? "border-accent/25 bg-accent-soft/15"
          : "border-line bg-surface/80";

  return (
    <div
      className={`flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5 backdrop-blur-sm ${toneBorder}`}
      role="region"
      aria-label="Suggested next action"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-accent">
          <Sparkles size={15} />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
            {action.eyebrow}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-body-sm font-medium text-text">{action.title}</span>
            <span className="text-mini text-text-3">{action.reason}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action.secondaryLabel && action.secondaryDispatch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatchAction(action.secondaryDispatch!)}
          >
            {action.secondaryLabel}
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          iconRight={<ArrowRight size={14} />}
          onClick={() => dispatchAction(action.dispatch)}
        >
          {action.primaryLabel}
        </Button>
      </div>
    </div>
  );
}
