/**
 * P18 — Thesis Quality Engine (Part 7).
 * Deterministic joint mechanism×thesis scoring with evidence-bound rationale.
 */
import { BOTTLENECK_LABELS, type GtmBottleneck } from "./bottleneck";
import { scoreThesisEligibility, type FounderFitSignals } from "./cmoFounderFit";
import type { ChannelThesisId, CmoWeek1Priority } from "./cmoIntake";
import { detectProductBinding } from "./cmoLaneD";
import type { ProductActivationProfile } from "./cmoLaneD";
import { inferPricingThesis } from "./cmoRevenuePlane";
import {
  assessGrowthMechanisms,
  buildEngineScanSignals,
  buildMechanismWeek1Tasks,
  defaultPublicPresencePolicy,
  mapMechanismToThesis,
  type MechanismEvalContext,
  type PublicPresencePolicy,
} from "./cmoGrowthEngine";
import {
  GROWTH_MECHANISM_IDS,
  getMechanismRecord,
  type GrowthMechanismId,
} from "./cmoGrowthMechanismKnowledge";
import type {
  FounderFitProfile,
  MarketingProfile,
  Persona,
  ProjectProfile,
} from "./types";

export type EvidenceConfidence = "measured" | "assumption" | "missing";

export type ThesisQualityDimensionId =
  | "product_class"
  | "market_maturity"
  | "founder_fit"
  | "public_presence"
  | "distribution_assets"
  | "budget"
  | "activation_readiness"
  | "monetization_readiness"
  | "existing_demand"
  | "growth_mechanism_fit"
  | "evidence_confidence";

export type ProductClassId = "consumer" | "b2b_saas" | "devtools" | "horizontal" | "general";
export type DemandMaturity = "cold" | "warm" | "hot";

export interface ThesisQualityDimensionScore {
  score: number;
  evidence: string[];
  confidence: EvidenceConfidence;
}

export interface ThesisQualityContext {
  project: ProjectProfile;
  persona: Persona;
  profile?: MarketingProfile | null;
  founder_fit?: FounderFitProfile | null;
  presence?: PublicPresencePolicy | null;
  activation?: ProductActivationProfile | null;
  product_name: string;
  product_class: ProductClassId;
  market_maturity: {
    company_stage: string;
    demand_maturity: DemandMaturity;
    launch_imminent: boolean;
  };
  bottleneck: GtmBottleneck;
  demand_score: number;
  activation_binding_active: boolean;
  monetization_ready: boolean;
  checkout_detected: boolean;
  mechanism_ctx: MechanismEvalContext;
  founder_signals: FounderFitSignals;
  computed_at: string;
}

export interface ThesisMechanismPairRank {
  mechanism_id: GrowthMechanismId;
  thesis_id: ChannelThesisId;
  score: number;
  blockers: string[];
  evidence: string[];
}

export interface ThesisQualityReport {
  primary_mechanism_id: GrowthMechanismId;
  primary_thesis_id: ChannelThesisId;
  secondary_support: {
    mechanism_id?: GrowthMechanismId;
    thesis_id: ChannelThesisId;
    role: string;
  };
  why_now: string[];
  why_not_others: Array<{
    thesis_id: ChannelThesisId;
    reason: string;
    evidence: string[];
  }>;
  success_signal: string;
  kill_pivot_condition: string;
  week1_execution: Omit<CmoWeek1Priority, "id">[];
  dimension_scores: Record<ThesisQualityDimensionId, ThesisQualityDimensionScore>;
  composite_confidence: EvidenceConfidence;
  ranked_pairs: ThesisMechanismPairRank[];
  computed_at: string;
}

export interface ThesisQualityInput {
  project: ProjectProfile;
  persona?: Persona;
  profile?: MarketingProfile | null;
  founder_fit?: FounderFitProfile | null;
  presence?: PublicPresencePolicy | null;
  activation?: ProductActivationProfile | null;
  now?: string;
}

export const ALL_CHANNEL_THESIS_IDS: ChannelThesisId[] = [
  "viral_short_form",
  "founder_social",
  "product_hunt_launch",
  "landing_conversion",
  "seo_content",
  "outbound_sales",
  "community_launch",
  "influencer_partnerships",
];

