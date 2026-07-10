import type { MarketingPlan, MarketingProfile } from "./types";
import type { WorkSurface } from "./workSurfaces";

/** Left project rail sections — marketing workspace navigation. */
export type RailSection =
  | "product"
  | "goals"
  | "audiences"
  | "campaigns"
  | "experiments"
  | "connections"
  | "brand";

export const RAIL_SECTIONS: RailSection[] = [
  "product",
  "goals",
  "audiences",
  "campaigns",
  "experiments",
  "connections",
  "brand",
];

export type RailSectionStatus = "empty" | "partial" | "ready";

export interface RailSectionMeta {
  id: RailSection;
  label: string;
  description: string;
  /** Default center stage when the section header is clicked. */
  workSurface: WorkSurface;
}

export const RAIL_SECTION_META: Record<RailSection, RailSectionMeta> = {
  product: {
    id: "product",
    label: "Product",
    description: "Name, category, stage, and positioning context.",
    workSurface: "campaign-plan",
  },
  goals: {
    id: "goals",
    label: "Goals",
    description: "Marketing goals and readiness metrics.",
    workSurface: "performance",
  },
  audiences: {
    id: "audiences",
    label: "Audiences",
    description: "Personas, pains, and jobs to be done.",
    workSurface: "content-set",
  },
  campaigns: {
    id: "campaigns",
    label: "Campaigns",
    description: "Active plan, tasks, and funnel mapping.",
    workSurface: "campaign-plan",
  },
  experiments: {
    id: "experiments",
    label: "Experiments",
    description: "Hypotheses, outcomes, and learnings.",
    workSurface: "experiment",
  },
  connections: {
    id: "connections",
    label: "Connections",
    description: "Channels and ad account connectors.",
    workSurface: "performance",
  },
  brand: {
    id: "brand",
    label: "Brand",
    description: "Voice, proof, constraints, and creative assets.",
    workSurface: "content-set",
  },
};

/** Maps profile fields to rail sections for completeness checks. */
export const RAIL_PROFILE_FIELDS: Record<RailSection, (keyof MarketingProfile)[]> = {
  product: ["product_name", "product_description", "category", "company_stage"],
  goals: ["marketing_goals", "primary_problem", "main_value_proposition"],
  audiences: ["target_audience", "main_markets"],
  campaigns: ["marketing_goals", "available_channels"],
  experiments: ["previous_experiments"],
  connections: ["available_channels"],
  brand: ["brand_voice", "differentiators", "constraints"],
};

export function railSectionToWorkSurface(section: RailSection): WorkSurface {
  return RAIL_SECTION_META[section].workSurface;
}

export function computeRailSectionStatus(
  section: RailSection,
  profile: MarketingProfile | null,
  plan: MarketingPlan | null,
): RailSectionStatus {
  if (section === "campaigns") {
    if (plan?.taskGraph.length) return "ready";
    if (plan) return "partial";
    return profile?.marketing_goals.length ? "partial" : "empty";
  }

  if (!profile) return "empty";

  switch (section) {
    case "product":
      return profile.product_name && profile.product_description ? "ready" : "partial";
    case "goals":
      return profile.marketing_goals.length >= 2
        ? "ready"
        : profile.marketing_goals.length
          ? "partial"
          : "empty";
    case "audiences":
      return profile.target_audience.length >= 1 ? "ready" : "empty";
    case "experiments":
      return profile.previous_experiments.length >= 1 ? "ready" : "empty";
    case "connections":
      return profile.available_channels.length >= 1 ? "ready" : "empty";
    case "brand":
      return profile.brand_voice && profile.differentiators.length
        ? "ready"
        : profile.brand_voice
          ? "partial"
          : "empty";
    default:
      return "empty";
  }
}

export function isProfileIncomplete(profile: MarketingProfile | null): boolean {
  if (!profile) return true;
  if (profile.gaps.length > 0) return true;
  return profile.confidence_score < 0.5;
}

export const PROFILE_GAP_PROMPT =
  "Tell me about your target market and main competitors so I can tailor the campaign.";
