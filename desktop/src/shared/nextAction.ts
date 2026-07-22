import type { FeedItem } from "./feed";
import { countPendingApprovals } from "./feed";
import type { MarketingPlan, PlanTask, CampaignSession } from "./types";
import type { ChannelThesis } from "./cmoIntake";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import { getNowTask, isWeekReviewDue, opsQueueBlocksLaneWork } from "./cmoOpsCadence";
import { allOpsTasksTerminal, isWeekCloseReady } from "./cmoProofLoop";
import type { LaneBWorkspace } from "./cmoLaneB";
import { getNextLaneBItem } from "./cmoLaneB";
import type { CmoDelegateWorkspace } from "./cmoLaneC";
import { getNextDelegateBrief } from "./cmoLaneC";
import { getNextDelegateRubricDay } from "./cmoDelegateOperator";
import type { CmoContinuousState } from "./cmoContinuous";
import { isContinuousReplanReady } from "./cmoContinuous";
import type { GrowthControlPlane } from "./cmoGrowthPlane";
import type { GrowthMemoryState } from "./cmoGrowthMemory";
import {
  isCommandSurfaceActive,
  isCommandSurfaceOwnedAction,
} from "./cmoCommandSurface";
import {
  campaignNextActionEyebrow,
  campaignNextActionReason,
} from "./campaignSession";
import {
  nextActionableTask,
  taskStatusFromSnapshot,
  type PlanProgressSnapshot,
} from "./planProgress";
import { firstAwaitingApplyTask, firstAwaitingReviewTask } from "./planTaskCompletion";
import { isBrowserPlanTask } from "./planPlaybooks";
import { personaValue } from "./personaValue";
import type { WorkSurface } from "./workSurfaces";
import { WORK_SURFACE_META } from "./workSurfaces";
import { isWeek1OpsActive, resolveFirstRunPrimaryAction } from "./northStarFunnel";

export type NextActionScope = "page" | "workspace";

export type NextActionTone = "accent" | "warn" | "ok" | "neutral";

export type NextActionDispatch =
  | { type: "open_project" }
  | { type: "connect" }
  | { type: "open_feed_gate"; feedItemId: string }
  | { type: "focus_run" }
  | { type: "focus_browser" }
  | { type: "continue_plan"; taskId: string; playbookId?: string }
  | { type: "view_plan_task"; taskId: string; playbookId?: string }
  | { type: "generate_plan" }
  | { type: "preview_plan" }
  | { type: "start_playbook"; playbookId: string }
  | { type: "retry_failed_task"; taskId: string; playbookId?: string }
  | { type: "apply_plan_changes"; taskId: string; playbookId?: string; day: number }
  | { type: "confirm_plan_review"; taskId: string; playbookId?: string }
  | { type: "composer_focus" }
  | { type: "open_workspace" }
  | { type: "draft_landing_copy" }
  | { type: "open_plan_surface" }
  | { type: "start_edit_from_receipt" }
  | { type: "apply_from_receipt" }
  | { type: "open_ops_proof"; taskId: string }
  | { type: "run_ops_system_task"; taskId: string }
  | { type: "focus_ops_board" }
  | { type: "open_week_review" }
  | { type: "start_next_cmo_cycle"; thesisId?: string; mode?: "pivot" | "double_down" }
  | { type: "complete_lane_b_item"; itemId: string }
  | { type: "focus_lane_b_panel" }
  | { type: "open_delegate_brief"; briefId: string }
  | { type: "open_delegate_rubric"; rubricId: string }
  | { type: "focus_delegate_panel" };

export interface ResolvedNextAction {
  id: string;
  eyebrow: string;
  title: string;
  reason: string;
  tone: NextActionTone;
  primaryLabel: string;
  secondaryLabel?: string;
  dispatch: NextActionDispatch;
  secondaryDispatch?: NextActionDispatch;
}

export interface NextActionInput {
  scope: NextActionScope;
  route: "home" | "workspace" | "runs" | "assets" | "settings" | "help";