/** Reject vague rationale copy in eval + UI lint. */
export const GENERIC_THESIS_RATIONALE_RE =
  /^(post on social|improve seo|optimize landing page|grow your audience|increase brand awareness|focus on content marketing|generic launch plan)$/i;

const THESIS_LABEL: Record<ChannelThesisId, string> = {
  viral_short_form: "Short-form viral distribution",
  founder_social: "Founder-led social proof",
  product_hunt_launch: "Product Hunt launch window",
  landing_conversion: "Landing page conversion",
  seo_content: "SEO content demand capture",
  outbound_sales: "Outbound sales pipeline",
  community_launch: "Community-led distribution",
  influencer_partnerships: "Creator / influencer partnerships",
};

function mapProductClassForRevenue(
  pc: ProductClassId,
): "b2b_saas" | "consumer" | "devtool" | "other" {
  if (pc === "b2b_saas") return "b2b_saas";
  if (pc === "consumer") return "consumer";
  if (pc === "devtools") return "devtool";
  return "other";
}

function inferProductClass(
  scan: ReturnType<typeof buildEngineScanSignals>,
  _profile?: MarketingProfile | null,
): ProductClassId {
  if (scan.is_devtool) return "devtools";
  if (scan.is_consumer && !scan.is_b2b_saas) return "consumer";
  if (scan.is_b2b_saas) return "b2b_saas";
  if (scan.is_horizontal) return "horizontal";
  return "general";
}

function inferDemandMaturity(
  profile?: MarketingProfile | null,
  scan?: ReturnType<typeof buildEngineScanSignals>,
): DemandMaturity {
  const users = profile?.current_users ?? 0;
  const email = profile?.email_list_size ?? 0;
  const hasBlog = scan?.has_blog ?? false;
  const stage = profile?.company_stage ?? "";
  if (users >= 500 || email >= 5000 || /scaling|growing/.test(stage)) return "hot";
  if (users >= 50 || email >= 500 || hasBlog) return "warm";
  return "cold";
}

function inferBottleneckFromContext(
  ctx: ThesisQualityContext,
): GtmBottleneck {
  const { profile, persona, activation_binding_active, checkout_detected } = ctx;
  if (activation_binding_active) return "conversion";
  if (persona === "sales" && profile?.sales_pipeline_empty !== false) return "revenue";
  if (!checkout_detected && profile?.founder_fit?.thirty_day_win === "paying_customers") {
    return "revenue";
  }
  const users = profile?.current_users ?? 0;
  const email = profile?.email_list_size ?? 0;
  if (users < 20 && email < 200 && ctx.market_maturity.demand_maturity === "cold") {
    return "awareness";
  }
  if (ctx.mechanism_ctx.scanSignals.launch_imminent) return "distribution";
  if (profile?.tracking_flags?.analytics_detected || ctx.project.hasAnalytics) {
    if (users > 100) return "conversion";
    return "measurement";
  }
  return "awareness";
}

function computeDemandScore(profile?: MarketingProfile | null): number {
  let score = 0;
  const users = profile?.current_users ?? 0;
  const email = profile?.email_list_size ?? 0;
  if (users >= 1000) score += 35;
  else if (users >= 100) score += 22;
  else if (users >= 10) score += 10;
  if (email >= 5000) score += 30;
  else if (email >= 500) score += 18;
  else if (email >= 50) score += 8;
  const kpiCount = profile?.manual_kpis?.length ?? 0;
  if (kpiCount >= 2) score += 12;
  if (profile?.sales_pipeline_empty === false) score += 15;
  return Math.min(100, score);
}

function hasCheckoutRoute(project: ProjectProfile): boolean {
  return (project.routes ?? []).some((r) => /checkout|subscribe|billing/i.test(r));
}

function hasPricingRoute(project: ProjectProfile): boolean {
  return (project.routes ?? []).some((r) => /pricing/i.test(r));
}

