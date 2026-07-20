/**
 * Part 6 — dimension registry: required gates, default confidence, confirmation prompts.
 */
import type {
  ClaimConfidence,
  ConfirmationPrompt,
  ProductUnderstandingDimension,
} from "./productUnderstandingInput";

export interface DimensionDef {
  id: ProductUnderstandingDimension;
  label: string;
  question: string;
  required_for_seal: boolean;
  required_for_week1: boolean;
  default_empty_confidence: ClaimConfidence;
  allowed_sources: Array<
    import("./productUnderstandingInput").EvidenceSourceKind
  >;
}

export const DIMENSION_REGISTRY: Record<ProductUnderstandingDimension, DimensionDef> = {
  product_category: {
    id: "product_category",
    label: "Product category",
    question: "What type of product is this?",
    required_for_seal: false,
    required_for_week1: false,
    default_empty_confidence: "assumption",
    allowed_sources: ["repo_path", "scan_heuristic", "user_answer"],
  },
  business_model: {
    id: "business_model",
    label: "Business model",
    question: "How does this product make money?",
    required_for_seal: true,
    required_for_week1: true,
    default_empty_confidence: "missing",
    allowed_sources: ["repo_path", "user_answer", "scan_heuristic"],
  },
  pricing: {
    id: "pricing",
    label: "Pricing",
    question: "What is the pricing model or range?",
    required_for_seal: false,
    required_for_week1: false,
    default_empty_confidence: "missing",
    allowed_sources: ["repo_path", "live_url", "user_answer", "browser_finding"],
  },
  target_user: {
    id: "target_user",
    label: "Target user",
    question: "Who is the primary user?",
    required_for_seal: true,
    required_for_week1: false,
    default_empty_confidence: "missing",
    allowed_sources: ["repo_path", "user_answer"],
  },
  primary_problem: {
    id: "primary_problem",
    label: "Primary problem",
    question: "What pain does this solve?",
    required_for_seal: false,
    required_for_week1: false,
    default_empty_confidence: "assumption",
    allowed_sources: ["repo_path", "user_answer"],
  },
  activation_event: {
    id: "activation_event",
    label: "Activation event",
    question: "What is the first value moment?",
    required_for_seal: true,
    required_for_week1: true,
    default_empty_confidence: "needs_confirmation",
    allowed_sources: ["user_answer", "repo_path", "scan_heuristic"],
  },
  traffic_analytics: {
    id: "traffic_analytics",
    label: "Traffic & analytics",
    question: "Is measurement connected?",
    required_for_seal: false,
    required_for_week1: false,
    default_empty_confidence: "missing",
    allowed_sources: ["analytics_snapshot", "scan_heuristic", "user_answer"],
  },
  site_structure: {
    id: "site_structure",
    label: "Site structure",
    question: "Landing, pricing, onboarding surfaces?",
    required_for_seal: false,
    required_for_week1: false,
    default_empty_confidence: "measured",
    allowed_sources: ["repo_path", "live_url", "scan_heuristic"],
  },
  founder_constraints: {
    id: "founder_constraints",
    label: "Founder constraints",
    question: "Time, budget, visibility limits?",
    required_for_seal: false,
    required_for_week1: true,
    default_empty_confidence: "missing",
    allowed_sources: ["user_answer"],
  },
  distribution_assets: {
    id: "distribution_assets",
    label: "Distribution assets",
    question: "Existing channels and proof?",
    required_for_seal: false,
    required_for_week1: false,
    default_empty_confidence: "missing",
    allowed_sources: ["repo_path", "user_answer", "experiment"],
  },
  competitors_alternatives: {
    id: "competitors_alternatives",
    label: "Competitors",
    question: "Who are the alternatives?",
    required_for_seal: false,
    required_for_week1: false,
    default_empty_confidence: "missing",
    allowed_sources: ["user_answer", "browser_finding", "live_url"],
  },
};

export const CRITICAL_SEAL_DIMENSIONS: ProductUnderstandingDimension[] = (
  Object.values(DIMENSION_REGISTRY) as DimensionDef[]
)
  .filter((d) => d.required_for_seal)
  .map((d) => d.id);

export const CRITICAL_WEEK1_DIMENSIONS: ProductUnderstandingDimension[] = (
  Object.values(DIMENSION_REGISTRY) as DimensionDef[]
)
  .filter((d) => d.required_for_week1)
  .map((d) => d.id);

export function confirmationPromptFor(
  dimension: ProductUnderstandingDimension,
): ConfirmationPrompt {
  const def = DIMENSION_REGISTRY[dimension];
  return {
    id: `confirm.${dimension}`,
    dimension,
    prompt: def.question,
    cta_label: `Confirm ${def.label.toLowerCase()}`,
  };
}

export function dimensionDef(id: ProductUnderstandingDimension): DimensionDef {
  return DIMENSION_REGISTRY[id];
}