  hasProject: boolean;
  connected: boolean;
  persona: "marketing" | "sales";
  hasAgentCwd: boolean;

  canvasMode: string;
  workSurface?: WorkSurface | null;
  activePlaybookId?: string;

  plan: MarketingPlan | null;
  planLoading: boolean;
  planPreviewMode: boolean;
  planProgress: PlanProgressSnapshot | null;

  runActive: boolean;
  runNeedsApproval: boolean;
  browserActive: boolean;
  browserNeedsApproval: boolean;

  feedItems: FeedItem[];
  runsCount: number;
  assetsCount: number;

  /** Active campaign session — session-aware eyebrow/reason (Faz 6). */
  campaignSession?: CampaignSession | null;

  /** P1 — CMO ops cadence when Week 1 is active without a full plan. */
  opsCadence?: CmoOpsCadence | null;
  /** Quick Start track — suppress plan CTAs pre-ship. */
  firstShipAt?: number | null;
  onboardingTrack?: "quick_start" | "full_cmo";
  heroPath?: string | null;
  week1Ready?: boolean;
  marketingProfile?: import("./types").MarketingProfile | null;
  /** P3 — Lane B workspace (posting / outreach / runbook). */
  laneBWorkspace?: LaneBWorkspace | null;
  channelThesis?: ChannelThesis | null;
  /** P4 — continuous CMO cycle state. */
  cmoContinuous?: CmoContinuousState | null;
  /** P11 — pending evidence-backed Week N+1 replan. */
  growthMemory?: GrowthMemoryState | null;
  /** P5 — Lane C delegate workspace. */
  delegateWorkspace?: CmoDelegateWorkspace | null;
  /** P7 — growth control plane (binding + today move). */
  growthControlPlane?: GrowthControlPlane | null;
  /** Last ask turn receipt — chat-aware next actions. */
  lastTurnReceipt?: import("./turnReceipt").TurnReceipt | null;
  /** Edit run with unapplied patches (non-plan). */
  pendingRunApply?: { runId: string; files: string[] } | null;
}

function firstWaitingGate(items: FeedItem[]): FeedItem | null {
  return items.find((i) => i.category === "gate" && i.status === "waiting" && !i.isDemo) ?? null;
}

function firstFailedTask(
  plan: MarketingPlan,
  snapshot: PlanProgressSnapshot | null,
): PlanTask | null {
  if (!snapshot) return null;
  const sorted = [...plan.taskGraph].sort((a, b) => a.day - b.day);
  for (const task of sorted) {
    if (taskStatusFromSnapshot(snapshot, task.id) === "failed") return task;
  }
  return null;
}

function planContinueBlocked(task: PlanTask, input: NextActionInput): string | null {
  if (isBrowserPlanTask(task)) {
    return input.connected ? null : "Connect to run browser tasks.";
  }
  if (!input.connected) return "Connect to run agent tasks.";
  if (!input.hasAgentCwd) {
    return "Open a local folder or cloned repo for file-editing tasks.";
  }
  return null;
}

function buildPlanAction(
  task: PlanTask,
  input: NextActionInput,
  eyebrow: string,
): ResolvedNextAction {
  const done = input.planProgress?.computed.done ?? 0;
  const total = input.planProgress?.computed.total ?? input.plan?.taskGraph.length ?? 0;
  const blocked = planContinueBlocked(task, input);
  const browser = isBrowserPlanTask(task);

  return {
    id: `plan-task-${task.id}`,
    eyebrow,
    title: `Day ${task.day} · ${task.title}`,
    reason:
      done > 0
        ? `${done}/${total} tasks done · ${browser ? "Browser task" : "Repo task"}`
        : `Start your launch plan · ${browser ? "Browser research" : "File edits"}`,
    tone: blocked ? "warn" : "accent",
    primaryLabel: blocked ? "Connect" : browser ? "Run in browser" : `Run Day ${task.day}`,
    secondaryLabel: "View in plan",
    dispatch: blocked
      ? { type: "connect" }
      : { type: "continue_plan", taskId: task.id, playbookId: task.playbookId },
    secondaryDispatch: { type: "view_plan_task", taskId: task.id, playbookId: task.playbookId },
  };
}

