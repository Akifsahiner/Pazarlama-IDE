/**
 * P0 — CMO Intake + Channel Thesis (deterministic, no LLM).
 * See CMO_INTAKE_SPEC.md and PRODUCT_NORTH_STAR.md §11.
 */
import { inferIntegrateRoute } from "./assetTarget";
import {
  BOTTLENECK_LABELS,
  BOTTLENECK_PLAYBOOKS,
  type GtmBottleneck,
} from "./bottleneck";
import { applyMechanismToChannelThesis } from "./cmoGrowthEngine";
import { capWeek1Priorities } from "./cmoExecutionBind";
import type { GrowthMechanismId } from "./cmoGrowthMechanismKnowledge";
import { buildProductUnderstanding } from "./productUnderstandingPolicy";
import { attachIntakeUnderstanding } from "./productUnderstandingIntakeBind";
import type {
  FounderFitProfile,
  GrowthNarrative,
  MarketingProfile,
  Persona,
  ProjectProfile,
  StrategicOption,
  StrategicOptionId,
} from "./types";

export type CmoVerdict = "marketable" | "needs_work" | "not_ready";

export type ChannelThesisId =
  | "viral_short_form"
  | "founder_social"
  | "product_hunt_launch"
  | "landing_conversion"
  | "seo_content"
  | "outbound_sales"
  | "community_launch"
  | "influencer_partnerships";

export type CmoTaskOwner = "system" | "user" | "delegate";

export interface CmoWeek1Priority {
  /** Stable key for ops cadence + accountability (e.g. `viral_short_form.w1.0`). */
  id: string;
  what: string;
  why: string;
  owner: CmoTaskOwner;
  done_when: string;
}

export interface ChannelThesis {
  id: ChannelThesisId;
  title: string;
  headline: string;
  verdict: CmoVerdict;
  verdict_reason: string;
  primary_bottleneck: GtmBottleneck;
  rationale: string[];
  week1_priorities: CmoWeek1Priority[];
  primary_playbook_ids: string[];
  lane_a: string[];
  lane_b: string[];
  deprioritize: string[];
  signals: Record<string, string>;
  generated_at: string;
  /** P13 — scan-only thesis until the founder seals a strategic option. */
  draft?: boolean;
  /** P13 — selected A/B/C strategic posture. */
  strategic_option_id?: StrategicOptionId;
  /** P13 — canonical story inherited by execution lanes. */
  narrative_one_liner?: string;
  /** Part 6 — rationale bullets linked to claim ids. */
  rationale_claim_ids?: string[];
  /** Part 6 — deterministic thesis pick audit log. */
  thesis_decision?: import("./productUnderstandingInput").ThesisDecisionLog;
}

/** P4 — prior-cycle context for continuous CMO replan. */
export interface CmoIntakeContext {
  cycle_index?: number;
  previous_thesis_id?: ChannelThesisId;
  pivot_verdict?: import("./cmoOpsCadence").PivotVerdict;
  force_thesis_id?: ChannelThesisId;
  prior_primary_kpi_value?: number;
  prior_primary_kpi_target?: number;
  mode?: "pivot" | "double_down";
  /** P11 — evidence carried from the prior cycle into deterministic replan copy. */
  memory_snapshot?: {
    winners: Array<{ label: string; kind: string; metric?: string }>;
    losers: Array<{ label: string; kind: string }>;
    recommended_mode?: "pivot" | "double_down";
  };
}

export interface CmoIntakeInput {
  project: ProjectProfile;
  persona: Persona;
  profile?: MarketingProfile | null;
  context?: CmoIntakeContext;
  founder_fit?: FounderFitProfile;
  selected_option?: StrategicOption;
  narrative?: GrowthNarrative;
  draft?: boolean;
}

interface IntakeSignals {
  heroPath?: string;
  hasBlog: boolean;
  hasPricing: boolean;
  hasSignup: boolean;
  isUrlOnly: boolean;
  isDevTool: boolean;
  isConsumer: boolean;
  isB2bSaas: boolean;
  readmeLower: string;
  controversialOrViral: boolean;
  daysUntilLaunch?: number;
  companyStage: string;
  hasAnalytics: boolean;
  emailListSize?: number;
  currentUsers?: number;
  salesPipelineEmpty: boolean;
}

