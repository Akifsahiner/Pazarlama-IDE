/**
 * Central tactic ID registry — Plan Studio tasks and decision tactic_stack
 * must resolve to these IDs (Skill Excellence Program).
 */
import { NL_TACTICS, OSS_TACTICS, PR_TACTICS, X_TACTICS } from "./p1Tactics.js";

export interface TacticDef {
  id: string;
  skillId: string;
  playbookId: string;
  phaseLabel?: string;
  label: string;
  teaching: string[];
  acceptanceCriteria: string[];
}

const PH_TACTICS: TacticDef[] = [
  {
    id: "ph_citizen_mode_14d",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "T-30",
    label: "PH citizen mode (14 days substantive comments)",
    teaching: [
      "Upvote 3 in-category products/day",
      "Leave 1 substantive comment/day",
      "Follow 20 makers — contribution patterns matter",
    ],
    acceptanceCriteria: ["14 days logged", "No 'upvote us' language anywhere"],
  },
  {
    id: "ph_hunter_dm_14d",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "T-21",
    label: "Hunter DM 14 days out (no payment)",
    teaching: [
      "Shortlist 5 hunters with recent category wins",
      "DM with 60s demo — never offer payment",
      "Default to self-hunt if no reply in 5 days",
    ],
    acceptanceCriteria: ["1 yes or self-hunt locked"],
  },
  {
    id: "ph_upcoming_page_7d",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "T-14",
    label: "Upcoming page + notify funnel",
    teaching: [
      "List on upcoming 7 days out",
      "Landing primary CTA = upcoming notify",
      "Track notify subscriber count",
    ],
    acceptanceCriteria: ["Upcoming live", "LP CTA points to notify"],
  },
  {
    id: "ph_comment_squad_10",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "T-10",
    label: "Comment squad (honest first-hour questions)",
    teaching: [
      "Personal DMs only — not mass ESP",
      "Ask for real questions, not upvotes",
      "Lock 10–30 confirmations in a sheet",
    ],
    acceptanceCriteria: ["≥10 confirmations documented"],
  },
  {
    id: "ph_gallery_4_slides",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "T-7",
    label: "Gallery 4+ real-UI slides",
    teaching: [
      "Slide 1: hero + tagline",
      "Slide 2: workflow in motion",
      "Slide 3: proof metric",
      "Slide 4: PH-only deal",
    ],
    acceptanceCriteria: ["≥4 real product UI slides", "No mockup-only gallery"],
  },
  {
    id: "ph_maker_comment_story",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "T-3",
    label: "Maker comment story arc",
    teaching: [
      "First person: problem → build → ask for feedback",
      "Not a press release",
      "Pin at H0",
    ],
    acceptanceCriteria: ["Draft <400 words approved"],
  },
  {
    id: "ph_submit_1201_pt",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "H0",
    label: "Submit 12:01am PT Tue/Wed",
    teaching: [
      "Never Monday/Friday/holiday",
      "Do not email at H0 — organic seed first",
      "Log submission timestamp",
    ],
    acceptanceCriteria: ["Submitted 12:01am PT Tue or Wed"],
  },
  {
    id: "ph_email_wave_1_6am",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "H+6",
    label: "Email wave 1 — engaged segment ~6am PT",
    teaching: [
      "Segment: opened 3 of last 5",
      "Founder from-name; single CTA = PH URL",
      "Ask for honest comments not votes",
    ],
    acceptanceCriteria: ["Wave 1 send logged"],
  },
  {
    id: "ph_email_wave_2_9am",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "H+9",
    label: "Email wave 2 — general + LinkedIn",
    teaching: [
      "Different subject from wave 1",
      "Parallel founder LinkedIn post",
      "Still no upvote asks",
    ],
    acceptanceCriteria: ["Wave 2 + LinkedIn live"],
  },
  {
    id: "ph_email_wave_3_12pm",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "H+12",
    label: "Email wave 3 — cold reframe ~12pm PT",
    teaching: ["In case you missed it framing", "PH page already has social proof"],
    acceptanceCriteria: ["Wave 3 send logged"],
  },
  {
    id: "ph_comment_reply_sla_30m",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "H0-H+18",
    label: "Comment reply SLA ≤30 minutes",
    teaching: [
      "Every comment answered within 30 min",
      "Non-English OK via DeepL",
      "No emotional troll engagement",
    ],
    acceptanceCriteria: ["Zero unreplied >30m in first 6h"],
  },
  {
    id: "ph_teardown_post_d1",
    skillId: "ph_launch",
    playbookId: "aggressive-top-1",
    phaseLabel: "D+1",
    label: "Launch teardown post + thank-you email",
    teaching: [
      "Screenshots + numbers + lessons",
      "Thank-you email converts fence-sitters",
      "Teardown often outperforms the PH page for distribution",
    ],
    acceptanceCriteria: ["Teardown published", "Thank-you email sent"],
  },
  {
    id: "ph_supporter_comment_cadence",
    skillId: "ph_launch",
    playbookId: "with-email-list",
    phaseLabel: "H0",
    label: "PH supporter comment cadence (ethical)",
    teaching: [
      "T-7d: DM supporters with maker story",
      "H+0: Pin maker comment",
      "H+3: Reply within 15–30 min",
      "Never upvote farms",
    ],
    acceptanceCriteria: ["Maker comment live", "Reply SLA held"],
  },
];

