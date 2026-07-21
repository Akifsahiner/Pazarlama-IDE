/**
 * Part 10 — Bridge between execution kernel and ops cadence / store runtime.
 */
import {
  isOpsTaskUnlocked,
  type CmoOpsCadence,
  type CmoOpsTask,
} from "./cmoOpsCadence";
import {
  bootstrapExecutionKernel,
  cancelExecutionTask,
  completeExecutionTask,
  dispatchExecutionTask,
  failExecutionTask,
  pauseExecutionTask,
  projectKernelToOpsCadence,
  resumeExecutionTask,
  retryExecutionTask,
  transitionExecutionStatus,
  type ExecutionKernelState,
  type ExecutionProvenance,
  type ExecutionProvenanceSource,
} from "./executionKernel";
import {
  resolveDispatchPayload,
  resolveHandlerKind,
  type ExecutionDispatchPayload,
} from "./executionHandlers";
import type { LaneARunPlan } from "./cmoLaneA";
import { executionPlanToLaneARunPlan } from "./cmoExecutionBind";
import { resolveLaneARunPlan, getLaneAItemForOpsTask } from "./cmoLaneA";
import type { ChannelThesis } from "./cmoIntake";
import type { ProjectProfile } from "./types";
import type { CmoOpsProof, OpsProofInput } from "./cmoOpsCadence";
import type { VerifyRunResult, BrowserEvidenceProof } from "./browserVerify";
import {
  buildVerifyChecklistFromTask,
  doneWhenRequiresBrowserVerify,
  toBrowserEvidenceProof,
  verifyPassed,
} from "./browserVerify";
import type { ShipReceipt } from "./shipReceipt";
import {
  enrichShipReceiptWithVerify,
  markShipReceiptVerifyRunning,
  markShipReceiptVerifySkipped,
} from "./shipReceipt";
import { runShipQualityLint, hasBlockingQualityFinding, type ShipQualityFinding } from "./shipQualityLint";
import type { ShipRecoveryAction } from "./shipPipelineRecovery";
import { buildShipRecovery } from "./shipPipelineRecovery";

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
  const task = input.cadence.tasks.find((t) => t.id === input.taskId);
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

export function handlerKindForTask(task: CmoOpsTask): string {
  const mode = task.execution_mode ?? "repo_edit";
  return resolveHandlerKind(mode);
}

export type { ExecutionDispatchPayload, LaneARunPlan };

/** Faz 4 — apply → verify → complete helpers (kept alongside Part 10 kernel bridge). */
export interface VerifyAfterApplyPlan {
  url: string;
  checklist: string[];
  shouldSchedule: boolean;
  skipReason?: string;
}

export interface FinalizeVerifyInput {
  receipt: ShipReceipt;
  runId: string;
  url: string;
  report?: {
    validations?: Array<{ label: string; passed: boolean; detail?: string }>;
  };
  failed?: boolean;
  summary?: string;
  screenshotPath?: string;
  thesisId?: ChannelThesis["id"] | null;
  afterSnapshot?: Partial<import("./firstShipSnapshot").FirstShipSnapshot>;
  diffText?: string;
}

export interface FinalizeVerifyResult {
  receipt: ShipReceipt;
  evidence: BrowserEvidenceProof;
  passed: boolean;
  pipelineEvent: "verify.completed" | "verify.failed";
  pipelineError?: string;
  recovery?: ShipRecoveryAction;
  qualityFindings: ShipQualityFinding[];
  blockAutoComplete: boolean;
}

export function planVerifyAfterApply(input: {
  previewUrl?: string | null;
  canBrowse: boolean;
  task?: CmoOpsTask | null;
  thesis?: ChannelThesis | null;
  lastVerifyAt?: number;
  now?: number;
}): VerifyAfterApplyPlan | null {
  const url = input.previewUrl?.trim();
  if (!url) return null;

  const checklist = buildVerifyChecklistFromTask(input.task, input.thesis);
  const now = input.now ?? Date.now();
  if (input.lastVerifyAt && now - input.lastVerifyAt < 10 * 60_000) {
    return { url, checklist, shouldSchedule: false, skipReason: "debounced" };
  }

  if (!input.canBrowse) {
    return { url, checklist, shouldSchedule: false, skipReason: "cu_unavailable" };
  }

  return { url, checklist, shouldSchedule: true };
}

export function finalizeVerifyRun(input: FinalizeVerifyInput): FinalizeVerifyResult {
  const verifyResult: VerifyRunResult = {
    url: input.url,
    run_id: input.runId,
    validations: input.report?.validations ?? [],
    findings: [],
    verified_at: new Date().toISOString(),
  };

  const evidence = toBrowserEvidenceProof(verifyResult, input.screenshotPath);
  const passed = !input.failed && verifyPassed(verifyResult, 1);

  const qualityFindings = runShipQualityLint({
    after: input.afterSnapshot,
    diffText: input.diffText,
    thesisId: input.thesisId ?? null,
  });

  let receipt = enrichShipReceiptWithVerify(input.receipt, evidence, passed);
  receipt = { ...receipt, qualityWarnings: qualityFindings };

  return {
    receipt,
    evidence,
    passed,
    pipelineEvent: passed ? "verify.completed" : "verify.failed",
    pipelineError: passed ? undefined : input.summary ?? "VERIFY_FAILED",
    recovery: passed ? undefined : buildShipRecovery("verify_failed"),
    qualityFindings,
    blockAutoComplete: !passed || hasBlockingQualityFinding(qualityFindings),
  };
}

export function shouldBlockTaskComplete(input: {
  task: CmoOpsTask;
  receipt?: ShipReceipt | null;
  qualityFindings?: ShipQualityFinding[];
}): { blocked: boolean; reason?: string } {
  if (input.task.expected_proof_kind === "browser_evidence") {
    if (!input.receipt || input.receipt.verifyStatus !== "passed") {
      return {
        blocked: true,
        reason: "Browser verification must pass before completing this task.",
      };
    }
  }

  if (doneWhenRequiresBrowserVerify(input.task.done_when, input.task)) {
    if (!input.receipt || input.receipt.verifyStatus !== "passed") {
      return {
        blocked: true,
        reason: "Live URL verification required by done_when criteria.",
      };
    }
  }

  const findings = input.qualityFindings ?? input.receipt?.qualityWarnings ?? [];
  if (hasBlockingQualityFinding(findings)) {
    return {
      blocked: true,
      reason: findings.find((f) => f.severity === "block")?.detail ?? "Quality gate blocked.",
    };
  }

  return { blocked: false };
}

export function receiptForVerifyStart(receipt: ShipReceipt | null | undefined): ShipReceipt | null {
  if (!receipt) return null;
  return markShipReceiptVerifyRunning(receipt);
}

export function receiptForVerifySkipped(receipt: ShipReceipt | null | undefined): ShipReceipt | null {
  if (!receipt) return null;
  return markShipReceiptVerifySkipped(receipt);
}