function detectSignals(input: CmoIntakeInput): IntakeSignals {
  const { project, profile, persona } = input;
  const routes = (project.routes ?? []).map((r) => r.replace(/\\/g, "/"));
  const readmeLower = (project.readmeSummary ?? profile?.product_description ?? "").toLowerCase();
  const category = (profile?.category ?? project.productType ?? "").toLowerCase();

  const isDevTool =
    /devtools|developer|dev tool|api|sdk|cli|open.?source/i.test(readmeLower) ||
    category.includes("devtools") ||
    routes.some((r) => /\/api\b|openapi|docs/i.test(r));

  const isConsumer =
    profile?.business_model === "consumer" ||
    /consumer|b2c|mobile app|social|game|viral|tiktok|creator/i.test(readmeLower) ||
    (!isDevTool && /ai assistant|cheat|overlay|meeting notes/i.test(readmeLower));

  const isB2bSaas =
    profile?.business_model === "saas" ||
    /b2b|saas|enterprise|team|workspace|sales enablement/i.test(readmeLower) ||
    (isDevTool && !isConsumer);

  const controversialOrViral =
    /cheat|controvers|viral|polariz|black mirror|undetectable|interview coder/i.test(
      readmeLower,
    );

  return {
    heroPath: inferIntegrateRoute(routes),
    hasBlog: routes.some((r) => /\/blog\b/i.test(r)),
    hasPricing: routes.some((r) => /pricing/i.test(r)),
    hasSignup: routes.some((r) => /signup|sign-up|register|login/i.test(r)),
    isUrlOnly: project.source.kind === "url",
    isDevTool,
    isConsumer,
    isB2bSaas,
    readmeLower,
    controversialOrViral,
    daysUntilLaunch: profile?.days_until_launch,
    companyStage: profile?.company_stage ?? "",
    hasAnalytics: project.hasAnalytics || profile?.tracking_flags?.analytics_detected === true,
    emailListSize: profile?.email_list_size,
    currentUsers: profile?.current_users,
    salesPipelineEmpty: persona === "sales" && profile?.sales_pipeline_empty !== false,
  };
}

function computeVerdict(project: ProjectProfile, signals: IntakeSignals): {
  verdict: CmoVerdict;
  reason: string;
} {
  if (signals.isUrlOnly || project.scannedFileCount < 3) {
    return {
      verdict: "not_ready",
      reason:
        "Open the local project folder (not just a live URL) so we can ship repo changes and audit the real codebase.",
    };
  }
  if (!signals.heroPath && project.routes.length < 2) {
    return {
      verdict: "needs_work",
      reason:
        "No clear landing page route detected — add a home/landing page before scaling distribution.",
    };
  }
  if (!project.readmeSummary?.trim() && !project.framework) {
    return {
      verdict: "needs_work",
      reason:
        "Product story is thin from scan alone — confirm value prop in intake so thesis is not generic.",
    };
  }
  return {
    verdict: "marketable",
    reason: "Repo scan shows a shippable product surface — we can run a concrete Week 1 growth thesis.",
  };
}

