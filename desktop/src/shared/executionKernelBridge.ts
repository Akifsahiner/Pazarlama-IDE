/**
 * Part 10 — Bridge between execution kernel and ops cadence / store runtime.
 */
import { isTaskGraphReady } from "./executionGraph";
import {
  isOpsTaskUnlocked,
  type CmoOpsCadence,
  type CmoOpsProof,
  type OpsProofInput,
} from "./cmoOpsCadence";
import {
  bootstrapExecutionKernel,
  cancelExecutionTask,
  completeExecutionTask,
  dispatchExecutionTask,
  failExecutionTask,
  findActiveOpsTaskId,
  findOpsTaskIdForHumanRef,
  findVerifyingOpsTaskId,
  pauseExecutionTask,
  projectKernelToOpsCadence,
  resumeExecutionTask,
  retryExecutionTask,
  transitionExecutionStatus,
  weekReviewGovernanceId,
  type ExecutionKernelState,
  type ExecutionProvenance,
  type ExecutionProvenanceSource,
} from "./executionKernel";
import {
  resolveDispatchPayload,
  type ExecutionDispatchPayload,
} from "./executionHandlers";
import type { LaneARunPlan } from "./cmoLaneA";
import { executionPlanToLaneARunPlan } from "./cmoExecutionBind";
import { resolveLaneARunPlan, getLaneAItemForOpsTask } from "./cmoLaneA";
import type { ChannelThesis } from "./cmoIntake";
import type { ProjectProfile } from "./types";

export const EXECUTION_KERNEL_LS = "execution_kernel.v1";

export function provenanceFrom(source: ExecutionProvenanceSource): ExecutionProvenance {
  return { source, at: new Date().toISOString(), actor: "user" };
}

export function ensureExecutionKernel(input: {
  cadence: CmoOpsCadence;
  projectId: string;
  existing?: ExecutionKernelState | null;
}): ExecutionKernelState {
  return bootstrapExecutionKernel({
    cadence: input.cadence,
    projectId: input.projectId,
    existing: input.existing,
    isUnlocked: (taskId) => {
      const task = input.cadence.tasks.find((t) => t.id === taskId);
      if (!task) return false;
      return isOpsTaskUnlocked(input.cadence, task, input.existing);
    },
  });
}

export function syncKernelAndCadence(input: {
  kernel: ExecutionKernelState;
  cadence: CmoOpsCadence;
}): { kernel: ExecutionKernelState; cadence: CmoOpsCadence } {
  const cadence = projectKernelToOpsCadence(input.kernel, input.cadence);
  return { kernel: input.kernel, cadence };
}

export interface KernelDispatchPlan {
  kernel: ExecutionKernelState;
  payload: ExecutionDispatchPayload;
  noop: boolean;
}

export function planKernelDispatch(input: {
  kernel: ExecutionKernelState;
  cadence: CmoOpsCadence;
  taskId: string;
  source: ExecutionProvenanceSource;
  thesis?: ChannelThesis | null;
  project?: ProjectProfile | null;
  laneAWorkspace?: import("./cmoLaneA").LaneAWorkspace | null;
}): KernelDispatchPlan | { error: string } {
  const inst = input.kernel.instances[input.taskId];
  const task = input.cadence.tasks.find((t) => t.id === input.taskId);

  if (!task && inst?.scope === "governance" && inst.execution_mode === "week_review") {
    if (!isTaskGraphReady(input.kernel.instances, inst.depends_on)) {
      return { error: "Week review blocked — complete pending tasks first." };
    }
    const { kernel, noop } = dispatchExecutionTask(
      input.kernel,
      input.taskId,
      provenanceFrom(input.source),
    );
    return {
      kernel,
      payload: { kind: "week_review", cadenceId: input.cadence.id },
      noop,
    };
  }

  if (!task) return { error: "Task not found." };
  if (!isOpsTaskUnlocked(input.cadence, task, input.kernel)) {
    return { error: "Task blocked by dependencies." };
  }

  const { kernel, instance, noop } = dispatchExecutionTask(
    input.kernel,
    input.taskId,
    provenanceFrom(input.source),
  );

  const payload = resolveDispatchPayload({
    task,
    instance,
    cadenceId: input.cadence.id,
    resolveLanePlan: (taskId) => {
      const t = input.cadence.tasks.find((x) => x.id === taskId);
      if (!t || !input.thesis || !input.project) return null;
      if (t.execution_plan) {
        return executionPlanToLaneARunPlan(taskId, t.execution_plan);
      }
      const laneItem = input.laneAWorkspace
        ? getLaneAItemForOpsTask(input.laneAWorkspace, taskId)
        : undefined;
      return resolveLaneARunPlan({
        task: t,
        thesis: input.thesis,
        project: input.project,
        laneAItemId: laneItem?.id,
      });
    },
  });

  if (!payload) return { error: `No handler for mode ${instance.execution_mode}` };
  return { kernel, payload, noop };
}