const COMMUNITY_TACTICS: TacticDef[] = [
  {
    id: "comm_icp_community_map",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "T-14",
    label: "ICP community map (HN / IH / subreddits)",
    teaching: [
      "Score 3 communities where ICP actually posts",
      "Note mod strictness + self-promo rules",
      "Prioritize fit over reach",
    ],
    acceptanceCriteria: ["3 communities scored 1–5", "ICP evidence cited"],
  },
  {
    id: "comm_subreddit_rules_audit",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "T-14",
    label: "Subreddit rules audit before any post",
    teaching: [
      "Read sidebar rules + last 10 posts",
      "Note self-promo / story-first policy",
      "Check ban history for similar launches",
    ],
    acceptanceCriteria: ["Rules checklist signed", "Target sub approved"],
  },
  {
    id: "comm_show_hn_title_draft",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "T-7",
    label: "Show HN title + first comment draft",
    teaching: [
      "Title: Show HN: [Name] – [outcome] ≤80 chars",
      "First comment: problem → build → ask feedback",
      "Demo link in comment, not title spam",
    ],
    acceptanceCriteria: ["Title ≤80 chars", "First comment <400 words approved"],
  },
  {
    id: "comm_demo_url_live",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "T-7",
    label: "Live demo URL QA (mobile + desktop)",
    teaching: [
      "E2E signup or core flow on production URL",
      "Test mobile Safari + desktop Chrome",
      "0 blockers before Show HN submit",
    ],
    acceptanceCriteria: ["0 blockers logged", "UTM params on demo link"],
  },
  {
    id: "comm_ih_build_log",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "T-10",
    label: "Indie Hackers build log (story-first)",
    teaching: [
      "Problem + build journey — not pitch deck",
      "Soft CTA in profile only",
      "Publish before Show HN day",
    ],
    acceptanceCriteria: ["IH post live", "Published ≥48h before HN"],
  },
  {
    id: "comm_show_hn_submit",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "H0",
    label: "Submit Show HN (Tue–Thu ~9am PT)",
    teaching: [
      "Avoid Monday/Friday/holiday dumps",
      "Founder present 4h for replies",
      "Log submission timestamp",
    ],
    acceptanceCriteria: ["Submitted Tue–Thu morning PT", "Timestamp logged"],
  },
  {
    id: "comm_hn_comment_sla_60m",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "H0–H+4",
    label: "HN comment reply SLA ≤60 minutes",
    teaching: [
      "Reply every comment in first 4h",
      "Factual on criticism — no defensiveness",
      "Never ask for upvotes",
    ],
    acceptanceCriteria: ["≥90% replies within 60 min", "No vote asks"],
  },
  {
    id: "comm_cross_post_spacing_48h",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "T-3",
    label: "Cross-post spacing ≥48h between platforms",
    teaching: [
      "No HN + Reddit + IH same calendar day",
      "Calendar shows ≥48h gaps",
      "Teardown only after HN window closes",
    ],
    acceptanceCriteria: ["Calendar with spaced posts", "No same-day spam"],
  },
  {
    id: "comm_reddit_value_post",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "H+48",
    label: "Reddit value post (story-first, rules OK)",
    teaching: [
      "Story post per sub rules",
      "Link only if self-promo allowed",
      "No cross-post copy-paste from HN",
    ],
    acceptanceCriteria: ["0 mod removals", "Story-first format"],
  },
  {
    id: "comm_devto_companion_post",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "H+72",
    label: "Dev.to technical companion post",
    teaching: [
      "Technical deep-dive with canonical URL",
      "UTM: utm_source=dev_to",
      "Optional — skip if no dev audience",
    ],
    acceptanceCriteria: ["Published with UTM", "Canonical URL set"],
  },
  {
    id: "comm_teardown_metrics_d1",
    skillId: "community-launch",
    playbookId: "aggressive-community-blitz",
    phaseLabel: "D+1",
    label: "Public teardown with sessions + signups",
    teaching: [
      "Sessions, signups, HN points, lessons",
      "Honest ceiling vs outcome",
      "Share on X/LinkedIn — no vote asks",
    ],
    acceptanceCriteria: ["Teardown live D+1", "Metrics logged"],
  },
];

