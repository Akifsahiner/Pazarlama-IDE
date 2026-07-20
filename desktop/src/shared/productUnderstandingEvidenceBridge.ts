/**
 * Part 6 — bridge ProductUnderstandingGraph evidence into P15/P16/P17 bindings.
 */
import { migrateEvidenceStringsToRefs } from "./migrateEvidenceStringsToRefs";
import type { EvidenceRef, ProductUnderstandingDimension, ProductUnderstandingGraph } from "./productUnderstandingInput";
import { claimForDimension } from "./productUnderstandingPolicy";

export function refsFromGraph(
  graph: ProductUnderstandingGraph | null | undefined,
  dimensions: ProductUnderstandingDimension[],
): EvidenceRef[] {
  if (!graph) return [];
  const refs: EvidenceRef[] = [];
  for (const dim of dimensions) {
    const row = claimForDimension(graph, dim);
    if (row?.evidence.length) refs.push(...row.evidence.slice(0, 3));
  }
  return refs;
}

export function bindingEvidenceRefs(
  graph: ProductUnderstandingGraph | null | undefined,
  legacyEvidence: string[],
  dimensions: ProductUnderstandingDimension[],
): EvidenceRef[] {
  const fromGraph = refsFromGraph(graph, dimensions);
  if (fromGraph.length) return fromGraph.slice(0, 8);
  return migrateEvidenceStringsToRefs(legacyEvidence);
}