function buildDimensionScores(ctx: ThesisQualityContext): ThesisQualityReport["dimension_scores"] {
  const { project, profile, founder_fit, presence, activation, mechanism_ctx } = ctx;
  const assessment = assessGrowthMechanisms(mechanism_ctx);
  const pricing = inferPricingThesis({
    scan: {
      routes: project.routes,
      hasPricing: hasPricingRoute(project),
      hasSignup: (project.routes ?? []).some((r) => /signup|register|trial/i.test(r)),
      hasCheckout: hasCheckoutRoute(project),
    },
    founderFit: founder_fit ?? undefined,
    salesPipelineEmpty: profile?.sales_pipeline_empty,
    persona: ctx.persona,
    productClass: mapProductClassForRevenue(ctx.product_class),
  });

  const founderEvidence: string[] = [];
  if (founder_fit?.brand_face_readiness) {
    founderEvidence.push(`Founder face readiness: ${founder_fit.brand_face_readiness}`);
  }
  if (founder_fit?.weekly_marketing_hours) {
    founderEvidence.push(`Weekly marketing hours: ${founder_fit.weekly_marketing_hours}`);
  }

  const presenceEvidence: string[] = [];
  if (presence?.founder.allowed) presenceEvidence.push("Founder public presence allowed");
  if (presence?.creators.allowed) presenceEvidence.push("Creator partnerships allowed");

  const assetEvidence: string[] = [...(profile?.available_assets ?? []).slice(0, 2)];
  if (mechanism_ctx.scanSignals.has_blog) assetEvidence.push("Scan: blog route detected");
  if (mechanism_ctx.scanSignals.has_api_surface) assetEvidence.push("Scan: API surface detected");

  return {
    product_class: {
      score: 80,
      evidence: [`Product class: ${ctx.product_class}`, `Scan: ${project.name}`],
      confidence: "measured",
    },
    market_maturity: {
      score: ctx.market_maturity.demand_maturity === "hot" ? 85 : ctx.market_maturity.demand_maturity === "warm" ? 60 : 35,
      evidence: [
        `Company stage: ${ctx.market_maturity.company_stage || "unknown"}`,
        `Demand maturity: ${ctx.market_maturity.demand_maturity}`,
      ],
      confidence: profile?.company_stage ? "measured" : "assumption",
    },
    founder_fit: {
      score: founder_fit ? 75 : 30,
      evidence: founderEvidence.length ? founderEvidence : ["Founder fit not completed — assumption mode"],
      confidence: founder_fit ? "measured" : "missing",
    },
    public_presence: {
      score: presence?.configured_at ? 70 : 40,
      evidence: presenceEvidence.length ? presenceEvidence : ["Default presence policy assumed"],
      confidence: presence?.configured_at ? "measured" : "assumption",
    },
    distribution_assets: {
      score: Math.min(100, assetEvidence.length * 25 + 20),
      evidence: assetEvidence.length ? assetEvidence : ["No distribution assets recorded yet"],
      confidence: assetEvidence.length ? "assumption" : "missing",
    },
    budget: {
      score:
        founder_fit?.monthly_budget_band === "over_2000"
          ? 80
          : founder_fit?.monthly_budget_band === "500_2000"
            ? 65
            : founder_fit?.monthly_budget_band === "under_500"
              ? 40
              : 25,
      evidence: founder_fit?.monthly_budget_band
        ? [`Budget band: ${founder_fit.monthly_budget_band}`]
        : ["Budget band unknown"],
      confidence: founder_fit?.monthly_budget_band ? "measured" : "missing",
    },
    activation_readiness: {
      score: ctx.activation_binding_active ? 20 : 75,
      evidence: ctx.activation_binding_active
        ? ["Activation binding active — scale blocked"]
        : activation?.activation_rate_pct != null
          ? [`Activation rate: ${activation.activation_rate_pct}%`]
          : ["No activation metrics — assumed ready"],
      confidence: activation?.confidence ?? (ctx.activation_binding_active ? "measured" : "assumption"),
    },
    monetization_readiness: {
      score: ctx.monetization_ready ? 80 : ctx.checkout_detected ? 60 : 25,
      evidence: pricing.evidence.length ? pricing.evidence : ["Monetization inferred from scan"],
      confidence: pricing.confidence,
    },
    existing_demand: {
      score: ctx.demand_score,
      evidence: [
        profile?.current_users != null ? `Users: ${profile.current_users}` : "Users: unknown",
        profile?.email_list_size != null ? `Email list: ${profile.email_list_size}` : "Email list: unknown",
      ],
      confidence:
        profile?.current_users != null || profile?.email_list_size != null ? "measured" : "assumption",
    },
    growth_mechanism_fit: {
      score: assessment.ranked[0]?.score ?? 0,
      evidence: assessment.ranked[0]?.evidence.slice(0, 3) ?? [],
      confidence: assessment.ranked[0]?.confidence ?? "missing",
    },
    evidence_confidence: {
      score: 0,
      evidence: [],
      confidence: "assumption",
    },
  };
}

