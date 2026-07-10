import type { GtmBottleneck } from "./bottleneck";

export const PLAYBOOK_TITLES: Record<string, string> = {
  "waitlist-hype": "Waitlist & Hype Engine",
  "ph-number-one": "Product Hunt #1 Campaign",
  "ph-launch": "Product Hunt Launch",
  "linkedin-gtm": "LinkedIn Founder GTM",
  influencer: "Influencer Partnerships",
  "short-form-viral": "Short-form Video Format",
  "paid-ads-opt": "Paid Ads Optimization Loop",
  "paid-ads": "Paid Ads Sprint",
  "landing-conversion": "Landing & Conversion",
  "content-engine": "Content & Social Engine",
  "email-nurture": "Email Launch Sequence",
  "sales-outbound": "Sales Outbound",
  "analytics-measurement": "Analytics & Measurement",
  "seo-foundation": "SEO Foundation",
};

export interface TacticTeaching {
  headline: string;
  why: string;
  steps: string[];
  playbookId: string;
}

/** Testimonial GTM tactics — shown in decision card + home strip. */
export const TACTIC_TEACHING: Record<string, TacticTeaching> = {
  referral_waitlist_loop: {
    headline: "Referral waitlist loop",
    why: "Most founders blast social posts; a referral loop turns every signup into distribution without paid spend.",
    steps: [
      "Single CTA on landing — email only, no feature tour.",
      "After signup, show share link: 'Invite 3 friends → early access'.",
      "Track referral count server-side; unlock tier at threshold.",
      "Email Day 3: remind referrers who are 1 invite away.",
    ],
    playbookId: "waitlist-hype",
  },
  ph_supporter_comment_cadence: {
    headline: "PH supporter comment cadence",
    why: "Launch day visibility comes from thoughtful comments — never upvote farms or vote rings.",
    steps: [
      "T-7d: DM supporters with draft maker story + ask for launch-day comment.",
      "H+0: Post maker comment at 12:01 AM PT with product story + ask.",
      "H+3: Reply to every comment within 15 minutes.",
      "H+6: Share on LinkedIn/X with link — no 'please upvote' language.",
    ],
    playbookId: "ph-number-one",
  },
  linkedin_14_day_grid: {
    headline: "14-day founder LinkedIn grid",
    why: "Random posting fails; a hook grid builds audience before launch week.",
    steps: [
      "Day 1–2: Fix headline (ICP pain → outcome) + banner + featured link.",
      "Day 3–16: Alternate hooks — story, contrarian take, build log, customer win.",
      "End each post with one soft CTA (waitlist or demo).",
      "Batch-write 14 posts; schedule 3×/week minimum.",
    ],
    playbookId: "linkedin-gtm",
  },
  short_form_hook_ab: {
    headline: "Short-form hook A/B",
    why: "Virality isn't guaranteed — professional format tests hooks systematically.",
    steps: [
      "Write 3 hooks (question, stat, demo-first) for same offer.",
      "15–45s script each; same CTA, different opening 3 seconds.",
      "Post on 3 consecutive days; note retention in first 3s.",
      "Double down on winning hook pattern — don't chase trends blindly.",
    ],
    playbookId: "short-form-viral",
  },
  influencer_brief_disclosure: {
    headline: "Influencer brief + #ad disclosure",
    why: "Cold DMs get ignored; a tiered brief with clear disclosure converts creators.",
    steps: [
      "Tier creators: micro (10–50k), mid (50–200k) by engagement rate.",
      "Send value-first pitch — no generic 'collab?' templates.",
      "Brief: 3 talking points, #ad required, UTM link, deliverable dates.",
      "Track clicks per creator; kill underperformers after 2 posts.",
    ],
    playbookId: "influencer",
  },
  ads_hypothesis_loop: {
    headline: "Ads hypothesis loop",
    why: "Boosting posts burns budget; weekly hypothesis tests find winners.",
    steps: [
      "Monday: write one hypothesis (hook × audience × offer).",
      "Launch 2–3 creative variants at small daily budget.",
      "Friday: kill losers, scale winner 20% if CPA beats target.",
      "Document learnings in hypothesis sheet for next week.",
    ],
    playbookId: "paid-ads-opt",
  },
};

