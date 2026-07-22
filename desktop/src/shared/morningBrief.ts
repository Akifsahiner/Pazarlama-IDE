/**
 * Faz 3 — Morning brief view model: daily ritual compositor for Execution Record hero.
 */
import {
  buildCommandSurfaceModel,
  resolveCommandSurfaceAction,
  type BuildCommandSurfaceModelInput,
  type CommandSurfaceAction,
  type CommandSurfaceGovernance,
  type ResolveCommandSurfaceActionInput,
} from "./cmoCommandSurface";
import type { CmoOpsCadence, CmoOpsTask } from "./cmoOpsCadence";
import type { CmoTaskOwner } from "./cmoIntake";
import { getFocusTasks, isOpsTaskUnlocked } from "./cmoOpsCadence";
import { formatEffortMinutes } from "./effortEstimate";
import type { FounderFitProfile } from "./types";

const OWNER_MINUTES: Record<CmoTaskOwner, number> = {
  system: 45,
  user: 30,
  delegate: 25,
};

export interface MorningBriefEffort {
  totalMinutes: number;
  totalLabel: string;
  ownerBreakdown: string;
}

export interface MorningBriefQueuedHint {
  message: string;
  blockedTaskId: string;
}

export interface MorningBriefNextUp {
  label: string;
  owner: CmoTaskOwner;
  taskId: string;
}

export interface MorningBriefFooter {
  pendingOps: number;
  pendingLaneB: number;
  pendingLaneD: number;
  mechanismAntiPattern?: string;
  operatorSummary?: string;
}

export interface MorningBriefView {
  dayIndex: number;
  weekIndex: number;
  mechanismLabel: string;
  headerLine: string;
  bottleneck: string;
  today: string;
  why: string;
  doneWhen: string;
  nextUp?: MorningBriefNextUp;
  effort: MorningBriefEffort;
  focusTasks: CmoOpsTask[];
  footer: MorningBriefFooter;
  governance?: CommandSurfaceGovernance;
  primaryAction: CommandSurfaceAction;
  queuedHint?: MorningBriefQueuedHint;
}

export interface BuildMorningBriefInput extends ResolveCommandSurfaceActionInput {
  mechanismFallback?: string;
}

function sortedTasks(tasks: CmoOpsTask[]): CmoOpsTask[] {
  return [...tasks].sort((a, b) => a.priority_index - b.priority_index);
}

/** Owner-based effort heuristic for focus queue (ops tasks have no plan minutes). */
export function estimateFocusEffortBudget(
  tasks: CmoOpsTask[],
  _founderFit?: FounderFitProfile | null,
): MorningBriefEffort {
  const totalMinutes = tasks.reduce((sum, t) => sum + (OWNER_MINUTES[t.owner] ?? 30), 0);
  const counts: Record<CmoTaskOwner, number> = { system: 0, user: 0, delegate: 0 };
  for (const task of tasks) counts[task.owner] += 1;

  const parts: string[] = [];
  if (counts.system > 0) parts.push(`${counts.system} IDE`);
  if (counts.user > 0) parts.push(`${counts.user} you`);
  if (counts.delegate > 0) parts.push(`${counts.delegate} delegate`);

  return {
    totalMinutes,
    totalLabel: `~${formatEffortMinutes(totalMinutes)} total`,
    ownerBreakdown: parts.join(" · ") || "0 tasks",
  };
}

export function formatOwnerBreakdown(tasks: CmoOpsTask[]): string {
  return estimateFocusEffortBudget(tasks).ownerBreakdown;
}

/** First sequentially locked pending task → queued hint for lifecycle pill. */
export function resolveQueuedHint(cadence: CmoOpsCadence): MorningBriefQueuedHint | undefined {
  const ordered = sortedTasks(cadence.tasks);
  const firstIncomplete = ordered.find((t) => t.status !== "done" && t.status !== "skipped");
  if (!firstIncomplete || firstIncomplete.status !== "pending") return undefined;

  const blocked = ordered.find(
    (t) =>
      t.status !== "done" &&
      t.status !== "skipped" &&
      !isOpsTaskUnlocked(cadence, t) &&
      t.id !== firstIncomplete.id,
  );
  if (!blocked) return undefined;

  const blockerIdx = ordered.findIndex((t) => t.id === firstIncomplete.id);
  const blockingTask = ordered.find(
    (t) =>
      t.status !== "done" &&
      t.status !== "skipped" &&
      t.priority_index < firstIncomplete.priority_index,
  );
  return {
    message: blockingTask
      ? `Queued — finish "${blockingTask.what}" first`
      : `Queued — finish Task #${blockerIdx + 1} first`,
    blockedTaskId: firstIncomplete.id,
  };
}