function pairAlignmentBonus(
  thesisId: ChannelThesisId,
  ctx: ThesisQualityContext,
): { bonus: number; evidence: string[] } {
  const { product_class, mechanism_ctx, profile, persona } = ctx;
  const scan = mechanism_ctx.scanSignals;
  const evidence: string[] = [];
  let bonus = 0;

  if (product_class === "consumer" && scan.controversial_or_viral) {
    if (thesisId === "viral_short_form") {
      bonus += 35;
      evidence.push(`${ctx.product_name}: controversial/viral product signals favor short-form`);
    }
    if (thesisId === "seo_content") {
      bonus -= 40;
      evidence.push(`${ctx.product_name}: pre-launch viral consumer — SEO is not the primary lever`);
    }
    if (thesisId === "product_hunt_launch") {
      bonus -= 15;
      evidence.push(`${ctx.product_name}: viral consumer — short-form before launch-day spike`);
    }
  }

  if (
    product_class === "consumer" &&
    /prelaunch|idea/.test(profile?.company_stage ?? "") &&
    !scan.launch_imminent
  ) {
    if (thesisId === "viral_short_form") {
      bonus += 28;
      evidence.push(`${ctx.product_name}: consumer pre-launch — build demand before scale`);
    }
    if (/beauty|cosmetic|fashion|creator|short-form|short form/i.test(ctx.mechanism_ctx.project.readmeSummary ?? "")) {
      if (thesisId === "influencer_partnerships") bonus += 20;
      if (thesisId === "viral_short_form") bonus += 12;
    }
  }

  if (persona === "sales" && profile?.sales_pipeline_empty !== false && thesisId === "outbound_sales") {
    bonus += 70;
    evidence.push(`${ctx.product_name}: empty sales pipeline → outbound is the revenue path`);
  }

  if (
    ctx.persona === "sales" &&
    profile?.sales_pipeline_empty !== false &&
    ctx.founder_fit?.thirty_day_win === "paying_customers" &&
    thesisId === "outbound_sales"
  ) {
    bonus += 25;
    evidence.push(`${ctx.product_name}: paying-customer goal with empty pipeline → outbound first`);
  }

  if (ctx.founder_fit?.brand_face_readiness === "never") {
    if (thesisId === "viral_short_form") bonus -= 22;
    if (thesisId === "influencer_partnerships") bonus += 45;
    if (/beauty|cosmetic|fashion|retail/i.test(ctx.mechanism_ctx.project.readmeSummary ?? "")) {
      if (thesisId === "influencer_partnerships") bonus += 15;
    }
  }

  if (
    product_class === "consumer" &&
    !scan.launch_imminent &&
    profile?.days_until_launch == null &&
    thesisId === "product_hunt_launch"
  ) {
    bonus -= 50;
    evidence.push(`${ctx.product_name}: no launch date — PH is not the immediate lever`);
  }

  if (
    product_class === "consumer" &&
    /prelaunch|idea/.test(profile?.company_stage ?? "") &&
    profile?.days_until_launch == null &&
    thesisId === "viral_short_form"
  ) {
    bonus += 18;
    evidence.push(`${ctx.product_name}: consumer pre-launch without PH date — build audience first`);
  }

  if (
    (ctx.project.hasAnalytics || profile?.tracking_flags?.analytics_detected) &&
    product_class === "b2b_saas" &&
    (profile?.current_users ?? 0) >= 100 &&
    thesisId === "landing_conversion"
  ) {
    bonus += 38;
    evidence.push(`${ctx.product_name}: traffic exists with analytics — optimize conversion path`);
  }

  if (scan.has_blog && /growing|scaling|launched/.test(profile?.company_stage ?? "") && thesisId === "seo_content") {
    bonus += 28;
    evidence.push(`${ctx.product_name}: blog + growing stage → capture existing search demand`);
  }

  if (scan.launch_imminent && thesisId === "product_hunt_launch") {
    bonus += 32;
    evidence.push(`${ctx.product_name}: launch within 21 days → PH window is live`);
  } else if (
    profile?.days_until_launch != null &&
    profile.days_until_launch <= 21 &&
    thesisId === "product_hunt_launch" &&
    !(product_class === "consumer" && scan.controversial_or_viral)
  ) {
    bonus += 24;
    evidence.push(`${ctx.product_name}: launch window active → coordinated PH reach`);
  }

  if (product_class === "devtools" && scan.is_devtool && thesisId === "community_launch") {
    bonus += 22;
    evidence.push(`${ctx.product_name}: devtool → community/OSS distribution adjacency`);
  }

  if (product_class === "b2b_saas" && ctx.bottleneck === "awareness" && thesisId === "founder_social") {
    bonus += 18;
    evidence.push(`${ctx.product_name}: B2B awareness gap → founder credibility channel`);
  }

  if (ctx.activation_binding_active && (thesisId === "landing_conversion" || thesisId === "viral_short_form")) {
    bonus -= 50;
    evidence.push(`${ctx.product_name}: activation binding — do not scale acquisition yet`);
  }

  if (!ctx.checkout_detected && ctx.founder_fit?.thirty_day_win === "paying_customers") {
    if (thesisId === "landing_conversion") bonus -= 25;
    if (thesisId === "outbound_sales") bonus += 15;
  }

  if (ctx.demand_score < 15 && thesisId === "seo_content" && ctx.market_maturity.demand_maturity === "cold") {
    bonus -= 20;
    evidence.push(`${ctx.product_name}: cold demand — SEO alone won't create awareness fast enough`);
  }

  return { bonus, evidence };
}