/** Home strip + testimonial ordering. */
export const TESTIMONIAL_PLAYBOOKS: Array<{ id: string; tacticId: string; oneLiner: string }> = [
  { id: "waitlist-hype", tacticId: "referral_waitlist_loop", oneLiner: "Waitlist hype + referral loop" },
  { id: "ph-number-one", tacticId: "ph_supporter_comment_cadence", oneLiner: "Product Hunt coordination (ethical)" },
  { id: "linkedin-gtm", tacticId: "linkedin_14_day_grid", oneLiner: "LinkedIn founder reach" },
  { id: "short-form-viral", tacticId: "short_form_hook_ab", oneLiner: "Short-form hook format" },
  { id: "influencer", tacticId: "influencer_brief_disclosure", oneLiner: "Influencer pitch + brief" },
  { id: "paid-ads-opt", tacticId: "ads_hypothesis_loop", oneLiner: "Paid ads optimization loop" },
];

export const READINESS_TACTIC_HINTS: Record<string, { playbookId: string; tactic: string; label: string }> = {
  "Landing & conversion": {
    playbookId: "landing-conversion",
    tactic: "hero_social_proof_stack",
    label: "Hero + social proof + single CTA above fold",
  },
  "Product positioning": {
    playbookId: "landing-conversion",
    tactic: "icp_headline_formula",
    label: "ICP-specific headline formula (pain → outcome)",
  },
  "Launch narrative": {
    playbookId: "waitlist-hype",
    tactic: "referral_waitlist_loop",
    label: "Referral waitlist loop (3 invites = early access)",
  },
  Distribution: {
    playbookId: "ph-number-one",
    tactic: "ph_supporter_comment_cadence",
    label: "PH supporter comment cadence (never upvote farms)",
  },
  "Social proof": {
    playbookId: "linkedin-gtm",
    tactic: "linkedin_14_day_grid",
    label: "14-day founder post grid with hooks",
  },
  "Email capture": {
    playbookId: "waitlist-hype",
    tactic: "prelaunch_drip_sequence",
    label: "7–14 day pre-launch email drip",
  },
  Analytics: {
    playbookId: "analytics-measurement",
    tactic: "funnel_event_map",
    label: "Map signup → activation events before scaling paid",
  },
  "Paid readiness": {
    playbookId: "paid-ads-opt",
    tactic: "ads_hypothesis_loop",
    label: "Weekly ads hypothesis → 2 creatives → kill/scale",
  },
};

export function playbookTitle(id: string): string {
  return PLAYBOOK_TITLES[id] ?? id;
}

export function tacticTeachingFor(
  tacticLabelOrId?: string,
  playbookId?: string,
): TacticTeaching | null {
  if (!tacticLabelOrId && !playbookId) return null;
  const lower = (tacticLabelOrId ?? "").toLowerCase();
  for (const [id, teach] of Object.entries(TACTIC_TEACHING)) {
    if (playbookId && teach.playbookId === playbookId) return teach;
    if (lower.includes(id.replace(/_/g, " ")) || lower.includes(teach.headline.toLowerCase())) return teach;
  }
  if (playbookId) {
    const match = TESTIMONIAL_PLAYBOOKS.find((p) => p.id === playbookId);
    if (match) return TACTIC_TEACHING[match.tacticId] ?? null;
  }
  return null;
}

export function tacticHintForReadinessLabel(label: string): (typeof READINESS_TACTIC_HINTS)[string] | null {
  const exact = READINESS_TACTIC_HINTS[label];
  if (exact) return exact;
  const lower = label.toLowerCase();
  for (const [key, hint] of Object.entries(READINESS_TACTIC_HINTS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return hint;
  }
  if (/awareness|traffic|waitlist/i.test(lower)) return READINESS_TACTIC_HINTS["Launch narrative"];
  if (/convert|landing|cta/i.test(lower)) return READINESS_TACTIC_HINTS["Landing & conversion"];
  if (/launch|distribution|ph/i.test(lower)) return READINESS_TACTIC_HINTS["Distribution"];
  return null;
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
