import type { FeedItem } from "./feed";
import { countPendingApprovals } from "./feed";
import type { MarketingPlan, PlanTask, CampaignSession } from "./types";
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
import { PLAN_PREVIEW_LABEL, PLAN_AI_LABEL } from "./planLabels";
import { personaValue } from "./personaValue";
import type { WorkSurface } from "./workSurfaces";
import { WORK_SURFACE_META } from "./workSurfaces";

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
  | { type: "open_plan_surface" };

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

/** Single prioritized “what should I do now?” for the current screen. */
export function resolveNextAction(input: NextActionInput): ResolvedNextAction | null {
  const action = resolveNextActionCore(input);
  if (!action || !input.campaignSession) return action;
  return {
    ...action,
    eyebrow: campaignNextActionEyebrow(input.campaignSession, action.eyebrow),
    reason: campaignNextActionReason(input.campaignSession, action.reason),
  };
}

function resolveNextActionCore(input: NextActionInput): ResolvedNextAction | null {
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
    const pv = personaValue(input.persona);
    if (input.scope === "page" && input.route === "home") {
      if (!input.connected) {
        return {
          id: "home-offline-plan",
          eyebrow: pv.eyebrow,
          title: pv.offlinePlanTitle,
          reason: "Scan-based outline — connect for full AI personalization.",
          tone: "accent",
          primaryLabel: PLAN_PREVIEW_LABEL,
          secondaryLabel: "Connect",
          dispatch: { type: "preview_plan" },
          secondaryDispatch: { type: "connect" },
        };
      }
      return {
        id: "home-first-move",
        eyebrow: pv.eyebrow,
        title: pv.firstMoveTitle,
        reason: pv.promise,
        tone: "accent",
        primaryLabel: "Open workspace",
        secondaryLabel: PLAN_AI_LABEL,
        dispatch: { type: "open_workspace" },
        secondaryDispatch: { type: "generate_plan" },
      };
    }
    return {
      id: input.connected ? "generate-plan" : "preview-plan",
      eyebrow: pv.eyebrow,
      title: input.connected ? pv.planTitle : pv.offlinePlanTitle,
      reason: input.connected
        ? pv.promise
        : "Scan-based outline — connect for full AI personalization.",
      tone: "accent",
      primaryLabel: input.connected ? PLAN_AI_LABEL : PLAN_PREVIEW_LABEL,
      secondaryLabel: input.connected ? undefined : "Connect",
      dispatch: input.connected ? { type: "generate_plan" } : { type: "preview_plan" },
      secondaryDispatch: input.connected ? undefined : { type: "connect" },
    };
  }

  if (
    input.workSurface &&
    input.scope === "workspace" &&
    input.workSurface !== "campaign-plan"
  ) {
    const unlock = surfaceUnlockAction(input.workSurface);
    if (unlock && !input.plan) return unlock;
  }

  if (input.route === "runs" && input.runsCount === 0 && input.hasProject) {
    return {
      id: "first-run",
      eyebrow: "Get moving",
      title: "Run your first task",
      reason: "Start from the launch plan or describe work in the composer.",
      tone: "accent",
      primaryLabel: "Open workspace",
      secondaryLabel: input.plan ? "View plan" : undefined,
      dispatch: { type: "open_workspace" },
      secondaryDispatch: input.plan ? { type: "open_plan_surface" } : undefined,
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
      title: "Connect your backend",
      reason: "Scan and preview work offline — connect for agent, browser, and full plans.",
      tone: "neutral",
      primaryLabel: "Connect",
      secondaryLabel: "Preview plan",
      dispatch: { type: "connect" },
      secondaryDispatch: input.plan ? { type: "open_plan_surface" } : { type: "preview_plan" },
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