function scorePair(
  mechanismId: GrowthMechanismId,
  thesisId: ChannelThesisId,
  ctx: ThesisQualityContext,
): ThesisMechanismPairRank {
  const assessment = assessGrowthMechanisms(ctx.mechanism_ctx);
  const mechRow = assessment.ranked.find((r) => r.engine_id === mechanismId);
  const mechScore = mechRow?.score ?? 0;
  const mechEvidence = mechRow?.evidence ?? [];
  const mechBlockers = mechRow?.blockers ?? [];

  let thesisScore = 50;
  let thesisBlockers: string[] = [];
  if (ctx.founder_fit) {
    const elig = scoreThesisEligibility(thesisId, ctx.founder_fit, ctx.founder_signals);
    thesisScore = elig.score;
    thesisBlockers = elig.blockers;
  }

  const record = getMechanismRecord(mechanismId);
  const thesisInCandidates = record.thesis_candidates.includes(thesisId);
  if (!thesisInCandidates) {
    thesisBlockers = [...thesisBlockers, `${record.label} does not map to ${THESIS_LABEL[thesisId]}.`];
  }

  const { bonus, evidence: alignEvidence } = pairAlignmentBonus(thesisId, ctx);
  let score = Math.round(mechScore * 0.55 + thesisScore * 0.35 + bonus);
  score = Math.max(0, Math.min(100, score));

  const blockers = [...mechBlockers, ...thesisBlockers];
  if (ctx.activation_binding_active && (thesisId === "viral_short_form" || thesisId === "landing_conversion")) {
    blockers.push("Activation binding — acquisition scale blocked until product path is fixed.");
    score = 0;
  }
  if (ctx.founder_fit?.scale_readiness === "not_yet" && thesisId === "viral_short_form") {
    blockers.push("Product cannot absorb a traffic spike yet.");
    score = 0;
  }

  const evidence = [
    ...mechEvidence.slice(0, 2),
    ...alignEvidence,
    `Mechanism fit score: ${mechScore}`,
    `Thesis eligibility score: ${thesisScore}`,
  ].filter(Boolean);

  return {
    mechanism_id: mechanismId,
    thesis_id: thesisId,
    score: blockers.length > 0 && score === 0 ? 0 : score,
    blockers: [...new Set(blockers)],
    evidence,
  };
}