export function morningBriefDayKey(projectId: string, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${projectId}:${y}-${m}-${d}`;
}

/** True when calendar day changed since last seen brief key. */
export function shouldShowDayUnlockToast(
  lastSeenDayKey: string | undefined | null,
  projectId: string,
  cadence: CmoOpsCadence,
  now = new Date(),
): boolean {
  if (!cadence) return false;
  const key = morningBriefDayKey(projectId, now);
  return key !== lastSeenDayKey;
}

export function buildMorningBriefHeaderLine(input: {
  dayIndex: number;
  mechanismLabel: string;
  effort: MorningBriefEffort;
}): string {
  const parts = [
    `Day ${input.dayIndex}`,
    input.mechanismLabel,
    input.effort.totalLabel,
    input.effort.ownerBreakdown,
  ].filter(Boolean);
  return parts.join(" · ");
}

function resolveNextUp(focusTasks: CmoOpsTask[]): MorningBriefNextUp | undefined {
  const next = focusTasks[1];
  if (!next) return undefined;
  const ownerPrefix =
    next.owner === "system" ? "IDE" : next.owner === "user" ? "You" : "Delegate";
  return {
    label: `${ownerPrefix}: ${next.what}`,
    owner: next.owner,
    taskId: next.id,
  };
}

/** Blocks ops dispatch while governance owns the surface. */
export function canDispatchOpsTask(
  governance: CommandSurfaceGovernance | undefined | null,
  action: CommandSurfaceAction,
): boolean {
  if (!governance) return true;
  const blockedKinds = new Set([
    "run_system",
    "submit_proof",
    "lane_b_proof",
    "operator_proof",
    "export",
  ]);
  if (action.kind === "none") return false;
  if (!blockedKinds.has(action.kind)) return true;

  const governanceBlocksOps = new Set([
    "week_review",
    "pivot",
    "product_loop",
    "replan",
    "measuring",
    "revenue_focus",
  ]);
  return !governanceBlocksOps.has(governance.kind);
}

export function buildMorningBriefView(input: BuildMorningBriefInput): MorningBriefView | null {
  if (!input.plane || !input.cadence) return null;

  const model = buildCommandSurfaceModel(input as BuildCommandSurfaceModelInput);
  if (!model) return null;

  const focusTasks = getFocusTasks(input.cadence, 3);
  const effort = estimateFocusEffortBudget(focusTasks, input.plane ? undefined : null);
  const mechanismLabel =
    model.mechanismLabel?.trim() ||
    input.mechanismFallback?.trim() ||
    input.plane.thesis_id.replace(/_/g, " ");
  const primaryAction = resolveCommandSurfaceAction(input);
  const governance = model.governance;
  const dayIndex = input.cadence.day_index;
  const weekIndex = input.cadence.week_index;

  return {
    dayIndex,
    weekIndex,
    mechanismLabel,
    headerLine: buildMorningBriefHeaderLine({ dayIndex, mechanismLabel, effort }),
    bottleneck: model.bottleneck,
    today: model.today,
    why: model.why,
    doneWhen: model.doneWhen,
    nextUp: governance?.kind === "product_loop" ? undefined : resolveNextUp(focusTasks),
    effort,
    focusTasks,
    footer: {
      pendingOps: model.pendingOps,
      pendingLaneB: model.pendingLaneB,
      pendingLaneD: model.pendingLaneD,
      mechanismAntiPattern: model.mechanismAntiPattern,
      operatorSummary: model.operatorSummary,
    },
    governance,
    primaryAction,
    queuedHint: resolveQueuedHint(input.cadence),
  };
}
