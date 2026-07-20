/**
 * P7 — Growth Control Plane: equation, binding bottleneck, red list, command surface.
 * See CMO_GROWTH_PLANE_SPEC.md and PRODUCT_NORTH_STAR.md §11 P7.
 */
import type { GtmBottleneck } from "./bottleneck";
import { BOTTLENECK_LABELS } from "./bottleneck";
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import { assessMeasurementBaseline } from "./measurementBaseline";
import { getNowTask } from "./cmoOpsCadence";
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import {
  getNextDistributionSlot,
  isDistributionOperatorGate,
  slotDisplayLabel,
} from "./cmoDistributionOperator";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import {
  getNextInfluencerTouch,
  isInfluencerOperatorGate,
  touchDisplayLabel,
} from "./cmoInfluencerOperator";
import type { DelegateOperatorWorkspace } from "./cmoDelegateOperator";
import type { GrowthMemoryState } from "./cmoGrowthMemory";
import type { BudgetPlan } from "./cmoBudgetPlane";
import {
  getNextDelegateRubricDay,
  isDelegateOperatorGate,
} from "./cmoDelegateOperator";
import { resolveTodayWhy } from "./cmoCommandSurface";
import { inferIntegrateRoute } from "./assetTarget";
import { buildMechanismAntiPatternRedList } from "./cmoGrowthEngine";
import { migrateEvidenceStringsToRefs } from "./migrateEvidenceStringsToRefs";
import { getMechanismRecord, type GrowthMechanismId } from "./cmoGrowthMechanismKnowledge";
import type { MarketingProfile, Persona, ProjectProfile } from "./types";

export type GrowthStageId =
  | "attention"
  | "traffic"
  | "signup"
  | "activation"
  | "conversion"
  | "retention"
  | "revenue"
  | "paid"
  | "monetization";

export type GrowthProductClass = "b2b_saas" | "devtools" | "consumer" | "general";

export type MetricSource = "ga4" | "manual_kpi" | "profile" | "inferred" | "unknown";
export type MetricConfidence = "high" | "low" | "missing";

export interface GrowthStageMetric {
  id: GrowthStageId;
  label: string;
  value?: number;
  unit?: string;
  benchmark?: number;
  source: MetricSource;
  confidence: MetricConfidence;
}

export interface GrowthEquation {
  product_class: GrowthProductClass;
  formula: string;
  stages: GrowthStageMetric[];
}

export interface BindingBottleneck {
  stage_id: GrowthStageId;
  gtm: GtmBottleneck;
  headline: string;
  rationale: string[];
  evidence: string[];
  /** Part 6 — structured evidence refs (optional v2). */
  evidence_refs?: import("./productUnderstandingInput").EvidenceRef[];
}

export interface RedListItem {
  id: string;
  tactic: string;
  reason: string;
  evidence: string[];
}

export interface GrowthTodayMove {
  what: string;
  /** P12 — why this move advances the binding growth lever. */
  why: string;
  done_when: string;
  owner: "system" | "user" | "delegate";
  ops_task_id?: string;
}

export interface GrowthControlPlane {
  id: string;
  computed_at: string;
  equation: GrowthEquation;
  binding: BindingBottleneck;
  red_list: RedListItem[];
  thesis_id: ChannelThesisId;
  thesis_aligned: boolean;
  alignment_note?: string;
  /** P11 — latest evidence-backed message learning. */
  memory_note?: string;
  /** P14 — factual spend note; never an ROI score. */
  budget_note?: string;
  /** P17 — primary growth mechanism (UI-safe label). */
  mechanism_label?: string;
  mechanism_rationale?: string;
  mechanism_anti_pattern?: string;
  primary_lever: string;
  today?: GrowthTodayMove;
}

export interface GrowthPlaneInput {
  project: ProjectProfile;
  profile?: MarketingProfile | null;
  persona: Persona;
  thesis?: ChannelThesis | null;
  opsCadence?: CmoOpsCadence | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
  growthMemory?: GrowthMemoryState | null;
  budgetPlan?: BudgetPlan | null;
}

