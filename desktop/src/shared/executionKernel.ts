/**
 * Part 10 — Unified Execution Kernel: persisted lifecycle SoT for ops/plan tasks.
 * See CMO_EXECUTION_KERNEL_SPEC.md
 */
import type { CmoOpsCadence, CmoOpsProof, CmoOpsTask, CmoOpsTaskStatus } from "./cmoOpsCadence";
import type { HumanExecutionRef } from "./humanExecutionPlan";
import type { MarketingExecutionMode } from "./marketingTaskContract";
import {
  computeBlockedBy,
  isTaskGraphReady,
  recomputeBlockedBy,
  resolveGraphStatus,
} from "./executionGraph";
import {
  buildIdempotencyKey,
  canRetryExecution,
  nextAttemptState,
} from "./executionRetryPolicy";
import type { ExecutionRecordLifecycle } from "./executionRecord";
import type { PlanTaskProgressRow, PlanTaskStatus } from "./planProgress";

export type ExecutionTaskStatus =
  | "proposed"
  | "ready"
  | "running"
  | "awaiting_approval"
  | "applied"
  | "verifying"
  | "completed"
  | "measuring"
  | "paused"
  | "cancelled"
  | "failed";

export type ExecutionScope = "ops" | "plan" | "governance";

export type ExecutionProvenanceSource =
  | "command_surface"
  | "ops_board"
  | "plan_studio"
  | "brain_action"
  | "auto_chain"
  | "replay"
  | "week_review";

export interface ExecutionProvenance {
  source: ExecutionProvenanceSource;
  at: string;
  actor?: "system" | "user";
}

export interface ExecutionOwnership {
  contract: "ops_cadence";
  lifecycle: "execution_kernel";
  run?: "run_event_bus";
  asset?: "human_execution_asset";
}

export interface ExecutionPartialState {
  applied_files?: string[];
  remaining_gate?: string;
}

export interface ExecutionInstance {
  id: string;
  scope: ExecutionScope;
  execution_mode: MarketingExecutionMode;
  status: ExecutionTaskStatus;
  attempt: number;
  idempotency_key: string;
  depends_on: string[];
  blocked_by?: string[];
  run_id?: string;
  linked_entity?: HumanExecutionRef;
  proof?: CmoOpsProof;
  partial?: ExecutionPartialState;
  provenance: ExecutionProvenance;
  ownership: ExecutionOwnership;
  paused_at?: string;
  started_at?: string;
  completed_at?: string;
  last_error?: string;
}

export interface ExecutionKernelEvent {
  id: string;
  task_id: string;
  type:
    | "dispatched"
    | "status_changed"
    | "proof_submitted"
    | "partial_applied"
    | "retry_scheduled"
    | "paused"
    | "resumed"
    | "cancelled";
  status: ExecutionTaskStatus;
  attempt: number;
  provenance: ExecutionProvenance;
  at: string;
  detail?: string;
}

export interface ExecutionKernelState {
  id: string;
  project_id: string;
  ops_cadence_id?: string;
  instances: Record<string, ExecutionInstance>;
  events: ExecutionKernelEvent[];
  updated_at: string;
}

export const EXECUTION_KERNEL_EVENT_RING = 200;

/** Stable governance instance id for week review close. */
export function weekReviewGovernanceId(cadenceId: string): string {
  return `${cadenceId}.governance.week_review`;
}

export function findActiveOpsTaskId(
  kernel: ExecutionKernelState | null | undefined,
): string | null {
  if (!kernel) return null;
  for (const inst of Object.values(kernel.instances)) {
    if (
      inst.scope === "ops" &&
      (inst.status === "running" ||
        inst.status === "awaiting_approval" ||
        inst.status === "verifying" ||
        inst.status === "paused")
    ) {
      return inst.id;
    }
  }
  return null;
}

export function findVerifyingOpsTaskId(
  kernel: ExecutionKernelState | null | undefined,
): string | null {
  if (!kernel) return null;
  for (const inst of Object.values(kernel.instances)) {
    if (inst.scope === "ops" && inst.status === "verifying") return inst.id;
  }
  return null;
}

export function findOpsTaskIdForHumanRef(
  cadence: CmoOpsCadence,
  ref: { source: string; item_id: string },
): string | undefined {
  return cadence.tasks.find(
    (t) =>
      t.human_execution_ref?.source === ref.source &&
      t.human_execution_ref?.item_id === ref.item_id,
  )?.id;
}

