/**
 * Part 6 — Product understanding claim + evidence SSOT types.
 * See PRODUCT_UNDERSTANDING_SPEC.md
 */

export type ClaimConfidence = "measured" | "assumption" | "missing" | "needs_confirmation";

export type EvidenceSourceKind =
  | "repo_path"
  | "live_url"
  | "user_answer"
  | "analytics_snapshot"
  | "experiment"
  | "scan_heuristic"
  | "browser_finding";

export type ProductUnderstandingDimension =
  | "product_category"
  | "business_model"
  | "pricing"
  | "target_user"
  | "primary_problem"
  | "activation_event"
  | "traffic_analytics"
  | "site_structure"
  | "founder_constraints"
  | "distribution_assets"
  | "competitors_alternatives";

export const PRODUCT_UNDERSTANDING_DIMENSIONS: ProductUnderstandingDimension[] = [
  "product_category",
  "business_model",
  "pricing",
  "target_user",
  "primary_problem",
  "activation_event",
  "traffic_analytics",
  "site_structure",
  "founder_constraints",
  "distribution_assets",
  "competitors_alternatives",
];

export interface EvidenceRef {
  id: string;
  kind: EvidenceSourceKind;
  label: string;
  ref: string;
  excerpt?: string;
  startLine?: number;
  endLine?: number;
  captured_at?: string;
  rule_id?: string;
}

export interface ProductClaim {
  dimension: ProductUnderstandingDimension;
  value: string | number | boolean | null;
  confidence: ClaimConfidence;
  evidence: EvidenceRef[];
  updated_at: string;
}

export interface ConfirmationPrompt {
  id: string;
  dimension: ProductUnderstandingDimension;
  prompt: string;
  cta_label: string;
}

export interface ProductUnderstandingGraph {
  version: 1;
  project_id: string;
  claims: ProductClaim[];
  computed_at: string;
}

export interface FabricationAudit {
  gate_id: string;
  dimension?: ProductUnderstandingDimension;
  message: string;
  blocked: boolean;
  recovery?: string;
}

export interface ProductUnderstandingBuildInput {
  project?: import("./types").ProjectProfile | null;
  profile?: import("./types").MarketingProfile | null;
  urlScan?: UrlScanClaimsInput | null;
}

export interface UrlScanClaimsInput {
  url: string;
  title?: string;
  description?: string;
  routes: string[];
  hasAnalytics: boolean;
}

export interface ThesisDecisionLog {
  thesis_id: string;
  matched_rules: string[];
  blocking_claims: ProductUnderstandingDimension[];
  rationale_claim_ids: string[];
}

export function createEvidenceRef(
  partial: Omit<EvidenceRef, "id"> & { id?: string },
): EvidenceRef {
  const base = `${partial.kind}:${partial.ref}:${partial.rule_id ?? ""}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  const id = partial.id ?? `ev-${hash.toString(36)}`;
  return { ...partial, id };
}

export function claimId(dimension: ProductUnderstandingDimension): string {
  return `claim.${dimension}`;
}