function pickThesisId(
  input: CmoIntakeInput,
  signals: IntakeSignals,
  bottleneck: GtmBottleneck,
): ChannelThesisId {
  const { persona, profile } = input;

  if (persona === "sales" && (signals.salesPipelineEmpty || bottleneck === "revenue")) {
    return "outbound_sales";
  }

  if (!signals.hasAnalytics && bottleneck === "measurement") {
    return "landing_conversion";
  }

  if (
    signals.controversialOrViral ||
    (signals.isConsumer && !signals.isB2bSaas && /prelaunch|idea|^$/.test(signals.companyStage))
  ) {
    return "viral_short_form";
  }

  if (
    signals.daysUntilLaunch != null &&
    signals.daysUntilLaunch <= 21 &&
    signals.daysUntilLaunch >= 0
  ) {
    return "product_hunt_launch";
  }
  if (
    profile?.marketing_goals?.some((g) => /launch|product hunt|ph\b/i.test(g)) ||
    profile?.days_until_launch != null
  ) {
    return "product_hunt_launch";
  }

  if (signals.hasBlog && /growing|scaling|launched/.test(signals.companyStage)) {
    return "seo_content";
  }

  if (signals.isDevTool && bottleneck === "distribution") {
    return "community_launch";
  }

  if (signals.isB2bSaas && bottleneck === "awareness") {
    return "founder_social";
  }

  if (signals.isConsumer && bottleneck === "awareness" && !signals.controversialOrViral) {
    return "influencer_partnerships";
  }

  if (signals.heroPath && (bottleneck === "conversion" || signals.hasAnalytics)) {
    return "landing_conversion";
  }

  if (bottleneck === "distribution") {
    return signals.isDevTool ? "community_launch" : "product_hunt_launch";
  }

  return signals.isB2bSaas ? "founder_social" : "landing_conversion";
}

function inferBottleneck(signals: IntakeSignals, persona: Persona): GtmBottleneck {
  if (persona === "sales" && signals.salesPipelineEmpty) return "revenue";
  if (!signals.hasAnalytics && /launched|growing|scaling/.test(signals.companyStage)) {
    return "measurement";
  }
  if (signals.currentUsers != null && signals.currentUsers > 100 && signals.heroPath) {
    return "conversion";
  }
  if (signals.daysUntilLaunch != null && signals.daysUntilLaunch <= 30) return "distribution";
  if (signals.emailListSize != null && signals.emailListSize > 500) return "conversion";
  if (signals.isConsumer && /prelaunch|idea|^$/.test(signals.companyStage)) return "awareness";
  if (signals.isB2bSaas && /prelaunch|idea|^$/.test(signals.companyStage)) return "awareness";
  if (signals.heroPath && !signals.hasAnalytics) return "conversion";
  return "awareness";
}

interface ThesisTemplate {
  title: string;
  headline: string;
  rationale: string[];
  lane_a: string[];
  lane_b: string[];
  deprioritize: string[];
  week1: (signals: IntakeSignals, hero?: string) => Omit<CmoWeek1Priority, "id">[];
}