const SEO_TACTICS: TacticDef[] = [
  {
    id: "seo_gsc_baseline_audit",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-30",
    label: "GSC baseline + index coverage audit",
    teaching: ["Export coverage report", "Log indexed vs excluded", "Top queries baseline"],
    acceptanceCriteria: ["Baseline sheet with ≥5 rows"],
  },
  {
    id: "seo_intent_cluster_map",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-21",
    label: "Intent-tier keyword cluster map",
    teaching: ["Commercial vs informational tiers", "One cluster per sprint", "8–15 keywords"],
    acceptanceCriteria: ["Cluster map with A/B/C tiers"],
  },
  {
    id: "seo_competitor_serp_teardown",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-21",
    label: "Competitor SERP teardown (top 3)",
    teaching: ["Word count", "Schema usage", "Content gaps"],
    acceptanceCriteria: ["Teardown doc for 3 target keywords"],
  },
  {
    id: "seo_alternatives_page_template",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-14",
    label: "Alternatives page (honest comparison table)",
    teaching: ["Include real competitors", "Disclose bias", "Link to vs pages"],
    acceptanceCriteria: ["1 alternatives URL live"],
  },
  {
    id: "seo_comparison_page_template",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-14",
    label: "Comparison page [You] vs [Competitor]",
    teaching: ["Verified pricing rows", "FAQ schema", "Unique intro ≥120 words"],
    acceptanceCriteria: ["Comparison URL with screenshot"],
  },
  {
    id: "seo_vs_page_template",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-10",
    label: "Second vs page for #2 competitor",
    teaching: ["Unique intro", "Canonical URL", "Not duplicate of vs #1"],
    acceptanceCriteria: ["2nd vs page live"],
  },
  {
    id: "seo_how_to_hub_page",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-7",
    label: "How-to hub pillar linking cluster",
    teaching: ["Pillar for ICP job", "≥3 internal links to commercial pages"],
    acceptanceCriteria: ["Hub published with links"],
  },
  {
    id: "seo_internal_link_graph",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-7",
    label: "Internal link graph (docs/blog → hub → signup)",
    teaching: ["0 orphan cluster pages", "Varied anchor text", "Docs sidebar links"],
    acceptanceCriteria: ["Link map signed; 0 orphans"],
  },
  {
    id: "seo_docs_blog_cta_placement",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-3",
    label: "Docs/blog end-of-article CTA (contextual)",
    teaching: ["After value delivered", "No mid-article modal", "Single CTA component"],
    acceptanceCriteria: ["Shared CTA component in repo"],
  },
  {
    id: "seo_metadata_schema_pass",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "T-3",
    label: "Title/meta + FAQ schema pass",
    teaching: ["Title ≤60", "Meta ≤155", "Rich Results Test"],
    acceptanceCriteria: ["Schema validation pass"],
  },
  {
    id: "seo_programmatic_guardrails",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "H0",
    label: "Programmatic page guardrails (unique intro gate)",
    teaching: ["≥120 unique words per URL", "Product screenshot required", "Human review"],
    acceptanceCriteria: ["Thin-content checklist signed"],
  },
  {
    id: "seo_content_refresh_d30",
    skillId: "seo-content-engine",
    playbookId: "aggressive-programmatic-cluster",
    phaseLabel: "D+30",
    label: "D+30 title/meta refresh on low CTR",
    teaching: ["CTR <2% + impressions >500", "Log changes", "Merge 0-impression pages"],
    acceptanceCriteria: ["Refresh log updated"],
  },
];

