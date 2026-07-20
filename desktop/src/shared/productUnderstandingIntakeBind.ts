/**
 * Part 6 — bind CMO intake thesis to product understanding claims.
 */
import type { ChannelThesis, ChannelThesisId, CmoIntakeInput } from "./cmoIntake";
import type { ProductUnderstandingGraph, ThesisDecisionLog } from "./productUnderstandingInput";
import { claimForDimension } from "./productUnderstandingPolicy";

const THESIS_RULE_MAP: Partial<Record<ChannelThesisId, string[]>> = {
  viral_short_form: ["signal.consumer", "signal.viral_readme"],
  founder_social: ["signal.b2b_or_devtool", "signal.awareness"],
  landing_conversion: ["signal.hero_path", "signal.pricing_or_signup"],
  seo_content: ["signal.blog_route"],
  outbound_sales: ["signal.sales_persona", "signal.pipeline_empty"],
  community_launch: ["signal.devtool_or_marketplace"],
  product_hunt_launch: ["signal.launch_window"],
  influencer_partnerships: ["signal.consumer", "signal.proof_gap"],
};

export function bindThesisRationale(
  thesis: ChannelThesis,
  graph: ProductUnderstandingGraph | null | undefined,
): ChannelThesis {
  if (!graph) return thesis;
  const claimIds: string[] = [];
  const boundRationale = thesis.rationale.map((bullet, i) => {
    const site = claimForDimension(graph, "site_structure");
    const category = claimForDimension(graph, "product_category");
    const refs: string[] = [];
    if (/landing|hero|conversion/i.test(bullet) && site) refs.push(`claim.site_structure`);
    if (/SEO|content|blog/i.test(bullet) && site) refs.push(`claim.site_structure`);
    if (/founder|social|dev/i.test(bullet) && category) refs.push(`claim.product_category`);
    if (/viral|short-form|creator/i.test(bullet) && category) refs.push(`claim.product_category`);
    claimIds.push(`rationale.${i}:${refs.join(",") || "template"}`);
    return bullet;
  });
  return {
    ...thesis,
    rationale: boundRationale,
    rationale_claim_ids: claimIds,
  };
}

export function buildThesisDecisionLog(
  thesisId: ChannelThesisId,
  input: CmoIntakeInput,
  graph: ProductUnderstandingGraph | null | undefined,
): ThesisDecisionLog {
  const matched = THESIS_RULE_MAP[thesisId] ?? [`thesis.${thesisId}`];
  const blocking: ThesisDecisionLog["blocking_claims"] = [];
  if (graph) {
    const biz = claimForDimension(graph, "business_model");
    if (biz?.confidence === "missing") blocking.push("business_model");
    const act = claimForDimension(graph, "activation_event");
    if (act?.confidence === "needs_confirmation") blocking.push("activation_event");
  }
  if (input.project.source.kind === "url") {
    blocking.push("site_structure");
  }
  return {
    thesis_id: thesisId,
    matched_rules: matched,
    blocking_claims: blocking,
    rationale_claim_ids: [],
  };
}

export function attachIntakeUnderstanding(
  thesis: ChannelThesis,
  input: CmoIntakeInput,
  graph: ProductUnderstandingGraph | null | undefined,
): ChannelThesis {
  const withRationale = bindThesisRationale(thesis, graph);
  const decision = buildThesisDecisionLog(thesis.id, input, graph);
  return {
    ...withRationale,
    thesis_decision: decision,
    rationale_claim_ids: withRationale.rationale_claim_ids,
  };
}