const THESIS_TEMPLATES: Record<ChannelThesisId, ThesisTemplate> = {
  viral_short_form: {
    title: "Viral short-form distribution",
    headline:
      "Your primary game is attention-first short-form — volume, hooks, and founder story before SEO.",
    rationale: [
      "Consumer or polarizing positioning wins on TikTok/Reels/X, not long-cycle SEO.",
      "Ship a minimal landing + tracking; spend Week 1 on hooks and posting cadence.",
      "Measure which hooks drive signups — pivot offer when usage data disagrees with positioning.",
    ],
    lane_a: [
      "Minimal landing + UTM + conversion events in repo",
      "20 hook scripts and thumbnail copy packs",
    ],
    lane_b: [
      "Record and post 3–5 short videos per day on primary channel",
      "Pin founder story thread; engage comments in first hour",
    ],
    deprioritize: ["Long-form SEO content calendar", "Enterprise outbound", "Heavy paid ads before hook fit"],
    week1: (_s, hero) => [
      {
        what: hero
          ? `Ship landing tracking + hero clarity in @${hero}`
          : "Ship landing page tracking and single CTA in repo",
        why: "You need a measurable destination before scaling creative volume.",
        owner: "system",
        done_when: "Diff applied · signup/click event fires in preview",
      },
      {
        what: "Produce 15 hook scripts (3 angles × 5 variants) from product story",
        why: "Short-form wins on hook testing, not one perfect video.",
        owner: "system",
        done_when: "Script pack saved · 3 flagged as Week 1 A/B/C",
      },
      {
        what: "Post first 3 videos using scripts A/B/C; log URLs",
        why: "Distribution is the moat — creative without posting is zero reach.",
        owner: "user",
        done_when: "3 live post URLs recorded · 24h view/signup snapshot logged",
      },
      {
        what: "Engage comments on each post in the first hour",
        why: "Early engagement signals quality to the algorithm and builds community.",
        owner: "user",
        done_when: "3 comment thread URLs · reply count logged",
      },
    ],
  },
  founder_social: {
    title: "Founder-led social + dev credibility",
    headline:
      "Grow through founder LinkedIn/X presence and technical credibility — not generic brand ads.",
    rationale: [
      "B2B/devtools buyers trust builders who teach in public.",
      "Repo ships prove expertise; social distributes proof.",
      "Outbound complements social once ICP reacts to founder posts.",
    ],
    lane_a: [
      "Landing + ICP headline + proof block in repo",
      "14-day founder post grid (hooks + drafts)",
    ],
    lane_b: [
      "Publish 3 founder posts this week with repo links",
      "Comment on 10 ICP threads with substance (not pitches)",
    ],
    deprioritize: ["TikTok volume plays", "Product Hunt before narrative clarity"],
    week1: (_s, hero) => [
      {
        what: hero ? `Sharpen ICP headline + proof on @${hero}` : "Sharpen ICP headline on landing",
        why: "Social traffic must land on a message that matches your posts.",
        owner: "system",
        done_when: "Hero/ICP diff applied or reviewed",
      },
      {
        what: "Draft 7 founder posts (problem → insight → product tie-in)",
        why: "Consistency beats virality for B2B awareness.",
        owner: "system",
        done_when: "7 drafts in marketing/ with scheduled order",
      },
      {
        what: "Publish posts 1–3; engage 30 min after each",
        why: "Algorithm and trust reward founder presence, not scheduling tools alone.",
        owner: "user",
        done_when: "3 live post URLs · engagement notes captured",
      },
      {
        what: "Comment substantively on 10 ICP threads (no pitches)",
        why: "Distribution compounds when founders show up where buyers already discuss the problem.",
        owner: "user",
        done_when: "10 thread URLs · one-line takeaway per thread logged",
      },
    ],
  },
  product_hunt_launch: {
    title: "Coordinated launch week",
    headline:
      "Your window is launch distribution — Product Hunt / HN / supporter network in a tight runbook.",
    rationale: [
      "Launch rewards coordination and assets, not incremental SEO tweaks this week.",
      "Prepare gallery, maker comment, supporter messages before launch day.",
      "Landing must convert launch traffic in the first 48 hours.",
    ],
    lane_a: [
      "Launch landing + gallery copy + event tracking",
      "PH/HN runbook and supporter DM templates",
    ],
    lane_b: [
      "Line up supporters and hunter; schedule launch day hour-by-hour",
      "Maker comment + gallery live at T-0",
    ],
    deprioritize: ["Long SEO campaigns", "Cold outbound blitz during launch week"],
    week1: (_s, hero) => [
      {
        what: hero ? `Launch-ready landing + meta on @${hero}` : "Launch-ready landing copy in repo",
        why: "Launch traffic spikes are wasted without a single sharp CTA.",
        owner: "system",
        done_when: "Diff applied · preview checked",
      },
      {
        what: "Build PH asset pack (tagline, gallery bullets, maker comment draft)",
        why: "Launch day fails when assets are written morning-of.",
        owner: "system",
        done_when: "Asset pack complete · checklist 80% green",
      },
      {
        what: "Confirm 10 supporters + launch slot; dry-run comment",
        why: "Distribution is people — schedule them now.",
        owner: "user",
        done_when: "10 supporters confirmed · launch datetime set",
      },
    ],
  },
  landing_conversion: {
    title: "Landing conversion lift",
    headline:
      "Fix the money page first — hero, proof, and tracking before scaling awareness spend.",
    rationale: [
      "Traffic without conversion is vanity; repo changes are measurable.",
      "Technical SEO supports conversion but does not replace a weak hero.",
      "Apply → measure signup/click events within 7 days.",
    ],
    lane_a: [
      "Hero CTA + meta + social proof in repo",
      "Conversion events / analytics wiring",
    ],
    lane_b: [
      "Drive 50+ targeted visitors (community post, newsletter, friends-of-product)",
      "Log before/after signup rate",
    ],
    deprioritize: ["Broad brand campaigns", "Influencer spend before baseline CR"],
    week1: (_s, hero) => [
      {
        what: hero
          ? `Hero CTA + meta + above-fold proof on @${hero}`
          : "Hero CTA and meta improvements in repo",
        why: "Highest leverage change for teams with some traffic or launch imminent.",
        owner: "system",
        done_when: "Patch applied · TurnReceipt shows files + lines",
      },
      {
        what: "Wire primary conversion event if missing",
        why: "You cannot prove uplift without tracking.",
        owner: "system",
        done_when: "Event snippet in repo or GA4 step documented",
      },
      {
        what: "Send 50 targeted visitors to new landing; record signup rate",
        why: "Conversion work needs real traffic signal, not guesses.",
        owner: "user",
        done_when: "Visitor count + signup % logged in KPI",
      },
    ],
  },
  seo_content: {
    title: "SEO + content engine",
    headline:
      "Compound organic reach — technical SEO in repo plus a focused content cluster.",
    rationale: [
      "Blog route exists; growing products win on searchable intent.",
      "Ship technical SEO foundation before volume blogging.",
      "One pillar article beats ten thin posts.",
    ],
    lane_a: [
      "Technical SEO (sitemap, schema, canonical) in repo",
      "One pillar article outline + draft in marketing/",
    ],
    lane_b: ["Publish pillar · share in 2 communities", "Submit to Search Console"],
    deprioritize: ["Paid ads before indexation", "Viral short-form as primary"],
    week1: () => [
      {
        what: "Ship technical SEO baseline (sitemap, meta, structured data)",
        why: "Content without indexation infrastructure underperforms.",
        owner: "system",
        done_when: "SEO diff applied or audit checklist complete",
      },
      {
        what: "Draft one pillar article targeting primary ICP search intent",
        why: "SEO wins on depth + intent match, not frequency alone.",
        owner: "system",
        done_when: "Draft in marketing/ with target keyword noted",
      },
      {
        what: "Publish pillar and distribute to 2 relevant communities",
        why: "Initial backlinks and engagement accelerate indexation.",
        owner: "user",
        done_when: "Live URL + 2 distribution links logged",
      },
    ],
  },
  outbound_sales: {
    title: "Outbound revenue pipeline",
    headline:
      "Build pipeline first — ICP, list, and value-first sequences before brand campaigns.",
    rationale: [
      "Sales persona with empty pipeline needs conversations, not billboards.",
      "Research and drafts in IDE; you send and book demos.",
      "Landing supports outbound but does not replace touches.",
    ],
    lane_a: ["ICP doc + landing alignment", "First-touch sequences + lead CSV template"],
    lane_b: [
      "Send 20 value-first emails or DMs to ICP list",
      "Log replies and objections for iteration",
    ],
    deprioritize: ["Product Hunt", "Consumer viral plays"],
    week1: () => [
      {
        what: "Finalize ICP + pain/outcome one-pager from repo signals",
        why: "Outbound fails without a narrow who-and-why.",
        owner: "system",
        done_when: "ICP doc in marketing/ · approved by you",
      },
      {
        what: "Build list of 30 targets + 3-touch sequence drafts",
        why: "Pipeline = volume × relevance × follow-up.",
        owner: "system",
        done_when: "CSV + sequences exportable",
      },
      {
        what: "Send first 20 touches; log replies",
        why: "Revenue motion requires human send — system prepares.",
        owner: "user",
        done_when: "20 sent · reply rate logged",
      },
    ],
  },
  community_launch: {
    title: "Developer community launch",
    headline:
      "Reach builders where they are — Show HN, Indie Hackers, Discord, GitHub README — with shippable proof.",
    rationale: [
      "DevTools distribution is credibility + show-don't-tell.",
      "Repo quality and README are the ad.",
      "Community posts need a sharp demo hook.",
    ],
    lane_a: [
      "README launch section + demo GIF copy",
      "Show HN / community post drafts",
    ],
    lane_b: [
      "Post Show HN or IH with maker comment",
      "Reply to every comment in first 2 hours",
    ],
    deprioritize: ["Influencer mass market", "Generic LinkedIn inspirational posts"],
    week1: (_s, hero) => [
      {
        what: "Upgrade README with clear hook, demo, and install CTA",
        why: "Community traffic lands on GitHub first.",
        owner: "system",
        done_when: "README diff ready to apply",
      },
      {
        what: hero ? `Ensure landing matches README promise on @${hero}` : "Align landing with README",
        why: "Community bounce happens when README and site disagree.",
        owner: "system",
        done_when: "Landing diff applied or reviewed",
      },
      {
        what: "Post to one primary community (HN/IH/Reddit); engage 2h",
        why: "Distribution requires presence at launch moment.",
        owner: "user",
        done_when: "Post URL live · comment response log",
      },
    ],
  },
  influencer_partnerships: {
    title: "Influencer + creator partnerships",
    headline:
      "Borrow audiences — micro-influencers and creators in your niche, not broad ads yet.",
    rationale: [
      "Consumer awareness without ad budget needs trusted voices.",
      "Prepare briefs and tracking; you close deals and ship codes.",
      "Landing must convert influencer traffic.",
    ],
    lane_a: [
      "Influencer list + outreach templates + UTM plan",
      "Landing proof block for creator traffic",
    ],
    lane_b: [
      "DM 15 micro-influencers with personalized pitch",
      "Track trial signups per UTM",
    ],
    deprioritize: ["Enterprise outbound", "Long SEO-only bets this week"],
    week1: (_s, hero) => [
      {
        what: hero ? `Add social proof + offer clarity on @${hero}` : "Sharpen offer on landing",
        why: "Influencer traffic is impatient — clarity converts.",
        owner: "system",
        done_when: "Landing patch applied",
      },
      {
        what: "Research 25 niche creators; draft 3 outreach templates",
        why: "Partnerships are a numbers game with relevance.",
        owner: "system",
        done_when: "List + templates in marketing/",
      },
      {
        what: "Send 15 personalized DMs; track responses",
        why: "Deals close in DMs, not in strategy docs.",
        owner: "user",
        done_when: "15 sent · 3+ replies logged",
      },
    ],
  },
};

