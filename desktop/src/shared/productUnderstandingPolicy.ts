/**
 * Part 6 — merge scan + profile → ProductUnderstandingGraph.
 */
import type { MarketingProfile, ProjectProfile } from "./types";
import {
  type ProductClaim,
  type ProductUnderstandingBuildInput,
  type ProductUnderstandingDimension,
  type ProductUnderstandingGraph,
} from "./productUnderstandingInput";
import { buildClaimsFromScan, extractActivationClaim, extractPrimaryProblemClaim } from "./productUnderstandingFromScan";
import { buildClaimsFromProfile } from "./productUnderstandingFromProfile";
import { buildClaimsFromUrlScan } from "./productUnderstandingFromUrl";

export function mergeClaimLists(claims: ProductClaim[]): ProductClaim[] {
  const byDim = new Map<ProductUnderstandingDimension, ProductClaim>();
  for (const c of claims) {
    const prev = byDim.get(c.dimension);
    if (!prev) {
      byDim.set(c.dimension, c);
      continue;
    }
    const rank = (x: ProductClaim) => {
      const order = { measured: 4, assumption: 3, needs_confirmation: 2, missing: 1 };
      return order[x.confidence] * 10 + x.evidence.length;
    };
    byDim.set(c.dimension, rank(c) >= rank(prev) ? c : prev);
  }
  return Array.from(byDim.values());
}

export function buildProductUnderstanding(
  input: ProductUnderstandingBuildInput,
): ProductUnderstandingGraph | null {
  const { project, profile, urlScan } = input;
  const projectId = project?.id ?? profile?.product_name ?? "unknown";
  const parts: ProductClaim[] = [];

  if (project) {
    parts.push(...buildClaimsFromScan(project));
    const activation = profile?.product_activation?.activation_event_label;
    const magic = profile?.founder_fit?.magic_moment;
    if (activation || magic) {
      const idx = parts.findIndex((c) => c.dimension === "activation_event");
      if (idx >= 0) parts.splice(idx, 1);
      parts.push(extractActivationClaim(project, magic, activation));
    }
    if (profile?.primary_problem) {
      const idx = parts.findIndex((c) => c.dimension === "primary_problem");
      if (idx >= 0) parts.splice(idx, 1);
      parts.push(extractPrimaryProblemClaim(project, profile.primary_problem));
    }
  }
  if (urlScan) parts.push(...buildClaimsFromUrlScan(urlScan));
  if (profile) parts.push(...buildClaimsFromProfile(profile));

  if (parts.length === 0) return null;

  return {
    version: 1,
    project_id: projectId,
    claims: mergeClaimLists(parts),
    computed_at: new Date().toISOString(),
  };
}

export function claimForDimension(
  graph: ProductUnderstandingGraph | null | undefined,
  dimension: ProductUnderstandingDimension,
): ProductClaim | undefined {
  return graph?.claims.find((c) => c.dimension === dimension);
}

export function mergeClaims(
  prev: ProductUnderstandingGraph | null | undefined,
  patch: ProductUnderstandingGraph,
): ProductUnderstandingGraph {
  if (!prev) return patch;
  return {
    ...patch,
    claims: mergeClaimLists([...prev.claims, ...patch.claims]),
    computed_at: patch.computed_at,
  };
}

export function assertClaimSourced(claim: ProductClaim): void {
  if (claim.confidence === "measured" && claim.evidence.length === 0) {
    throw new Error(`Measured claim ${claim.dimension} requires evidence`);
  }
  if (claim.confidence === "missing" && claim.value != null && claim.value !== "") {
    throw new Error(`Missing claim ${claim.dimension} must have null value`);
  }
}

export function productUnderstandingCompact(
  graph: ProductUnderstandingGraph | null | undefined,
): string {
  if (!graph) return "{}";
  const rows = graph.claims.map((c) => ({
    dimension: c.dimension,
    value: c.value,
    confidence: c.confidence,
    evidence: c.evidence.map((e) => ({
      kind: e.kind,
      ref: e.ref,
      label: e.label,
    })),
  }));
  return JSON.stringify(rows, null, 0);
}

export function hydrateGraphFromProfile(
  profile: MarketingProfile | null | undefined,
  project?: ProjectProfile | null,
): ProductUnderstandingGraph | null {
  if (profile?.product_understanding) return profile.product_understanding;
  return buildProductUnderstanding({ project, profile });
}
