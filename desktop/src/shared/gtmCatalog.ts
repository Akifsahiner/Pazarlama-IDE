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
  "email-nurture": "Email Nurture Sequence",
  "sales-outbound": "Sales Outbound",
  "analytics-measurement": "Analytics & Measurement",
  "seo-foundation": "SEO Content Engine",
  "community-launch": "Community Launch (HN / IH / Reddit)",
  "twitter-x-gtm": "X (Twitter) Founder GTM",
  "newsletter-sponsorship": "Newsletter Sponsorship",
  "press-pr-launch": "Press & PR Launch",
  "devrel-open-source-launch": "DevRel OSS Launch",
};

export interface TacticTeaching {
  headline: string;
  why: string;
  steps: string[];
  playbookId: string;
  /** Registry phase label (T-30, H0, D+1). */
  phaseLabel?: string;
}

/** PH + core tactic phase timeline for UI. */
export const TACTIC_PHASE: Record<string, string> = {
  ph_citizen_mode_14d: "T-30",
  ph_hunter_dm_14d: "T-21",
  ph_upcoming_page_7d: "T-14",
  ph_comment_squad_10: "T-10",
  ph_gallery_4_slides: "T-7",
  ph_maker_comment_story: "T-3",
  ph_submit_1201_pt: "H0",
  ph_email_wave_1_6am: "H+6",
  ph_email_wave_2_9am: "H+9",
  ph_email_wave_3_12pm: "H+12",
  ph_comment_reply_sla_30m: "H0–H+18",
  ph_teardown_post_d1: "D+1",
  ph_supporter_comment_cadence: "H0",
  waitlist_single_cta: "T-14",
  k_factor_instrument: "T-14",
  micro_launch_wave_3: "T-7",
  referral_waitlist_loop: "T-14",
  launch_bottleneck_diagnose: "T-14",
  launch_task_graph: "T-14",
  hero_social_proof_stack: "T-7",
  lp_competitor_teardown: "T-7",
  cro_hypothesis_weekly: "H0",
  linkedin_14_day_grid: "T-30",
  linkedin_comment_led_dm: "T-7",
  lead_evidence_scorecard: "T-7",
  value_first_outbound_sequence: "H0",
  outreach_tier3_personalization: "T-3",
  ads_hypothesis_loop: "H0",
  funnel_event_map: "T-14",
  comm_icp_community_map: "T-14",
  comm_subreddit_rules_audit: "T-14",
  comm_ih_build_log: "T-10",
  comm_show_hn_title_draft: "T-7",
  comm_demo_url_live: "T-7",
  comm_cross_post_spacing_48h: "T-3",
  comm_show_hn_submit: "H0",
  comm_hn_comment_sla_60m: "H0–H+4",
  comm_reddit_value_post: "H+48",
  comm_devto_companion_post: "H+72",
  comm_teardown_metrics_d1: "D+1",
  seo_gsc_baseline_audit: "T-30",
  seo_intent_cluster_map: "T-21",
  seo_alternatives_page_template: "T-14",
  seo_comparison_page_template: "T-14",
  seo_vs_page_template: "T-10",
  seo_how_to_hub_page: "T-7",
  seo_internal_link_graph: "T-7",
  seo_docs_blog_cta_placement: "T-3",
  seo_metadata_schema_pass: "T-3",
  seo_programmatic_guardrails: "H0",
  seo_content_refresh_d30: "D+30",
  email_list_hygiene_segment: "T-21",
  email_prelaunch_drip_14d: "T-14",
  email_subject_line_ab: "T-7",
  email_near_miss_nudge: "T-3",
  email_ph_timing_lock: "T-1",
  email_launch_wave_1_engaged: "H+6",
  email_launch_wave_2_general: "H+9",
  email_launch_wave_3_reframe: "H+12",
  email_post_launch_onboarding_3: "D+1",
  email_teardown_metrics_d7: "D+7",
};