function signalRecord(
  input: CmoIntakeInput,
  signals: IntakeSignals,
  bottleneck: GtmBottleneck,
): Record<string, string> {
  const { project, persona } = input;
  return {
    persona,
    framework: project.framework ?? "unknown",
    routes: String(project.routes.length),
    hero: signals.heroPath ?? "none",
    bottleneck,
    bottleneck_label: BOTTLENECK_LABELS[bottleneck],
    company_stage: signals.companyStage || "unknown",
    has_analytics: signals.hasAnalytics ? "yes" : "no",
    product_class: signals.isDevTool
      ? "devtools"
      : signals.isConsumer
        ? "consumer"
        : signals.isB2bSaas
          ? "b2b_saas"
          : "general",
    controversial_hook: signals.controversialOrViral ? "detected" : "no",
    days_until_launch:
      signals.daysUntilLaunch != null ? String(signals.daysUntilLaunch) : "unset",
    email_list: signals.emailListSize != null ? String(signals.emailListSize) : "unset",
  };
}

function weekPriorityId(
  thesisId: ChannelThesisId,
  weekIndex: number,
  index: number,
): string {
  return `${thesisId}.w${weekIndex}.${index}`;
}

function appendCycleRationale(
  base: string[],
  context?: CmoIntakeContext,
  weekIndex = 1,
): string[] {
  if (!context || weekIndex <= 1) return base;
  const extra: string[] = [
    `Week ${weekIndex} replan — refreshed from scan signals and prior-cycle KPI truth.`,
  ];
  if (context.mode === "double_down") {
    extra.push(
      `Week ${weekIndex}: same channel — tighten execution before switching thesis.`,
    );
  } else if (context.previous_thesis_id && context.force_thesis_id) {
    extra.push(
      `Week ${weekIndex}: pivot from ${context.previous_thesis_id.replace(/_/g, " ")} after flat Week ${weekIndex - 1} metrics.`,
    );
  }
  if (
    context.prior_primary_kpi_value != null &&
    context.prior_primary_kpi_target != null &&
    context.prior_primary_kpi_target > 0
  ) {
    const pct = Math.round(
      (context.prior_primary_kpi_value / context.prior_primary_kpi_target) * 100,
    );
    extra.push(
      `Prior cycle KPI: ${context.prior_primary_kpi_value} (${pct}% of target) — ${context.pivot_verdict ?? "review"} signal.`,
    );
  }
  const winner = context.memory_snapshot?.winners[0];
  if (winner) {
    extra.push(
      `Growth memory: double down on ${winner.label}${winner.metric ? ` (${winner.metric})` : ""}.`,
    );
  }
  if (context.memory_snapshot?.losers.length) {
    extra.push(
      `Retire prior losers: ${context.memory_snapshot.losers.map((item) => item.label).join(", ")}.`,
    );
  }
  return [...extra, ...base];
}