interface PlaneSignals {
  heroPath?: string;
  hasBlog: boolean;
  hasAnalytics: boolean;
  isDevTool: boolean;
  isConsumer: boolean;
  isB2bSaas: boolean;
  companyStage: string;
  daysUntilLaunch?: number;
  emailListSize?: number;
  currentUsers?: number;
  salesPipelineEmpty: boolean;
  controversialOrViral: boolean;
}

function detectPlaneSignals(input: GrowthPlaneInput): PlaneSignals {
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

  return {
    heroPath: inferIntegrateRoute(routes),
    hasBlog: routes.some((r) => /\/blog\b/i.test(r)),
    hasAnalytics:
      project.hasAnalytics || profile?.tracking_flags?.analytics_detected === true,
    isDevTool,
    isConsumer,
    isB2bSaas,
    companyStage: profile?.company_stage ?? "",
    daysUntilLaunch: profile?.days_until_launch,
    emailListSize: profile?.email_list_size,
    currentUsers: profile?.current_users,
    salesPipelineEmpty: persona === "sales" && profile?.sales_pipeline_empty !== false,
    controversialOrViral: /cheat|controvers|viral|polariz|undetectable/i.test(readmeLower),
  };
}

function resolveProductClass(signals: PlaneSignals): GrowthProductClass {
  if (signals.isDevTool) return "devtools";
  if (signals.isB2bSaas) return "b2b_saas";
  if (signals.isConsumer) return "consumer";
  return "general";
}

function ga4Metric(
  profile: MarketingProfile | null | undefined,
  name: string,
): number | undefined {
  const metrics = profile?.connector_snapshots?.ga4?.metrics ?? [];
  const hit = metrics.find((m) => m.name.toLowerCase() === name.toLowerCase());
  return hit?.value;
}

function kpiValue(profile: MarketingProfile | null | undefined, id: string): number | undefined {
  return profile?.manual_kpis?.find((k) => k.id === id)?.value;
}

function stage(
  id: GrowthStageId,
  label: string,
  opts: {
    value?: number;
    unit?: string;
    benchmark?: number;
    source: MetricSource;
    confidence: MetricConfidence;
  },
): GrowthStageMetric {
  return {
    id,
    label,
    value: opts.value,
    unit: opts.unit,
    benchmark: opts.benchmark,
    source: opts.source,
    confidence: opts.confidence,
  };
}