const EMAIL_NURTURE_TACTICS: TacticDef[] = [
  {
    id: "email_list_hygiene_segment",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "T-21",
    label: "List hygiene + engaged/warm/dormant segments",
    teaching: ["Remove hard bounces", "Engaged = opened 2/5", "Exclude dormant from launch"],
    acceptanceCriteria: ["Segment sizes logged"],
  },
  {
    id: "email_prelaunch_drip_14d",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "T-14",
    label: "14-day pre-launch story drip",
    teaching: ["Problem → build → preview", "No discount spam", "UTM on CTAs"],
    acceptanceCriteria: ["4–6 sends scheduled"],
  },
  {
    id: "email_subject_line_ab",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "T-7",
    label: "Subject line A/B on teaser (click winner)",
    teaching: ["20% engaged split", "Winner feeds wave 2", "Not on launch morning"],
    acceptanceCriteria: ["Winner documented"],
  },
  {
    id: "email_story_arc_teaser",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "T-7",
    label: "Sneak peek teaser email",
    teaching: ["Screenshot/GIF", "Single CTA", "Click baseline recorded"],
    acceptanceCriteria: ["Teaser sent with UTM"],
  },
  {
    id: "email_near_miss_nudge",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "T-3",
    label: "Near-miss nudge (1 invite or non-clicker)",
    teaching: ["Specific threshold", "One send only", "48h from other launch emails"],
    acceptanceCriteria: ["Single segment nudge sent"],
  },
  {
    id: "email_ph_timing_lock",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "T-1",
    label: "PH/community launch timing lock",
    teaching: ["H0 no email if PH", "Waves H+6/H+9/H+12 PT", "Calendar signed"],
    acceptanceCriteria: ["Wave schedule documented"],
  },
  {
    id: "email_launch_wave_1_engaged",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "H+6",
    label: "Launch wave 1 — engaged segment",
    teaching: ["Founder from-name", "One CTA", "After organic seed"],
    acceptanceCriteria: ["Wave 1 send logged"],
  },
  {
    id: "email_launch_wave_2_general",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "H+9",
    label: "Launch wave 2 — general minus dormant",
    teaching: ["Different subject from wave 1", "Same CTA URL", "Skip if wave 1 open <20%"],
    acceptanceCriteria: ["Wave 2 send or skip documented"],
  },
  {
    id: "email_launch_wave_3_reframe",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "H+12",
    label: "Launch wave 3 — reframe (optional)",
    teaching: ["Non-clickers only", "Cancel if unsub >0.3%", "Honest story angle"],
    acceptanceCriteria: ["Wave 3 send or skip documented"],
  },
  {
    id: "email_post_launch_onboarding_3",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "D+1",
    label: "Post-launch onboarding (3 emails)",
    teaching: ["D+1 activation", "D+3 habit", "D+7 feedback"],
    acceptanceCriteria: ["3 onboarding sends scheduled"],
  },
  {
    id: "email_unsubscribe_compliance",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "T-14",
    label: "Unsubscribe + List-Unsubscribe compliance",
    teaching: ["One-click unsub", "CAN-SPAM footer", "Test inbox check"],
    acceptanceCriteria: ["Compliance check pass"],
  },
  {
    id: "email_teardown_metrics_d7",
    skillId: "email-nurture-sequence",
    playbookId: "aggressive-launch-nurture",
    phaseLabel: "D+7",
    label: "D+7 email metrics teardown",
    teaching: ["Open/click/activation by wave", "Honest stats", "Optional subscriber email"],
    acceptanceCriteria: ["Rollup published internally"],
  },
];

