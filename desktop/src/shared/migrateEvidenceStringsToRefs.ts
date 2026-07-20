/**
 * Part 6 — v1 compat: migrate prose evidence strings to EvidenceRef[].
 */
import { createEvidenceRef, type EvidenceRef } from "./productUnderstandingInput";

export function migrateEvidenceStringsToRefs(
  lines: string[] | undefined,
  fallbackKind: EvidenceRef["kind"] = "scan_heuristic",
): EvidenceRef[] {
  if (!lines?.length) return [];
  return lines.map((line, i) =>
    createEvidenceRef({
      kind: fallbackKind,
      label: line,
      ref: `legacy:${i}`,
      rule_id: "migrate.v1_string",
    }),
  );
}

export function evidenceLabels(refs: EvidenceRef[], legacy?: string[]): string[] {
  if (refs.length > 0) return refs.map((r) => r.label);
  return legacy ?? [];
}