export function buildGrowthEquation(
  input: GrowthPlaneInput,
  signals: PlaneSignals,
): GrowthEquation {
  const profile = input.profile;
  const product_class = resolveProductClass(signals);

  const sessions = ga4Metric(profile, "sessions");
  const conversions = ga4Metric(profile, "conversions");
  const visitors = kpiValue(profile, "targeted_visitors");
  const signups = kpiValue(profile, "waitlist_signups");
  const signupRate = kpiValue(profile, "signup_rate_pct");
  const shortViews = kpiValue(profile, "short_form_views");
  const outboundReplies = kpiValue(profile, "outbound_replies");

  const trafficValue = sessions ?? visitors;
  const trafficSource: MetricSource = sessions != null ? "ga4" : visitors != null ? "manual_kpi" : "unknown";
  const trafficConf: MetricConfidence =
    trafficValue != null ? "high" : signals.hasAnalytics ? "low" : "missing";

  const signupValue = signups ?? conversions;
  const signupSource: MetricSource =
    signups != null ? "manual_kpi" : conversions != null ? "ga4" : "unknown";

  const activationValue = profile?.current_users;
  const activationConf: MetricConfidence =
    activationValue != null ? "high" : "missing";
  const paidCustomers =
    profile?.revenue_profile?.funnel_stages.find((stage) => stage.id === "paid")?.count ??
    kpiValue(profile, "paid_customers");
  const paidConf: MetricConfidence = paidCustomers != null ? "high" : "missing";

  let formula: string;
  let stages: GrowthStageMetric[];

  switch (product_class) {
    case "devtools":
      formula = "attention × traffic × activation × team adoption × revenue";
      stages = [
        stage("attention", "Developer attention", {
          value: shortViews,
          unit: shortViews != null ? "views" : undefined,
          source: shortViews != null ? "manual_kpi" : "unknown",
          confidence: shortViews != null ? "high" : "missing",
        }),
        stage("traffic", "Qualified traffic", {
          value: trafficValue,
          unit: trafficValue != null ? "sessions" : undefined,
          benchmark: 500,
          source: trafficSource,
          confidence: trafficConf,
        }),
        stage("activation", "Activated users", {
          value: activationValue,
          unit: activationValue != null ? "users" : undefined,
          benchmark: 50,
          source: activationValue != null ? "profile" : "unknown",
          confidence: activationConf,
        }),
        stage("revenue", "Pipeline / paid", {
          value: outboundReplies,
          unit: outboundReplies != null ? "replies" : undefined,
          source: outboundReplies != null ? "manual_kpi" : "unknown",
          confidence: outboundReplies != null ? "high" : "missing",
        }),
      ];
      break;
    case "consumer":
      formula = "attention × traffic × signup × retention × monetization";
      stages = [
        stage("attention", "Attention / views", {
          value: shortViews,
          unit: shortViews != null ? "views" : undefined,
          source: shortViews != null ? "manual_kpi" : "unknown",
          confidence: shortViews != null ? "high" : "missing",
        }),
        stage("traffic", "Landing traffic", {
          value: trafficValue,
          unit: "sessions",
          benchmark: 500,
          source: trafficSource,
          confidence: trafficConf,
        }),
        stage("signup", "Signups", {
          value: signupValue,
          unit: "signups",
          source: signupSource,
          confidence: signupValue != null ? "high" : "missing",
        }),
        stage("retention", "Retained users", {
          value: activationValue,
          unit: "users",
          source: activationValue != null ? "profile" : "unknown",
          confidence: activationConf,
        }),
        stage("monetization", "Paying customers", {
          value: paidCustomers,
          unit: "customers",
          source: paidCustomers != null ? "manual_kpi" : "unknown",
          confidence: paidConf,
        }),
      ];
      break;
    case "b2b_saas":
      formula = "traffic × signup × activation × paid × retention";
      stages = [
        stage("traffic", "Qualified traffic", {
          value: trafficValue,
          unit: "sessions",
          benchmark: 500,
          source: trafficSource,
          confidence: trafficConf,
        }),
        stage("signup", "Signups / trials", {
          value: signupValue,
          unit: "signups",
          source: signupSource,
          confidence: signupValue != null ? "high" : "missing",
        }),
        stage("activation", "Activated accounts", {
          value: activationValue,
          unit: "users",
          benchmark: 50,
          source: activationValue != null ? "profile" : "unknown",
          confidence: activationConf,
        }),
        stage("paid", "Paying customers", {
          value: paidCustomers,
          unit: "customers",
          source: paidCustomers != null ? "manual_kpi" : "unknown",
          confidence: paidConf,
        }),
        stage("conversion", "Signup rate %", {
          value: signupRate,
          unit: "%",
          benchmark: 2,
          source: signupRate != null ? "manual_kpi" : trafficValue && signupValue ? "inferred" : "unknown",
          confidence:
            signupRate != null
              ? "high"
              : trafficValue && signupValue
                ? "low"
                : "missing",
        }),
      ];
      break;
    default:
      formula = "traffic × signup × conversion × retention";
      stages = [
        stage("traffic", "Traffic", {
          value: trafficValue,
          unit: "sessions",
          benchmark: 500,
          source: trafficSource,
          confidence: trafficConf,
        }),
        stage("signup", "Signups", {
          value: signupValue,
          unit: "signups",
          source: signupSource,
          confidence: signupValue != null ? "high" : "missing",
        }),
        stage("conversion", "Conversion rate", {
          value: signupRate,
          unit: "%",
          benchmark: 2,
          source: signupRate != null ? "manual_kpi" : "unknown",
          confidence: signupRate != null ? "high" : "missing",
        }),
      ];
  }

  if (
    signupRate == null &&
    trafficValue != null &&
    trafficValue >= 100 &&
    signupValue != null &&
    signupValue >= 0
  ) {
    const inferred = Math.round((signupValue / trafficValue) * 1000) / 10;
    const convStage = stages.find((s) => s.id === "conversion");
    if (convStage && convStage.confidence === "missing") {
      convStage.value = inferred;
      convStage.unit = "%";
      convStage.source = "inferred";
      convStage.confidence = "low";
    }
  }

  return { product_class, formula, stages };
}