/** Build channel thesis from scan + profile — P0 intake engine. */
export function buildCmoIntake(input: CmoIntakeInput): ChannelThesis {
  const signals = detectSignals(input);
  const { verdict, reason } = computeVerdict(input.project, signals);
  const primary_bottleneck = inferBottleneck(signals, input.persona);
  const weekIndex = Math.max(1, input.context?.cycle_index ?? 1);
  const id =
    input.context?.force_thesis_id ?? pickThesisId(input, signals, primary_bottleneck);
  const template = THESIS_TEMPLATES[id];
  const playbooks = BOTTLENECK_PLAYBOOKS[primary_bottleneck] ?? ["landing-conversion"];

  const thesis: ChannelThesis = {
    id,
    title: template.title,
    headline: template.headline,
    verdict,
    verdict_reason: reason,
    primary_bottleneck,
    rationale: appendCycleRationale(template.rationale, input.context, weekIndex),
    week1_priorities: capWeek1Priorities(
      template.week1(signals, signals.heroPath).map((p, i) => ({
        ...p,
        id: weekPriorityId(id, weekIndex, i),
      })),
    ),
    primary_playbook_ids: playbooks.slice(0, 3),
    lane_a: template.lane_a,
    lane_b: template.lane_b,
    deprioritize: template.deprioritize,
    signals: signalRecord(input, signals, primary_bottleneck),
    generated_at: new Date().toISOString(),
    draft: input.draft,
  };
  const graph =
    input.profile?.product_understanding ??
    buildProductUnderstanding({ project: input.project, profile: input.profile });
  return attachIntakeUnderstanding(thesis, input, graph);
}

