/**
 * Part 6 — bind CMO intake signals → product understanding claims (honest SSOT).
 */
import type { ChannelThesisId } from "./cmoIntake";
import type { ProductUnderstandingDimension, ProductUnderstandingGraph } from "./productUnderstandingInput";
import { claimForDimension } from "./productUnderstandingPolicy";

export interface SignalClaimBinding {
  signal_key: string;
  signal_value: string;
  rule_id: string;
  claim_dimension: ProductUnderstandingDimension;
  claim_id: string;
  confidence: string;
}

/** Maps intake signal keys to dimensions they should cite. */
export const SIGNAL_DIMENSION_MAP: Record<string, ProductUnderstandingDimension[]> = {
  persona: ["founder_constraints"],
  framework: ["product_category"],
  routes: ["site_structure"],
  hero: ["site_structure"],
  bottleneck: ["primary_problem"],
  bottleneck_label: ["primary_problem"],
  company_stage: ["target_user", "business_model"],
  has_analytics: ["traffic_analytics"],
  product_class: ["product_category", "target_user"],
  controversial_hook: ["product_category", "distribution_assets"],
  days_until_launch: ["distribution_assets"],
  email_list: ["distribution_assets"],
};

/** Thesis pick rules that must resolve to at least one claim when graph exists. */
export const THESIS_SIGNAL_RULES: Partial<Record<ChannelThesisId, string[]>> = {
  viral_short_form: ["signal.product_class", "signal.controversial_hook", "signal.company_stage"],
  founder_social: ["signal.product_class", "signal.bottleneck", "signal.hero"],
  landing_conversion: ["signal.hero", "signal.has_analytics", "signal.bottleneck"],
  seo_content: ["signal.hero", "signal.company_stage"],
  outbound_sales: ["signal.persona", "signal.bottleneck"],
  community_launch: ["signal.product_class", "signal.bottleneck"],
  product_hunt_launch: ["signal.days_until_launch", "signal.company_stage"],
  influencer_partnerships: ["signal.product_class", "signal.bottleneck"],
};

const SIGNAL_RULE_IDS: Record<string, string> = {
  persona: "signal.persona",
  framework: "signal.framework",
  routes: "signal.routes_count",
  hero: "signal.hero_path",
  bottleneck: "signal.bottleneck",
  bottleneck_label: "signal.bottleneck_label",
  company_stage: "signal.company_stage",
  has_analytics: "signal.has_analytics",
  product_class: "signal.product_class",
  controversial_hook: "signal.controversial_hook",
  days_until_launch: "signal.days_until_launch",
  email_list: "signal.email_list",
};

export function bindSignalsToClaims(
  signals: Record<string, string>,
  graph: ProductUnderstandingGraph | null | undefined,
): SignalClaimBinding[] {
  const bindings: SignalClaimBinding[] = [];
  for (const [key, value] of Object.entries(signals)) {
    const dims = SIGNAL_DIMENSION_MAP[key];
    if (!dims?.length) continue;
    for (const dim of dims) {
      const claim = graph ? claimForDimension(graph, dim) : undefined;
      bindings.push({
        signal_key: key,
        signal_value: value,
        rule_id: SIGNAL_RULE_IDS[key] ?? `signal.${key}`,
        claim_dimension: dim,
        claim_id: claim ? `claim.${dim}` : `claim.${dim}.missing`,
        confidence: claim?.confidence ?? "missing",
      });
    }
  }
  return bindings;
}

export function rationaleClaimIdsFromBindings(
  rationale: string[],
  bindings: SignalClaimBinding[],
  thesisId: ChannelThesisId,
): string[] {
  const thesisRules = THESIS_SIGNAL_RULES[thesisId] ?? [];
  return rationale.map((bullet, i) => {
    const matched = bindings.filter((b) => {
      if (/landing|hero|conversion/i.test(bullet) && b.claim_dimension === "site_structure") return true;
      if (/SEO|content|blog/i.test(bullet) && b.claim_dimension === "site_structure") return true;
      if (/founder|social|dev/i.test(bullet) && b.claim_dimension === "product_category") return true;
      if (/viral|short-form|creator|tiktok|reels/i.test(bullet) && b.claim_dimension === "product_category") return true;
      if (/analytics|track|measure/i.test(bullet) && b.claim_dimension === "traffic_analytics") return true;
      if (/pricing|checkout|paid/i.test(bullet) && b.claim_dimension === "pricing") return true;
      if (/activation|onboard|signup|value/i.test(bullet) && b.claim_dimension === "activation_event") return true;
      if (thesisRules.includes(b.rule_id)) return true;
      return false;
    });
    const refs = [...new Set(matched.map((m) => m.claim_id))];
    return `rationale.${i}:${refs.join(",") || "template"}`;
  });
}