/** Waitlist / landing / launch-planning + P1 seeds. */
const CORE_TACTICS: TacticDef[] = [
  {
    id: "referral_waitlist_loop",
    skillId: "waitlist-hype-engine",
    playbookId: "aggressive-viral-loop",
    label: "Referral waitlist loop",
    teaching: [
      "Single email CTA on landing",
      "Invite threshold unlocks early access",
      "Track K-factor weekly; fix if K < 0.3 after 14d",
    ],
    acceptanceCriteria: ["Referral link live", "K-factor instrumented"],
  },
  {
    id: "waitlist_single_cta",
    skillId: "waitlist-hype-engine",
    playbookId: "aggressive-viral-loop",
    phaseLabel: "T-14",
    label: "Waitlist single CTA (email only)",
    teaching: ["Kill feature tours above fold", "One field + submit"],
    acceptanceCriteria: ["Exactly one primary CTA on waitlist LP"],
  },
  {
    id: "k_factor_instrument",
    skillId: "waitlist-hype-engine",
    playbookId: "aggressive-viral-loop",
    phaseLabel: "T-14",
    label: "K-factor instrumentation",
    teaching: ["K = invites_accepted / signups", "Weekly sheet or dashboard"],
    acceptanceCriteria: ["K visible weekly"],
  },
  {
    id: "micro_launch_wave_3",
    skillId: "waitlist-hype-engine",
    playbookId: "aggressive-viral-loop",
    phaseLabel: "T-7",
    label: "Three micro-launches",
    teaching: ["Niche Slack", "Founder LinkedIn", "Partner/newsletter"],
    acceptanceCriteria: ["3 timed drops logged"],
  },
  {
    id: "hero_social_proof_stack",
    skillId: "landing-page-conversion",
    playbookId: "aggressive-cro-sprint",
    label: "Hero + social proof + single CTA",
    teaching: [
      "5-second clarity test",
      "One primary CTA above fold",
      "Proof adjacent to decision",
    ],
    acceptanceCriteria: ["Exactly one primary CTA", "Proof visible without scroll on desktop"],
  },
  {
    id: "lp_competitor_teardown",
    skillId: "landing-page-conversion",
    playbookId: "aggressive-cro-sprint",
    phaseLabel: "T-7",
    label: "Competitor LP teardown (3 URLs)",
    teaching: ["5-second clarity notes", "CTA count", "Proof type"],
    acceptanceCriteria: ["3 teardown notes filed"],
  },
  {
    id: "ads_lp_message_match",
    skillId: "landing-page-conversion",
    playbookId: "aggressive-cro-sprint",
    label: "Ads ↔ landing message match",
    teaching: ["Ad promise = first screen", "Same noun for offer"],
    acceptanceCriteria: ["Match audit checked before spend"],
  },
  {
    id: "cro_hypothesis_weekly",
    skillId: "landing-page-conversion",
    playbookId: "aggressive-cro-sprint",
    label: "Weekly CRO hypothesis",
    teaching: ["One hypothesis", "Sample size rule", "Kill/revert same day"],
    acceptanceCriteria: ["Hypothesis logged with kill rule"],
  },
  {
    id: "launch_bottleneck_diagnose",
    skillId: "launch-planning",
    playbookId: "aggressive-14d-sprint",
    phaseLabel: "T-14",
    label: "Launch bottleneck diagnose",
    teaching: ["Name one bottleneck from profile", "Cite 3 profile fields"],
    acceptanceCriteria: ["Single bottleneck written"],
  },
  {
    id: "launch_task_graph",
    skillId: "launch-planning",
    playbookId: "aggressive-14d-sprint",
    label: "Task graph with tactic + phaseLabel",
    teaching: ["tactic", "execution_mode", "phaseLabel", "acceptance_criteria on every task"],
    acceptanceCriteria: ["8–15 tasks all with tactic"],
  },
  {
    id: "channel_parallel_cap_2",
    skillId: "launch-planning",
    playbookId: "aggressive-14d-sprint",
    label: "Cap parallel channels at 2",
    teaching: ["Primary + ≤2 support", "Cut secondary on miss"],
    acceptanceCriteria: ["Channel list ≤3 including primary"],
  },
  {
    id: "ads_hypothesis_loop",
    skillId: "paid-ads-optimization",
    playbookId: "aggressive-hypothesis-sprint",
    label: "Ads hypothesis → kill/scale weekly",
    teaching: [
      "One hypothesis per week",
      "2 creatives; kill if CPA >2× after 50 clicks",
      "Scale +20% every 3 days if on target",
    ],
    acceptanceCriteria: ["Hypothesis logged", "Kill rule predefined"],
  },
  {
    id: "linkedin_14_day_grid",
    skillId: "linkedin-founder-gtm",
    playbookId: "aggressive-pipeline-30d",
    label: "14-day founder LinkedIn grid",
    teaching: ["Headline fix", "70/20/10 content mix", "Comment-led distribution"],
    acceptanceCriteria: ["14 posts drafted", "ICP engagement tracked"],
  },
  {
    id: "linkedin_comment_led_dm",
    skillId: "linkedin-founder-gtm",
    playbookId: "aggressive-pipeline-30d",
    label: "Comment-led DM sequence",
    teaching: ["Comment first 5 days", "DM only after 2 interactions", "Value-first opener"],
    acceptanceCriteria: ["Sequence doc with reply-rate target"],
  },
  {
    id: "platform_native_asset_pack",
    skillId: "launch-asset-generator",
    playbookId: "aggressive-platform-native",
    label: "Platform-native asset pack",
    teaching: ["PH gallery dimensions", "LI carousel specs", "No one-size export"],
    acceptanceCriteria: ["Per-platform specs checked"],
  },
  {
    id: "lead_evidence_scorecard",
    skillId: "lead-research",
    playbookId: "aggressive-icp-precision",
    label: "Lead scorecard with evidence URL",
    teaching: ["Every lead needs evidence URL", "Score fit 1–5", "No invented titles"],
    acceptanceCriteria: ["Scorecard rows with URLs"],
  },
  {
    id: "funnel_event_map",
    skillId: "analytics-measurement",
    playbookId: "aggressive-ship-signal",
    label: "Funnel event map before paid scale",
    teaching: ["Signup → activation events", "No fake GA4 rows", "Manual KPI OK until connector"],
    acceptanceCriteria: ["Event taxonomy doc", "Primary success metric named"],
  },
  {
    id: "value_first_outbound_sequence",
    skillId: "outreach-drafting",
    playbookId: "aggressive-personalization-tiers",
    label: "Value-first outbound (no pitch-first)",
    teaching: ["Research-led opener", "Personalization tier 2+", "Reply-rate benchmark"],
    acceptanceCriteria: ["Sequence ≤5 touches", "No spray-and-pray"],
  },
  {
    id: "outreach_tier3_personalization",
    skillId: "outreach-drafting",
    playbookId: "aggressive-personalization-tiers",
    label: "Tier-3 personalization for top accounts",
    teaching: ["Tier1: role/company", "Tier2: recent trigger", "Tier3: product-specific insight"],
    acceptanceCriteria: ["Top 20 accounts at tier 3"],
  },
];