export function buildFinalChannelThesis(
  input: CmoIntakeInput & {
    selected_option: StrategicOption;
    narrative: GrowthNarrative;
    primary_mechanism_id?: GrowthMechanismId;
    secondary_mechanism_id?: GrowthMechanismId;
  },
): ChannelThesis {
  const thesis = buildCmoIntake({
    ...input,
    draft: false,
    context: {
      ...input.context,
      force_thesis_id: input.selected_option.thesis_id,
    },
  });
  const mechanismId =
    input.primary_mechanism_id ?? input.selected_option.primary_mechanism_id;
  let merged = thesis;
  if (mechanismId) {
    merged = applyMechanismToChannelThesis(
      thesis,
      mechanismId,
      input.secondary_mechanism_id,
      input.context?.cycle_index ?? 1,
    );
  }
  const proofWhy = input.narrative.proof_angle;
  return {
    ...merged,
    headline: input.narrative.one_liner,
    rationale: [input.narrative.cultural_tension, ...merged.rationale].slice(0, 4),
    week1_priorities: merged.week1_priorities.map((priority, index) => ({
      ...priority,
      why: index === 0 ? `${priority.why} ${proofWhy}` : priority.why,
    })),
    strategic_option_id: input.selected_option.id,
    narrative_one_liner: input.narrative.one_liner,
    draft: false,
  };
}

/** Cluely-calibration readme for tests. */
export function cluelyLikeReadme(): string {
  return "Cluely — undetectable AI overlay. Cheat on everything. Viral consumer AI assistant for meetings and interviews.";
}

/** Human label for a channel thesis id (UI). */
export function channelThesisTitle(id: ChannelThesisId): string {
  return THESIS_TEMPLATES[id]?.title ?? id.replace(/_/g, " ");
}