function rankAllPairs(ctx: ThesisQualityContext): ThesisMechanismPairRank[] {
  const pairs: ThesisMechanismPairRank[] = [];
  for (const mechanismId of GROWTH_MECHANISM_IDS) {
    const record = getMechanismRecord(mechanismId);
    const theses = record.thesis_candidates.length ? record.thesis_candidates : ALL_CHANNEL_THESIS_IDS;
    for (const thesisId of theses) {
      pairs.push(scorePair(mechanismId, thesisId, ctx));
    }
  }
  return pairs
    .filter((p) => p.blockers.length === 0 || p.score > 0)
    .sort((a, b) => b.score - a.score || a.thesis_id.localeCompare(b.thesis_id));
}

function pickSecondarySupport(
  primary: ThesisMechanismPairRank,
  ranked: ThesisMechanismPairRank[],
  ctx: ThesisQualityContext,
): ThesisQualityReport["secondary_support"] {
  const candidate = ranked.find(
    (p) =>
      p.thesis_id !== primary.thesis_id &&
      p.score >= primary.score - 25 &&
      p.blockers.length === 0,
  );
  if (candidate) {
    return {
      mechanism_id: candidate.mechanism_id,
      thesis_id: candidate.thesis_id,
      role:
        candidate.thesis_id === "landing_conversion"
          ? "Conversion support once primary demand exists"
          : "Supporting lane after primary motion proves signal",
    };
  }
  if (ctx.checkout_detected && primary.thesis_id !== "landing_conversion") {
    return {
      thesis_id: "landing_conversion",
      role: "Optimize signup path once top-of-funnel motion runs",
    };
  }
  return {
    thesis_id: "landing_conversion",
    role: "Instrument conversion once awareness motion produces traffic",
  };
}

function buildWhyNow(
  primary: ThesisMechanismPairRank,
  ctx: ThesisQualityContext,
): string[] {
  const name = ctx.product_name;
  const bn = BOTTLENECK_LABELS[ctx.bottleneck];
  const lines = [
    `${name}'s binding constraint is ${bn} — ${THESIS_LABEL[primary.thesis_id]} addresses it directly.`,
    ...primary.evidence.slice(0, 2).map((e) => `${name}: ${e}`),
  ];
  if (ctx.founder_fit?.thirty_day_win) {
    lines.push(
      `${name}: founder 30-day win is ${ctx.founder_fit.thirty_day_win.replace(/_/g, " ")} — this channel maps to that outcome.`,
    );
  }
  return lines.slice(0, 4);
}

function buildWhyNotOthers(
  primary: ThesisMechanismPairRank,
  ranked: ThesisMechanismPairRank[],
  ctx: ThesisQualityContext,
): ThesisQualityReport["why_not_others"] {
  const taken = new Set<ChannelThesisId>([primary.thesis_id]);
  const rejected: ThesisQualityReport["why_not_others"] = [];
  for (const thesisId of ALL_CHANNEL_THESIS_IDS) {
    if (taken.has(thesisId)) continue;
    const best = ranked
      .filter((p) => p.thesis_id === thesisId)
      .sort((a, b) => b.score - a.score)[0];
    const blockers = best?.blockers ?? [];
    const evidence = best?.evidence.slice(0, 2) ?? [];
    let reason = `${THESIS_LABEL[thesisId]} scored lower for ${ctx.product_name}.`;
    if (blockers.length) reason = blockers[0]!;
    else if (best && primary.score - best.score > 15) {
      reason = `Primary channel outscores ${THESIS_LABEL[thesisId]} by ${primary.score - best.score} points on mechanism + founder fit.`;
    }
    rejected.push({ thesis_id: thesisId, reason, evidence });
  }
  return rejected.slice(0, 6);
}

function buildSuccessSignal(primary: ThesisMechanismPairRank, ctx: ThesisQualityContext): string {
  const win = ctx.founder_fit?.thirty_day_win ?? "qualified_signups";
  const labels: Record<string, string> = {
    qualified_signups: "3+ qualified signups with documented source",
    paying_customers: "1+ paying customer with attributed channel",
    waitlist: "50+ waitlist adds from primary channel",
    pipeline_meetings: "3+ qualified pipeline meetings booked",
    brand_awareness: "Measurable reach spike on primary channel",
  };
  return `Week 1 success for ${ctx.product_name}: ${labels[win] ?? labels.qualified_signups} via ${THESIS_LABEL[primary.thesis_id]}.`;
}

