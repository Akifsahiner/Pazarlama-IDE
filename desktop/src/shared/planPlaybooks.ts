import type { MarketingPlan, PlanTask, ReadinessScore } from "./types";
import type { PlanTaskStatus } from "./planProgress";
import { isDepSatisfied, isTaskTerminal } from "./planProgress";
import { cuGoalForPlaybook } from "./cuTemplates";

export type PlaybookPhase =
  | "foundation"
  | "warmup"
  | "launch"
  | "post_launch"
  | "always_on";

export type PlaybookIconKey =
  | "product_hunt"
  | "paid_ads"
  | "email"
  | "content"
  | "seo"
  | "social"
  | "partnerships"
  | "analytics"
  | "sales_outbound"
  | "landing";

export interface ReadinessScoreWithRationale extends ReadinessScore {
  rationale?: string;
  suggestedPlaybookId?: string;
  suggestedTactic?: string;
}

export interface PlaybookStub {
  id: string;
  title: string;
  subtitle: string;
  phase: PlaybookPhase;
  iconKey: PlaybookIconKey;
  whyIncluded?: string;
  sortOrder: number;
}

export interface PlanPlaybook {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  phase: PlaybookPhase;
  iconKey: PlaybookIconKey;
  accentToken?: string;
  executiveSummary: string;
  primaryMetric: { name: string; target: string };
  bets: string[];
  risks: string[];
  skipIf?: string;
  dependsOnPlaybookIds: string[];
  tasks: PlanTask[];
  sortOrder: number;
}

import type { GtmBottleneck } from "./bottleneck";

/** Plan Suite v2 — extends flat MarketingPlan with playbook hierarchy. */
export interface MarketingPlanSuite extends MarketingPlan {
  schemaVersion?: 2;
  thesis?: string;
  narrativeHook?: string;
  primaryBottleneck?: GtmBottleneck;
  primaryPlaybookId?: string;
  bottleneckWhy?: string;
  playbooks: PlanPlaybook[];
  antiPatterns?: string[];
  readiness: ReadinessScoreWithRationale[];
}

export const LEGACY_PLAYBOOK_ID = "launch-core";

export function isPlanSuite(plan: MarketingPlan | null | undefined): plan is MarketingPlanSuite {
  return !!plan && Array.isArray((plan as MarketingPlanSuite).playbooks) && (plan as MarketingPlanSuite).playbooks.length > 0;
}

/** Wrap v1 flat plan as a single playbook suite. */
export function normalizeLegacyPlan(plan: MarketingPlan): MarketingPlanSuite {
  if (isPlanSuite(plan) && plan.schemaVersion === 2) {
    return {
      ...plan,
      playbooks: plan.playbooks.map((pb) => ({
        ...pb,
        tasks: pb.tasks.map((t) => ({ ...t, playbookId: t.playbookId ?? pb.id })),
      })),
      taskGraph: plan.taskGraph.map((t) => ({
        ...t,
        playbookId: t.playbookId ?? LEGACY_PLAYBOOK_ID,
      })),
    };
  }

  const tasks = plan.taskGraph.map((t) => ({
    ...t,
    playbookId: t.playbookId ?? LEGACY_PLAYBOOK_ID,
  }));

  const playbook: PlanPlaybook = {
    id: LEGACY_PLAYBOOK_ID,
    slug: "30-day-launch",
    title: "30-Day Launch",
    subtitle: "Full launch sequence",
    phase: "foundation",
    iconKey: "landing",
    executiveSummary: plan.strategyNote || plan.positioning,
    primaryMetric: { name: "Launch readiness", target: "Complete critical path tasks" },
    bets: [plan.positioning.slice(0, 160)],
    risks: ["Scope creep across all channels at once"],
    dependsOnPlaybookIds: [],
    tasks,
    sortOrder: 0,
  };

  return {
    ...plan,
    schemaVersion: 2,
    thesis: plan.positioning.split(".").slice(0, 1).join(".") || plan.positioning.slice(0, 120),
    narrativeHook: plan.strategyNote || plan.positioning,
    playbooks: [playbook],
    antiPatterns: [],
    readiness: plan.readiness.map((r) => ({ ...r })),
    taskGraph: tasks,
  };
}

export function normalizePlan(raw: MarketingPlan | null | undefined): MarketingPlanSuite | null {
  if (!raw) return null;
  return normalizeLegacyPlan(raw);
}

export function flattenPlaybookTasks(playbooks: PlanPlaybook[]): PlanTask[] {
  return playbooks.flatMap((pb) =>
    pb.tasks.map((t) => ({ ...t, playbookId: t.playbookId ?? pb.id })),
  );
}

export function getPlaybook(plan: MarketingPlanSuite, id: string): PlanPlaybook | null {
  return plan.playbooks.find((p) => p.id === id || p.slug === id) ?? null;
}