export const TACTIC_LABEL: Record<string, string> = {
  referral_waitlist_loop: "Referral waitlist loop",
  waitlist_single_cta: "Waitlist single CTA",
  k_factor_instrument: "K-factor instrumentation",
  micro_launch_wave_3: "Three micro-launches",
  launch_bottleneck_diagnose: "Launch bottleneck diagnose",
  launch_task_graph: "Task graph with tactics",
  channel_parallel_cap_2: "Cap parallel channels at 2",
  hero_social_proof_stack: "Hero + social proof + single CTA",
  lp_competitor_teardown: "Competitor LP teardown",
  ads_lp_message_match: "Ads ↔ landing message match",
  cro_hypothesis_weekly: "Weekly CRO hypothesis",
  ph_citizen_mode_14d: "PH citizen mode (14d)",
  ph_hunter_dm_14d: "Hunter DM (T-21)",
  ph_upcoming_page_7d: "Upcoming page (T-14)",
  ph_comment_squad_10: "Comment squad (T-10)",
  ph_gallery_4_slides: "Gallery 4+ slides",
  ph_submit_1201_pt: "Submit 12:01am PT",
  ph_email_wave_1_6am: "Email wave 1 (H+6)",
  ph_email_wave_2_9am: "Email wave 2 (H+9)",
  ph_email_wave_3_12pm: "Email wave 3 (H+12)",
  ph_teardown_post_d1: "Teardown post (D+1)",
  ph_supporter_comment_cadence: "PH supporter comment cadence",
  linkedin_14_day_grid: "14-day LinkedIn grid",
  linkedin_comment_led_dm: "Comment-led DM sequence",
  lead_evidence_scorecard: "Lead scorecard + evidence URL",
  value_first_outbound_sequence: "Value-first outbound",
  outreach_tier3_personalization: "Tier-3 personalization",
  ads_hypothesis_loop: "Ads hypothesis loop",
  funnel_event_map: "Funnel event map",
  platform_native_asset_pack: "Platform-native asset pack",
  comm_show_hn_submit: "Submit Show HN (Tue–Thu ~9am PT)",
  comm_hn_comment_sla_60m: "HN comment reply SLA ≤60 min",
  comm_reddit_value_post: "Reddit value post (story-first)",
  comm_teardown_metrics_d1: "Community teardown (D+1)",
  seo_intent_cluster_map: "Keyword cluster map",
  seo_comparison_page_template: "Comparison page template",
  seo_internal_link_graph: "Internal link graph",
  email_prelaunch_drip_14d: "Pre-launch drip (14d)",
  email_launch_wave_1_engaged: "Launch wave 1 (engaged)",
  email_ph_timing_lock: "PH email timing lock",
};

export function tacticLabel(id: string): string {
  return TACTIC_LABEL[id] ?? id.replace(/_/g, " ");
}

