/**
 * Faz 5 — progressive human proof: posted URL → metrics → complete.
 */
import type { HumanProofDraft, HumanProofProgressStep } from "./humanExecutionAsset";
import type { CmoOpsCadence, CmoOpsTask } from "./cmoOpsCadence";
import { resolveProofRequirements } from "./proofRequirements";

const URL_RE = /^https?:\/\/.+/i;

export function validatePostedUrl(url: string | undefined): { ok: boolean; error?: string } {
  const trimmed = url?.trim() ?? "";
  if (trimmed.length < 8) {
    return { ok: false, error: "Post URL required (min 8 characters)." };
  }
  if (!URL_RE.test(trimmed) && trimmed.length < 12) {
    return { ok: false, error: "Add a valid http(s) URL or a longer proof link." };
  }
  return { ok: true };
}

export function resolveHumanProofStep(
  draft: HumanProofDraft | null | undefined,
  taskComplete: boolean,
): HumanProofProgressStep {
  if (taskComplete) return "complete";
  if (!draft?.posted_url?.trim()) return "draft";
  if (draft.measure_deferred || draft.kpi_value != null) return "metrics";
  return "posted";
}

export function canAdvanceToMetrics(draft: HumanProofDraft | null | undefined): boolean {
  return validatePostedUrl(draft?.posted_url).ok;
}

export function canCompleteHumanProof(
  draft: HumanProofDraft | null | undefined,
  requireKpi: boolean,
  cadence?: CmoOpsCadence | null,
  task?: Pick<CmoOpsTask, "owner" | "done_when" | "expected_proof_kind">,
): { ok: boolean; error?: string } {
  const posted = validatePostedUrl(draft?.posted_url);
  if (!posted.ok) return posted;

  const effectiveRequireKpi =
    task != null
      ? resolveProofRequirements(cadence, task).kpiRequired && !draft?.measure_deferred
      : requireKpi;

  if (effectiveRequireKpi && draft?.kpi_value == null && !draft?.measure_deferred) {
    return { ok: false, error: "Log a KPI value or defer measurement before completing." };
  }
  return { ok: true };
}

export function nextProofStepLabel(step: HumanProofProgressStep): string {
  switch (step) {
    case "draft":
      return "Mark posted";
    case "posted":
      return "Log metrics";
    case "metrics":
      return "Complete";
    case "complete":
      return "Done";
  }
}