const BY_ID = new Map<string, TacticDef>();
for (const t of [...PH_TACTICS, ...COMMUNITY_TACTICS, ...SEO_TACTICS, ...EMAIL_NURTURE_TACTICS, ...X_TACTICS, ...NL_TACTICS, ...PR_TACTICS, ...OSS_TACTICS, ...CORE_TACTICS]) {
  BY_ID.set(t.id, t);
}

export function getTactic(id: string): TacticDef | undefined {
  return BY_ID.get(id);
}

export function isRegisteredTactic(id: string): boolean {
  return BY_ID.has(id);
}

export function allTacticIds(): string[] {
  return [...BY_ID.keys()].sort();
}

export function tacticsForSkill(skillId: string): TacticDef[] {
  return [...BY_ID.values()].filter((t) => t.skillId === skillId);
}

export function tacticsForPlaybookStub(stubId: string): TacticDef[] {
  if (stubId === "ph-number-one" || stubId === "ph-launch") {
    return PH_TACTICS;
  }
  if (stubId === "community-launch") {
    return COMMUNITY_TACTICS;
  }
  if (stubId === "seo-foundation" || stubId === "seo-content-engine") {
    return SEO_TACTICS;
  }
  if (stubId === "email-nurture") {
    return EMAIL_NURTURE_TACTICS;
  }
  if (stubId === "twitter-x-gtm") {
    return X_TACTICS;
  }
  if (stubId === "newsletter-sponsorship") {
    return NL_TACTICS;
  }
  if (stubId === "press-pr-launch") {
    return PR_TACTICS;
  }
  if (stubId === "devrel-open-source-launch") {
    return OSS_TACTICS;
  }
  return [...BY_ID.values()].filter((t) => t.playbookId.includes(stubId.replace(/-/g, "")) || t.playbookId === stubId);
}

/** Labels for UI / gtmCatalog sync. */
export function tacticLabelMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of BY_ID.values()) out[t.id] = t.label;
  return out;
}
