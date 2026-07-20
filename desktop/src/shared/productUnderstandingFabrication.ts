/**
 * Part 6 — anti-fabrication audit gates (FAB-01..06).
 */
import type { ChannelThesis } from "./cmoIntake";
import {
  CRITICAL_SEAL_DIMENSIONS,
  CRITICAL_WEEK1_DIMENSIONS,
  confirmationPromptFor,
} from "./productUnderstandingRegistry";
import type {
  FabricationAudit,
  ProductUnderstandingDimension,
  ProductUnderstandingGraph,
} from "./productUnderstandingInput";
import { claimForDimension } from "./productUnderstandingPolicy";

export interface FabricationContext {
  action?: "seal" | "week1" | "replan" | "brain_decision";
  thesis?: ChannelThesis | null;
  cited_dimensions?: string[];
  url_only?: boolean;
}

export function auditClaimFabrication(
  graph: ProductUnderstandingGraph | null | undefined,
  context: FabricationContext = {},
): FabricationAudit[] {
  const audits: FabricationAudit[] = [];
  if (!graph) {
    audits.push({
      gate_id: "FAB-00",
      message: "No product understanding graph — claims not computed",
      blocked: false,
    });
    return audits;
  }

  for (const claim of graph.claims) {
    if (claim.confidence === "measured" && claim.evidence.length === 0) {
      audits.push({
        gate_id: "FAB-MEASURED",
        dimension: claim.dimension,
        message: `Measured claim "${claim.dimension}" has no evidence`,
        blocked: true,
        recovery: "Add source ref or downgrade to assumption/missing",
      });
    }
    if (context.url_only && claim.evidence.some((e) => e.kind === "repo_path")) {
      audits.push({
        gate_id: "FAB-05",
        dimension: claim.dimension,
        message: "URL-only project cannot cite repo paths",
        blocked: true,
        recovery: "Remove invalid repo_path refs",
      });
    }
    if (claim.dimension === "competitors_alternatives" && claim.confidence === "measured") {
      const hasUrlOrUser = claim.evidence.some(
        (e) => e.kind === "live_url" || e.kind === "user_answer" || e.kind === "browser_finding",
      );
      if (!hasUrlOrUser) {
        audits.push({
          gate_id: "FAB-04",
          dimension: claim.dimension,
          message: "Competitor claim lacks URL or user ref",
          blocked: true,
          recovery: confirmationPromptFor("competitors_alternatives").cta_label,
        });
      }
    }
  }

  if (context.action === "seal") {
    for (const dim of CRITICAL_SEAL_DIMENSIONS) {
      const claim = claimForDimension(graph, dim);
      if (!claim || claim.confidence === "missing") {
        audits.push({
          gate_id: "FAB-01",
          dimension: dim,
          message: `Critical dimension "${dim}" is missing for strategic seal`,
          blocked: true,
          recovery: confirmationPromptFor(dim).cta_label,
        });
      }
      if (claim?.confidence === "needs_confirmation") {
        audits.push({
          gate_id: "FAB-01",
          dimension: dim,
          message: `"${dim}" needs confirmation before seal`,
          blocked: true,
          recovery: confirmationPromptFor(dim).cta_label,
        });
      }
    }
  }

  if (context.action === "week1") {
    for (const dim of CRITICAL_WEEK1_DIMENSIONS) {
      const claim = claimForDimension(graph, dim);
      if (!claim || claim.confidence === "missing") {
        audits.push({
          gate_id: "FAB-01-WEEK1",
          dimension: dim,
          message: `"${dim}" missing for Week 1`,
          blocked: dim === "activation_event" || dim === "business_model",
          recovery: confirmationPromptFor(dim).cta_label,
        });
      }
      if (claim?.confidence === "needs_confirmation") {
        audits.push({
          gate_id: "FAB-01-WEEK1",
          dimension: dim,
          message: `"${dim}" needs confirmation before Week 1`,
          blocked: dim === "activation_event" || dim === "business_model",
          recovery: confirmationPromptFor(dim).cta_label,
        });
      }
    }
  }

  if (context.action === "brain_decision" && context.cited_dimensions?.length) {
    for (const dim of context.cited_dimensions) {
      const claim = claimForDimension(graph, dim as ProductUnderstandingDimension);
      if (claim?.confidence === "missing") {
        audits.push({
          gate_id: "FAB-02",
          dimension: dim as ProductUnderstandingDimension,
          message: `Brain cited missing dimension "${dim}" as fact`,
          blocked: true,
        });
      }
    }
  }

  if (context.thesis?.rationale?.length && !context.thesis.rationale_claim_ids?.length) {
    audits.push({
      gate_id: "FAB-RATIONALE",
      message: "Thesis rationale bullets not linked to claims",
      blocked: false,
      recovery: "Bind rationale via productUnderstandingIntakeBind",
    });
  }

  return audits;
}

export function hasBlockingFabrication(audits: FabricationAudit[]): boolean {
  return audits.some((a) => a.blocked);
}

export function blockingDimensions(audits: FabricationAudit[]): ProductUnderstandingDimension[] {
  return audits.filter((a) => a.blocked && a.dimension).map((a) => a.dimension!);
}
