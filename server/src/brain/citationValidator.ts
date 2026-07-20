/**
 * Part 6 — post-LLM citation validator for /agent decisions.
 */
import type { MarketingDecision } from "../schemas/decision.js";

export interface ClaimGraphRow {
  dimension: string;
  value: unknown;
  confidence: string;
  evidence?: Array<{ ref: string }>;
}

export interface CitationValidationResult {
  ok: boolean;
  errors: string[];
  sanitized?: MarketingDecision;
}

export function validateDecisionCitations(
  decision: MarketingDecision,
  graph: ClaimGraphRow[],
): CitationValidationResult {
  const errors: string[] = [];
  const byDim = new Map(graph.map((r) => [r.dimension, r]));

  if (decision.claim_citations?.length) {
    for (const cite of decision.claim_citations) {
      const row = byDim.get(cite.dimension);
      if (!row) {
        errors.push(`Cited unknown dimension: ${cite.dimension}`);
        continue;
      }
      if (row.confidence === "missing") {
        errors.push(`Cannot cite missing dimension as fact: ${cite.dimension}`);
      }
      if (cite.confidence === "measured" && (!cite.evidence_refs || cite.evidence_refs.length === 0)) {
        errors.push(`Measured citation requires evidence_refs: ${cite.dimension}`);
      }
    }
  }

  if (decision.profile_citations?.length && graph.length) {
    for (const field of decision.profile_citations) {
      const row = byDim.get(field);
      if (row && (row.value == null || row.value === "") && row.confidence === "missing") {
        errors.push(`profile_citations references empty/missing field: ${field}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    sanitized: errors.length ? decision : decision,
  };
}