function buildKillPivot(primary: ThesisMechanismPairRank, ctx: ThesisQualityContext): string {
  return `If ${ctx.product_name} shows no movement on ${THESIS_LABEL[primary.thesis_id]} within 7 days, pivot to ${BOTTLENECK_LABELS[ctx.bottleneck]} diagnostic — check activation (${ctx.activation_binding_active ? "currently blocked" : "monitor"}) and re-run thesis quality.`;
}

function compositeConfidence(
  dimensions: ThesisQualityReport["dimension_scores"],
): EvidenceConfidence {
  const confidences = Object.values(dimensions)
    .filter((d) => d.score > 0 || d.evidence.length > 0)
    .map((d) => d.confidence);
  if (confidences.every((c) => c === "measured")) return "measured";
  if (confidences.some((c) => c === "missing")) return "missing";
  return "assumption";
}

export function buildThesisQualityContext(input: ThesisQualityInput): ThesisQualityContext {
  const persona = input.persona ?? "marketing";
  const profile = input.profile ?? null;
  const founder_fit = input.founder_fit ?? profile?.founder_fit ?? null;
  const presence =
    input.presence ??
    (profile?.public_presence_policy as PublicPresencePolicy | undefined) ??
    (founder_fit ? defaultPublicPresencePolicy(founder_fit) : null);
  const activation = input.activation ?? profile?.product_activation ?? null;
  const scanSignals = buildEngineScanSignals(input.project, profile);
  const founder_signals: FounderFitSignals = {
    is_consumer: scanSignals.is_consumer,
    is_b2b: scanSignals.is_b2b_saas,
    is_devtool: scanSignals.is_devtool,
    launch_imminent: scanSignals.launch_imminent,
    baseline_thesis_id: profile?.channel_thesis?.id,
  };
  const mechanism_ctx: MechanismEvalContext = {
    project: input.project,
    profile,
    founderFit: founder_fit,
    presence,
    persona,
    scanSignals,
    founderFitSignals: founder_signals,
  };
  const product_class = inferProductClass(scanSignals, profile);
  const demand_maturity = inferDemandMaturity(profile, scanSignals);
  const checkout_detected = hasCheckoutRoute(input.project);
  const activation_binding = detectProductBinding({
    founderFit: founder_fit ?? undefined,
    activation: activation ?? undefined,
    gaps: scanSignals.gaps,
  });
  const pricing = inferPricingThesis({
    scan: {
      routes: input.project.routes,
      hasPricing: hasPricingRoute(input.project),
      hasCheckout: checkout_detected,
    },
    founderFit: founder_fit ?? undefined,
    persona,
    productClass: mapProductClassForRevenue(product_class),
  });

  const partial: ThesisQualityContext = {
    project: input.project,
    persona,
    profile,
    founder_fit,
    presence,
    activation: activation ?? undefined,
    product_name: profile?.product_name ?? input.project.name ?? "This product",
    product_class,
    market_maturity: {
      company_stage: profile?.company_stage ?? scanSignals.company_stage,
      demand_maturity,
      launch_imminent: scanSignals.launch_imminent,
    },
    bottleneck: "awareness",
    demand_score: computeDemandScore(profile),
    activation_binding_active: activation_binding.active,
    monetization_ready: pricing.model !== "not_yet" && checkout_detected,
    checkout_detected,
    mechanism_ctx,
    founder_signals,
    computed_at: input.now ?? new Date().toISOString(),
  };
  partial.bottleneck = inferBottleneckFromContext(partial);
  return partial;
}