function surfaceUnlockAction(surface: WorkSurface): ResolvedNextAction | null {
  const meta = WORK_SURFACE_META[surface];
  const needsPlan = surface === "funnel" || surface === "campaign-plan";
  if (!needsPlan) return null;
  return {
    id: `unlock-${surface}`,
    eyebrow: "Unlock surface",
    title: meta.label,
    reason: "Generate a launch plan to populate this view.",
    tone: "neutral",
    primaryLabel: "Open plan",
    dispatch: { type: "open_plan_surface" },
  };
}

function enrichWithGrowthPlane(
  action: ResolvedNextAction,
  plane?: GrowthControlPlane | null,
): ResolvedNextAction {
  if (!plane?.binding.headline) return action;
  const bindingEyebrow = `Bottleneck · ${plane.binding.headline}`;
  const eyebrow =
    action.eyebrow.startsWith("Bottleneck ·") || action.eyebrow.length > 72
      ? action.eyebrow
      : bindingEyebrow.length > 72
        ? `${bindingEyebrow.slice(0, 69)}…`
        : bindingEyebrow;
  const reason =
    action.reason && action.reason.length > 12
      ? action.reason
      : plane.primary_lever || action.reason;
  return { ...action, eyebrow, reason };
}

/** Blocking actions that must surface above the Execution Record primary CTA. */
export function isBlockingNextAction(action: ResolvedNextAction): boolean {
  if (action.id.startsWith("gate-")) return true;
  return (
    action.id === "apply-from-receipt" ||
    action.id === "run-approval" ||
    action.id === "browser-approval" ||
    action.id === "return-run" ||
    action.id === "return-browser"
  );
}

export function shouldSuppressWorkspaceNextActionBar(input: {
  scope: NextActionScope;
  growthControlPlane?: GrowthControlPlane | null;
  opsCadence?: CmoOpsCadence | null;
  action: ResolvedNextAction | null;
}): boolean {
  if (input.scope !== "workspace") return false;
  if (
    !isCommandSurfaceActive({
      growthControlPlane: input.growthControlPlane,
      opsCadence: input.opsCadence,
    })
  ) {
    return false;
  }
  if (!input.action) return true;
  return !isBlockingNextAction(input.action);
}

/** Single prioritized “what should I do now?” for the current screen. */
export function resolveNextAction(input: NextActionInput): ResolvedNextAction | null {
  const commandSurfaceActive = isCommandSurfaceActive({
    growthControlPlane: input.growthControlPlane,
    opsCadence: input.opsCadence,
  });
  let action = resolveNextActionCore(input);
  const planCompetesWithOps =
    Boolean(input.plan) &&
    isCommandSurfaceActive({
      growthControlPlane: input.growthControlPlane,
      opsCadence: input.opsCadence,
    });
  if (
    action &&
    commandSurfaceActive &&
    isCommandSurfaceOwnedAction(action.id) &&
    !planCompetesWithOps
  ) {
    // The command surface owns CMO daily/governance work. Resolve again without
    // those sources so blocking run/apply/approval actions can still surface.
    action = resolveNextActionCore({
      ...input,
      opsCadence: null,
      laneBWorkspace: null,
      delegateWorkspace: null,
    });
  }
  if (!action) return null;
  const enriched = !commandSurfaceActive && input.opsCadence && !input.plan
    ? enrichWithGrowthPlane(action, input.growthControlPlane)
    : action;
  if (!input.campaignSession) {
    if (
      shouldSuppressWorkspaceNextActionBar({
        scope: input.scope,
        growthControlPlane: input.growthControlPlane,
        opsCadence: input.opsCadence,
        action: enriched,
      })
    ) {
      return null;
    }
    return enriched;
  }
  const withCampaign = {
    ...enriched,
    eyebrow: campaignNextActionEyebrow(input.campaignSession, enriched.eyebrow),
    reason: campaignNextActionReason(input.campaignSession, enriched.reason),
  };
  if (
    shouldSuppressWorkspaceNextActionBar({
      scope: input.scope,
      growthControlPlane: input.growthControlPlane,
      opsCadence: input.opsCadence,
      action: withCampaign,
    })
  ) {
    return null;
  }
  return withCampaign;
}

