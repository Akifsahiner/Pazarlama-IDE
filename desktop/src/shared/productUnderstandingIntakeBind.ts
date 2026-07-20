/**
 * Part 6 — bind CMO intake thesis to product understanding claims.
 */
import type { ChannelThesis, CmoIntakeInput, ThesisPickResult } from "./cmoIntake";
import type { ProductUnderstandingGraph, ThesisDecisionLog } from "./productUnderstandingInput";
import { claimForDimension } from "./productUnderstandingPolicy";
import {
  bindSignalsToClaims,
  rationaleClaimIdsFromBindings,
} from "./productUnderstandingSignalBind";

export function bindThesisRationale(
  thesis: ChannelThesis,
  graph: ProductUnderstandingGraph | null | undefined,
): ChannelThesis {
  if (!graph) return thesis;
  const bindings = bindSignalsToClaims(thesis.signals, graph);
  const claimIds = rationaleClaimIdsFromBindings(thesis.rationale, bindings, thesis.id);
  return {
    ...thesis,
    rationale_claim_ids: claimIds,
  };
}

export function buildThesisDecisionLog(
  pick: ThesisPickResult,
  input: CmoIntakeInput,
  graph: ProductUnderstandingGraph | null | undefined,
  rationaleClaimIds: string[] = [],
): ThesisDecisionLog {
  const blocking: ThesisDecisionLog["blocking_claims"] = [];
  if (graph) {
    const biz = claimForDimension(graph, "business_model");
    if (biz?.confidence === "missing") blocking.push("business_model");
    const target = claimForDimension(graph, "target_user");
    if (target?.confidence === "missing") blocking.push("target_user");
    const act = claimForDimension(graph, "activation_event");
    if (act?.confidence === "needs_confirmation") blocking.push("activation_event");
  }
  if (input.project.source.kind === "url") {
    blocking.push("site_structure");
  }
  return {
    thesis_id: pick.id,
    matched_rules: pick.matched_rules,
    blocking_claims: blocking,
    rationale_claim_ids: rationaleClaimIds,
  };
}

export function attachIntakeUnderstanding(
  thesis: ChannelThesis,
  input: CmoIntakeInput,
  graph: ProductUnderstandingGraph | null | undefined,
  pick?: ThesisPickResult,
): ChannelThesis {
  const withRationale = bindThesisRationale(thesis, graph);
  const decision = buildThesisDecisionLog(
    pick ?? { id: thesis.id, matched_rules: [`thesis.${thesis.id}`] },
    input,
    graph,
    withRationale.rationale_claim_ids ?? [],
  );
  return {
    ...withRationale,
    thesis_decision: decision,
    rationale_claim_ids: withRationale.rationale_claim_ids,
  };
}
