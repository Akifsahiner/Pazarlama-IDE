/**
 * P17 — Growth Mechanism Knowledge Corpus.
 * Company-calibrated growth systems as deterministic data (not LLM, not UI case studies).
 */
import type { ChannelThesisId } from "./cmoIntake";

export type GrowthMechanismId =
  | "founder_narrative"
  | "brand_character"
  | "entertainment_ip"
  | "solution_ecosystem"
  | "remixable_artifacts"
  | "intent_to_product"
  | "partner_ecosystem"
  | "product_borne_distribution"
  | "customer_output"
  | "category_education"
  | "proprietary_data"
  | "release_ritual"
  | "community_demand"
  | "owned_culture_media";

export type MechanismIntensity = "none" | "low" | "medium" | "high" | "very_high";
export type MechanismTimeToSignal = "fast" | "medium" | "slow";

export interface MechanismWeek1Template {
  what: string;
  why: string;
  owner: "system" | "user" | "delegate";
  done_when: string;
  lane_hint?: string;
}

export interface MechanismOperatorFlags {
  distribution?: boolean;
  influencer?: boolean;
  delegate?: boolean;
  character_mode?: boolean;
  community_listening?: boolean;
  partner_brief?: boolean;
}

export interface GrowthMechanismRecord {
  id: GrowthMechanismId;
  label: string;
  calibration_sources: string[];
  superficial_wrong_lesson: string;
  hidden_system_chain: string[];
  problem_solved: string[];
  required_assets: string[];
  non_transferable_assets: string[];
  founder_dependency: MechanismIntensity;
  capital_intensity: MechanismIntensity;
  time_to_signal: MechanismTimeToSignal;
  compounding_potential: MechanismIntensity;
  leading_indicators: string[];
  business_outcomes: string[];
  failure_modes: string[];
  anti_patterns: string[];
  week1_task_templates: MechanismWeek1Template[];
  thesis_candidates: ChannelThesisId[];
  operator_flags: MechanismOperatorFlags;
  lane_a_skills?: string[];
  lane_b_mode?: string;
  deprioritize_extra?: string[];
}

export const GROWTH_MECHANISM_IDS: GrowthMechanismId[] = [
  "founder_narrative",
  "brand_character",
  "entertainment_ip",
  "solution_ecosystem",
  "remixable_artifacts",
  "intent_to_product",
  "partner_ecosystem",
  "product_borne_distribution",
  "customer_output",
  "category_education",
  "proprietary_data",
  "release_ritual",
  "community_demand",
  "owned_culture_media",
];

