/**
 * Faz 2 — bind CMO ops tasks to Lane A execution plans at cadence creation.
 * See CMO_EXECUTION_BIND_SPEC.md
 */
import type { ChannelThesis, CmoWeek1Priority } from "./cmoIntake";
import type { CmoOpsCadence, CmoOpsTask } from "./cmoOpsCadence";
import {
  getLaneAItemForOpsTask,
  resolveLaneARunPlan,
  type LaneAWorkspace,
  type LaneARunPlan,
} from "./cmoLaneA";
import type { ExpectedProofKind, OpsExecutionPlan } from "./opsExecutionPlan";
import type { ProjectProfile } from "./types";

export type { ExpectedProofKind, OpsExecutionPlan } from "./opsExecutionPlan";
export { WEEK1_MAX_SYSTEM, WEEK1_MAX_TASKS, WEEK1_MAX_USER } from "./cmoExecutionBindConstants";
export {
  WEEK2_PLUS_MAX_SYSTEM,
  WEEK2_PLUS_MAX_TASKS,
  WEEK2_PLUS_MAX_USER,
} from "./cmoExecutionBindConstants";

import {
  WEEK1_MAX_SYSTEM,
  WEEK1_MAX_TASKS,
  WEEK1_MAX_USER,
  WEEK2_PLUS_MAX_SYSTEM,
  WEEK2_PLUS_MAX_TASKS,
  WEEK2_PLUS_MAX_USER,
} from "./cmoExecutionBindConstants";

import { inferExpectedProofKindFromDoneWhen } from "./browserVerify";

export function inferExpectedProofKind(
  doneWhen: string,
): ExpectedProofKind | undefined {
  return inferExpectedProofKindFromDoneWhen(doneWhen);
}

/** Enforce max 3 system + 2 user/delegate, total ≤ 5. */
export function capWeek1Priorities(
  priorities: CmoWeek1Priority[],
): CmoWeek1Priority[] {
  const system = priorities.filter((p) => p.owner === "system").slice(0, WEEK1_MAX_SYSTEM);
  const human = priorities
    .filter((p) => p.owner === "user" || p.owner === "delegate")
    .slice(0, WEEK1_MAX_USER);
  const merged: CmoWeek1Priority[] = [];
  let si = 0;
  let hi = 0;
  for (const p of priorities) {
    if (merged.length >= WEEK1_MAX_TASKS) break;
    if (p.owner === "system") {
      const next = system[si];
      if (next && next.what === p.what) {
        merged.push(p);
        si += 1;
      }
    } else {
      const next = human[hi];
      if (next && next.what === p.what) {
        merged.push(p);
        hi += 1;
      }
    }
  }
  if (merged.length === 0) {
    return priorities.slice(0, Math.min(WEEK1_MAX_TASKS, priorities.length));
  }
  return merged;
}

/** Enforce week-specific caps (Week 1: 3+2; Week 2+: 4+3). */
export function capWeekPriorities(
  priorities: CmoWeek1Priority[],
  weekIndex: number,
): CmoWeek1Priority[] {
  if (weekIndex <= 1) return capWeek1Priorities(priorities);
  const system = priorities.filter((p) => p.owner === "system").slice(0, WEEK2_PLUS_MAX_SYSTEM);
  const human = priorities
    .filter((p) => p.owner === "user" || p.owner === "delegate")
    .slice(0, WEEK2_PLUS_MAX_USER);
  const merged: CmoWeek1Priority[] = [];
  let si = 0;
  let hi = 0;
  for (const p of priorities) {
    if (merged.length >= WEEK2_PLUS_MAX_TASKS) break;
    if (p.owner === "system") {
      const next = system[si];
      if (next && next.what === p.what) {
        merged.push(p);
        si += 1;
      }
    } else {
      const next = human[hi];
      if (next && next.what === p.what) {
        merged.push(p);
        hi += 1;
      }
    }
  }
  if (merged.length === 0) {
    return priorities.slice(0, Math.min(WEEK2_PLUS_MAX_TASKS, priorities.length));
  }
  return merged;
}

export function bindExecutionPlanForTask(input: {
  task: CmoOpsTask;
  thesis: ChannelThesis;
  project: ProjectProfile;
  laneAWorkspace?: LaneAWorkspace | null;
  preferScout?: boolean;
}): OpsExecutionPlan | null {
  if (input.task.owner !== "system") return null;
  const laneItem = input.laneAWorkspace
    ? getLaneAItemForOpsTask(input.laneAWorkspace, input.task.id)
    : undefined;
  const plan = resolveLaneARunPlan({
    task: input.task,
    thesis: input.thesis,
    project: input.project,
    preferScout: input.preferScout,
    laneAItemId: laneItem?.id,
  });
  if (!plan) return null;
  return laneRunPlanToExecutionPlan(plan);
}

export function laneRunPlanToExecutionPlan(plan: LaneARunPlan): OpsExecutionPlan {
  return {
    mode: plan.mode,
    goal: plan.goal,
    skills: [...plan.skills],
    mentions: [...plan.mentions],
    scout_prompt: plan.scoutPrompt,
    start_url: plan.startUrl,
    lane_a_item_id: plan.laneAItemId,
  };
}

export function executionPlanToLaneARunPlan(
  taskId: string,
  plan: OpsExecutionPlan,
): LaneARunPlan {
  return {
    opsTaskId: taskId,
    laneAItemId: plan.lane_a_item_id,
    mode: plan.mode,
    goal: plan.goal,
    scoutPrompt: plan.scout_prompt,
    skills: [...plan.skills],
    mentions: [...plan.mentions],
    startUrl: plan.start_url,
  };
}

export interface BindCadenceResult {
  cadence: CmoOpsCadence;
  missingPlans: string[];
}

export function bindExecutionPlansForCadence(input: {
  cadence: CmoOpsCadence;
  thesis: ChannelThesis;
  project: ProjectProfile;
  laneAWorkspace?: LaneAWorkspace | null;
  preferScoutForFirstSystem?: boolean;
  strict?: boolean;
}): BindCadenceResult {
  const firstSystemId = input.cadence.tasks.find((t) => t.owner === "system")?.id;
  const missingPlans: string[] = [];

  const tasks = input.cadence.tasks.map((task) => {
    if (task.owner !== "system") {
      const kind = inferExpectedProofKind(task.done_when);
      return kind ? { ...task, expected_proof_kind: kind } : task;
    }
    const plan = bindExecutionPlanForTask({
      task,
      thesis: input.thesis,
      project: input.project,
      laneAWorkspace: input.laneAWorkspace,
      preferScout: input.preferScoutForFirstSystem && task.id === firstSystemId,
    });
    if (!plan) {
      missingPlans.push(task.id);
      return task;
    }
    const proofKind: ExpectedProofKind =
      plan.mode === "repo_edit" || plan.mode === "scout_then_edit"
        ? "browser_evidence"
        : (inferExpectedProofKind(task.done_when) ?? "browser_evidence");
    return { ...task, execution_plan: plan, expected_proof_kind: proofKind };
  });

  if (input.strict && missingPlans.length > 0) {
    throw new Error(
      `System ops tasks missing execution plan: ${missingPlans.join(", ")}`,
    );
  }

  return { cadence: { ...input.cadence, tasks }, missingPlans };
}

export function validateSystemTaskCoverage(cadence: CmoOpsCadence): {
  ok: boolean;
  missing: string[];
} {
  const missing = cadence.tasks
    .filter((t) => t.owner === "system" && !t.execution_plan)
    .map((t) => t.id);
  return { ok: missing.length === 0, missing };
}