function inferredSignupRate(equation: GrowthEquation): number | undefined {
  const traffic = equation.stages.find((s) => s.id === "traffic")?.value;
  const signups = equation.stages.find((s) => s.id === "signup")?.value;
  const rate = equation.stages.find((s) => s.id === "conversion")?.value;
  if (rate != null) return rate;
  if (traffic != null && traffic > 0 && signups != null) {
    return Math.round((signups / traffic) * 1000) / 10;
  }
  return undefined;
}

function trafficValue(equation: GrowthEquation): number | undefined {
  return equation.stages.find((s) => s.id === "traffic")?.value;
}

export function resolveBindingBottleneck(
  equation: GrowthEquation,
  signals: PlaneSignals,
  input: GrowthPlaneInput,
): BindingBottleneck {
  const evidence: string[] = [];
  const persona = input.persona;
  const traffic = trafficValue(equation);
  const signupRate = inferredSignupRate(equation);
  const users = signals.currentUsers ?? input.profile?.current_users;
  const launched = /launched|growing|scaling/.test(signals.companyStage);

  if (persona === "sales" && signals.salesPipelineEmpty) {
    evidence.push("Sales persona with empty pipeline flag");
    return {
      stage_id: "revenue",
      gtm: "revenue",
      headline: "Revenue — pipeline is empty, not awareness",
      rationale: [
        "Outbound and ICP clarity beat top-of-funnel volume when nothing is in pipeline.",
        "Focus on qualified conversations before scaling brand or SEO.",
      ],
      evidence,
    };
  }

  if (!signals.hasAnalytics && launched) {
    evidence.push("No analytics detected on launched product");
    return {
      stage_id: "conversion",
      gtm: "measurement",
      headline: "Measurement — you can't optimize blind",
      rationale: [
        "Ship tracking before scaling distribution or paid spend.",
        "Without events you cannot tell which channel moves signups.",
      ],
      evidence,
    };
  }

  if (
    launched &&
    input.project &&
    !assessMeasurementBaseline(input.profile, input.project).ready
  ) {
    evidence.push("Shipped product without measurement baseline");
    return {
      stage_id: "conversion",
      gtm: "measurement",
      headline: "Measurement — log baseline before scaling",
      rationale: [
        "Connect GA4 or log a manual KPI before Week 1 ops scale.",
        "Pivot decisions require logged numbers, not guesses.",
      ],
      evidence,
    };
  }

  if (
    signals.daysUntilLaunch != null &&
    signals.daysUntilLaunch <= 21 &&
    signals.daysUntilLaunch >= 0
  ) {
    evidence.push(`Launch window: ${signals.daysUntilLaunch} days`);
    return {
      stage_id: "attention",
      gtm: "distribution",
      headline: "Distribution — launch window is the lever",
      rationale: [
        "Coordinated launch reach beats incremental SEO this week.",
        "Runbook, assets, and supporter network are the binding constraint.",
      ],
      evidence,
    };
  }

  if (traffic != null && traffic >= 500) {
    const rate = signupRate ?? 0;
    evidence.push(`Traffic: ${traffic} sessions/visitors`);
    if (signupRate != null) evidence.push(`Signup rate ≈ ${rate}%`);
    if (rate < 2) {
      return {
        stage_id: "conversion",
        gtm: "conversion",
        headline: "Conversion — traffic exists, signups don't",
        rationale: [
          "More top-of-funnel volume will waste attention until landing and offer convert.",
          "Fix message, CTA, and activation before scaling posts or ads.",
        ],
        evidence,
      };
    }
  }

  if (traffic != null && traffic >= 200 && signupRate != null && signupRate < 2) {
    evidence.push(`Manual traffic: ${traffic}, signup rate ${signupRate}%`);
    return {
      stage_id: "conversion",
      gtm: "conversion",
      headline: "Conversion — not distribution",
      rationale: ["Qualified visits are arriving but the funnel is not converting."],
      evidence,
    };
  }

  if (users != null && users > 50 && (traffic == null || traffic < 200)) {
    evidence.push(`Current users: ${users} with low measured traffic`);
    return {
      stage_id: "activation",
      gtm: "conversion",
      headline: "Activation — users arrive but don't reach value",
      rationale: [
        "User base exists without proportional new demand — fix time-to-value and onboarding.",
      ],
      evidence,
    };
  }

  if (
    (signals.isConsumer || signals.isDevTool) &&
    /prelaunch|idea|^$/.test(signals.companyStage) &&
    (traffic == null || traffic < 200)
  ) {
    evidence.push("Prelaunch product with low or unknown traffic");
    if (signals.controversialOrViral) evidence.push("Viral/controversial positioning detected");
    return {
      stage_id: "attention",
      gtm: "awareness",
      headline: "Attention — nobody knows you exist yet",
      rationale: [
        "Distribution and hook volume before long-cycle SEO or heavy paid.",
        "Ship minimal landing + tracking, then test creative in market.",
      ],
      evidence,
    };
  }

  if (launched && signals.heroPath && (traffic == null || traffic < 300)) {
    evidence.push("Shippable surface with low reach");
    return {
      stage_id: "attention",
      gtm: "distribution",
      headline: "Distribution — product ready, reach isn't",
      rationale: ["Product surface is shippable — coordinated reach is the constraint."],
      evidence,
    };
  }

  if (!signals.hasAnalytics) {
    evidence.push("Analytics not detected — measurement gap");
    return {
      stage_id: "conversion",
      gtm: "measurement",
      headline: "Measurement — install tracking before scaling",
      rationale: [BOTTLENECK_LABELS.measurement],
      evidence,
    };
  }

  evidence.push("Default: early-stage awareness constraint from scan signals");
  return {
    stage_id: "attention",
    gtm: "awareness",
    headline: "Attention — build distribution before optimization",
    rationale: ["Primary constraint is getting the right people to see the offer."],
    evidence,
  };
}