export const GROWTH_MECHANISM_KNOWLEDGE: Record<GrowthMechanismId, GrowthMechanismRecord> = {
  founder_narrative: {
    id: "founder_narrative",
    label: "Founder Narrative Engine",
    calibration_sources: ["cluely"],
    superficial_wrong_lesson: "Post more short videos without a repeatable story or proof loop.",
    hidden_system_chain: [
      "Founder credibility and polarizing narrative",
      "High-volume short-form hooks",
      "Earned attention and comment debate",
      "Minimal landing + tracking",
      "Usage-led pivot from distribution data",
    ],
    problem_solved: [
      "Consumer prelaunch with no distribution",
      "Category needs a human story to break through",
      "Founder can sustain camera cadence",
    ],
    required_assets: ["founder_on_camera", "polarizing_position", "hook_library", "landing_surface"],
    non_transferable_assets: ["existing_viral_moment", "category_controversy_fit"],
    founder_dependency: "high",
    capital_intensity: "low",
    time_to_signal: "fast",
    compounding_potential: "medium",
    leading_indicators: ["short_form_views", "social_posts"],
    business_outcomes: ["qualified_signups", "brand_awareness"],
    failure_modes: [
      "Founder stops posting after week 2",
      "Hooks without narrative coherence",
      "Controversy without product proof",
    ],
    anti_patterns: [
      "Generic SEO-first plan when founder story is the asset",
      "Batching 30 days of posts without daily measurement",
    ],
    week1_task_templates: [
      {
        what: "Ship minimal landing + UTM + 3 hook scripts tied to narrative",
        why: "Distribution needs a measurable destination before volume.",
        owner: "system",
        done_when: "Landing live with events; 3 hooks in repo",
        lane_hint: "lane_a",
      },
      {
        what: "Publish 3 proof posts testing one narrative angle",
        why: "Week 1 learns which story earns attention, not which feature list converts.",
        owner: "user",
        done_when: "3 live URLs logged with view counts",
        lane_hint: "lane_b",
      },
      {
        what: "Review hook retention and pick one angle to double down",
        why: "Founder narrative compounds only when one thread wins.",
        owner: "user",
        done_when: "Winning angle named + next 5 hooks drafted",
      },
    ],
    thesis_candidates: ["viral_short_form", "founder_social"],
    operator_flags: { distribution: true },
    lane_a_skills: ["short-form-video", "landing-page-conversion"],
    lane_b_mode: "posting_calendar",
    deprioritize_extra: ["Long SEO cycle before first hook test"],
  },

  brand_character: {
    id: "brand_character",
    label: "Brand Character Engine",
    calibration_sources: ["duolingo"],
    superficial_wrong_lesson: "Make a funny mascot dance on TikTok without product-linked tension.",
    hidden_system_chain: [
      "Recurring product tension (e.g. guilt, streak, FOMO)",
      "Character personality with behavior bounds",
      "Repeatable story relationships and universe",
      "Trend-response system with in-product tie-in",
      "Channel fatigue monitoring and diversification",
    ],
    problem_solved: [
      "Founder refuses to be the face",
      "Daily-use consumer product with emotional frequency",
      "Audience has meme literacy",
    ],
    required_assets: [
      "recurring_product_tension",
      "visual_character",
      "in_product_character_moments",
      "content_cadence_capacity",
    ],
    non_transferable_assets: ["decade_of_brand_memory", "massive_social_team"],
    founder_dependency: "low",
    capital_intensity: "medium",
    time_to_signal: "medium",
    compounding_potential: "very_high",
    leading_indicators: ["social_posts", "short_form_views"],
    business_outcomes: ["qualified_signups", "brand_awareness"],
    failure_modes: [
      "Random mascot without product tension",
      "Character inconsistent across product and social",
      "One channel over-index until fatigue",
    ],
    anti_patterns: [
      "Random panda mascot for B2B accounting software",
      "Character jokes disconnected from activation event",
    ],
    week1_task_templates: [
      {
        what: "Define character job: what tension does it represent in-product?",
        why: "Character must encode existing user anxiety, not random humor.",
        owner: "user",
        done_when: "One-page character brief with 3 behavior rules",
      },
      {
        what: "Wire one in-product character moment to the activation path",
        why: "Duolingo-class growth ties social character to product guilt/joy loop.",
        owner: "system",
        done_when: "PR or copy shipped linking character to magic moment",
        lane_hint: "lane_a",
      },
      {
        what: "Publish 2 character posts with trend-response template",
        why: "Tests whether the universe resonates before scaling volume.",
        owner: "user",
        done_when: "2 URLs + engagement notes logged",
        lane_hint: "lane_b",
      },
    ],
    thesis_candidates: ["viral_short_form", "influencer_partnerships"],
    operator_flags: { distribution: true, character_mode: true },
    lane_a_skills: ["launch-asset-generator", "landing-page-conversion"],
    lane_b_mode: "posting_calendar",
    deprioritize_extra: ["Founder-led talking head as primary"],
  },

  entertainment_ip: {
    id: "entertainment_ip",
    label: "Entertainment Brand Engine",
    calibration_sources: ["liquid_death"],
    superficial_wrong_lesson: "Use edgy slogans and absurd ads without a cultural world.",
    hidden_system_chain: [
      "Commodity product reframed via category code inversion",
      "Instantly recognizable physical/social packaging",
      "Entertainment production system",
      "Surprising collaborations",
      "Merch, membership, retail theatre",
    ],
    problem_solved: [
      "Physical or socially visible consumer product",
      "Category communication is homogeneous",
      "Identity signaling potential",
    ],
    required_assets: [
      "physical_or_social_visibility",
      "brand_world_bible",
      "collaboration_pipeline",
      "merch_or_membership_surface",
    ],
    non_transferable_assets: ["mass_retail_distribution", "entertainment_studio_budget"],
    founder_dependency: "low",
    capital_intensity: "high",
    time_to_signal: "slow",
    compounding_potential: "high",
    leading_indicators: ["brand_awareness", "social_posts"],
    business_outcomes: ["qualified_signups", "paying_customers"],
    failure_modes: [
      "Edgy copy without recognizable world",
      "Merch before core product repeat purchase",
      "Collabs off-brand for cheap reach",
    ],
    anti_patterns: ["Profanity-as-strategy for B2B SaaS", "Merch store before product-market clarity"],
    week1_task_templates: [
      {
        what: "Write category inversion brief: what cultural code do we reject?",
        why: "Liquid Death wins on opposite-world identity, not water quality claims.",
        owner: "user",
        done_when: "Brief approved with 3 visual/code rules",
      },
      {
        what: "Design one recognizable packaging or social asset system",
        why: "Remote recognition drives offline and social spread.",
        owner: "system",
        done_when: "Asset kit in repo or brand folder",
        lane_hint: "lane_a",
      },
      {
        what: "Shortlist 5 collaboration targets that fit the inverted world",
        why: "Collabs extend the universe; random influencers do not.",
        owner: "user",
        done_when: "5 targets with rationale logged",
        lane_hint: "lane_b",
      },
    ],
    thesis_candidates: ["influencer_partnerships", "community_launch"],
    operator_flags: { influencer: true, delegate: true },
    deprioritize_extra: ["Feature comparison SEO as primary"],
  },

  solution_ecosystem: {
    id: "solution_ecosystem",
    label: "Solution Creator Ecosystem",
    calibration_sources: ["notion"],
    superficial_wrong_lesson: "Open a Discord and call it community-led growth.",
    hidden_system_chain: [
      "Horizontal flexible product",
      "User-built vertical solutions (templates)",
      "Creator distribution to their audience",
      "Template → signup → activation",
      "Community education expands use cases",
    ],
    problem_solved: [
      "Blank canvas onboarding",
      "Many vertical use cases",
      "Users can sell expertise via templates",
    ],
    required_assets: [
      "flexible_product",
      "template_or_gallery_surface",
      "creator_economics",
      "public_template_index",
    ],
    non_transferable_assets: ["existing_passionate_superusers", "millions_of_active_workspaces"],
    founder_dependency: "none",
    capital_intensity: "medium",
    time_to_signal: "medium",
    compounding_potential: "very_high",
    leading_indicators: ["qualified_signups", "targeted_visitors"],
    business_outcomes: ["qualified_signups", "paying_customers"],
    failure_modes: [
      "Low-quality template spam",
      "Creators without distribution",
      "Gallery without activation path",
    ],
    anti_patterns: ["Empty ambassador program", "Templates without activation metric"],
    week1_task_templates: [
      {
        what: "Identify top 5 vertical use cases from scan + ICP",
        why: "Notion growth is vertical solution discovery, not generic feature tours.",
        owner: "user",
        done_when: "5 verticals named with example user job",
      },
      {
        what: "Ship one seed template per top vertical with activation CTA",
        why: "Templates must shorten time-to-first-value for that vertical.",
        owner: "system",
        done_when: "Templates live with tracked signup path",
        lane_hint: "lane_a",
      },
      {
        what: "Outreach to 10 micro-creators in one vertical",
        why: "Creators bring their audience; the product brings the system.",
        owner: "user",
        done_when: "10 targets logged; 3 conversations started",
        lane_hint: "lane_b",
      },
    ],
    thesis_candidates: ["seo_content", "community_launch", "influencer_partnerships"],
    operator_flags: { influencer: true, delegate: true },
    lane_a_skills: ["seo-foundation", "landing-page-conversion"],
    lane_b_mode: "outreach_tracker",
    deprioritize_extra: ["Founder viral volume before template wedge"],
  },

  remixable_artifacts: {
    id: "remixable_artifacts",
    label: "Remixable Artifact Ecosystem",
    calibration_sources: ["figma"],
    superficial_wrong_lesson: "Add a share button and hope users publish files.",
    hidden_system_chain: [
      "Create valuable artifact in-product",
      "Publish with preview and attribution",
      "Remix duplicates into new user entry",
      "Creator gains audience; product gains use cases",
    ],
    problem_solved: [
      "User output can be starting point for others",
      "Open-source-like remix culture fits product",
    ],
    required_assets: [
      "shareable_artifact",
      "public_gallery_or_community",
      "duplicate_or_remix_flow",
      "creator_attribution",
    ],
    non_transferable_assets: ["existing_design_community_scale"],
    founder_dependency: "none",
    capital_intensity: "medium",
    time_to_signal: "medium",
    compounding_potential: "very_high",
    leading_indicators: ["qualified_signups", "targeted_visitors"],
    business_outcomes: ["qualified_signups"],
    failure_modes: [
      "Artifacts without remix path",
      "No attribution so creators leave",
      "Low-quality public gallery",
    ],
    anti_patterns: ["Static template download without in-product remix"],
    week1_task_templates: [
      {
        what: "Audit: can user output become another user's starting point?",
        why: "Figma mechanism is remix, not just template copy.",
        owner: "user",
        done_when: "Yes/no with 3 example artifact types",
      },
      {
        what: "Ship public artifact page with one-click duplicate/remix",
        why: "Remix loop is the distribution surface.",
        owner: "system",
        done_when: "Live URL with duplicate path instrumented",
        lane_hint: "lane_a",
      },
      {
        what: "Seed 5 starter artifacts with creator attribution",
        why: "Cold start requires proof artifacts before community scale.",
        owner: "system",
        done_when: "5 artifacts published",
        lane_hint: "lane_a",
      },
    ],
    thesis_candidates: ["community_launch", "seo_content"],
    operator_flags: { delegate: true },
    lane_a_skills: ["launch-asset-generator", "devrel-open-source-launch"],
    deprioritize_extra: ["Influencer mass outreach before gallery exists"],
  },

  intent_to_product: {
    id: "intent_to_product",
    label: "Intent-to-Product Engine",
    calibration_sources: ["canva"],
    superficial_wrong_lesson: "Generate thousands of thin SEO pages without product action.",
    hidden_system_chain: [
      "Map high-intent queries",
      "Each query links to real product object (template/job)",
      "User starts work inside product from page",
      "Output share/reuse closes loop",
    ],
    problem_solved: [
      "Many discrete user jobs map to product templates",
      "Search is primary discovery channel",
    ],
    required_assets: [
      "template_library_or_job_objects",
      "programmatic_page_pipeline",
      "instant_activation_from_page",
    ],
    non_transferable_assets: ["massive_template_corpus", "global_localization_teams"],
    founder_dependency: "none",
    capital_intensity: "medium",
    time_to_signal: "slow",
    compounding_potential: "high",
    leading_indicators: ["targeted_visitors", "qualified_signups"],
    business_outcomes: ["qualified_signups", "paying_customers"],
    failure_modes: [
      "Duplicate thin pages",
      "Informational pages without product action",
      "No measurement per intent cluster",
    ],
    anti_patterns: ["Blog posts that never enter the product", "SEO without unique artifact per page"],
    week1_task_templates: [
      {
        what: "Build intent cluster map: 10 queries → product job → template",
        why: "Canva wins by binding search intent to instant product work.",
        owner: "user",
        done_when: "10-row map with activation path length ≤3 clicks",
      },
      {
        what: "Ship 3 intent pages with live template start (not copy-only)",
        why: "Proves search-to-product loop before scaling pages.",
        owner: "system",
        done_when: "3 URLs indexed with event tracking",
        lane_hint: "lane_a",
      },
      {
        what: "Run duplicate-page risk review on new URLs",
        why: "Guardrails prevent commodity SEO trap.",
        owner: "user",
        done_when: "Checklist signed; thin pages rejected or merged",
      },
    ],
    thesis_candidates: ["seo_content", "landing_conversion"],
    operator_flags: {},
    lane_a_skills: ["seo-foundation", "landing-page-conversion"],
    deprioritize_extra: ["Paid ads before intent pages convert"],
  },

  partner_ecosystem: {
    id: "partner_ecosystem",
    label: "Partner Ecosystem Engine",
    calibration_sources: ["zapier"],
    superficial_wrong_lesson: "Build many integrations nobody discovers or uses.",
    hidden_system_chain: [
      "Shared customer overlap with partner",
      "Integration + co-use case",
      "Two-sided directory and landing pages",
      "Joint launch + workflow templates",
      "Retention via switching cost",
    ],
    problem_solved: [
      "Developer tool or platform product",
      "Users already live in adjacent tools",
      "API or integration surface exists",
    ],
    required_assets: ["api_or_integration_surface", "partner_overlap_map", "workflow_templates"],
    non_transferable_assets: ["thousands_of_existing_integrations", "partner_sales_teams"],
    founder_dependency: "none",
    capital_intensity: "medium",
    time_to_signal: "medium",
    compounding_potential: "very_high",
    leading_indicators: ["qualified_signups", "outbound_replies"],
    business_outcomes: ["qualified_signups", "paying_customers"],
    failure_modes: [
      "Integrations without directory/marketing surface",
      "No co-marketing with partner",
      "Broken integrations erode trust",
    ],
    anti_patterns: ["Slack integration checkbox with no launch plan"],
    week1_task_templates: [
      {
        what: "Build ecosystem adjacency graph from scan + user workflows",
        why: "Zapier treats integrations as distribution deals, not checkboxes.",
        owner: "user",
        done_when: "Top 5 partners ranked by overlap score",
      },
      {
        what: "Draft integration spec + partner landing outline for #1 partner",
        why: "Directory page and workflow template are the launch artifact.",
        owner: "system",
        done_when: "Spec + landing markdown in repo",
        lane_hint: "lane_a",
      },
      {
        what: "Send co-marketing outreach to partner #1 with workflow template",
        why: "Partner channel only works with joint launch.",
        owner: "user",
        done_when: "Outreach sent with template attached",
        lane_hint: "lane_c",
      },
    ],
    thesis_candidates: ["community_launch", "outbound_sales"],
    operator_flags: { delegate: true, partner_brief: true },
    lane_a_skills: ["devrel-open-source-launch"],
    lane_b_mode: "outreach_tracker",
    deprioritize_extra: ["Founder TikTok before integration surface"],
  },

  product_borne_distribution: {
    id: "product_borne_distribution",
    label: "Product-Borne Distribution",
    calibration_sources: ["dropbox", "calendly"],
    superficial_wrong_lesson: "Add a referral popup after launch instead of embedding loop in core flow.",
    hidden_system_chain: [
      "User seeks value through action that involves others",
      "Non-user exposed during normal use",
      "Recipient experiences product value in context",
      "Recipient activates for own need",
    ],
    problem_solved: [
      "Collaboration, sharing, scheduling, or invite is core UX",
      "Referral reward aligns with product value unit",
    ],
    required_assets: [
      "invite_share_or_collaborate_surface",
      "recipient_value_moment",
      "loop_instrumentation",
    ],
    non_transferable_assets: ["network_effects_at_scale"],
    founder_dependency: "none",
    capital_intensity: "low",
    time_to_signal: "medium",
    compounding_potential: "very_high",
    leading_indicators: ["qualified_signups", "targeted_visitors"],
    business_outcomes: ["qualified_signups", "paying_customers"],
    failure_modes: [
      "Referral bolt-on without core loop",
      "Reward misaligned with product value",
      "Loop abuse or spam invites",
    ],
    anti_patterns: ["Generic refer-a-friend modal on unrelated SaaS"],
    week1_task_templates: [
      {
        what: "Audit product loop entries: invite, share, export, collaborate, embed",
        why: "Calendly/Dropbox growth lives in the value path, not marketing popups.",
        owner: "user",
        done_when: "Loop map with entry rate hypothesis",
      },
      {
        what: "Instrument loop events: send, expose, recipient_view, recipient_activate",
        why: "Cannot optimize loop without measured funnel.",
        owner: "system",
        done_when: "Events live in repo analytics",
        lane_hint: "lane_a",
      },
      {
        what: "Ship or tighten one loop with product-native reward (not coupon-only)",
        why: "Reward must be more of what user already values.",
        owner: "system",
        done_when: "Loop shipped with proof URL",
        lane_hint: "lane_a",
      },
    ],
    thesis_candidates: ["landing_conversion", "community_launch"],
    operator_flags: {},
    lane_a_skills: ["analytics-measurement", "landing-page-conversion"],
    deprioritize_extra: ["Paid ads scale before loop measured"],
  },

  customer_output: {
    id: "customer_output",
    label: "Customer Output Engine",
    calibration_sources: ["gopro"],
    superficial_wrong_lesson: "Ask users for UGC when output is not inherently share-worthy.",
    hidden_system_chain: [
      "Product use produces visually/socially valuable output",
      "Easy submission + rights flow",
      "Reward and recognition",
      "Brand distributes best output as proof",
    ],
    problem_solved: [
      "Output proves product capability",
      "Users gain status from sharing output",
    ],
    required_assets: [
      "shareable_output",
      "submission_workflow",
      "rights_and_rewards",
      "quality_ranking",
    ],
    non_transferable_assets: ["extreme_sports_culture", "hardware_margin_for_awards"],
    founder_dependency: "low",
    capital_intensity: "medium",
    time_to_signal: "medium",
    compounding_potential: "high",
    leading_indicators: ["social_posts", "short_form_views"],
    business_outcomes: ["brand_awareness", "qualified_signups"],
    failure_modes: [
      "UGC campaign on boring output",
      "No rights management",
      "Low-quality flood without ranking",
    ],
    anti_patterns: ["Hashtag contest for B2B spreadsheet software"],
    week1_task_templates: [
      {
        what: "Define output marketing fit: is user output share-worthy proof?",
        why: "GoPro content IS the product demo; generic UGC is not.",
        owner: "user",
        done_when: "Fit score + 3 example outputs documented",
      },
      {
        what: "Ship capture prompt + submission path in product or landing",
        why: "Frictionless submit unlocks supply.",
        owner: "system",
        done_when: "Submit flow live",
        lane_hint: "lane_a",
      },
      {
        what: "Publish 1 customer output with permission and reward note",
        why: "Proof of program before scaling rewards.",
        owner: "user",
        done_when: "1 output live with rights logged",
        lane_hint: "lane_b",
      },
    ],
    thesis_candidates: ["influencer_partnerships", "viral_short_form"],
    operator_flags: { influencer: true, distribution: true },
    lane_b_mode: "posting_calendar",
    deprioritize_extra: ["Founder-only content when output should lead"],
  },

  category_education: {
    id: "category_education",
    label: "Category Education Engine",
    calibration_sources: ["hubspot"],
    superficial_wrong_lesson: "Publish lots of blog posts without owning a teachable methodology.",
    hidden_system_chain: [
      "Category lacks shared language",
      "Company defines methodology + vocabulary",
      "Free curriculum and certification",
      "Certified practitioners bring method to employers",
      "Product implements the method",
    ],
    problem_solved: [
      "Complex category with education gap",
      "Buyer needs internal champions",
      "Product makes sense inside a method",
    ],
    required_assets: [
      "methodology_outline",
      "curriculum_assets",
      "certification_or_badging",
      "free_diagnostic",
    ],
    non_transferable_assets: ["decade_of_inbound_brand", "massive_academy_team"],
    founder_dependency: "low",
    capital_intensity: "medium",
    time_to_signal: "slow",
    compounding_potential: "very_high",
    leading_indicators: ["targeted_visitors", "qualified_signups"],
    business_outcomes: ["pipeline_meetings", "qualified_signups"],
    failure_modes: [
      "Blog volume without certification path",
      "Methodology disconnected from product",
      "Certification without employer recognition",
    ],
    anti_patterns: ["SEO blog farm without curriculum", "Glossary page as thought leadership"],
    week1_task_templates: [
      {
        what: "Draft category vocabulary + maturity model (1 page)",
        why: "HubSpot won by teaching inbound before selling software.",
        owner: "user",
        done_when: "Vocabulary + 3 maturity stages documented",
      },
      {
        what: "Ship free diagnostic or checklist landing tied to product",
        why: "Education entry point must capture intent and teach method.",
        owner: "system",
        done_when: "Diagnostic live with email or signup gate",
        lane_hint: "lane_a",
      },
      {
        what: "Outline Module 1 curriculum with product practice lab",
        why: "Certification path creates long-lived distribution.",
        owner: "user",
        done_when: "Module 1 outline with 3 exercises",
      },
    ],
    thesis_candidates: ["seo_content", "founder_social"],
    operator_flags: { delegate: true },
    lane_a_skills: ["seo-foundation", "content-engine"],
    deprioritize_extra: ["Short-form volume before method exists"],
  },

  proprietary_data: {
    id: "proprietary_data",
    label: "Proprietary Data Authority",
    calibration_sources: ["gong"],
    superficial_wrong_lesson: "Publish stats without methodology or unique dataset.",
    hidden_system_chain: [
      "Product generates unique aggregate data",
      "Anonymized research answers market questions",
      "Findings become PR and sales assets",
      "Research demonstrates product capability",
    ],
    problem_solved: [
      "B2B product with rich usage data exhaust",
      "Market debates answerable with your data",
      "Founder face not required",
    ],
    required_assets: [
      "anonymizable_dataset",
      "research_methodology",
      "statistical_review_process",
      "privacy_compliance",
    ],
    non_transferable_assets: ["billions_of_call_recordings"],
    founder_dependency: "none",
    capital_intensity: "low",
    time_to_signal: "slow",
    compounding_potential: "high",
    leading_indicators: ["targeted_visitors", "outbound_replies"],
    business_outcomes: ["pipeline_meetings", "brand_awareness"],
    failure_modes: [
      "Fake or unrepresentative stats",
      "Data too thin for claims",
      "Privacy breach destroys trust",
    ],
    anti_patterns: ["Random benchmark tweets", "Survey of 12 friends as industry report"],
    week1_task_templates: [
      {
        what: "List 5 research questions only your data can answer",
        why: "Gong Labs proves the product by publishing what it sees at scale.",
        owner: "user",
        done_when: "5 questions with data feasibility notes",
      },
      {
        what: "Validate dataset fitness: sample size, anonymization, bias risks",
        why: "Authority requires honest methodology.",
        owner: "user",
        done_when: "Fitness checklist completed",
      },
      {
        what: "Draft research one-pager with methodology section",
        why: "First public asset tests market pull before full report.",
        owner: "system",
        done_when: "Markdown report in repo",
        lane_hint: "lane_a",
      },
    ],
    thesis_candidates: ["founder_social", "seo_content", "outbound_sales"],
    operator_flags: {},
    lane_a_skills: ["seo-foundation", "launch-asset-generator"],
    deprioritize_extra: ["Founder viral video as primary"],
  },

  release_ritual: {
    id: "release_ritual",
    label: "Release Ritual Engine",
    calibration_sources: ["supabase"],
    superficial_wrong_lesson: "Tweet each feature randomly without themed launch cadence.",
    hidden_system_chain: [
      "Continuous product development",
      "Batch releases into themed ritual",
      "Daily beats during launch week",
      "Community events + dev content",
      "Expectation for next ritual",
    ],
    problem_solved: [
      "DevTool or platform with steady shipping",
      "Team can share stage (not single founder)",
      "Feature significance warrants event",
    ],
    required_assets: [
      "release_backlog",
      "demo_quality",
      "docs_and_migration_paths",
      "community_surface",
    ],
    non_transferable_assets: ["large_devrel_org", "existing_launch_week_brand"],
    founder_dependency: "low",
    capital_intensity: "medium",
    time_to_signal: "fast",
    compounding_potential: "high",
    leading_indicators: ["qualified_signups", "brand_awareness"],
    business_outcomes: ["qualified_signups"],
    failure_modes: [
      "Launch fatigue from weekly fake events",
      "Features not demo-ready",
      "No community follow-through",
    ],
    anti_patterns: ["Feature tweet without migration path", "Launch week with single minor patch"],
    week1_task_templates: [
      {
        what: "Compile Launch Week backlog: 5 shippable beats with narrative",
        why: "Supabase turns shipping tempo into media tempo.",
        owner: "user",
        done_when: "5-day outline with owner per day",
      },
      {
        what: "Prepare Day 1 demo + docs + social assets for top feature",
        why: "Each beat needs demo, docs, migration, and measurement.",
        owner: "system",
        done_when: "Day 1 assets ready in repo",
        lane_hint: "lane_a",
      },
      {
        what: "Schedule one community event (AMA, hackathon, or office hours)",
        why: "Ritual includes live community activation.",
        owner: "user",
        done_when: "Event scheduled with link",
        lane_hint: "lane_b",
      },
    ],
    thesis_candidates: ["product_hunt_launch", "community_launch"],
    operator_flags: { distribution: true, delegate: true },
    lane_a_skills: ["devrel-open-source-launch", "launch-asset-generator"],
    lane_b_mode: "launch_runbook",
    deprioritize_extra: ["Influencer mass before launch assets ready"],
  },

  community_demand: {
    id: "community_demand",
    label: "Community Demand Sensor",
    calibration_sources: ["elf"],
    superficial_wrong_lesson: "Chase TikTok trends without structured product signal taxonomy.",
    hidden_system_chain: [
      "Social/community conversations",
      "Structured demand signals (feature, price, competitor)",
      "Product hypothesis from repeated signals",
      "Small test launch",
      "Creator/community co-launch if validated",
    ],
    problem_solved: [
      "Consumer brand with active social audience",
      "Product roadmap can respond quickly",
      "Community asks for variants",
    ],
    required_assets: [
      "social_listening_surface",
      "signal_taxonomy",
      "rapid_test_capacity",
    ],
    non_transferable_assets: ["massive_existing_community", "retail_velocity_data"],
    founder_dependency: "low",
    capital_intensity: "medium",
    time_to_signal: "fast",
    compounding_potential: "medium",
    leading_indicators: ["social_posts", "qualified_signups"],
    business_outcomes: ["paying_customers", "brand_awareness"],
    failure_modes: [
      "Trend-chasing without purchase intent signals",
      "No link from social to product test",
      "Over-building before limited test",
    ],
    anti_patterns: ["Trend-jack without demand taxonomy", "Product roadmap from vanity metrics only"],
    week1_task_templates: [
      {
        what: "Define demand signal taxonomy (feature, price, competitor, use case)",
        why: "e.l.f. uses social as R&D sensor, not just ad channel.",
        owner: "user",
        done_when: "Taxonomy doc with 5 categories",
      },
      {
        what: "Run structured listening session; log 20 tagged signals",
        why: "Week 1 builds signal baseline before product bets.",
        owner: "user",
        done_when: "20 signals logged with category tags",
        lane_hint: "lane_b",
      },
      {
        what: "Promote top repeated signal to product opportunity brief",
        why: "Marketing agent opens product loop with evidence.",
        owner: "user",
        done_when: "1 brief with frequency + urgency notes",
      },
    ],
    thesis_candidates: ["influencer_partnerships", "viral_short_form"],
    operator_flags: { community_listening: true, influencer: true },
    lane_b_mode: "posting_calendar",
    deprioritize_extra: ["Long SEO cycle ignoring live demand"],
  },

  owned_culture_media: {
    id: "owned_culture_media",
    label: "Owned Culture & Media Engine",
    calibration_sources: ["red_bull"],
    superficial_wrong_lesson: "Sponsor one sports event and slap logo on it.",
    hidden_system_chain: [
      "Audience identity and cultural territory",
      "Own events, media, and talent relationships",
      "Content distribution independent of paid ads",
      "Brand association through culture not product demos",
    ],
    problem_solved: [
      "Mature brand with capital and multi-year horizon",
      "Audience defined by lifestyle not feature",
    ],
    required_assets: [
      "significant_capital",
      "cultural_territory_fit",
      "media_or_event_ops",
      "multi_year_commitment",
    ],
    non_transferable_assets: ["red_bull_media_house", "extreme_sports_ip_portfolio"],
    founder_dependency: "none",
    capital_intensity: "very_high",
    time_to_signal: "slow",
    compounding_potential: "very_high",
    leading_indicators: ["brand_awareness"],
    business_outcomes: ["brand_awareness"],
    failure_modes: [
      "One-off sponsorship without media system",
      "Culture mismatch with product",
      "Cash burn before brand association forms",
    ],
    anti_patterns: ["Early-stage SaaS planning media house", "Event sponsorship without audience ownership"],
    week1_task_templates: [
      {
        what: "Validate capital and stage gate for owned media (honest no if pre-revenue)",
        why: "Red Bull model requires years and significant capital — not for Week 1 startups.",
        owner: "user",
        done_when: "Gate documented: proceed or defer",
      },
      {
        what: "If deferred: pick lightweight culture asset (newsletter, podcast, micro-event)",
        why: "Start with ownable asset before media house fantasy.",
        owner: "user",
        done_when: "One asset chosen with 90-day plan",
      },
      {
        what: "If proceed: draft cultural territory map aligned to ICP identity",
        why: "Ownership requires knowing which culture you belong to.",
        owner: "delegate",
        done_when: "Territory map approved",
        lane_hint: "lane_c",
      },
    ],
    thesis_candidates: ["influencer_partnerships", "community_launch"],
    operator_flags: { delegate: true },
    deprioritize_extra: ["Performance marketing as primary for culture brands"],
  },
};

export function getMechanismRecord(id: GrowthMechanismId): GrowthMechanismRecord {
  return GROWTH_MECHANISM_KNOWLEDGE[id];
}

export function listMechanismRecords(): GrowthMechanismRecord[] {
  return GROWTH_MECHANISM_IDS.map((id) => GROWTH_MECHANISM_KNOWLEDGE[id]);
}
