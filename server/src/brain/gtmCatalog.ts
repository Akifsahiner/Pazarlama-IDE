import type { GtmBottleneck } from "./bottleneck.js";

export const GENERIC_TASK_TITLE_RE =
  /post on social|improve seo|engage audience|be active on|create content$|marketing tasks|boost engagement/i;

export const PH_MANIPULATION_RE =
  /upvote\s*farm|buy\s*upvotes|vote\s*ring|bot\s*upvote|pay\s*for\s*upvotes/i;

export const TACTIC_SNAKE_CASE_RE = /^[a-z][a-z0-9_]{2,48}$/;

export const READINESS_DIMENSIONS = [
  "Landing & conversion",
  "Launch narrative",
  "Distribution",
  "Social proof",
  "Email capture",
  "Analytics",
  "Paid readiness",
] as const;

export const READINESS_PLAYBOOK_MAP: Record<string, string> = {
  "Landing & conversion": "landing-conversion",
  "Product positioning": "landing-conversion",
  "Launch narrative": "waitlist-hype",
  Distribution: "ph-number-one",
  "Social proof": "linkedin-gtm",
  "Email capture": "waitlist-hype",
  Analytics: "analytics-measurement",
  "Paid readiness": "paid-ads-opt",
};

export const READINESS_TACTIC_LABEL: Record<string, string> = {
  "Landing & conversion": "Hero + social proof + single CTA above fold",
  "Product positioning": "ICP headline formula (pain → outcome)",
  "Launch narrative": "Referral waitlist loop (3 invites = early access)",
  Distribution: "PH supporter comment cadence (never upvote farms)",
  "Social proof": "14-day founder LinkedIn post grid with hooks",
  "Email capture": "7–14 day pre-launch email drip sequence",
  Analytics: "Funnel event map before scaling paid",
  "Paid readiness": "Weekly ads hypothesis → 2 creatives → kill/scale",
};

export const TACTIC_BY_BOTTLENECK: Record<GtmBottleneck, string> = {
  awareness: "referral_waitlist_loop",
  conversion: "hero_social_proof_stack",
  distribution: "ph_supporter_comment_cadence",
  revenue: "value_first_outbound_sequence",
  measurement: "funnel_event_map",
};

export const TACTIC_LABEL: Record<string, string> = {
  referral_waitlist_loop: "Referral waitlist loop — 3 invites unlock early access",
  ph_supporter_comment_cadence: "PH supporter comment cadence (ethical, no upvote farms)",
  linkedin_14_day_grid: "14-day founder LinkedIn grid with hook formulas",
  hero_social_proof_stack: "Hero + social proof + single CTA stack",
  ads_hypothesis_loop: "Ads hypothesis → 2 creatives → kill/scale weekly",
  funnel_event_map: "Map signup → activation events before scaling",
  value_first_outbound_sequence: "Value-first outbound (no pitch-first DMs)",
  influencer_brief_disclosure: "Influencer brief with #ad disclosure + UTM",
  short_form_hook_ab: "3 hook variants A/B for 15–45s scripts",
};

export function tacticLabel(id: string): string {
  return TACTIC_LABEL[id] ?? id.replace(/_/g, " ");
}

/** Testimonial tactic teaching — mirrored in desktop gtmCatalog. */
export const TACTIC_TEACHING: Record<
  string,
  { headline: string; why: string; steps: string[]; playbookId: string }
> = {
  referral_waitlist_loop: {
    headline: "Referral waitlist loop",
    why: "Turns every signup into distribution without paid spend.",
    steps: [
      "Single email CTA on landing.",
      "Share link after signup with invite threshold.",
      "Track referrals server-side.",
      "Email nudge at 1 invite away.",
    ],
    playbookId: "waitlist-hype",
  },
  ph_supporter_comment_cadence: {
    headline: "PH supporter comment cadence",
    why: "Ethical launch visibility via thoughtful comments — never upvote farms.",
    steps: [
      "T-7d supporter outreach with draft story.",
      "H+0 maker comment at 12:01 AM PT.",
      "H+3 reply to every comment.",
      "H+6 social share without upvote asks.",
    ],
    playbookId: "ph-number-one",
  },
  linkedin_14_day_grid: {
    headline: "14-day founder LinkedIn grid",
    why: "Hook grid builds audience before launch week.",
    steps: [
      "Fix headline + banner Days 1–2.",
      "Alternate hooks Days 3–16.",
      "Soft CTA each post.",
      "Batch 14 posts upfront.",
    ],
    playbookId: "linkedin-gtm",
  },
  short_form_hook_ab: {
    headline: "Short-form hook A/B",
    why: "Professional format tests hooks — no viral lottery.",
    steps: [
      "3 hooks for same offer.",
      "15–45s scripts each.",
      "Post 3 days; compare 3s retention.",
      "Scale winning pattern.",
    ],
    playbookId: "short-form-viral",
  },
  influencer_brief_disclosure: {
    headline: "Influencer brief + #ad",
    why: "Tiered brief with disclosure converts creators.",
    steps: [
      "Tier by engagement rate.",
      "Value-first pitch.",
      "Brief with #ad + UTM.",
      "Kill underperformers after 2 posts.",
    ],
    playbookId: "influencer",
  },
  ads_hypothesis_loop: {
    headline: "Ads hypothesis loop",
    why: "Weekly tests beat random boosting.",
    steps: [
      "Monday hypothesis.",
      "2–3 creatives small budget.",
      "Friday kill/scale.",
      "Log in hypothesis sheet.",
    ],
    playbookId: "paid-ads-opt",
  },
};

export function enrichReadinessRow(row: {
  label: string;
  score: number;
  rationale?: string;
  suggestedPlaybookId?: string;
  suggestedTactic?: string;
}): typeof row {
  return {
    ...row,
    suggestedPlaybookId: row.suggestedPlaybookId ?? READINESS_PLAYBOOK_MAP[row.label],
    suggestedTactic: row.suggestedTactic ?? READINESS_TACTIC_LABEL[row.label],
  };
}

export function inferPrimaryPlaybookFromBottleneck(
  bottleneck: GtmBottleneck,
  availablePlaybookIds: string[],
): string {
  const priority: Record<GtmBottleneck, string[]> = {
    awareness: ["waitlist-hype", "short-form-viral", "influencer", "content-engine"],
    conversion: ["landing-conversion", "paid-ads-opt", "paid-ads"],
    distribution: ["ph-number-one", "linkedin-gtm", "ph-launch", "content-engine"],
    revenue: ["sales-outbound"],
    measurement: ["analytics-measurement"],
  };
  for (const id of priority[bottleneck]) {
    if (availablePlaybookIds.includes(id)) return id;
  }
  return availablePlaybookIds[0] ?? "landing-conversion";
}