const BINDING_RED_RULES: Record<GtmBottleneck, RedListItem[]> = {
  awareness: [
    {
      id: "red.seo_primary",
      tactic: "Long-form SEO as primary channel",
      reason: "Search demand unproven — binding is attention, not indexation",
      evidence: [],
    },
    {
      id: "red.paid_scale",
      tactic: "Paid ads scale",
      reason: "Paid amplifies a message — fix offer and hooks before spend",
      evidence: [],
    },
    {
      id: "red.enterprise_outbound",
      tactic: "Enterprise outbound blitz",
      reason: "No awareness base — outbound without story converts poorly",
      evidence: [],
    },
  ],
  conversion: [
    {
      id: "red.more_tofu",
      tactic: "More top-of-funnel posts only",
      reason: "Traffic exists — pouring more visitors into a leaky funnel wastes reach",
      evidence: [],
    },
    {
      id: "red.influencer_mass",
      tactic: "Influencer mass market before CR fix",
      reason: "Fix landing and activation before paying for borrowed audiences",
      evidence: [],
    },
  ],
  distribution: [
    {
      id: "red.seo_program",
      tactic: "6-month SEO program as Week 1 focus",
      reason: "Launch window needs coordinated reach, not slow SEO compounding",
      evidence: [],
    },
    {
      id: "red.nurture_only",
      tactic: "Long nurture-only email drips",
      reason: "Distribution event needs live reach now",
      evidence: [],
    },
  ],
  revenue: [
    {
      id: "red.brand",
      tactic: "Brand awareness campaigns",
      reason: "Pipeline empty — direct revenue motion beats brand",
      evidence: [],
    },
    {
      id: "red.ph_launch",
      tactic: "Product Hunt launch this week",
      reason: "Sales-led motion — launch buzz without pipeline does not close deals",
      evidence: [],
    },
  ],
  measurement: [
    {
      id: "red.paid_ads",
      tactic: "Paid ads before tracking",
      reason: "Cannot optimize spend without conversion events",
      evidence: [],
    },
    {
      id: "red.scale_distribution",
      tactic: "Scale distribution before tracking",
      reason: "You will not know which channel works",
      evidence: [],
    },
  ],
};