export function tasksForPlaybook(plan: MarketingPlanSuite, playbookId: string): PlanTask[] {
  const pb = getPlaybook(plan, playbookId);
  if (pb) return pb.tasks;
  return plan.taskGraph.filter((t) => t.playbookId === playbookId);
}

export function playbookProgress(
  plan: MarketingPlanSuite,
  playbookId: string,
  byTaskId: Record<string, { status: string }>,
): { done: number; total: number } {
  const tasks = tasksForPlaybook(plan, playbookId);
  let done = 0;
  for (const t of tasks) {
    if (isTaskTerminal(byTaskId[t.id]?.status as PlanTaskStatus | undefined)) done += 1;
  }
  return { done, total: tasks.length };
}

export function nextActionableTaskInPlaybook(
  plan: MarketingPlanSuite,
  playbookId: string,
  byTaskId: Record<string, { status: string }>,
): PlanTask | null {
  const tasks = [...tasksForPlaybook(plan, playbookId)].sort(
    (a, b) => a.day - b.day || a.title.localeCompare(b.title),
  );
  for (const task of tasks) {
    const st = byTaskId[task.id]?.status ?? "pending";
    if (st !== "pending") continue;
    const blocked = task.dependsOn.some(
      (dep) => !isDepSatisfied(byTaskId[dep]?.status as PlanTaskStatus | undefined),
    );
    if (blocked) continue;
    return task;
  }
  return null;
}

export function playbookDependsSatisfied(
  plan: MarketingPlanSuite,
  playbookId: string,
  byTaskId: Record<string, { status: string }>,
): boolean {
  const pb = getPlaybook(plan, playbookId);
  if (!pb?.dependsOnPlaybookIds.length) return true;
  for (const depId of pb.dependsOnPlaybookIds) {
    const prog = playbookProgress(plan, depId, byTaskId);
    if (prog.total === 0 || prog.done < prog.total) return false;
  }
  return true;
}

export function playbooksInProgress(
  plan: MarketingPlanSuite,
  byTaskId: Record<string, { status: string }>,
): { started: number; total: number } {
  let started = 0;
  for (const pb of plan.playbooks) {
    const prog = playbookProgress(plan, pb.id, byTaskId);
    if (prog.done > 0 && prog.done < prog.total) started += 1;
    else if (prog.done === 0 && prog.total > 0) {
      const hasRunning = pb.tasks.some((t) => byTaskId[t.id]?.status === "running");
      if (hasRunning) started += 1;
    }
  }
  return { started, total: plan.playbooks.length };
}

export const PLAYBOOK_PHASE_LABEL: Record<PlaybookPhase, string> = {
  foundation: "Foundation",
  warmup: "Warm-up",
  launch: "Launch",
  post_launch: "Post-launch",
  always_on: "Always-on",
};

/** True when task should sync analytics connectors (GA4) instead of repo edits. */
export function isConnectorReadPlanTask(task: PlanTask): boolean {
  return task.execution_mode === "connector_read";
}

/** True when task should run in Operator / browser CU (not local repo agent). */
export function isBrowserPlanTask(task: PlanTask): boolean {
  return task.execution_mode === "browser";
}

/** Build an agent run goal from a v3 plan task (instructions + CU browser goals). */
export function buildPlanTaskRunGoal(task: PlanTask): string {
  const parts = [
    `Execute plan task (Day ${task.day}): ${task.title}.`,
    task.tactic ? `Tactic: ${task.tactic}.` : "",
    task.channel ? `Channel: ${task.channel}.` : "",
    task.instructions_md ? `Instructions:\n${task.instructions_md}` : "",
    task.deliverable ? `Deliverable: ${task.deliverable}.` : "",
    task.acceptance_criteria ? `Done when: ${task.acceptance_criteria}.` : "",
    task.kpi ? `KPI: ${task.kpi.name} — ${task.kpi.target}.` : "",
  ];
  if (isConnectorReadPlanTask(task) && task.playbookId) {
    parts.push("Sync read-only analytics (GA4) when connected; otherwise use browser research as fallback.");
  } else if (isBrowserPlanTask(task) && task.playbookId) {
    const cu = cuGoalForPlaybook(task.playbookId);
    if (cu) parts.push(`Browser research goal: ${cu}`);
  }
  parts.push(
    isConnectorReadPlanTask(task)
      ? "Pull analytics via connector sync or browser fallback — do not publish."
      : isBrowserPlanTask(task)
        ? "Use browser research; capture evidence screenshots. Draft only — do not publish."
        : "Make concrete file changes in the project worktree. Draft only — do not publish.",
  );
  return parts.filter(Boolean).join("\n");
}