export function kernelCompleteFromOpsProof(input: {
  kernel: ExecutionKernelState;
  taskId: string;
  proof: OpsProofInput & Partial<CmoOpsProof>;
  source?: ExecutionProvenanceSource;
  measurable?: boolean;
}): ExecutionKernelState {
  const toStatus =
    input.measurable && input.proof.kpi_value == null ? "measuring" : "completed";
  return completeExecutionTask(
    input.kernel,
    input.taskId,
    { proof: input.proof as CmoOpsProof, toStatus },
    provenanceFrom(input.source ?? "ops_board"),
  );
}

export function kernelTransitionForApply(input: {
  kernel: ExecutionKernelState;
  taskId: string;
  browserEvidenceRequired: boolean;
  partial?: { applied_files?: string[]; remaining_gate?: string };
}): ExecutionKernelState {
  const prov = provenanceFrom("auto_chain");
  if (input.partial?.remaining_gate) {
    return completeExecutionTask(input.kernel, input.taskId, {
      partial: input.partial,
      toStatus: "applied",
    }, prov);
  }
  if (input.browserEvidenceRequired) {
    return transitionExecutionStatus(input.kernel, input.taskId, "verifying", prov);
  }
  return completeExecutionTask(input.kernel, input.taskId, { toStatus: "completed" }, prov);
}

export function kernelTransitionAwaitingApproval(
  kernel: ExecutionKernelState,
  taskId: string,
): ExecutionKernelState {
  return transitionExecutionStatus(
    kernel,
    taskId,
    "awaiting_approval",
    provenanceFrom("auto_chain"),
  );
}

export function kernelSetRunId(
  kernel: ExecutionKernelState,
  taskId: string,
  runId: string,
): ExecutionKernelState {
  const inst = kernel.instances[taskId];
  if (!inst) return kernel;
  return {
    ...kernel,
    instances: { ...kernel.instances, [taskId]: { ...inst, run_id: runId } },
    updated_at: new Date().toISOString(),
  };
}

export function kernelRetry(
  kernel: ExecutionKernelState,
  taskId: string,
  source: ExecutionProvenanceSource = "ops_board",
): ExecutionKernelState {
  return retryExecutionTask(kernel, taskId, provenanceFrom(source));
}

export function kernelPause(
  kernel: ExecutionKernelState,
  taskId: string,
): ExecutionKernelState {
  return pauseExecutionTask(kernel, taskId, provenanceFrom("ops_board"));
}

export function kernelResume(
  kernel: ExecutionKernelState,
  taskId: string,
): ExecutionKernelState {
  return resumeExecutionTask(kernel, taskId, provenanceFrom("ops_board"));
}

export function kernelCancel(
  kernel: ExecutionKernelState,
  taskId: string,
): ExecutionKernelState {
  return cancelExecutionTask(kernel, taskId, provenanceFrom("ops_board"));
}

export function kernelFail(
  kernel: ExecutionKernelState,
  taskId: string,
  error: string,
): ExecutionKernelState {
  return failExecutionTask(kernel, taskId, error, provenanceFrom("auto_chain"));
}

export function hydrateKernelFromProfile(input: {
  cadence: CmoOpsCadence;
  projectId: string;
  stored?: ExecutionKernelState | null;
}): ExecutionKernelState {
  if (input.stored?.instances && Object.keys(input.stored.instances).length > 0) {
    return bootstrapExecutionKernel({
      cadence: input.cadence,
      projectId: input.projectId,
      existing: input.stored,
    });
  }
  return bootstrapExecutionKernel({
    cadence: input.cadence,
    projectId: input.projectId,
  });
}

export function completeWeekReviewGovernance(
  kernel: ExecutionKernelState,
  cadence: CmoOpsCadence,
  summary: string,
): ExecutionKernelState {
  const govId = weekReviewGovernanceId(cadence.id);
  const inst = kernel.instances[govId];
  if (!inst) return kernel;
  return completeExecutionTask(
    kernel,
    govId,
    {
      toStatus: "completed",
      proof: { note: summary, completed_at: new Date().toISOString() },
    },
    provenanceFrom("week_review"),
  );
}

export function completeVerifyingOpsTask(
  kernel: ExecutionKernelState,
  proof: CmoOpsProof,
): ExecutionKernelState {
  const taskId = findVerifyingOpsTaskId(kernel);
  if (!taskId) return kernel;
  return completeExecutionTask(
    kernel,
    taskId,
    { proof, toStatus: "completed" },
    provenanceFrom("auto_chain"),
  );
}

export function findLinkedOpsTaskForRubric(
  cadence: CmoOpsCadence,
  rubricId: string,
): string | undefined {
  return findOpsTaskIdForHumanRef(cadence, { source: "delegate", item_id: rubricId });
}

export { findActiveOpsTaskId, findVerifyingOpsTaskId, weekReviewGovernanceId };
export type { ExecutionDispatchPayload, LaneARunPlan };