export function buildRedList(
  binding: BindingBottleneck,
  thesis?: ChannelThesis | null,
): RedListItem[] {
  const items: RedListItem[] = BINDING_RED_RULES[binding.gtm].map((r) => ({
    ...r,
    evidence: [...r.evidence, ...binding.evidence.slice(0, 2)],
  }));

  for (const dep of thesis?.deprioritize ?? []) {
    const id = `red.thesis.${dep.slice(0, 24).replace(/\W+/g, "_")}`;
    if (items.some((i) => i.tactic.toLowerCase() === dep.toLowerCase())) continue;
    items.push({
      id,
      tactic: dep,
      reason: `Deprioritized for this thesis — binding is ${binding.gtm}`,
      evidence: binding.evidence.slice(0, 1),
    });
  }

  return items.slice(0, 8);
}

export function buildRevenueRedList(
  profile?: MarketingProfile | null,
  budgetPlan?: BudgetPlan | null,
): RedListItem[] {
  const gaps = profile?.gaps ?? [];
  const hasCheckoutGap =
    gaps.includes("revenue.checkout_missing") || gaps.includes("revenue.billing_integration_missing");
  const paidSpend = kpiValue(profile, "paid_spend");
  if (!hasCheckoutGap) return [];
  if ((paidSpend ?? 0) <= 0 && !(budgetPlan?.allocations.some((row) => row.bucket_id === "paid_ads" && row.pct > 0))) {
    return [];
  }
  return [
    {
      id: "red.revenue.paid_scale",
      tactic: "Paid ads scale before checkout",
      reason: "Checkout or billing is missing — do not scale spend into an uncloseable funnel.",
      evidence: gaps.filter((gap) => gap.startsWith("revenue.")).slice(0, 2),
    },
  ];
}

export function buildProductRedList(
  productBinding?: import("./cmoLaneD").ProductBinding | null,
): RedListItem[] {
  if (!productBinding?.active) return [];
  return [
    {
      id: "red.product.paid_scale",
      tactic: "Paid acquisition scale",
      reason: "Marketing is paused while product activation is the binding constraint.",
      evidence: productBinding.evidence.slice(0, 2),
    },
    {
      id: "red.product.distribution_volume",
      tactic: "Distribution volume increase",
      reason: "More reach would send users into an unresolved first-value path.",
      evidence: productBinding.evidence.slice(0, 2),
    },
    {
      id: "red.product.influencer_mass",
      tactic: "Influencer mass outreach",
      reason: "Borrowed attention waits until the P0 product requests are terminal.",
      evidence: productBinding.evidence.slice(0, 2),
    },
  ];
}

const THESIS_BINDING_TENSION: Partial<
  Record<ChannelThesisId, Partial<Record<GtmBottleneck, string>>>
> = {
  seo_content: {
    awareness:
      "Thesis is SEO-first but binding constraint is attention. Week 1 still executes current thesis — review after KPI proof or pivot at week review.",
  },
  landing_conversion: {
    awareness: "Conversion thesis is premature when traffic is near zero",
  },
  viral_short_form: {
    conversion: "Short-form volume thesis is correct — do not over-index on landing tweaks yet",
  },
};

export function checkThesisAlignment(
  thesis: ChannelThesis | null | undefined,
  binding: BindingBottleneck,
): { aligned: boolean; note?: string } {
  if (!thesis) return { aligned: true };

  const tension = THESIS_BINDING_TENSION[thesis.id]?.[binding.gtm];
  if (tension) {
    return {
      aligned: false,
      note: tension,
    };
  }

  if (thesis.primary_bottleneck === binding.gtm) return { aligned: true };

  const compatible: Partial<Record<GtmBottleneck, GtmBottleneck[]>> = {
    awareness: ["distribution", "measurement"],
    distribution: ["awareness"],
    conversion: ["measurement", "revenue"],
    measurement: ["conversion"],
    revenue: ["conversion"],
  };
  const ok = compatible[binding.gtm]?.includes(thesis.primary_bottleneck);
  if (ok) return { aligned: true };

  return {
    aligned: false,
    note: `Thesis bottleneck (${thesis.primary_bottleneck}) differs from binding (${binding.gtm}). Week 1 still executes current thesis — review after KPI proof.`,
  };
}

export function primaryLeverFor(thesis?: ChannelThesis | null, binding?: BindingBottleneck): string {
  if (thesis?.headline) return thesis.headline;
  if (binding) return binding.headline;
  return "Focus one growth lever this week";
}

