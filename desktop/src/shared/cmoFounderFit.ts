/**
 * P13 — Founder-fit intake. Seven answers constrain the channel thesis before execution.
 */
import type { ChannelThesisId } from "./cmoIntake";
import type { FounderFitProfile } from "./types";

export type FounderFitQuestionId = Exclude<keyof FounderFitProfile, "completed_at">;

export interface FounderFitQuestion {
  id: FounderFitQuestionId;
  prompt: string;
  helper: string;
  kind: "choice" | "text";
  options?: Array<{ value: string; label: string }>;
}

export const FOUNDER_FIT_QUESTIONS: readonly FounderFitQuestion[] = [
  {
    id: "brand_face_readiness",
    prompt: "Are you willing to be the face of the brand on camera?",
    helper: "The best channel must fit the founder who has to sustain it.",
    kind: "choice",
    options: [
      { value: "never", label: "No — build without my face" },
      { value: "sometimes", label: "Sometimes, with a clear script" },
      { value: "primary_channel", label: "Yes — I can lead the channel" },
    ],
  },
  {
    id: "controversy_tolerance",
    prompt: "Can you lean into polarizing positioning if the data supports it?",
    helper: "We will never manufacture outrage; this sets the acceptable narrative edge.",
    kind: "choice",
    options: [
      { value: "avoid", label: "Avoid polarizing positions" },
      { value: "selective", label: "Only when the evidence is strong" },
      { value: "lean_in", label: "Yes — challenge the category" },
    ],
  },
  {
    id: "monthly_budget_band",
    prompt: "What can you invest in marketing during the first month?",
    helper: "P13 uses this only for feasibility. Budget allocation comes in P14.",
    kind: "choice",
    options: [
      { value: "0", label: "$0 — time and product only" },
      { value: "under_500", label: "Under $500" },
      { value: "500_2000", label: "$500–$2,000" },
      { value: "over_2000", label: "Over $2,000" },
    ],
  },
  {
    id: "scale_readiness",
    prompt: "If marketing works, can the product handle a traffic spike?",
    helper: "We should not scale acquisition into a product that is not ready.",
    kind: "choice",
    options: [
      { value: "not_yet", label: "Not yet" },
      { value: "probably", label: "Probably — with monitoring" },
      { value: "yes", label: "Yes" },
    ],
  },
  {
    id: "magic_moment",
    prompt: "What must a new user experience to say “this works”?",
    helper: "Describe the first concrete moment of value, not a feature list.",
    kind: "text",
  },
  {
    id: "weekly_marketing_hours",
    prompt: "How many hours can you reliably spend on marketing each week?",
    helper: "Choose the repeatable number, not the optimistic one.",
    kind: "choice",
    options: [
      { value: "under_3", label: "Under 3 hours" },
      { value: "3_7", label: "3–7 hours" },
      { value: "7_15", label: "7–15 hours" },
      { value: "15_plus", label: "15+ hours" },
    ],
  },
  {
    id: "thirty_day_win",
    prompt: "What outcome would make the first 30 days a win?",
    helper: "This becomes the strategic target; Week 1 evidence will calibrate it.",
    kind: "choice",
    options: [
      { value: "qualified_signups", label: "Qualified signups" },
      { value: "paying_customers", label: "Paying customers" },
      { value: "waitlist", label: "Waitlist growth" },
      { value: "pipeline_meetings", label: "Pipeline meetings" },
      { value: "brand_awareness", label: "Measurable awareness" },
    ],
  },
] as const;

export interface FounderFitSignals {
  baseline_thesis_id?: ChannelThesisId;
  is_consumer?: boolean;
  is_b2b?: boolean;
  is_devtool?: boolean;
  launch_imminent?: boolean;
}

export interface ThesisEligibility {
  score: number;
  blockers: string[];
}

const BASE_SCORE: Record<ChannelThesisId, number> = {
  viral_short_form: 50,
  founder_social: 50,
  product_hunt_launch: 45,
  landing_conversion: 45,
  seo_content: 35,
  outbound_sales: 40,
  community_launch: 40,
  influencer_partnerships: 35,
};

export function validateFounderFit(profile?: Partial<FounderFitProfile> | null): string | null {
  if (!profile) return "Complete the seven founder-fit questions.";
  for (const question of FOUNDER_FIT_QUESTIONS) {
    const value = profile[question.id];
    if (typeof value !== "string" || !value.trim()) return `Answer: ${question.prompt}`;
  }
  if ((profile.magic_moment?.trim().length ?? 0) < 12) {
    return "Describe the magic moment in at least 12 characters.";
  }
  return null;
}

export function scoreThesisEligibility(
  thesisId: ChannelThesisId,
  fit: FounderFitProfile,
  signals: FounderFitSignals = {},
): ThesisEligibility {
  let score = BASE_SCORE[thesisId];
  const blockers: string[] = [];
  if (thesisId === signals.baseline_thesis_id) score += 24;

  if (thesisId === "founder_social") {
    if (fit.brand_face_readiness === "never") {
      blockers.push("This path requires a visible founder, but you opted out.");
    } else {
      score += fit.brand_face_readiness === "primary_channel" ? 28 : 8;
    }
  }
  if (thesisId === "viral_short_form") {
    if (fit.controversy_tolerance === "avoid") score -= 22;
    if (fit.controversy_tolerance === "lean_in") score += 16;
    if (fit.weekly_marketing_hours === "under_3") score -= 30;
    if (fit.scale_readiness === "not_yet") {
      blockers.push("High-volume acquisition is unsafe until the product can absorb demand.");
    }
  }
  if (thesisId === "influencer_partnerships") {
    if (fit.brand_face_readiness === "never") score += 20;
    if (fit.monthly_budget_band === "0") score -= 24;
    if (fit.monthly_budget_band === "over_2000") score += 16;
  }
  if (thesisId === "outbound_sales" && fit.thirty_day_win === "pipeline_meetings") score += 30;
  if (thesisId === "product_hunt_launch" && signals.launch_imminent) score += 30;
  if (thesisId === "community_launch" && signals.is_devtool) score += 22;
  if (thesisId === "seo_content" && fit.weekly_marketing_hours === "under_3") score += 8;
  if (thesisId === "landing_conversion" && fit.scale_readiness === "not_yet") score += 18;

  return { score, blockers };
}

export function filterEligibleTheses(
  baselineId: ChannelThesisId,
  fit: FounderFitProfile,
  signals: FounderFitSignals = {},
): ChannelThesisId[] {
  return (Object.keys(BASE_SCORE) as ChannelThesisId[])
    .map((id) => ({
      id,
      result: scoreThesisEligibility(id, fit, { ...signals, baseline_thesis_id: baselineId }),
    }))
    .filter(({ result }) => result.blockers.length === 0)
    .sort((a, b) => b.result.score - a.result.score || a.id.localeCompare(b.id))
    .map(({ id }) => id);
}