export function tacticPhase(id: string): string | undefined {
  return TACTIC_PHASE[id];
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
    phaseLabel: "T-14",
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
  ph_submit_1201_pt: {
    headline: "Submit 12:01am PT Tue/Wed",
    why: "Timing and organic seed beat Monday dumps and H0 email blasts.",
    steps: [
      "Never Monday/Friday/holiday.",
      "Do not email at H0 — organic seed first.",
      "Log submission timestamp.",
      "Pin maker comment immediately.",
    ],
    playbookId: "ph-number-one",
  },
  ph_email_wave_1_6am: {
    headline: "Email wave 1 — engaged ~6am PT",
    why: "Staggered waves protect ranking and ask for comments, not votes.",
    steps: [
      "Segment: opened 3 of last 5.",
      "Founder from-name; single CTA = PH URL.",
      "Ask for honest comments not votes.",
      "Wave 2/3 only if ranking needs lift.",
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
  comm_show_hn_submit: {
    headline: "Show HN submit + reply window",
    why: "HN visibility comes from live demo + story-first comments — never vote brigading or alt accounts.",
    steps: [
      "T-7: Freeze Show HN title + first comment; QA demo on mobile + desktop.",
      "T-10: IH build log published before HN day.",
      "H0: Submit Tue–Thu ~9am PT; founder blocks 4h for replies.",
      "H+48: Reddit value post only after ≥48h spacing; D+1 teardown with honest metrics.",
    ],
    playbookId: "community-launch",
    phaseLabel: "H0",
  },
  seo_comparison_page_template: {
    headline: "Honest comparison page",
    why: "Commercial-intent SEO for dev tools lives in vs/alternatives pages — not vague blog posts.",
    steps: [
      "Map one keyword cluster (alternatives + 2× vs).",
      "Verify pricing and API rows from primary sources.",
      "Wire docs/blog internal links before index request.",
      "D+30: refresh low-CTR titles from GSC data.",
    ],
    playbookId: "seo-foundation",
    phaseLabel: "T-14",
  },
  email_prelaunch_drip_14d: {
    headline: "Pre-launch nurture drip",
    why: "Waitlist captures email; nurture converts it through launch — separate from cold outreach.",
    steps: [
      "T-21: Hygiene + engaged/warm/dormant segments.",
      "T-14: Story arc drip (problem → build → preview).",
      "T-7: Subject A/B on teaser; click-rate winner.",
      "H+6/H+9/H+12: Launch waves synced with PH/community clock.",
    ],
    playbookId: "email-nurture",
    phaseLabel: "T-14",
  },
};

/** Home strip + testimonial ordering. */
export const TESTIMONIAL_PLAYBOOKS: Array<{ id: string; tacticId: string; oneLiner: string }> = [
  { id: "waitlist-hype", tacticId: "referral_waitlist_loop", oneLiner: "Waitlist hype + referral loop" },
  { id: "ph-number-one", tacticId: "ph_supporter_comment_cadence", oneLiner: "Product Hunt coordination (ethical)" },
  { id: "community-launch", tacticId: "comm_show_hn_submit", oneLiner: "Show HN + IH + Reddit (ethical)" },
  { id: "seo-foundation", tacticId: "seo_comparison_page_template", oneLiner: "SEO comparison + alternatives cluster" },
  { id: "email-nurture", tacticId: "email_prelaunch_drip_14d", oneLiner: "Pre-launch drip + launch waves" },
  { id: "twitter-x-gtm", tacticId: "x_launch_thread_h0", oneLiner: "X threads + build-in-public (ethical)" },
  { id: "devrel-open-source-launch", tacticId: "oss_readme_star_cta", oneLiner: "OSS README + awesome-list PR" },
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
    playbookId: "community-launch",
    tactic: "comm_show_hn_submit",
    label: "Show HN submit + ethical comment SLA (no vote brigading)",
  },
  "Social proof": {
    playbookId: "linkedin-gtm",
    tactic: "linkedin_14_day_grid",
    label: "14-day founder post grid with hooks",
  },
  "Email capture": {
    playbookId: "email-nurture",
    tactic: "email_prelaunch_drip_14d",
    label: "14-day pre-launch drip + launch week waves",
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
  const raw = (tacticLabelOrId ?? "").trim();
  if (raw && TACTIC_TEACHING[raw]) return TACTIC_TEACHING[raw];
  const lower = raw.toLowerCase();
  for (const [id, teach] of Object.entries(TACTIC_TEACHING)) {
    if (playbookId && teach.playbookId === playbookId && !raw) return teach;
    if (lower === id || lower.includes(id.replace(/_/g, " ")) || lower.includes(teach.headline.toLowerCase()))
      return { ...teach, phaseLabel: teach.phaseLabel ?? TACTIC_PHASE[id] };
  }
  if (raw && TACTIC_LABEL[raw]) {
    return {
      headline: TACTIC_LABEL[raw],
      why: "Executable tactic from skill registry — follow phase timing.",
      steps: ["Open Plan Studio task", "Match instructions_md Tactic: line", "Ship acceptance criteria"],
      playbookId: playbookId ?? "waitlist-hype",
      phaseLabel: TACTIC_PHASE[raw],
    };
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
    awareness: ["seo-content-engine", "waitlist-hype", "short-form-viral", "influencer", "content-engine"],
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
