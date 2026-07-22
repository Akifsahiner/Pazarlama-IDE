/**
 * Part 18 — Execution state persistence helpers.
 * Centralizes localStorage key names and round-trip validation for kernel + ops + delegate.
 */
import { EXECUTION_KERNEL_LS } from "./executionKernelBridge";
import {
  hydrateExecutionKernelFromJson,
  type ExecutionKernelState,
} from "./executionKernel";
import {
  hydrateOpsCadenceFromJson,
  type CmoOpsCadence,
} from "./cmoOpsCadence";
import {
  hydrateDelegateOperatorFromJson,
  type DelegateOperatorWorkspace,
} from "./cmoDelegateOperator";

export const EXECUTION_PERSISTENCE_KEYS = {
  kernel: EXECUTION_KERNEL_LS,
  opsCadence: "ops_cadence.v1",
  delegateOperator: "delegate_operator.v1",
  laneCWorkspace: "lane_c_workspace.v1",
  humanProofDrafts: "human_proof_drafts.v1",
  campaignSession: "campaign_session.v1",
  laneB: "lane_b_workspace.v1",
  laneA: "lane_a_workspace.v1",
  growthPlane: "growth_control_plane.v1",
  distributionOperator: "distribution_operator.v1",
  influencerOperator: "influencer_operator.v1",
  cmoContinuous: "cmo_continuous.v1",
  growthMemory: "growth_memory.v1",
  budgetPlan: "budget_plan.v1",
  productActivation: "product_activation.v1",
  laneD: "lane_d_workspace.v1",
  revenueProfile: "revenue_profile.v1",
  monetizationWorkspace: "monetization_workspace.v1",
  founderFit: "founder_fit.v1",
  growthNarrative: "growth_narrative.v1",
  strategicDecision: "strategic_decision.v1",
  publicPresence: "public_presence_policy.v1",
  growthMechanism: "growth_mechanism_profile.v1",
  firstShipAt: "first_ship_at.v1",
  shipReceipt: "ship_receipt.v1",
} as const;

/** Prefixes migrated when folder hash id → server project id. */
export const PROJECT_LOCAL_STORAGE_PREFIXES: string[] = [
  ...Object.values(EXECUTION_PERSISTENCE_KEYS),
  "turn_receipts.v1",
  "first_ship_ledger.v1",
  "execution_metrics.v1",
  "onboarding_track.v1",
];

export function migrateProjectLocalStorage(fromProjectId: string, toProjectId: string): void {
  if (!fromProjectId || !toProjectId || fromProjectId === toProjectId) return;
  if (typeof localStorage === "undefined") return;
  for (const prefix of PROJECT_LOCAL_STORAGE_PREFIXES) {
    const fromKey = projectStorageKey(prefix, fromProjectId);
    const toKey = projectStorageKey(prefix, toProjectId);
    try {
      const raw = localStorage.getItem(fromKey);
      if (!raw) continue;
      if (!localStorage.getItem(toKey)) {
        localStorage.setItem(toKey, raw);
      }
      localStorage.removeItem(fromKey);
    } catch {
      /* quota / private mode */
    }
  }
}

export type ExecutionPersistenceKey =
  (typeof EXECUTION_PERSISTENCE_KEYS)[keyof typeof EXECUTION_PERSISTENCE_KEYS];

export function projectStorageKey(prefix: string, projectId: string): string {
  return `${prefix}.${projectId}`;
}

export function serializeExecutionKernel(kernel: ExecutionKernelState): string {
  return JSON.stringify(kernel);
}

export function parseExecutionKernel(raw: string): ExecutionKernelState | null {
  try {
    return hydrateExecutionKernelFromJson(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function parseOpsCadence(raw: string): CmoOpsCadence | null {
  try {
    return hydrateOpsCadenceFromJson(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function parseDelegateOperator(raw: string): DelegateOperatorWorkspace | null {
  try {
    return hydrateDelegateOperatorFromJson(JSON.parse(raw));
  } catch {
    return null;
  }
}

export interface ExecutionSnapshot {
  kernel: ExecutionKernelState;
  cadence: CmoOpsCadence;
  delegate?: DelegateOperatorWorkspace | null;
}

export function buildExecutionSnapshot(input: {
  kernel: ExecutionKernelState;
  cadence: CmoOpsCadence;
  delegate?: DelegateOperatorWorkspace | null;
}): ExecutionSnapshot {
  return {
    kernel: input.kernel,
    cadence: input.cadence,
    delegate: input.delegate ?? null,
  };
}

/** Returns empty array when round-trip is clean; otherwise human-readable drift errors. */
export function assertSnapshotRoundTrip(snapshot: ExecutionSnapshot): string[] {
  const errors: string[] = [];

  const kernelRaw = JSON.parse(serializeExecutionKernel(snapshot.kernel)) as unknown;
  const hydratedKernel = hydrateExecutionKernelFromJson(kernelRaw);
  if (!hydratedKernel) {
    errors.push("kernel hydrate failed");
  } else {
    for (const [taskId, inst] of Object.entries(snapshot.kernel.instances)) {
      const h = hydratedKernel.instances[taskId];
      if (!h) {
        errors.push(`kernel instance missing after hydrate: ${taskId}`);
        continue;
      }
      if (h.status !== inst.status) {
        errors.push(`kernel status drift ${taskId}: ${inst.status} → ${h.status}`);
      }
      if (h.attempt !== inst.attempt) {
        errors.push(`kernel attempt drift ${taskId}: ${inst.attempt} → ${h.attempt}`);
      }
      if (h.run_id !== inst.run_id) {
        errors.push(`kernel run_id drift ${taskId}`);
      }
    }
  }

  const cadenceRaw = JSON.parse(JSON.stringify(snapshot.cadence)) as unknown;
  const hydratedCadence = hydrateOpsCadenceFromJson(cadenceRaw);
  if (!hydratedCadence) {
    errors.push("ops cadence hydrate failed");
  } else if (hydratedCadence.tasks.length !== snapshot.cadence.tasks.length) {
    errors.push(
      `ops cadence task count drift: ${snapshot.cadence.tasks.length} → ${hydratedCadence.tasks.length}`,
    );
  } else {
    for (const task of snapshot.cadence.tasks) {
      const h = hydratedCadence.tasks.find((t) => t.id === task.id);
      if (!h) {
        errors.push(`ops task missing after hydrate: ${task.id}`);
        continue;
      }
      if (h.status !== task.status) {
        errors.push(`ops status drift ${task.id}: ${task.status} → ${h.status}`);
      }
      const proofAt = task.proof?.completed_at ?? "";
      const hydratedProofAt = h.proof?.completed_at ?? "";
      if (proofAt !== hydratedProofAt) {
        errors.push(`ops proof drift ${task.id}`);
      }
    }
  }

  if (snapshot.delegate) {
    const delegateRaw = JSON.parse(JSON.stringify(snapshot.delegate)) as unknown;
    const hydratedDelegate = hydrateDelegateOperatorFromJson(delegateRaw);
    if (!hydratedDelegate) {
      errors.push("delegate operator hydrate failed");
    } else if (hydratedDelegate.daily_rubrics.length !== snapshot.delegate.daily_rubrics.length) {
      errors.push("delegate rubric count drift");
    }
  }

  return errors;
}