export function attachTodayMove(
  plane: GrowthControlPlane,
  opsCadence?: CmoOpsCadence | null,
  distributionOperator?: DistributionOperatorWorkspace | null,
  thesis?: ChannelThesis | null,
  influencerOperator?: InfluencerOperatorWorkspace | null,
  delegateOperator?: DelegateOperatorWorkspace | null,
): GrowthControlPlane {
  if (
    distributionOperator &&
    thesis &&
    isDistributionOperatorGate({ thesis, opsCadence, growthPlane: plane })
  ) {
    const nextSlot = getNextDistributionSlot(distributionOperator);
    if (nextSlot) {
      const isMeasure = nextSlot.slot_kind === "measure";
      const today = {
        what: slotDisplayLabel(distributionOperator, nextSlot),
        done_when: isMeasure
          ? "Retention % + 24h views logged"
          : nextSlot.slot_kind === "engage"
            ? "Engage note captured (30 min)"
            : "Live post URL recorded",
        owner: "user" as const,
        ops_task_id: nextSlot.linked_ops_task_id,
      };
      return {
        ...plane,
        today: {
          ...today,
          why: resolveTodayWhy({
            plane,
            today,
            cadence: opsCadence,
            distributionOperator,
          }),
        },
      };
    }
  }

  if (
    influencerOperator &&
    thesis &&
    isInfluencerOperatorGate({ thesis, opsCadence, growthPlane: plane })
  ) {
    const nextTouch = getNextInfluencerTouch(influencerOperator);
    if (nextTouch) {
      const stage = nextTouch.pipeline_stage;
      const today = {
        what: touchDisplayLabel(influencerOperator, nextTouch),
        done_when:
          stage === "research"
            ? "DM sent + creator handle logged"
            : stage === "pitched"
              ? "Reply interest + note logged"
              : stage === "replied"
                ? "Deal terms + UTM + disclosure ack"
                : stage === "live"
                  ? "Signup or click count logged"
                  : "Creator step completed with proof",
        owner: "user" as const,
        ops_task_id: nextTouch.linked_ops_task_id,
      };
      return {
        ...plane,
        today: {
          ...today,
          why: resolveTodayWhy({
            plane,
            today,
            cadence: opsCadence,
            influencerOperator,
          }),
        },
      };
    }
  }

  if (
    delegateOperator &&
    thesis &&
    isDelegateOperatorGate({ thesis, opsCadence })
  ) {
    const nextRubric = getNextDelegateRubricDay(
      delegateOperator,
      opsCadence?.day_index,
    );
    if (nextRubric) {
      const required = nextRubric.checklist.filter((c) => c.required).map((c) => c.label);
      const today = {
        what: `Delegate rubric D${nextRubric.day_index}: ${nextRubric.title}`,
        done_when: required.slice(0, 2).join(" · ") || "Rubric checklist + proof note",
        owner: "delegate" as const,
      };
      return {
        ...plane,
        today: {
          ...today,
          why: resolveTodayWhy({
            plane,
            today,
            cadence: opsCadence,
            delegateOperator,
          }),
        },
      };
    }
  }

  if (!opsCadence) return plane;
  const now = getNowTask(opsCadence);
  if (!now || now.status === "done" || now.status === "skipped") return plane;
  const today = {
    what: now.what,
    done_when: now.done_when,
    owner: now.owner,
    ops_task_id: now.id,
  };
  return {
    ...plane,
    today: {
      ...today,
      why: resolveTodayWhy({ plane, today, cadence: opsCadence }),
    },
  };
}

