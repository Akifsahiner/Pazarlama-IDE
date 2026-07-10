import type { MarketingPlan } from "./types";
import type { PlanProgressSnapshot } from "./planProgress";
import { nextActionableTask } from "./planProgress";
import {
  getPlaybook,
  nextActionableTaskInPlaybook,
  normalizePlan,
  type MarketingPlanSuite,
} from "./planPlaybooks";
import type { PlanProgressSummary } from "./types";

export interface PlanDeepLinkResolution {
  playbookId?: string;
  taskId: string;
  taskTitle: string;
  taskDay: number;
  playbookTitle?: string;
  label: string;
}

export function resolvePlanDeepLink(opts: {
  plan: MarketingPlan | MarketingPlanSuite;
  planProgress: PlanProgressSnapshot | null;
  playbookId?: string;
  taskId?: string;
  activePlaybookId?: string;
}): PlanDeepLinkResolution | null {
  const suite = normalizePlan(opts.plan);
  if (!suite) return null;
  const byTaskId = opts.planProgress?.byTaskId ?? {};

  let task =
    opts.taskId != null
      ? suite.taskGraph.find((t) => t.id === opts.taskId) ?? null
      : null;

  const scopePlaybookId = opts.playbookId ?? opts.activePlaybookId;

  if (!task && scopePlaybookId) {
    task = nextActionableTaskInPlaybook(suite, scopePlaybookId, byTaskId);
  }
  if (!task) {
    task = nextActionableTask(suite, byTaskId);
  }
  if (!task && opts.taskId) {
    task = suite.taskGraph.find((t) => t.id === opts.taskId) ?? null;
  }
  if (!task) return null;

  const playbookId = task.playbookId ?? scopePlaybookId;
  const playbook = playbookId ? getPlaybook(suite, playbookId) : undefined;
  const playbookTitle = playbook?.title;
  const label = playbookTitle
    ? `${playbookTitle} · Day ${task.day}`
    : `Day ${task.day}: ${task.title}`;

  return {
    playbookId,
    taskId: task.id,
    taskTitle: task.title,
    taskDay: task.day,
    playbookTitle,
    label,
  };
}

export function buildPlanProgressSummaryForAgent(opts: {
  plan: MarketingPlan | null;
  planProgress: PlanProgressSnapshot | null;
  activePlaybookId?: string;
}): PlanProgressSummary | undefined {
  const { plan, planProgress, activePlaybookId } = opts;
  if (!plan || !planProgress || planProgress.computed.total <= 0) return undefined;

  const suite = normalizePlan(plan);
  const resolution = suite
    ? resolvePlanDeepLink({ plan: suite, planProgress, activePlaybookId })
    : null;

  const byPlaybook: Record<string, { done: number; total: number }> = {};
  for (const [id, counts] of Object.entries(planProgress.computed.byPlaybookId)) {
    byPlaybook[id] = { done: counts.done, total: counts.total };
  }

  let activePlaybookTitle: string | undefined;
  if (activePlaybookId && suite) {
    activePlaybookTitle = getPlaybook(suite, activePlaybookId)?.title;
  }

  return {
    done: planProgress.computed.done,
    total: planProgress.computed.total,
    nextTaskTitle: resolution?.taskTitle,
    nextTaskId: resolution?.taskId,
    nextPlaybookId: resolution?.playbookId,
    activePlaybookId,
    activePlaybookTitle,
    byPlaybook,
  };
}

export function planPlaybookMarkdownLink(
  playbookId: string,
  title: string,
  plan: MarketingPlanSuite,
  planProgress: PlanProgressSnapshot | null,
): string {
  const resolved = resolvePlanDeepLink({ plan, planProgress, playbookId });
  if (resolved) {
    return `[${title}](plan-task://${resolved.taskId})`;
  }
  return `[${title}](surface://plan-playbook/${playbookId})`;
}
