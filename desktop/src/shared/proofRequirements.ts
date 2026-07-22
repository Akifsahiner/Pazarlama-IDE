/**
 * Progressive proof contract — URL-only before Day 3, KPI on measure tasks after.
 * Single SSOT for HumanTaskKit, OpsTaskProofModal, and completeOpsTask validation.
 */
import type { CmoOpsCadence, CmoOpsTask } from "./cmoOpsCadence";
import { needsOpsProof } from "./cmoOpsCadence";

export interface ProofRequirements {
  urlRequired: boolean;
  kpiRequired: boolean;
  kpiDeferrable: boolean;
  measureDeferredAllowed: boolean;
}

export interface ProofValidationInput {
  cadence?: CmoOpsCadence | null;
  measure_deferred?: boolean;
}

function doneWhenRequiresKpi(doneWhen: string): boolean {
  return /\bkpi\b|\bmetric\b|\bretention\b|\bviews\b|\bimpressions\b/i.test(doneWhen);
}

/** Resolve proof gates for a human/delegate ops task at the current cadence day. */
export function resolveProofRequirements(
  cadence: CmoOpsCadence | null | undefined,
  task: Pick<CmoOpsTask, "owner" | "done_when" | "expected_proof_kind">,
): ProofRequirements {
  if (!needsOpsProof(task.owner)) {
    return {
      urlRequired: false,
      kpiRequired: false,
      kpiDeferrable: true,
      measureDeferredAllowed: true,
    };
  }

  const dayIndex = cadence?.day_index ?? 1;
  const isPostProof =
    task.expected_proof_kind === "live_url" ||
    /post|publish|url|thread/i.test(task.done_when);

  const kpiExplicit =
    task.expected_proof_kind === "kpi" ||
    doneWhenRequiresKpi(task.done_when);

  const kpiRequired = dayIndex >= 3 && kpiExplicit && !isPostProof;
  const kpiDeferrable = dayIndex < 3 || isPostProof;

  return {
    urlRequired: true,
    kpiRequired,
    kpiDeferrable,
    measureDeferredAllowed: kpiDeferrable,
  };
}

/** Whether KPI validation should run for this proof submission. */
export function shouldRequireKpiProof(
  cadence: CmoOpsCadence | null | undefined,
  task: Pick<CmoOpsTask, "owner" | "done_when" | "expected_proof_kind">,
  proof?: ProofValidationInput,
): boolean {
  const reqs = resolveProofRequirements(cadence, task);
  if (!reqs.kpiRequired) return false;
  if (proof?.measure_deferred && reqs.measureDeferredAllowed) return false;
  return true;
}
