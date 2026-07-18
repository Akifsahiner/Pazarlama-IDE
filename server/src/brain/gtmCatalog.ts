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
  ph_citizen_mode_14d: "PH citizen mode (14 days substantive comments)",
  ph_hunter_dm_14d: "Hunter DM 14 days out (no payment)",
  ph_upcoming_page_7d: "Upcoming page + notify funnel",
  ph_comment_squad_10: "Comment squad (honest first-hour questions)",
  ph_gallery_4_slides: "Gallery 4+ real-UI slides",
  ph_maker_comment_story: "Maker comment story arc",
  ph_submit_1201_pt: "Submit 12:01am PT Tue/Wed",
  ph_email_wave_1_6am: "Email wave 1 — engaged ~6am PT",
  ph_email_wave_2_9am: "Email wave 2 — general + LinkedIn",
  ph_email_wave_3_12pm: "Email wave 3 — cold reframe",
  ph_comment_reply_sla_30m: "Comment reply SLA ≤30 minutes",
  ph_teardown_post_d1: "Launch teardown post + thank-you email",
  linkedin_14_day_grid: "14-day founder LinkedIn grid with hook formulas",
  hero_social_proof_stack: "Hero + social proof + single CTA stack",
  ads_hypothesis_loop: "Ads hypothesis → 2 creatives → kill/scale weekly",
  funnel_event_map: "Map signup → activation events before scaling",
  value_first_outbound_sequence: "Value-first outbound (no pitch-first DMs)",
  influencer_brief_disclosure: "Influencer brief with #ad disclosure + UTM",
  short_form_hook_ab: "3 hook variants A/B for 15–45s scripts",
  comm_show_hn_submit: "Submit Show HN Tue–Thu ~9am PT",
  comm_hn_comment_sla_60m: "HN comment reply SLA ≤60 minutes",
  comm_reddit_value_post: "Reddit value post (story-first, rules OK)",
  comm_teardown_metrics_d1: "Public teardown with sessions + signups (D+1)",
  seo_intent_cluster_map: "Intent-tier keyword cluster map",
  seo_comparison_page_template: "Comparison page [You] vs [Competitor]",
  seo_internal_link_graph: "Internal link graph docs → hub → signup",
  seo_content_refresh_d30: "D+30 SEO refresh on low-CTR pages",
  email_prelaunch_drip_14d: "14-day pre-launch story drip",
  email_launch_wave_1_engaged: "Launch wave 1 — engaged segment (H+6)",
  email_ph_timing_lock: "PH/community email timing lock",
  x_launch_thread_h0: "Launch thread publish + pin (H0)",
  x_reply_sla_2h: "X reply SLA ≤2 hours in launch window",
  x_build_in_public_cadence: "Build-in-public 3×/week singles",
  nl_native_copy_120_words: "Newsletter native sponsor copy ≤120 words",
  nl_kill_rule_cpa_7d: "7d CPA kill rule on sponsor slots",
  pr_embargo_datetime_lock: "Press embargo datetime lock (UTC)",
  pr_reporter_shortlist_5: "Reporter shortlist (5) + personalized pitches",
  oss_readme_star_cta: "README star CTA above fold",
  oss_awesome_list_pr: "Awesome-list PR (value-add, one per list)",
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
  comm_show_hn_submit: {
    headline: "Show HN submit + reply window",
    why: "Ethical HN spike needs live demo, story-first comment, and founder presence — not vote brigading.",
    steps: [
      "T-7: Freeze title + first comment; QA demo URL.",
      "H0: Submit Tue–Thu ~9am PT.",
      "H0–H+4: Reply every comment ≤60 min.",
      "D+1: Public teardown with honest metrics.",
    ],
    playbookId: "community-launch",
  },
  seo_comparison_page_template: {
    headline: "Comparison page template",
    why: "Dev tools win commercial-intent queries with honest vs pages — not generic listicles.",
    steps: [
      "T-21: SERP teardown of top 3 results.",
      "T-14: Ship vs page with verified pricing rows.",
      "T-7: Wire internal links from docs hub.",
      "D+30: Refresh title/meta if CTR <2%.",
    ],
    playbookId: "seo-foundation",
  },
  email_prelaunch_drip_14d: {
    headline: "Pre-launch email drip",
    why: "Owned list activation beats cold channels — distinct from outreach and waitlist capture.",
    steps: [
      "T-21: Segment engaged/warm/dormant.",
      "T-14: Story arc drip (no discounts).",
      "T-7: Subject A/B on teaser.",
      "T-1: Lock PH/community wave timing.",
    ],
    playbookId: "email-nurture",
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
    awareness: ["seo-content-engine", "waitlist-hype", "short-form-viral", "influencer", "content-engine"],
    conversion: ["landing-conversion", "paid-ads-opt", "paid-ads"],
    distribution: ["community-launch", "twitter-x-gtm", "ph-number-one", "linkedin-gtm", "ph-launch", "devrel-open-source-launch", "content-engine"],
    revenue: ["sales-outbound"],
    measurement: ["analytics-measurement"],
  };
  for (const id of priority[bottleneck]) {
    if (availablePlaybookIds.includes(id)) return id;
  }
  return availablePlaybookIds[0] ?? "landing-conversion";
}