export function buildGrowthControlPlane(input: GrowthPlaneInput): GrowthControlPlane {
  const signals = detectPlaneSignals(input);
  const equation = buildGrowthEquation(input, signals);
  const bindingRaw = resolveBindingBottleneck(equation, signals, input);
  const binding = {
    ...bindingRaw,
    evidence_refs: migrateEvidenceStringsToRefs(bindingRaw.evidence),
  };
  const thesis = input.thesis;
  const thesis_id = thesis?.id ?? "landing_conversion";
  const alignment = checkThesisAlignment(thesis, binding);
  const productBinding = input.profile?.lane_d_workspace?.marketing_paused
    ? input.profile.lane_d_workspace.product_binding
    : undefined;
  const mechanismId =
    (input.thesis?.signals?.primary_mechanism_id as GrowthMechanismId | undefined) ??
    input.profile?.growth_mechanism_profile?.primary_mechanism_id;
  const mechanismRanked = input.profile?.growth_mechanism_profile?.assessment?.ranked ?? [];
  const mechanismRedList =
    mechanismId && mechanismRanked.length
      ? buildMechanismAntiPatternRedList(mechanismId, mechanismRanked)
      : [];
  const mechanismRecord = mechanismId ? getMechanismRecord(mechanismId) : undefined;
  const red_list = [
    ...buildProductRedList(productBinding),
    ...buildRevenueRedList(input.profile, input.budgetPlan),
    ...mechanismRedList,
    ...buildRedList(binding, thesis),
  ].slice(0, 8);
  const memoryWinner = input.growthMemory?.messages.find(
    (message) =>
      message.verdict === "winner" &&
      message.thesis_id === thesis_id &&
      message.cycle_index === input.growthMemory?.last_harvest_cycle_index,
  );
  const latestSpend = input.growthMemory?.experiments.find(
    (experiment) =>
      experiment.source === "budget_bucket" &&
      experiment.cycle_index === input.growthMemory?.last_harvest_cycle_index,
  );

  let plane: GrowthControlPlane = {
    id: `gcp.${thesis_id}.${Date.now()}`,
    computed_at: new Date().toISOString(),
    equation,
    binding,
    red_list,
    thesis_id,
    thesis_aligned: alignment.aligned,
    alignment_note: alignment.note,
    memory_note: memoryWinner
      ? `Last winner: ${memoryWinner.label} · ${input.growthMemory?.experiments.length ?? 0} experiments remembered`
      : undefined,
    budget_note:
      input.budgetPlan && latestSpend
        ? `$${latestSpend.spend_usd ?? 0} / $${
            input.budgetPlan.allocations.find(
              (allocation) => allocation.bucket_id === latestSpend.bucket_id,
            )?.amount_usd ?? 0
          } ${latestSpend.bucket_id?.replace(/_/g, " ")} · ${
            latestSpend.cpa_confidence === "measured" ? "CPA measured" : "CPA unavailable"
          }`
        : undefined,
    mechanism_label: mechanismRecord?.label,
    mechanism_rationale: mechanismRecord?.hidden_system_chain[0],
    mechanism_anti_pattern: mechanismRecord?.superficial_wrong_lesson,
    primary_lever: primaryLeverFor(thesis, binding),
  };

  plane = attachTodayMove(
    plane,
    input.opsCadence,
    input.distributionOperator,
    thesis,
    input.influencerOperator,
    input.delegateOperator,
  );
  return plane;
}

export function hydrateGrowthControlPlaneFromJson(raw: unknown): GrowthControlPlane | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.computed_at !== "string") return null;
  const binding = o.binding as BindingBottleneck | undefined;
  const equation = o.equation as GrowthEquation | undefined;
  if (!binding?.headline || !equation?.stages) return null;
  return {
    id: o.id,
    computed_at: o.computed_at,
    equation,
    binding,
    red_list: Array.isArray(o.red_list) ? (o.red_list as RedListItem[]) : [],
    thesis_id: (o.thesis_id as ChannelThesisId) ?? "landing_conversion",
    thesis_aligned: o.thesis_aligned !== false,
    alignment_note: typeof o.alignment_note === "string" ? o.alignment_note : undefined,
    memory_note: typeof o.memory_note === "string" ? o.memory_note : undefined,
    primary_lever: String(o.primary_lever ?? ""),
    today:
      o.today && typeof o.today === "object"
        ? ({
            ...(o.today as Omit<GrowthTodayMove, "why">),
            why:
              typeof (o.today as Record<string, unknown>).why === "string"
                ? String((o.today as Record<string, unknown>).why)
                : binding.rationale.find((line) => line.trim()) ??
                  String(o.primary_lever ?? "Advance the binding growth lever with proof."),
          } satisfies GrowthTodayMove)
        : undefined,
  };
}