export function evaluateThesisQuality(input: ThesisQualityInput): ThesisQualityReport {
  const ctx = buildThesisQualityContext(input);
  let ranked = rankAllPairs(ctx);

  if (
    ctx.persona === "sales" &&
    ctx.profile?.sales_pipeline_empty !== false
  ) {
    const outboundIdx = ranked.findIndex((p) => p.thesis_id === "outbound_sales");
    if (outboundIdx < 0) {
      ranked.unshift({
        mechanism_id: "category_education",
        thesis_id: "outbound_sales",
        score: 95,
        blockers: [],
        evidence: [`${ctx.product_name}: sales persona — outbound pipeline is the binding constraint`],
      });
    } else {
      const outbound = {
        ...ranked[outboundIdx]!,
        blockers: [],
        score: (ranked[0]?.score ?? 0) + 15,
      };
      ranked = [outbound, ...ranked.filter((_, i) => i !== outboundIdx)];
    }
  }

  if (ranked.length === 0 || ranked.every((p) => p.blockers.length > 0)) {
    const fallbackThesis = mapMechanismToThesis("intent_to_product", ctx.mechanism_ctx);
    ranked = [
      {
        mechanism_id: "intent_to_product",
        thesis_id: fallbackThesis,
        score: 40,
        blockers: [],
        evidence: [`${ctx.product_name}: fallback intent-to-product path`],
      },
    ];
  }

  const primary = ranked[0]!;
  const secondary_support = pickSecondarySupport(primary, ranked, ctx);
  const dimension_scores = buildDimensionScores(ctx);
  dimension_scores.evidence_confidence = {
    score: compositeConfidence(dimension_scores) === "measured" ? 90 : 50,
    evidence: [`Composite: ${compositeConfidence(dimension_scores)}`],
    confidence: compositeConfidence(dimension_scores),
  };

  const week1Templates = buildMechanismWeek1Tasks(
    primary.mechanism_id,
    1,
    secondary_support.mechanism_id,
  );

  return {
    primary_mechanism_id: primary.mechanism_id,
    primary_thesis_id: primary.thesis_id,
    secondary_support,
    why_now: buildWhyNow(primary, ctx),
    why_not_others: buildWhyNotOthers(primary, ranked, ctx),
    success_signal: buildSuccessSignal(primary, ctx),
    kill_pivot_condition: buildKillPivot(primary, ctx),
    week1_execution: week1Templates,
    dimension_scores,
    composite_confidence: compositeConfidence(dimension_scores),
    ranked_pairs: ranked.slice(0, 20),
    computed_at: ctx.computed_at,
  };
}

/** Eval helper — returns lint errors when evidence or product-specificity fails. */
export function assertThesisQualityEvidence(report: ThesisQualityReport): string[] {
  const errors: string[] = [];
  if (report.why_now.length === 0) errors.push("why_now is empty");
  for (const line of report.why_now) {
    if (GENERIC_THESIS_RATIONALE_RE.test(line.trim())) {
      errors.push(`Generic why_now line: ${line}`);
    }
  }
  const allEvidence = [
    ...report.why_now,
    ...report.ranked_pairs[0]?.evidence ?? [],
    ...Object.values(report.dimension_scores).flatMap((d) => d.evidence),
  ];
  if (allEvidence.filter(Boolean).length < 1) {
    errors.push("No evidence strings in report");
  }
  if (report.ranked_pairs[0]?.evidence.length === 0) {
    errors.push("Primary pair has no evidence");
  }
  return errors;
}

export function pickSafePairFromReport(report: ThesisQualityReport): ThesisMechanismPairRank {
  const safe = [...report.ranked_pairs]
    .filter((p) => p.blockers.length === 0)
    .sort((a, b) => {
      const safeMech = pickSafeScore(a.mechanism_id) - pickSafeScore(b.mechanism_id);
      if (safeMech !== 0) return safeMech;
      return b.score - a.score;
    });
  return safe[0] ?? report.ranked_pairs[0]!;
}

export function pickAttackPairFromReport(report: ThesisQualityReport): ThesisMechanismPairRank {
  const attack = [...report.ranked_pairs]
    .filter((p) => p.blockers.length === 0 && p.mechanism_id !== report.primary_mechanism_id)
    .sort((a, b) => b.score - a.score);
  return attack[0] ?? report.ranked_pairs[1] ?? report.ranked_pairs[0]!;
}

function pickSafeScore(id: GrowthMechanismId): number {
  const record = getMechanismRecord(id);
  if (record.capital_intensity === "low" && record.founder_dependency !== "high") return 10;
  if (id === "intent_to_product" || id === "category_education") return 8;
  return 0;
}

export function thesisQualityReportFromJson(raw: unknown): ThesisQualityReport | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as ThesisQualityReport;
  if (!o.primary_mechanism_id || !o.primary_thesis_id) return null;
  return o;
}