function opsWeekActive(
  input: NextActionInput,
): input is NextActionInput & { opsCadence: CmoOpsCadence } {
  if (!input.opsCadence) return false;
  if (!input.plan) return true;
  return isCommandSurfaceActive({
    growthControlPlane: input.growthControlPlane,
    opsCadence: input.opsCadence,
  });
}

/** @internal Exported for unit tests — core priority ladder without suppression. */
export function resolveNextActionCore(input: NextActionInput): ResolvedNextAction | null {
  if (input.planLoading) return null;

  if (!input.hasProject) {
    return {
      id: "open-project",
      eyebrow: "Get started",
      title: "Open a project",
      reason: "The agent works against a repo, folder, or live site.",
      tone: "accent",
      primaryLabel: "Open project",
      dispatch: { type: "open_project" },
    };
  }

  if (input.pendingRunApply?.files.length) {
    return {
      id: "apply-from-receipt",
      eyebrow: "Needs you",
      title: "Apply pending changes",
      reason: `${input.pendingRunApply.files.length} file(s) ready in worktree — ship to repo.`,
      tone: "warn",
      primaryLabel: "Review & apply",
      dispatch: { type: "apply_from_receipt" },
      secondaryDispatch: { type: "focus_run" },
    };
  }

  if (opsWeekActive(input)) {
    const weekCloseReady = input.opsCadence
      ? isWeekCloseReady(input.opsCadence)
      : false;
    const replanReady = isContinuousReplanReady(
      input.cmoContinuous,
      input.opsCadence,
      input.campaignSession?.phase,
      weekCloseReady,
    );
    if (replanReady) {
      const pivot = input.opsCadence.pivot_suggestion;
      const nextWeek = input.opsCadence.week_index + 1;
      const suggested = pivot?.suggested_thesis_ids[0];
      return {
        id: "cmo-start-next-cycle",
        eyebrow: `Week ${nextWeek}`,
        title:
          suggested && pivot && !pivot.dismissed_at && pivot.verdict === "flat"
            ? `Pivot to ${suggested.replace(/_/g, " ")}`
            : `Start Week ${nextWeek} ops`,
        reason:
          input.growthMemory?.pending_replan?.rationale[0] ??
          pivot?.rationale[0] ??
          "KPI logged — memory saved automatically.",
        tone: pivot?.verdict === "flat" ? "warn" : "accent",
        primaryLabel:
          suggested && pivot && !pivot.dismissed_at
            ? `Start Week ${nextWeek}`
            : "Start next week",
        secondaryLabel: "View cycle history",
        dispatch: {
          type: "start_next_cmo_cycle",
          thesisId:
            suggested && pivot && !pivot.dismissed_at ? suggested : undefined,
          mode:
            suggested && pivot && !pivot.dismissed_at && pivot.verdict === "flat"
              ? "pivot"
              : "double_down",
        },
        secondaryDispatch: { type: "focus_ops_board" },
      };
    }

    const pivot = input.opsCadence.pivot_suggestion;
    if (
      pivot &&
      !pivot.dismissed_at &&
      weekCloseReady &&
      input.opsCadence.week_review.status === "completed"
    ) {
      return {
        id: "ops-pivot",
        eyebrow: "CMO pivot",
        title: pivot.headline,
        reason: pivot.rationale[0] ?? "Week metrics suggest a channel pivot.",
        tone: pivot.verdict === "flat" ? "warn" : "neutral",
        primaryLabel: "Review pivot",
        secondaryLabel: "View ops table",
        dispatch: { type: "focus_ops_board" },
        secondaryDispatch: { type: "focus_ops_board" },
      };
    }

    if (
      !weekCloseReady &&
      (isWeekReviewDue(input.opsCadence) ||
        (allOpsTasksTerminal(input.opsCadence) &&
          input.opsCadence.week_review.status === "pending")) &&
      input.opsCadence.week_review.status !== "completed"
    ) {
      const now = getNowTask(input.opsCadence);
      if (now && now.status !== "done" && now.status !== "skipped") {
        return null;
      }
      return {
        id: "ops-log-kpi",
        eyebrow: `Week ${input.opsCadence.week_index}`,
        title: "Log KPI before starting the next week",
        reason: "Finish remaining ops tasks or log proof on completed user tasks.",
        tone: "warn",
        primaryLabel: "View ops table",
        dispatch: { type: "focus_ops_board" },
        secondaryDispatch: { type: "focus_ops_board" },
      };
    }

    const now = getNowTask(input.opsCadence);
    if (now && now.status !== "done" && now.status !== "skipped") {
      if (now.owner === "user" || now.owner === "delegate") {
        return {
          id: `ops-user-${now.id}`,
          eyebrow: now.owner === "delegate" ? "Delegate proof" : "Your move",
          title: now.what,
          reason: `Done when: ${now.done_when}`,
          tone: "warn",
          primaryLabel: "Mark done",
          secondaryLabel: "View ops table",
          dispatch: { type: "open_ops_proof", taskId: now.id },
          secondaryDispatch: { type: "focus_ops_board" },
        };
      }
      if (
        now.owner === "system" &&
        !input.runActive &&
        input.connected &&
        input.hasAgentCwd
      ) {
        return {
          id: `ops-system-${now.id}`,
          eyebrow: "IDE ships",
          title: now.what,
          reason: now.why,
          tone: "accent",
          primaryLabel: "Start in IDE",
          secondaryLabel: "View ops table",
          dispatch: { type: "run_ops_system_task", taskId: now.id },
          secondaryDispatch: { type: "focus_ops_board" },
        };
      }
    }
  }

  const laneWorkUnblocked =
    opsWeekActive(input) && !opsQueueBlocksLaneWork(input.opsCadence!);

  if (laneWorkUnblocked && input.delegateWorkspace) {
    const rubric = getNextDelegateRubricDay(
      input.delegateWorkspace as import("./cmoDelegateOperator").DelegateOperatorWorkspace,
      input.opsCadence?.day_index,
    );
    if (rubric) {
      return {
        id: `lane-c-rubric-${rubric.id}`,
        eyebrow: "Lane C · Rubric",
        title: rubric.title,
        reason: `Day ${rubric.day_index} delegate check-in — log proof when done.`,
        tone: "warn",
        primaryLabel: "Log rubric day",
        secondaryLabel: "View delegate panel",
        dispatch: { type: "open_delegate_rubric", rubricId: rubric.id },
        secondaryDispatch: { type: "focus_delegate_panel" },
      };
    }
    const nextDelegate = getNextDelegateBrief(input.delegateWorkspace);
    if (nextDelegate) {
      const isHandoff = nextDelegate.status === "draft";
      return {
        id: `lane-c-${nextDelegate.id}`,
        eyebrow: "Lane C",
        title: nextDelegate.title,
        reason: nextDelegate.what,
        tone: "warn",
        primaryLabel: isHandoff ? "Hand off" : "Mark delivered",
        secondaryLabel: "View delegate panel",
        dispatch: { type: "open_delegate_brief", briefId: nextDelegate.id },
        secondaryDispatch: { type: "focus_delegate_panel" },
      };
    }
  }

  if (laneWorkUnblocked && input.laneBWorkspace) {
    const nextLaneB = getNextLaneBItem(input.laneBWorkspace);
    if (nextLaneB) {
      return {
        id: `lane-b-${nextLaneB.id}`,
        eyebrow: "Lane B",
        title: nextLaneB.title,
        reason: nextLaneB.detail ?? "Human execution — post, DM, or launch step.",
        tone: "accent",
        primaryLabel: "Mark done",
        secondaryLabel: "View Lane B",
        dispatch: { type: "complete_lane_b_item", itemId: nextLaneB.id },
        secondaryDispatch: { type: "focus_lane_b_panel" },
      };
    }
  }

  const editAction = input.lastTurnReceipt?.primaryAction;
  if (editAction?.kind === "edit_run" && !input.runActive) {
    return {
      id: "edit-from-receipt",
      eyebrow: "Ready to ship",
      title: "Run in project",
      reason: editAction.goal.slice(0, 160),
      tone: "accent",
      primaryLabel: "Run in project",
      dispatch: { type: "start_edit_from_receipt" },
      secondaryDispatch: { type: "composer_focus" },
    };
  }

  if (input.plan && input.planProgress) {
    const awaitingApply = firstAwaitingApplyTask(input.plan, input.planProgress.byTaskId);
    if (awaitingApply) {
      const { task, status } = awaitingApply;
      return {
        id: `apply-${task.id}`,
        eyebrow: "Needs you",
        title: `Apply changes · Day ${task.day}`,
        reason:
          status === "partial"
            ? `${task.title} — partially applied; finish or mark complete.`
            : `${task.title} — review diff and apply to mark this task done.`,
        tone: "warn",
        primaryLabel: `Apply to complete Day ${task.day}`,
        secondaryLabel: "View in plan",
        dispatch: {
          type: "apply_plan_changes",
          taskId: task.id,
          playbookId: task.playbookId,
          day: task.day,
        },
        secondaryDispatch: {
          type: "view_plan_task",
          taskId: task.id,
          playbookId: task.playbookId,
        },
      };
    }

    const awaitingReview = firstAwaitingReviewTask(input.plan, input.planProgress.byTaskId);
    if (awaitingReview) {
      return {
        id: `confirm-${awaitingReview.id}`,
        eyebrow: "Needs you",
        title: `Confirm · Day ${awaitingReview.day}`,
        reason: `${awaitingReview.title} — confirm when research or outcome is sufficient.`,
        tone: "warn",
        primaryLabel: "Confirm complete",
        secondaryLabel: "View in plan",
        dispatch: {
          type: "confirm_plan_review",
          taskId: awaitingReview.id,
          playbookId: awaitingReview.playbookId,
        },
        secondaryDispatch: {
          type: "view_plan_task",
          taskId: awaitingReview.id,
          playbookId: awaitingReview.playbookId,
        },
      };
    }
  }

  const gate = firstWaitingGate(input.feedItems);
  if (gate) {
    return {
      id: `gate-${gate.id}`,
      eyebrow: "Needs you",
      title: gate.title,
      reason: gate.summary ?? "An agent action is waiting for your approval.",
      tone: "warn",
      primaryLabel: "Review now",
      dispatch: { type: "open_feed_gate", feedItemId: gate.id },
    };
  }

  if (input.runNeedsApproval) {
    return {
      id: "run-approval",
      eyebrow: "Needs you",
      title: "Approve agent action",
      reason: "The run is paused until you allow the next step.",
      tone: "warn",
      primaryLabel: "Review run",
      dispatch: { type: "focus_run" },
    };
  }

  if (input.browserNeedsApproval) {
    return {
      id: "browser-approval",
      eyebrow: "Needs you",
      title: "Approve browser action",
      reason: "The operator is paused on a sensitive step.",
      tone: "warn",
      primaryLabel: "Review browser",
      dispatch: { type: "focus_browser" },
    };
  }

  if (input.runActive && input.canvasMode !== "run") {
    return {
      id: "return-run",
      eyebrow: "In progress",
      title: "Agent run active",
      reason: "Pick up where the agent left off.",
      tone: "ok",
      primaryLabel: "Return to run",
      dispatch: { type: "focus_run" },
    };
  }

  if (input.browserActive && input.canvasMode !== "browser") {
    return {
      id: "return-browser",
      eyebrow: "In progress",
      title: "Browser session active",
      reason: "Live research is running in the operator.",
      tone: "ok",
      primaryLabel: "Return to browser",
      dispatch: { type: "focus_browser" },
    };
  }

  if (input.plan && input.planProgress && input.planProgress.computed.failed > 0) {
    const failed = firstFailedTask(input.plan, input.planProgress);
    if (failed) {
      return {
        id: `retry-${failed.id}`,
        eyebrow: "Needs attention",
        title: `Retry · Day ${failed.day}`,
        reason: failed.title,
        tone: "warn",
        primaryLabel: "Retry task",
        secondaryLabel: "View in plan",
        dispatch: { type: "retry_failed_task", taskId: failed.id, playbookId: failed.playbookId },
        secondaryDispatch: {
          type: "view_plan_task",
          taskId: failed.id,
          playbookId: failed.playbookId,
        },
      };
    }
  }

  if (input.plan && input.planProgress) {
    const next = nextActionableTask(input.plan, input.planProgress.byTaskId);
    if (next) {
      const eyebrow =
        input.planProgress.computed.done > 0
          ? "Next up"
          : input.planPreviewMode
            ? "Outline ready"
            : "Start here";
      const onPlanSurface =
        input.scope === "workspace" &&
        input.workSurface === "campaign-plan" &&
        input.canvasMode === "campaign-plan";

      if (onPlanSurface && input.activePlaybookId) {
        return null;
      }
      if (onPlanSurface && !input.activePlaybookId && next.playbookId) {
        return {
          id: `start-playbook-${next.playbookId}`,
          eyebrow: "Next up",
          title: `Day ${next.day} · ${next.title}`,
          reason: "Open the playbook to run this task.",
          tone: "accent",
          primaryLabel: "Open playbook",
          secondaryLabel: "Run task",
          dispatch: { type: "start_playbook", playbookId: next.playbookId },
          secondaryDispatch: {
            type: "continue_plan",
            taskId: next.id,
            playbookId: next.playbookId,
          },
        };
      }
      return buildPlanAction(next, input, eyebrow);
    } else if (input.planProgress.computed.done >= input.planProgress.computed.total) {
      return {
        id: "plan-complete",
        eyebrow: "Launch plan",
        title: "All tasks complete",
        reason: "Review outcomes or start a new experiment.",
        tone: "ok",
        primaryLabel: "View runs",
        secondaryLabel: "Open composer",
        dispatch: { type: "open_workspace" },
        secondaryDispatch: { type: "composer_focus" },
      };
    }
  }

  if (!input.plan && input.hasProject) {
    if (isWeek1OpsActive(input.opsCadence)) {
      return {
        id: "week1-ops-home",
        eyebrow: "Week 1",
        title: "Today's ops task is waiting",
        reason: "Execution Record has your one next action — open workspace to continue.",
        tone: "accent",
        primaryLabel: "Open workspace",
        dispatch: { type: "open_workspace" },
      };
    }
    const pv = personaValue(input.persona);
    const preShipQuickStart =
      input.onboardingTrack !== "full_cmo" && input.firstShipAt == null;
    if (input.scope === "page" && input.route === "home") {
      if (preShipQuickStart) {
        return {
          id: "home-ship-first",
          eyebrow: "Quick Start",
          title: "Ship your first marketing patch",
          reason: "One approved diff on your landing file — same folder as Cursor.",
          tone: "accent",
          primaryLabel: "Open workspace",
          dispatch: { type: "open_workspace" },
        };
      }
      if (!input.connected) {
        return {
          id: "home-offline-plan",
          eyebrow: pv.eyebrow,
          title: "Connect for AI runs",
          reason: "Scan works offline — connect to ship repo diffs and Week 1 ops.",
          tone: "accent",
          primaryLabel: "Connect",
          secondaryLabel: "Open workspace",
          dispatch: { type: "connect" },
          secondaryDispatch: { type: "open_workspace" },
        };
      }
      return {
        id: "home-first-move",
        eyebrow: pv.eyebrow,
        title: pv.firstMoveTitle,
        reason: pv.promise,
        tone: "accent",
        primaryLabel: "Open workspace",
        dispatch: { type: "open_workspace" },
      };
    }
    if (preShipQuickStart) {
      return {
        id: "ship-first-workspace",
        eyebrow: "Quick Start",
        title: "Ship from your repo",
        reason: pv.promise,
        tone: "accent",
        primaryLabel: "Open workspace",
        dispatch: { type: "open_workspace" },
      };
    }
    const firstRun = resolveFirstRunPrimaryAction({
      firstShipAt: input.firstShipAt,
      heroPath: input.heroPath,
      channelThesis: input.channelThesis,
      marketingProfile: input.marketingProfile,
      week1Ready: input.week1Ready,
      onboardingTrack: input.onboardingTrack,
      connected: input.connected,
      persona: input.persona,
      opsCadence: input.opsCadence,
    });
    return {
      id: firstRun.id,
      eyebrow: firstRun.eyebrow,
      title: firstRun.title,
      reason: firstRun.reason,
      tone: "accent",
      primaryLabel: firstRun.primaryLabel,
      dispatch: { type: "open_workspace" },
    };
  }

  if (
    input.workSurface &&
    input.scope === "workspace" &&
    input.workSurface !== "campaign-plan"
  ) {
    if (isWeek1OpsActive(input.opsCadence)) return null;
    const unlock = surfaceUnlockAction(input.workSurface);
    if (unlock && !input.plan) return unlock;
  }

  if (input.route === "runs" && input.runsCount === 0 && input.hasProject) {
    return {
      id: "first-run",
      eyebrow: "Get moving",
      title: "Run your first task",
      reason: isWeek1OpsActive(input.opsCadence)
        ? "Continue Week 1 ops in Execution Record."
        : "Open workspace — ship your first patch or start Week 1 ops.",
      tone: "accent",
      primaryLabel: "Open workspace",
      secondaryLabel: input.plan && !isWeek1OpsActive(input.opsCadence) ? "View plan" : undefined,
      dispatch: { type: "open_workspace" },
      secondaryDispatch:
        input.plan && !isWeek1OpsActive(input.opsCadence)
          ? { type: "open_plan_surface" }
          : undefined,
    };
  }

  if (input.route === "assets" && input.assetsCount === 0 && input.hasProject) {
    const pv = personaValue(input.persona);
    return {
      id: "first-asset",
      eyebrow: pv.eyebrow,
      title: input.persona === "sales" ? "Draft your first outreach" : "Draft your first asset",
      reason: pv.promise,
      tone: "accent",
      primaryLabel: pv.assetDraftLabel,
      dispatch: { type: "draft_landing_copy" },
    };
  }

  if (!input.connected && input.scope === "page" && input.route === "home") {
    return {
      id: "connect-home",
      eyebrow: "Unlock AI",
      title: "Enable AI features",
      reason: "Scan works offline — connect for agent runs, repo diffs, and Week 1 ops.",
      tone: "neutral",
      primaryLabel: "Retry connection",
      secondaryLabel: "Open workspace",
      dispatch: { type: "connect" },
      secondaryDispatch: { type: "open_workspace" },
    };
  }

  if (input.route === "settings" || input.route === "help") {
    if (input.plan && input.planProgress) {
      const next = nextActionableTask(input.plan, input.planProgress.byTaskId);
      if (next) return buildPlanAction(next, input, "Back to work");
    }
    return {
      id: "back-workspace",
      eyebrow: "Workspace",
      title: "Return to your project",
      reason: "Pick up launch tasks in the IDE.",
      tone: "neutral",
      primaryLabel: "Open workspace",
      dispatch: { type: "open_workspace" },
    };
  }

  if (input.scope === "workspace" && input.canvasMode === "empty") {
    return {
      id: "composer-idle",
      eyebrow: "Ready",
      title: "Tell the agent what to do",
      reason: "Use the composer, command palette, or your launch plan.",
      tone: "neutral",
      primaryLabel: "Focus composer",
      secondaryLabel: input.plan ? "View plan" : undefined,
      dispatch: { type: "composer_focus" },
      secondaryDispatch: input.plan ? { type: "open_plan_surface" } : undefined,
    };
  }

  return null;
}

/** @internal test helper */
export function _countGates(items: FeedItem[]): number {
  return countPendingApprovals(items);
}