export function defaultOwnership(): ExecutionOwnership {
  return {
    contract: "ops_cadence",
    lifecycle: "execution_kernel",
    run: "run_event_bus",
    asset: "human_execution_asset",
  };
}

export function opsStatusFromKernel(status: ExecutionTaskStatus): CmoOpsTaskStatus {
  switch (status) {
    case "proposed":
    case "ready":
      return "pending";
    case "running":
    case "awaiting_approval":
    case "applied":
    case "verifying":
    case "paused":
      return "in_progress";
    case "completed":
    case "measuring":
      return "done";
    case "cancelled":
      return "skipped";
    case "failed":
      return "pending";
    default:
      return "pending";
  }
}

export function kernelStatusFromOps(
  task: CmoOpsTask,
  unlocked: boolean,
): ExecutionTaskStatus {
  if (task.status === "skipped") return "cancelled";
  if (task.status === "done") {
    if (task.metric?.measurable && task.proof?.kpi_value == null) return "measuring";
    return task.metric?.measurable ? "completed" : "completed";
  }
  if (task.status === "in_progress") return "running";
  return unlocked ? "ready" : "proposed";
}

export function executionTaskStatusToRecordLifecycle(
  status: ExecutionTaskStatus | undefined,
): ExecutionRecordLifecycle {
  switch (status) {
    case "proposed":
      return "queued";
    case "ready":
      return "queued";
    case "running":
      return "running";
    case "awaiting_approval":
      return "awaiting_approval";
    case "applied":
    case "verifying":
      return "applied";
    case "completed":
      return "applied";
    case "measuring":
      return "measured";
    case "paused":
      return "running";
    case "cancelled":
      return "closed";
    case "failed":
      return "running";
    default:
      return "queued";
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function eventId(): string {
  return `ek-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function appendEvent(
  kernel: ExecutionKernelState,
  evt: Omit<ExecutionKernelEvent, "id" | "at">,
): ExecutionKernelEvent[] {
  const full: ExecutionKernelEvent = { ...evt, id: eventId(), at: nowIso() };
  const next = [...kernel.events, full];
  return next.length > EXECUTION_KERNEL_EVENT_RING
    ? next.slice(next.length - EXECUTION_KERNEL_EVENT_RING)
    : next;
}

function resolveMode(task: CmoOpsTask): MarketingExecutionMode {
  if (task.execution_mode) return task.execution_mode;
  if (task.owner === "system") {
    const mode = task.execution_plan?.mode;
    if (mode === "browser_research") return "browser_research";
    if (mode === "content_draft") return "content_draft";
    if (mode === "scout_then_edit") return "scout_then_edit";
    return "repo_edit";
  }
  if (task.human_execution_ref?.source === "delegate") return "delegate_rubric";
  if (task.human_execution_ref?.export_kind === "outreach_csv") return "export_csv";
  return "human_post";
}

function instanceFromOpsTask(
  task: CmoOpsTask,
  projectId: string,
  unlocked: boolean,
  provenance: ExecutionProvenance,
): ExecutionInstance {
  const attempt = 1;
  const status = kernelStatusFromOps(task, unlocked);
  return {
    id: task.id,
    scope: "ops",
    execution_mode: resolveMode(task),
    status,
    attempt,
    idempotency_key: buildIdempotencyKey(projectId, task.id, attempt),
    depends_on: task.depends_on ?? [],
    blocked_by: computeBlockedBy({}, task.id, task.depends_on ?? []),
    run_id: task.linked_run_id,
    linked_entity: task.human_execution_ref,
    proof: task.proof,
    provenance,
    ownership: defaultOwnership(),
    started_at: task.status === "in_progress" ? nowIso() : undefined,
    completed_at: task.status === "done" ? nowIso() : undefined,
  };
}

/** Bootstrap or refresh kernel instances from ops cadence (migration path). */
export function bootstrapExecutionKernel(input: {
  cadence: CmoOpsCadence;
  projectId: string;
  existing?: ExecutionKernelState | null;
  isUnlocked?: (taskId: string) => boolean;
}): ExecutionKernelState {
  const { cadence, projectId, existing, isUnlocked } = input;
  const provenance: ExecutionProvenance = {
    source: "auto_chain",
    at: nowIso(),
    actor: "system",
  };
  const instances: Record<string, ExecutionInstance> = { ...(existing?.instances ?? {}) };

  for (const task of cadence.tasks) {
    const unlocked = isUnlocked ? isUnlocked(task.id) : true;
    const prev = instances[task.id];
    if (prev) {
      instances[task.id] = {
        ...prev,
        execution_mode: task.execution_mode ?? prev.execution_mode,
        depends_on: task.depends_on ?? prev.depends_on,
        linked_entity: task.human_execution_ref ?? prev.linked_entity,
        run_id: task.linked_run_id ?? prev.run_id,
        proof: task.proof ?? prev.proof,
        idempotency_key: buildIdempotencyKey(projectId, task.id, prev.attempt),
      };
    } else {
      instances[task.id] = instanceFromOpsTask(task, projectId, unlocked, provenance);
    }
  }

  let recomputed = recomputeBlockedBy(instances);
  for (const [id, inst] of Object.entries(recomputed)) {
    if (inst.status === "proposed" || inst.status === "ready") {
      recomputed[id] = { ...inst, status: resolveGraphStatus(recomputed, inst) };
    }
  }

  recomputed = ensureGovernanceInstances(recomputed, cadence, projectId, provenance);

  return {
    id: existing?.id ?? `ek-${cadence.id}`,
    project_id: projectId,
    ops_cadence_id: cadence.id,
    instances: recomputed,
    events: existing?.events ?? [],
    updated_at: nowIso(),
  };
}

function ensureGovernanceInstances(
  instances: Record<string, ExecutionInstance>,
  cadence: CmoOpsCadence,
  projectId: string,
  provenance: ExecutionProvenance,
): Record<string, ExecutionInstance> {
  const govId = weekReviewGovernanceId(cadence.id);
  if (instances[govId]) return instances;
  let status: ExecutionTaskStatus = "proposed";
  if (cadence.week_review.status === "completed") status = "completed";
  else if (cadence.week_review.status === "due") status = "ready";
  return {
    ...instances,
    [govId]: {
      id: govId,
      scope: "governance",
      execution_mode: "week_review",
      status,
      attempt: 1,
      idempotency_key: buildIdempotencyKey(projectId, govId, 1),
      depends_on: cadence.tasks.map((t) => t.id),
      provenance,
      ownership: defaultOwnership(),
      completed_at:
        cadence.week_review.status === "completed"
          ? cadence.week_review.completed_at
          : undefined,
    },
  };
}

export function hydrateExecutionKernelFromJson(raw: unknown): ExecutionKernelState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as ExecutionKernelState;
  if (!o.id || !o.project_id || !o.instances) return null;
  return o;
}

export interface DispatchResult {
  kernel: ExecutionKernelState;
  instance: ExecutionInstance;
  noop: boolean;
}

/** Dispatch task — idempotent on same idempotency_key while running. */
export function dispatchExecutionTask(
  kernel: ExecutionKernelState,
  taskId: string,
  provenance: ExecutionProvenance,
): DispatchResult {
  const inst = kernel.instances[taskId];
  if (!inst) {
    throw new Error(`Execution instance not found: ${taskId}`);
  }
  if (inst.status === "running") {
    return { kernel, instance: inst, noop: true };
  }
  if (inst.status !== "ready" && inst.status !== "failed") {
    throw new Error(`Task ${taskId} not dispatchable (status=${inst.status})`);
  }
  if (!isTaskGraphReady(kernel.instances, inst.depends_on)) {
    throw new Error(`Task ${taskId} blocked by dependencies`);
  }

  const nextInst: ExecutionInstance = {
    ...inst,
    status: "running",
    provenance,
    started_at: nowIso(),
    last_error: undefined,
  };
  const instances = { ...kernel.instances, [taskId]: nextInst };
  const events = appendEvent(kernel, {
    task_id: taskId,
    type: "dispatched",
    status: "running",
    attempt: nextInst.attempt,
    provenance,
  });

  return {
    kernel: { ...kernel, instances, events, updated_at: nowIso() },
    instance: nextInst,
    noop: false,
  };
}

export interface CompleteInput {
  proof?: CmoOpsProof;
  partial?: ExecutionPartialState;
  toStatus?: ExecutionTaskStatus;
  runId?: string;
}

export function completeExecutionTask(
  kernel: ExecutionKernelState,
  taskId: string,
  input: CompleteInput,
  provenance: ExecutionProvenance,
): ExecutionKernelState {
  const inst = kernel.instances[taskId];
  if (!inst) throw new Error(`Execution instance not found: ${taskId}`);

  let status: ExecutionTaskStatus = input.toStatus ?? "completed";
  if (!input.toStatus && input.proof && inst.execution_mode !== "measurement_sync") {
    status = inst.execution_mode === "browser_research" ? "completed" : "completed";
  }
  if (input.partial?.remaining_gate) {
    status = "applied";
  }

  const nextInst: ExecutionInstance = {
    ...inst,
    status,
    proof: input.proof ?? inst.proof,
    partial: input.partial ?? inst.partial,
    run_id: input.runId ?? inst.run_id,
    completed_at: status === "completed" || status === "measuring" ? nowIso() : inst.completed_at,
    provenance,
  };

  let instances = { ...kernel.instances, [taskId]: nextInst };
  instances = recomputeBlockedBy(instances);
  for (const [id, i] of Object.entries(instances)) {
    if (i.status === "proposed" || i.status === "ready") {
      instances[id] = { ...i, status: resolveGraphStatus(instances, i) };
    }
  }

  const events = appendEvent(kernel, {
    task_id: taskId,
    type: input.partial ? "partial_applied" : "proof_submitted",
    status,
    attempt: nextInst.attempt,
    provenance,
    detail: input.partial?.remaining_gate,
  });

  return { ...kernel, instances, events, updated_at: nowIso() };
}

export function transitionExecutionStatus(
  kernel: ExecutionKernelState,
  taskId: string,
  status: ExecutionTaskStatus,
  provenance: ExecutionProvenance,
  extra?: Partial<ExecutionInstance>,
): ExecutionKernelState {
  const inst = kernel.instances[taskId];
  if (!inst) return kernel;
  const nextInst: ExecutionInstance = { ...inst, ...extra, status, provenance };
  let instances = { ...kernel.instances, [taskId]: nextInst };
  instances = recomputeBlockedBy(instances);
  for (const [id, i] of Object.entries(instances)) {
    if (i.status === "proposed") {
      instances[id] = { ...i, status: resolveGraphStatus(instances, i) };
    }
  }
  const events = appendEvent(kernel, {
    task_id: taskId,
    type: "status_changed",
    status,
    attempt: nextInst.attempt,
    provenance,
  });
  return { ...kernel, instances, events, updated_at: nowIso() };
}

export function retryExecutionTask(
  kernel: ExecutionKernelState,
  taskId: string,
  provenance: ExecutionProvenance,
): ExecutionKernelState {
  const inst = kernel.instances[taskId];
  if (!inst || !canRetryExecution(inst)) {
    throw new Error(`Task ${taskId} not retry eligible`);
  }
  const retryFields = nextAttemptState(inst);
  const nextInst: ExecutionInstance = {
    ...inst,
    ...retryFields,
    idempotency_key: buildIdempotencyKey(kernel.project_id, taskId, retryFields.attempt),
    provenance,
  };
  const instances = { ...kernel.instances, [taskId]: nextInst };
  const events = appendEvent(kernel, {
    task_id: taskId,
    type: "retry_scheduled",
    status: "ready",
    attempt: nextInst.attempt,
    provenance,
  });
  return { ...kernel, instances, events, updated_at: nowIso() };
}

export function pauseExecutionTask(
  kernel: ExecutionKernelState,
  taskId: string,
  provenance: ExecutionProvenance,
): ExecutionKernelState {
  return transitionExecutionStatus(kernel, taskId, "paused", provenance, {
    paused_at: nowIso(),
  });
}

export function resumeExecutionTask(
  kernel: ExecutionKernelState,
  taskId: string,
  provenance: ExecutionProvenance,
): ExecutionKernelState {
  return transitionExecutionStatus(kernel, taskId, "running", provenance, {
    paused_at: undefined,
  });
}

export function cancelExecutionTask(
  kernel: ExecutionKernelState,
  taskId: string,
  provenance: ExecutionProvenance,
): ExecutionKernelState {
  const inst = kernel.instances[taskId];
  if (!inst) return kernel;
  const nextInst: ExecutionInstance = {
    ...inst,
    status: "cancelled",
    completed_at: nowIso(),
    provenance,
  };
  let instances = { ...kernel.instances, [taskId]: nextInst };
  instances = recomputeBlockedBy(instances);
  for (const [id, i] of Object.entries(instances)) {
    if (i.status === "proposed") {
      instances[id] = { ...i, status: resolveGraphStatus(instances, i) };
    }
  }
  const events = appendEvent(kernel, {
    task_id: taskId,
    type: "cancelled",
    status: "cancelled",
    attempt: nextInst.attempt,
    provenance,
  });
  return { ...kernel, instances, events, updated_at: nowIso() };
}

export function failExecutionTask(
  kernel: ExecutionKernelState,
  taskId: string,
  error: string,
  provenance: ExecutionProvenance,
): ExecutionKernelState {
  return transitionExecutionStatus(kernel, taskId, "failed", provenance, { last_error: error });
}

/** Project kernel lifecycle → ops cadence task status (dual-write). */
export function projectKernelToOpsCadence(
  kernel: ExecutionKernelState,
  cadence: CmoOpsCadence,
): CmoOpsCadence {
  const tasks = cadence.tasks.map((task) => {
    const inst = kernel.instances[task.id];
    if (!inst) return task;
    return {
      ...task,
      status: opsStatusFromKernel(inst.status),
      linked_run_id: inst.run_id ?? task.linked_run_id,
      proof: inst.proof ?? task.proof,
    };
  });
  return { ...cadence, tasks };
}

/** Project kernel lifecycle → plan progress rows. */
export function projectKernelToPlanProgress(
  kernel: ExecutionKernelState,
  byTaskId: Record<string, PlanTaskProgressRow>,
): Record<string, PlanTaskProgressRow> {
  const next = { ...byTaskId };
  for (const inst of Object.values(kernel.instances)) {
    if (inst.scope !== "plan") continue;
    let status: PlanTaskStatus = "pending";
    switch (inst.status) {
      case "running":
      case "verifying":
        status = "running";
        break;
      case "awaiting_approval":
        status = "awaiting_apply";
        break;
      case "applied":
        status = "awaiting_review";
        break;
      case "completed":
      case "measuring":
        status = "done";
        break;
      case "cancelled":
        status = "skipped";
        break;
      case "failed":
        status = "failed";
        break;
      case "proposed":
        status = "blocked";
        break;
      default:
        status = "pending";
    }
    next[inst.id] = {
      ...(next[inst.id] ?? { taskId: inst.id, status: "pending" }),
      taskId: inst.id,
      status,
      lastRunId: inst.run_id,
      completedAt: inst.completed_at,
      updatedAt: nowIso(),
    };
  }
  return next;
}

export function getActiveExecutionInstance(
  kernel: ExecutionKernelState | null | undefined,
): ExecutionInstance | null {
  if (!kernel) return null;
  const active = Object.values(kernel.instances).find((i) =>
    ["running", "awaiting_approval", "verifying", "paused"].includes(i.status),
  );
  return active ?? null;
}

export function getNextReadyInstance(
  kernel: ExecutionKernelState | null | undefined,
  cadence?: CmoOpsCadence | null,
): ExecutionInstance | null {
  if (!kernel) return null;
  const ordered = cadence
    ? [...cadence.tasks].sort((a, b) => a.priority_index - b.priority_index)
    : Object.values(kernel.instances);
  for (const t of ordered) {
    const id = "id" in t ? t.id : (t as ExecutionInstance).id;
    const inst = kernel.instances[id];
    if (inst?.status === "ready") return inst;
  }
  return null;
}

export interface ReplayTimelineEntry {
  at: string;
  kind: "kernel" | "run";
  title: string;
  detail?: string;
}

/** Read-only task timeline from kernel events. */
export function replayTaskTimeline(
  kernel: ExecutionKernelState,
  taskId: string,
): ReplayTimelineEntry[] {
  return kernel.events
    .filter((e) => e.task_id === taskId)
    .map((e) => ({
      at: e.at,
      kind: "kernel" as const,
      title: e.type.replace(/_/g, " "),
      detail: e.detail ?? `${e.status} (attempt ${e.attempt})`,
    }));
}

export function assertKernelOpsSync(
  kernel: ExecutionKernelState,
  cadence: CmoOpsCadence,
): string[] {
  const errors: string[] = [];
  for (const task of cadence.tasks) {
    const inst = kernel.instances[task.id];
    if (!inst) {
      errors.push(`missing instance: ${task.id}`);
      continue;
    }
    const projected = opsStatusFromKernel(inst.status);
    if (projected !== task.status) {
      errors.push(`drift ${task.id}: kernel→${projected} ops→${task.status}`);
    }
  }
  return errors;
}
