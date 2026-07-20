/**
 * P16 — Revenue & Monetization Plane: pricing thesis, payment funnel,
 * revenue targets, and evidence-bound attribution.
 * All diagnosis and money math in this module is deterministic.
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import type { LaneAItem, LaneAWorkspace } from "./cmoLaneA";
import type { BindingBottleneck } from "./cmoGrowthPlane";
import type { BudgetChannelCloseout } from "./cmoBudgetPlane";
import type { GrowthExperimentRecord } from "./cmoGrowthMemory";
import type { FounderFitProfile, ManualKpi, ProjectProfile, StrategicDecision } from "./types";
import type { ProductActivationProfile } from "./cmoLaneD";
import type { ProductUnderstandingGraph } from "./productUnderstandingInput";
import { bindingEvidenceRefs } from "./productUnderstandingEvidenceBridge";

export type RevenueMetricConfidence = "measured" | "assumption" | "missing";
export type ConversionConfidence = "measured" | "insufficient_data";
export type CacConfidence = "measured" | "insufficient_data";
export type MonetizationModel =
  | "plg_self_serve"
  | "sales_led"
  | "hybrid"
  | "usage_based"
  | "freemium"
  | "not_yet";
export type PaymentProvider =
  | "stripe"
  | "paddle"
  | "lemon_squeezy"
  | "manual_invoicing"
  | "none_detected";
export type FunnelStageId =
  | "pricing_view"
  | "checkout_start"
  | "trial_start"
  | "paid"
  | "retained";
export type RevenueTargetMetricId = "paid_customers" | "mrr_usd" | "pipeline_meetings";
export type MonetizationTaskStatus = "pending" | "in_progress" | "shipped" | "skipped";
export type MonetizationFixScope = "site_level" | "core_billing";

export interface PricingThesis {
  model: MonetizationModel;
  headline: string;
  rationale: string[];
  evidence: string[];
  evidence_refs?: import("./productUnderstandingInput").EvidenceRef[];
  confidence: RevenueMetricConfidence;
}

export interface PaymentFunnelStage {
  id: FunnelStageId;
  label: string;
  event_name: string;
  count?: number;
  count_confidence: RevenueMetricConfidence;
  conversion_to_next_pct?: number;
  conversion_confidence: ConversionConfidence;
}

export interface RevenueTarget {
  metric_id: RevenueTargetMetricId;
  label: string;
  baseline?: number;
  target: number;
  current?: number;
  confidence: "measured" | "assumption" | "stretch";
  deadline_days: 30;
}

export interface RevenueAttributionRow {
  source_id: string;
  source_label: string;
  channel_kind:
    | "paid_ads"
    | "influencer"
    | "distribution"
    | "outbound"
    | "organic"
    | "primary";
  spend_usd?: number;
  spend_confidence: "measured" | "missing";
  paid_customers?: number;
  attribution_confidence: "measured" | "missing";
  cac_usd?: number;
  cac_confidence: CacConfidence;
}

export interface RevenueProfile {
  id: string;
  pricing_thesis: PricingThesis;
  payment_provider: PaymentProvider;
  funnel_stages: PaymentFunnelStage[];
  revenue_target: RevenueTarget;
  attributions: RevenueAttributionRow[];
  mrr_usd?: number;
  arpu_usd?: number;
  ltv_usd?: number;
  metric_confidence: Record<string, RevenueMetricConfidence>;
  configured_at: string;
  updated_at: string;
}

export interface RevenueBinding {
  active: boolean;
  stage_id: "revenue";
  headline: string;
  rationale: string[];
  evidence: string[];
  evidence_refs?: import("./productUnderstandingInput").EvidenceRef[];
  confidence: RevenueMetricConfidence;
  trigger?:
    | "paying_customers_goal_no_infra"
    | "growth_plane_revenue"
    | "trial_to_paid_below_floor"
    | "funnel_events_missing";
}

export interface MonetizationTaskProof {
  pr_url?: string;
  issue_url?: string;
  note?: string;
  metric_value?: number;
  metric_name?: string;
  completed_at: string;
}

export interface MonetizationTask {
  id: string;
  priority: "P0" | "P1";
  title: string;
  problem: string;
  acceptance_criteria: string[];
  growth_impact: string;
  fix_scope: MonetizationFixScope;
  status: MonetizationTaskStatus;
  linked_lane_a_item_id?: string;
  proof?: MonetizationTaskProof;
  skip_reason?: string;
  sort_order: number;
}

export interface MonetizationWorkspace {
  id: string;
  thesis_id: ChannelThesisId;
  started_at: string;
  revenue_binding: RevenueBinding;
  tasks: MonetizationTask[];
}

export interface RevenueFunnelCloseout {
  stages: PaymentFunnelStage[];
  leak_stage_id?: FunnelStageId;
  leak_label?: string;
}

export interface RevenueCloseout {
  funnel: RevenueFunnelCloseout;
  target: RevenueTarget;
  attributions: RevenueAttributionRow[];
  ltv_cac_ratio?: number;
  ltv_cac_confidence: CacConfidence;
  headline: string;
}

export interface RevenueSnapshot {
  profile: RevenueProfile;
  closeout: RevenueCloseout;
  recorded_at: string;
}

export interface RevenueReplanHint {
  kind: "instrument_funnel" | "pricing_page" | "checkout" | "trial_to_paid" | "attribution";
  headline: string;
  rationale: string;
}

export interface RevenueReplanPreview {
  hints: RevenueReplanHint[];
  pricing_pivot?: MonetizationModel;
  confidence: RevenueMetricConfidence;
}

export interface RevenueScanSignals {
  routes?: string[];
  hasPricing?: boolean;
  hasCheckout?: boolean;
  hasSignup?: boolean;
  billingDeps?: string[];
  hasAnalytics?: boolean;
}

export interface PricingThesisInput {
  scan?: RevenueScanSignals | null;
  founderFit?: FounderFitProfile | null;
  persona?: "marketing" | "sales" | "founder";
  productClass?: "b2b_saas" | "consumer" | "devtool" | "other";
  salesPipelineEmpty?: boolean;
  understandingGraph?: ProductUnderstandingGraph | null;
}

export interface RevenueBindingInput {
  founderFit?: FounderFitProfile | null;
  revenueProfile?: RevenueProfile | null;
  productBindingActive?: boolean;
  marketingPaused?: boolean;
  growthBinding?: Pick<BindingBottleneck, "gtm" | "headline" | "evidence"> | null;
  activation?: ProductActivationProfile | null;
  gaps?: string[];
  manualKpis?: ManualKpi[];
  understandingGraph?: ProductUnderstandingGraph | null;
}

export interface RevenueProfileInput {
  scan?: RevenueScanSignals | null;
  founderFit?: FounderFitProfile | null;
  strategicDecision?: StrategicDecision | null;
  persona?: "marketing" | "sales" | "founder";
  productClass?: "b2b_saas" | "consumer" | "devtool" | "other";
  salesPipelineEmpty?: boolean;
  understandingGraph?: ProductUnderstandingGraph | null;
  manualKpis?: ManualKpi[];
  existing?: Partial<RevenueProfile> | null;
  intake?: {
    modelOverride?: MonetizationModel;
    paymentProvider?: PaymentProvider;
    paidCustomers?: number;
    mrrUsd?: number;
    ltvUsd?: number;
    pricingViews?: number;
    checkoutStarts?: number;
    trialStarts?: number;
  };
  now?: string;
}

export interface MonetizationTaskProofInput {
  pr_url?: string;
  issue_url?: string;
  note?: string;
  metric_value?: number;
  metric_name?: string;
}

const URL_RE = /^https?:\/\/[^\s]+$/i;
const DEFAULT_PAID_TARGET = 30;
const TRIAL_TO_PAID_FLOOR_PCT = 5;
const TRIAL_MIN_COUNT = 10;

const WIN_LABEL: Record<
  FounderFitProfile["thirty_day_win"],
  { metric_id: RevenueTargetMetricId; label: string }
> = {
  qualified_signups: { metric_id: "paid_customers", label: "Qualified signups" },
  paying_customers: { metric_id: "paid_customers", label: "Paying customers" },
  waitlist: { metric_id: "paid_customers", label: "Waitlist additions" },
  pipeline_meetings: { metric_id: "pipeline_meetings", label: "Qualified pipeline meetings" },
  brand_awareness: { metric_id: "paid_customers", label: "Qualified awareness actions" },
};

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

function kpiValue(kpis: ManualKpi[] | undefined, id: string): number | undefined {
  return finiteNonNegative(kpis?.find((kpi) => kpi.id === id)?.value);
}

function hasRoute(routes: string[] | undefined, pattern: RegExp): boolean {
  return (routes ?? []).some((route) => pattern.test(route));
}

function detectPaymentProvider(signals: RevenueScanSignals): PaymentProvider {
  const deps = (signals.billingDeps ?? []).join(" ").toLowerCase();
  if (/stripe/.test(deps)) return "stripe";
  if (/paddle/.test(deps)) return "paddle";
  if (/lemon/.test(deps)) return "lemon_squeezy";
  if (hasRoute(signals.routes, /(checkout|subscribe|billing)/i)) return "stripe";
  return "none_detected";
}

function finalizePricingThesis(
  thesis: PricingThesis,
  graph?: ProductUnderstandingGraph | null,
): PricingThesis {
  return {
    ...thesis,
    evidence_refs: bindingEvidenceRefs(graph, thesis.evidence, [
      "pricing",
      "business_model",
      "site_structure",
    ]),
  };
}

function finalizeRevenueBinding(
  binding: RevenueBinding,
  graph?: ProductUnderstandingGraph | null,
): RevenueBinding {
  return {
    ...binding,
    evidence_refs: bindingEvidenceRefs(graph, binding.evidence, [
      "pricing",
      "business_model",
      "traffic_analytics",
    ]),
  };
}

export function inferPricingThesis(input: PricingThesisInput): PricingThesis {
  return finalizePricingThesis(inferPricingThesisRaw(input), input.understandingGraph);
}

function inferPricingThesisRaw(input: PricingThesisInput): PricingThesis {
  const routes = input.scan?.routes ?? [];
  const hasPricing = input.scan?.hasPricing ?? hasRoute(routes, /pricing/i);
  const hasSignup = input.scan?.hasSignup ?? hasRoute(routes, /(signup|register|trial)/i);
  const hasCheckout = input.scan?.hasCheckout ?? hasRoute(routes, /(checkout|subscribe|billing)/i);
  const payingGoal = input.founderFit?.thirty_day_win === "paying_customers";
  const salesEmpty = input.salesPipelineEmpty === true;
  const evidence: string[] = [];
  if (hasPricing) evidence.push("Scan: /pricing route detected");
  if (hasSignup) evidence.push("Scan: signup/trial route detected");
  if (hasCheckout) evidence.push("Scan: checkout/billing route detected");
  if (payingGoal) evidence.push("Founder 30-day win: paying customers");
  if (salesEmpty) evidence.push("Sales pipeline empty flag");

  if (input.persona === "sales" && salesEmpty && payingGoal) {
    return {
      model: "sales_led",
      headline: "Sales-led — close pipeline before PLG scale",
      rationale: [
        "Empty pipeline with a paying-customer goal means outbound and ICP clarity come first.",
        "Self-serve checkout can follow once conversations convert.",
      ],
      evidence,
      confidence: "measured",
    };
  }

  if (!hasPricing && payingGoal) {
    return {
      model: "not_yet",
      headline: "Monetization not ready — ship pricing before scale",
      rationale: [
        "The founder targets paying customers but no pricing surface was detected.",
        "Lane A should ship a pricing page with a clear paid path.",
      ],
      evidence: [...evidence, "Gap: revenue.pricing_page_missing"],
      confidence: "assumption",
    };
  }

  if (hasPricing && hasSignup && hasCheckout) {
    return {
      model: "plg_self_serve",
      headline: "Self-serve checkout on /pricing",
      rationale: [
        "Pricing, signup, and checkout routes suggest a product-led paid path.",
        "Instrument funnel events before scaling paid acquisition.",
      ],
      evidence,
      confidence: "measured",
    };
  }

  if (hasPricing && hasSignup) {
    const lowHours =
      input.founderFit?.weekly_marketing_hours === "under_3" ||
      input.founderFit?.weekly_marketing_hours === "3_7";
    const cameraShy = input.founderFit?.brand_face_readiness === "never";
    if (lowHours || cameraShy) {
      return {
        model: "plg_self_serve",
        headline: "Self-serve PLG — founder time favors checkout over sales calls",
        rationale: [
          "Limited weekly hours or camera avoidance favor a checkout-first motion.",
          "Add checkout instrumentation if billing integration is still missing.",
        ],
        evidence,
        confidence: "assumption",
      };
    }
    return {
      model: "hybrid",
      headline: "Hybrid — self-serve pricing with sales assist option",
      rationale: [
        "Pricing and signup exist but checkout is not fully detected.",
        "Offer both self-serve and contact/demo paths until checkout is proven.",
      ],
      evidence,
      confidence: "assumption",
    };
  }

  if (input.productClass === "consumer") {
    return {
      model: "freemium",
      headline: "Freemium — trial or free tier before paid conversion",
      rationale: [
        "Consumer products typically convert through trial or free tier usage.",
        "Define the paid upgrade moment and instrument it.",
      ],
      evidence,
      confidence: "assumption",
    };
  }

  if (input.productClass === "b2b_saas" && hasPricing) {
    return {
      model: "usage_based",
      headline: "Usage-based or tiered B2B pricing",
      rationale: [
        "B2B SaaS with a pricing page — confirm tier structure and billing unit.",
        "Sales assist may be required for enterprise tiers.",
      ],
      evidence,
      confidence: "assumption",
    };
  }

  return {
    model: "not_yet",
    headline: "Monetization path undefined — define how payment is received",
    rationale: [
      "No pricing, signup, or checkout signals were detected.",
      "Answer how payment will be received before scaling acquisition spend.",
    ],
    evidence,
    confidence: "missing",
  };
}

function funnelTemplate(model: MonetizationModel): PaymentFunnelStage[] {
  const base = (id: FunnelStageId, label: string, event: string): PaymentFunnelStage => ({
    id,
    label,
    event_name: event,
    count_confidence: "missing",
    conversion_confidence: "insufficient_data",
  });

  if (model === "sales_led") {
    return [
      base("pricing_view", "Pricing / proposal viewed", "pricing_page_viewed"),
      base("checkout_start", "Deal / invoice initiated", "deal_initiated"),
      base("paid", "Closed-won customers", "customer_paid"),
      base("retained", "Retained customers (week 2+)", "customer_retained"),
    ];
  }

  if (model === "freemium" || model === "usage_based") {
    return [
      base("pricing_view", "Pricing page views", "pricing_page_viewed"),
      base("trial_start", "Trial or free-tier starts", "trial_started"),
      base("checkout_start", "Checkout or upgrade started", "checkout_started"),
      base("paid", "Paying customers", "subscription_created"),
      base("retained", "Retained subscribers", "subscription_renewed"),
    ];
  }

  return [
    base("pricing_view", "Pricing page views", "pricing_page_viewed"),
    base("checkout_start", "Checkout started", "checkout_started"),
    base("paid", "Paying customers", "subscription_created"),
    base("retained", "Retained customers", "subscription_renewed"),
  ];
}

export function buildPaymentFunnel(
  model: MonetizationModel,
  counts?: Partial<Record<FunnelStageId, number>>,
  manualKpis?: ManualKpi[],
): PaymentFunnelStage[] {
  const kpiMap: Partial<Record<FunnelStageId, string>> = {
    pricing_view: "pricing_page_views",
    checkout_start: "checkout_starts",
    paid: "paid_customers",
  };
  const stages = funnelTemplate(model);
  return stages.map((stage, index) => {
    const count =
      finiteNonNegative(counts?.[stage.id]) ??
      kpiValue(manualKpis, kpiMap[stage.id] ?? "") ??
      undefined;
    const nextStage = stages[index + 1];
    const nextCount =
      nextStage != null
        ? finiteNonNegative(counts?.[nextStage.id]) ??
          kpiValue(manualKpis, kpiMap[nextStage.id] ?? "") ??
          undefined
        : undefined;
    const hasConversion = count != null && count > 0 && nextCount != null && nextCount >= 0;
    return {
      ...stage,
      count,
      count_confidence: count != null ? "measured" : "missing",
      conversion_to_next_pct: hasConversion ? roundPct((nextCount / count) * 100) : undefined,
      conversion_confidence: hasConversion ? "measured" : "insufficient_data",
    };
  });
}

function relevantBaseline(
  fit: FounderFitProfile,
  manualKpis?: ManualKpi[],
): number | undefined {
  const terms: Record<FounderFitProfile["thirty_day_win"], RegExp> = {
    qualified_signups: /signup|lead|registration/i,
    paying_customers: /customer|paid|purchase|revenue/i,
    waitlist: /waitlist/i,
    pipeline_meetings: /meeting|pipeline|demo/i,
    brand_awareness: /view|impression|reach|awareness/i,
  };
  const kpi = manualKpis?.find((item) => terms[fit.thirty_day_win].test(item.name));
  if (kpi && Number.isFinite(kpi.value)) return kpi.value;
  return undefined;
}

export function buildRevenueTarget(
  founderFit?: FounderFitProfile | null,
  strategicDecision?: StrategicDecision | null,
  manualKpis?: ManualKpi[],
  paidCustomers?: number,
): RevenueTarget {
  const win = founderFit?.thirty_day_win ?? "paying_customers";
  const descriptor = WIN_LABEL[win];
  const baseline = founderFit ? relevantBaseline(founderFit, manualKpis) : undefined;
  const sealed = strategicDecision?.options.find(
    (opt) => opt.id === strategicDecision.selected_id,
  );
  const sealedTarget = sealed?.thirty_day_target?.target;
  const current =
    finiteNonNegative(paidCustomers) ??
    kpiValue(manualKpis, "paid_customers") ??
    (win === "pipeline_meetings" ? kpiValue(manualKpis, "outbound_replies") : undefined);

  let target = sealedTarget ?? DEFAULT_PAID_TARGET;
  let confidence: RevenueTarget["confidence"] = "assumption";
  if (sealedTarget != null) {
    confidence = sealed?.thirty_day_target?.confidence ?? "assumption";
  } else if (baseline != null) {
    target = Math.max(baseline + 1, Math.ceil(baseline * 1.5));
    confidence = "measured";
  }

  if (descriptor.metric_id === "pipeline_meetings" && sealedTarget == null) {
    target = 15;
    confidence = "assumption";
  }

  return {
    metric_id: descriptor.metric_id,
    label: descriptor.label,
    baseline,
    target,
    current,
    confidence,
    deadline_days: 30,
  };
}

export function buildRevenueProfile(input: RevenueProfileInput): RevenueProfile {
  const now = input.now ?? new Date().toISOString();
  const thesis = inferPricingThesis({
    scan: input.scan,
    founderFit: input.founderFit,
    persona: input.persona,
    productClass: input.productClass,
    salesPipelineEmpty: input.salesPipelineEmpty,
    understandingGraph: input.understandingGraph,
  });
  const model = input.intake?.modelOverride ?? thesis.model;
  const paymentProvider =
    input.intake?.paymentProvider ??
    (input.existing?.payment_provider && input.existing.payment_provider !== "none_detected"
      ? input.existing.payment_provider
      : detectPaymentProvider(input.scan ?? {}));
  const funnelStages = buildPaymentFunnel(model, {
    pricing_view: input.intake?.pricingViews ?? input.existing?.funnel_stages?.find((s) => s.id === "pricing_view")?.count,
    checkout_start: input.intake?.checkoutStarts ?? input.existing?.funnel_stages?.find((s) => s.id === "checkout_start")?.count,
    trial_start: input.intake?.trialStarts ?? input.existing?.funnel_stages?.find((s) => s.id === "trial_start")?.count,
    paid: input.intake?.paidCustomers ?? input.existing?.funnel_stages?.find((s) => s.id === "paid")?.count,
  }, input.manualKpis);
  const revenueTarget = buildRevenueTarget(
    input.founderFit,
    input.strategicDecision,
    input.manualKpis,
    input.intake?.paidCustomers,
  );
  const mrr = finiteNonNegative(input.intake?.mrrUsd ?? input.existing?.mrr_usd) ?? kpiValue(input.manualKpis, "mrr_usd");
  const ltv = finiteNonNegative(input.intake?.ltvUsd ?? input.existing?.ltv_usd) ?? kpiValue(input.manualKpis, "ltv_usd");
  const paidCount = funnelStages.find((s) => s.id === "paid")?.count;
  const arpu =
    mrr != null && paidCount != null && paidCount > 0 ? roundMoney(mrr / paidCount) : undefined;

  return {
    id: input.existing?.id ?? `revenue.${Date.now()}`,
    pricing_thesis: input.intake?.modelOverride
      ? { ...thesis, model: input.intake.modelOverride }
      : thesis,
    payment_provider: paymentProvider,
    funnel_stages: funnelStages,
    revenue_target: revenueTarget,
    attributions: input.existing?.attributions ?? [],
    mrr_usd: mrr,
    arpu_usd: arpu,
    ltv_usd: ltv,
    metric_confidence: {
      mrr_usd: mrr != null ? "measured" : "missing",
      ltv_usd: ltv != null ? "measured" : "missing",
      arpu_usd: arpu != null ? "measured" : "missing",
      paid_customers: paidCount != null ? "measured" : "missing",
    },
    configured_at: input.existing?.configured_at ?? now,
    updated_at: now,
  };
}

function inactiveRevenueBinding(input: RevenueBindingInput): RevenueBinding {
  return finalizeRevenueBinding(
    {
      active: false,
      stage_id: "revenue",
      headline: "Revenue is not the binding monetization constraint",
      rationale: ["Continue the current thesis while monetization evidence is healthy or missing."],
      evidence: [],
      confidence: "missing",
    },
    input.understandingGraph,
  );
}

export function detectRevenueBinding(input: RevenueBindingInput): RevenueBinding {
  const fin = (binding: RevenueBinding) => finalizeRevenueBinding(binding, input.understandingGraph);
  if (input.productBindingActive || input.marketingPaused) return inactiveRevenueBinding(input);

  const payingGoal = input.founderFit?.thirty_day_win === "paying_customers";
  const paidCount =
    input.revenueProfile?.funnel_stages.find((s) => s.id === "paid")?.count ??
    kpiValue(input.manualKpis, "paid_customers");
  const gaps = input.gaps ?? [];
  const funnelMissing = gaps.includes("revenue.funnel_events_missing");
  const pricingMissing = gaps.includes("revenue.pricing_page_missing");
  const checkoutMissing = gaps.includes("revenue.checkout_missing");

  if (
    payingGoal &&
    (paidCount == null || paidCount === 0) &&
    (pricingMissing || funnelMissing || checkoutMissing)
  ) {
    return fin({
      active: true,
      stage_id: "revenue",
      headline: "Revenue — monetization infra missing for paying-customer goal",
      rationale: [
        "The founder targets paying customers but pricing, checkout, or funnel events are not ready.",
        "Focus on instrumentation and paid path before scaling spend.",
      ],
      evidence: gaps.filter((g) => g.startsWith("revenue.")),
      confidence: "assumption",
      trigger: "paying_customers_goal_no_infra",
    });
  }

  if (input.growthBinding?.gtm === "revenue" && (funnelMissing || checkoutMissing)) {
    return fin({
      active: true,
      stage_id: "revenue",
      headline: input.growthBinding.headline,
      rationale: [
        "Growth plane identifies revenue as binding and funnel instrumentation is incomplete.",
      ],
      evidence: input.growthBinding.evidence,
      confidence: "measured",
      trigger: "growth_plane_revenue",
    });
  }

  const trialCount = kpiValue(input.manualKpis, "trial_starts") ??
    input.revenueProfile?.funnel_stages.find((s) => s.id === "trial_start")?.count;
  const trialToPaid = kpiValue(input.manualKpis, "trial_to_paid_pct");
  if (
    trialCount != null &&
    trialCount >= TRIAL_MIN_COUNT &&
    trialToPaid != null &&
    trialToPaid < TRIAL_TO_PAID_FLOOR_PCT
  ) {
    return fin({
      active: true,
      stage_id: "revenue",
      headline: "Trial-to-paid — measured conversion is below the conservative floor",
      rationale: [
        `Trial-to-paid ${trialToPaid}% is below the ${TRIAL_TO_PAID_FLOOR_PCT}% deterministic floor.`,
        "Fix onboarding-to-checkout before scaling top-of-funnel.",
      ],
      evidence: [`${trialToPaid}% trial-to-paid with ${trialCount} trials`],
      confidence: "measured",
      trigger: "trial_to_paid_below_floor",
    });
  }

  if (funnelMissing && payingGoal) {
    return fin({
      active: true,
      stage_id: "revenue",
      headline: "Payment funnel — events are not instrumented",
      rationale: ["Cannot attribute paid customers to channels without funnel events."],
      evidence: ["Gap: revenue.funnel_events_missing"],
      confidence: "assumption",
      trigger: "funnel_events_missing",
    });
  }

  return inactiveRevenueBinding(input);
}

function monetizationTask(
  input: Omit<MonetizationTask, "priority" | "status" | "sort_order">,
  sortOrder: number,
): MonetizationTask {
  return { ...input, priority: "P0", status: "pending", sort_order: sortOrder };
}

export function createMonetizationWorkspaceFromBinding(input: {
  thesis: Pick<ChannelThesis, "id">;
  binding: RevenueBinding;
  revenueProfile: RevenueProfile;
  gaps?: string[];
  now?: string;
}): MonetizationWorkspace | null {
  if (!input.binding.active) return null;
  const tasks: MonetizationTask[] = [];
  const gaps = input.gaps ?? [];
  const model = input.revenueProfile.pricing_thesis.model;

  if (gaps.includes("revenue.pricing_page_missing")) {
    tasks.push(
      monetizationTask(
        {
          id: `${input.thesis.id}.revenue.pricing_page`,
          title: "Ship a pricing page with a clear paid path",
          problem: "No pricing surface was detected for a paying-customer goal.",
          acceptance_criteria: [
            "A /pricing route exists with visible tier or price information.",
            "Primary CTA leads to signup, checkout, or contact for purchase.",
            "pricing_page_viewed event is instrumented or manually baselined.",
          ],
          growth_impact: "Founders cannot convert traffic to revenue without a pricing surface.",
          fix_scope: "site_level",
        },
        tasks.length,
      ),
    );
  }

  if (gaps.includes("revenue.funnel_events_missing") || gaps.includes("revenue.checkout_missing")) {
    tasks.push(
      monetizationTask(
        {
          id: `${input.thesis.id}.revenue.funnel_events`,
          title: "Instrument the payment funnel events",
          problem: "Checkout and paid conversion are not reliably measured.",
          acceptance_criteria: [
            "pricing_page_viewed fires on /pricing load.",
            model === "sales_led"
              ? "deal_initiated or equivalent CRM stage is logged."
              : "checkout_started and subscription_created events fire once per user.",
            "Manual or analytics-backed paid customer count can be logged weekly.",
          ],
          growth_impact: "Revenue attribution and CAC require measured funnel stages.",
          fix_scope: "site_level",
        },
        tasks.length,
      ),
    );
  }

  if (gaps.includes("revenue.billing_integration_missing")) {
    tasks.push(
      monetizationTask(
        {
          id: `${input.thesis.id}.revenue.billing_core`,
          title: "Integrate billing provider for checkout",
          problem: "No billing integration was detected in the repo scan.",
          acceptance_criteria: [
            "Stripe, Paddle, or equivalent checkout flow is wired.",
            "Test payment succeeds in staging or sandbox.",
            "subscription_created event fires on successful payment.",
          ],
          growth_impact: "Self-serve revenue requires a working payment rail.",
          fix_scope: "core_billing",
        },
        tasks.length,
      ),
    );
  }

  if (tasks.length === 0) {
    tasks.push(
      monetizationTask(
        {
          id: `${input.thesis.id}.revenue.baseline`,
          title: "Log baseline paid customer count",
          problem: "Revenue binding is active but no P0 instrumentation gap was detected.",
          acceptance_criteria: [
            "Current paying customer count is logged with measured confidence.",
            "Primary acquisition channel for each paid customer is noted.",
          ],
          growth_impact: "Week-close and attribution require a honest revenue baseline.",
          fix_scope: "site_level",
        },
        0,
      ),
    );
  }

  return {
    id: `monetization.${Date.now()}`,
    thesis_id: input.thesis.id,
    started_at: input.now ?? new Date().toISOString(),
    revenue_binding: input.binding,
    tasks,
  };
}

export function linkSiteLevelMonetizationToLaneA(
  workspace: MonetizationWorkspace,
  laneA?: LaneAWorkspace | null,
  thesis?: ChannelThesis | null,
): { workspace: MonetizationWorkspace; laneA: LaneAWorkspace | null } {
  if (!thesis) return { workspace, laneA: laneA ?? null };
  let nextLaneA = laneA ?? null;
  const tasks = workspace.tasks.map((task) => {
    if (task.fix_scope !== "site_level" || task.linked_lane_a_item_id) return task;
    const laneItem: LaneAItem = {
      id: `lane_a.${task.id}`,
      mode: task.id.includes("funnel") ? "repo_edit" : "content_draft",
      title: task.title,
      detail: `${task.problem}\n\nDone when: ${task.acceptance_criteria.join("; ")}`,
      status: "pending",
      skills: ["analytics-measurement", "landing-page-conversion"],
      sort_order: nextLaneA?.items.length ?? 0,
    };
    nextLaneA = {
      id: nextLaneA?.id ?? `lane_a.${workspace.thesis_id}.${Date.now()}`,
      thesis_id: workspace.thesis_id,
      items: [...(nextLaneA?.items ?? []), laneItem],
      started_at: nextLaneA?.started_at ?? new Date().toISOString(),
    };
    return { ...task, linked_lane_a_item_id: laneItem.id, status: "in_progress" as const };
  });
  return { workspace: { ...workspace, tasks }, laneA: nextLaneA };
}

export function buildBillingIssueMarkdown(task: MonetizationTask): string {
  const criteria = task.acceptance_criteria.map((item) => `- [ ] ${item}`).join("\n");
  return `# P0 MONETIZATION REQUEST — ${task.title}\n\n## Problem\n${task.problem}\n\n## Growth impact\n${task.growth_impact}\n\n## Acceptance criteria\n${criteria}\n\n## Scope\nCore billing integration — file as a developer issue and log the issue URL as proof.\n`;
}

export function rollupRevenueFunnel(
  profile: RevenueProfile,
  manualKpis?: ManualKpi[],
): RevenueFunnelCloseout {
  const stages = buildPaymentFunnel(
    profile.pricing_thesis.model,
    Object.fromEntries(
      profile.funnel_stages
        .filter((s) => s.count != null)
        .map((s) => [s.id, s.count!]),
    ) as Partial<Record<FunnelStageId, number>>,
    manualKpis,
  );
  let leakStage: PaymentFunnelStage | undefined;
  for (let i = 0; i < stages.length - 1; i++) {
    const stage = stages[i]!;
    const next = stages[i + 1]!;
    if (
      stage.count_confidence === "measured" &&
      next.count_confidence === "measured" &&
      stage.count! > 0 &&
      next.conversion_confidence === "measured" &&
      (next.conversion_to_next_pct ?? 100) < 10
    ) {
      leakStage = stage;
      break;
    }
    if (stage.count_confidence === "measured" && next.count_confidence === "missing" && stage.count! > 0) {
      leakStage = stage;
      break;
    }
  }
  return {
    stages,
    leak_stage_id: leakStage?.id,
    leak_label: leakStage?.label,
  };
}

export function rollupRevenueAttribution(
  profile: RevenueProfile,
  budgetCloseout?: BudgetChannelCloseout[],
  existingAttributions?: RevenueAttributionRow[],
): RevenueAttributionRow[] {
  const rows: RevenueAttributionRow[] = [...(existingAttributions ?? profile.attributions)];
  const bucketMap: Record<string, RevenueAttributionRow["channel_kind"]> = {
    paid_ads: "paid_ads",
    influencer: "influencer",
    primary_channel: "primary",
  };

  for (const closeout of budgetCloseout ?? []) {
    if (closeout.actual_spend_usd <= 0) continue;
    const kind = bucketMap[closeout.bucket_id] ?? "primary";
    const existing = rows.find((r) => r.source_id === closeout.bucket_id);
    const paid = existing?.paid_customers;
    const hasCac = closeout.actual_spend_usd > 0 && paid != null && paid > 0;
    const row: RevenueAttributionRow = {
      source_id: closeout.bucket_id,
      source_label: closeout.bucket_id.replace(/_/g, " "),
      channel_kind: kind,
      spend_usd: closeout.actual_spend_usd,
      spend_confidence: "measured",
      paid_customers: paid,
      attribution_confidence: paid != null ? "measured" : "missing",
      cac_usd: hasCac ? roundMoney(closeout.actual_spend_usd / paid!) : undefined,
      cac_confidence: hasCac ? "measured" : "insufficient_data",
    };
    if (existing) {
      const idx = rows.indexOf(existing);
      rows[idx] = { ...existing, ...row, paid_customers: existing.paid_customers ?? row.paid_customers };
    } else {
      rows.push(row);
    }
  }

  if (!rows.some((r) => r.source_id === "organic")) {
    rows.push({
      source_id: "organic",
      source_label: "Organic / direct",
      channel_kind: "organic",
      spend_confidence: "missing",
      attribution_confidence: "missing",
      cac_confidence: "insufficient_data",
    });
  }
  if (!rows.some((r) => r.source_id === "outbound")) {
    rows.push({
      source_id: "outbound",
      source_label: "Outbound / sales",
      channel_kind: "outbound",
      spend_confidence: "missing",
      attribution_confidence: "missing",
      cac_confidence: "insufficient_data",
    });
  }

  return rows;
}

export function computeLtvCacRatio(
  profile: RevenueProfile,
  attributions: RevenueAttributionRow[],
): { ratio?: number; confidence: CacConfidence } {
  const ltv = profile.ltv_usd;
  const ltvMeasured = profile.metric_confidence.ltv_usd === "measured" && ltv != null && ltv > 0;
  const measuredCacs = attributions.filter((r) => r.cac_confidence === "measured" && r.cac_usd != null);
  if (!ltvMeasured || measuredCacs.length === 0) {
    return { confidence: "insufficient_data" };
  }
  const avgCac = measuredCacs.reduce((sum, r) => sum + r.cac_usd!, 0) / measuredCacs.length;
  if (avgCac <= 0) return { confidence: "insufficient_data" };
  return { ratio: roundMoney(ltv / avgCac), confidence: "measured" };
}

export function buildRevenueCloseout(
  profile: RevenueProfile,
  manualKpis?: ManualKpi[],
  budgetCloseout?: BudgetChannelCloseout[],
): RevenueCloseout {
  const funnel = rollupRevenueFunnel(profile, manualKpis);
  const attributions = rollupRevenueAttribution(profile, budgetCloseout);
  const target = {
    ...profile.revenue_target,
    current:
      profile.revenue_target.current ??
      funnel.stages.find((s) => s.id === "paid")?.count ??
      kpiValue(manualKpis, "paid_customers"),
  };
  const ltvCac = computeLtvCacRatio(profile, attributions);
  const progress =
    target.current != null
      ? `${target.current}/${target.target} ${target.label.toLowerCase()}`
      : `${target.label} target ${target.target} (${target.confidence})`;
  const leak = funnel.leak_label ? ` · leak at ${funnel.leak_label}` : "";
  const cacRows = attributions.filter((r) => r.cac_confidence === "measured");
  const cacHeadline = cacRows.length
    ? cacRows.map((r) => `${r.source_label} CAC $${r.cac_usd}`).join(" · ")
    : "CAC unavailable until spend and attributed paid customers are measured";
  return {
    funnel,
    target,
    attributions,
    ltv_cac_ratio: ltvCac.ratio,
    ltv_cac_confidence: ltvCac.confidence,
    headline: `${progress}${leak} · ${cacHeadline}`,
  };
}

export function buildRevenueSnapshot(
  profile: RevenueProfile,
  closeout: RevenueCloseout,
  now?: string,
): RevenueSnapshot {
  return {
    profile,
    closeout,
    recorded_at: now ?? new Date().toISOString(),
  };
}

export function buildRevenueReplanPreview(input: {
  profile: RevenueProfile;
  closeout: RevenueCloseout;
  weekIndex?: number;
  gaps?: string[];
}): RevenueReplanPreview {
  const hints: RevenueReplanHint[] = [];
  const gaps = input.gaps ?? [];
  const weekIndex = input.weekIndex ?? 1;

  if (gaps.includes("revenue.pricing_page_missing")) {
    hints.push({
      kind: "pricing_page",
      headline: "Ship pricing before scaling paid acquisition",
      rationale: "Paying-customer goal with no pricing page wastes spend on uncloseable traffic.",
    });
  }
  if (gaps.includes("revenue.checkout_missing") || gaps.includes("revenue.billing_integration_missing")) {
    hints.push({
      kind: "checkout",
      headline: "Checkout or billing integration is the binding monetization gap",
      rationale: "Instrument or integrate payment before increasing ad spend.",
    });
  }
  if (gaps.includes("revenue.funnel_events_missing")) {
    hints.push({
      kind: "instrument_funnel",
      headline: "Instrument payment funnel events this week",
      rationale: "Revenue attribution requires pricing_view → checkout → paid events.",
    });
  }
  if (input.closeout.funnel.leak_stage_id === "trial_start") {
    hints.push({
      kind: "trial_to_paid",
      headline: "Trial-to-paid conversion is the measured leak",
      rationale: "Fix onboarding-to-checkout before adding top-of-funnel volume.",
    });
  }
  if (input.closeout.attributions.every((r) => r.attribution_confidence === "missing")) {
    hints.push({
      kind: "attribution",
      headline: "Log paid customers per channel source",
      rationale: "Without attribution, CAC and channel ROI remain unavailable.",
    });
  }

  let pricingPivot: MonetizationModel | undefined;
  if (
    weekIndex >= 2 &&
    input.profile.pricing_thesis.model === "plg_self_serve" &&
    (input.closeout.target.current ?? 0) === 0 &&
    gaps.includes("revenue.checkout_missing")
  ) {
    pricingPivot = "hybrid";
  }

  return {
    hints,
    pricing_pivot: pricingPivot,
    confidence: hints.some((h) => h.kind === "trial_to_paid") ? "measured" : "assumption",
  };
}

export function harvestRevenueFromCycle(
  closeout: RevenueCloseout,
  cycleIndex: number,
  thesisId: ChannelThesisId,
  now = new Date().toISOString(),
): GrowthExperimentRecord[] {
  const experiments: GrowthExperimentRecord[] = [];

  if (closeout.funnel.leak_stage_id) {
    experiments.push({
      id: `revenue.leak.${cycleIndex}.${closeout.funnel.leak_stage_id}`,
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      source: "revenue_signal",
      source_id: closeout.funnel.leak_stage_id,
      hypothesis: `Funnel leak detected at ${closeout.funnel.leak_label}`,
      outcome: "inconclusive",
      learning: closeout.headline,
      message_ids: [],
      recorded_at: now,
    });
  }

  for (const row of closeout.attributions) {
    if (row.cac_confidence !== "measured") continue;
    experiments.push({
      id: `revenue.cac.${cycleIndex}.${row.source_id}`,
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      source: "revenue_signal",
      source_id: row.source_id,
      hypothesis: `${row.source_label} CAC measurement`,
      primary_metric: row.paid_customers
        ? { id: "paid_customers", value: row.paid_customers }
        : undefined,
      outcome: "inconclusive",
      learning: `CAC $${row.cac_usd} with $${row.spend_usd} spend`,
      message_ids: [],
      spend_usd: row.spend_usd,
      outcomes: row.paid_customers,
      cpa_usd: row.cac_usd,
      cpa_confidence: "measured",
      recorded_at: now,
    });
  }

  if (closeout.ltv_cac_confidence === "measured" && closeout.ltv_cac_ratio != null) {
    experiments.push({
      id: `revenue.ltv_cac.${cycleIndex}`,
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      source: "revenue_signal",
      source_id: "ltv_cac",
      hypothesis: "LTV:CAC ratio from measured inputs",
      outcome: closeout.ltv_cac_ratio >= 3 ? "won" : "inconclusive",
      learning: `LTV:CAC ${closeout.ltv_cac_ratio}:1 (measured inputs only)`,
      message_ids: [],
      recorded_at: now,
    });
  }

  return experiments;
}

export function getNextMonetizationTask(workspace: MonetizationWorkspace): MonetizationTask | null {
  return (
    workspace.tasks
      .filter((t) => t.status === "pending" || t.status === "in_progress")
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null
  );
}

export function validateMonetizationTaskProof(
  task: MonetizationTask,
  proof: MonetizationTaskProofInput,
): string[] {
  const errors: string[] = [];
  if (task.fix_scope === "core_billing" && !proof.issue_url?.trim()) {
    errors.push("Core billing tasks require an issue URL.");
  }
  if (task.fix_scope === "site_level" && !proof.pr_url?.trim() && proof.metric_value == null) {
    errors.push("Site-level tasks require a PR URL or measured metric value.");
  }
  if (proof.pr_url && !URL_RE.test(proof.pr_url.trim())) errors.push("PR URL must be http(s).");
  if (proof.issue_url && !URL_RE.test(proof.issue_url.trim())) errors.push("Issue URL must be http(s).");
  return errors;
}

export function completeMonetizationTask(
  workspace: MonetizationWorkspace,
  taskId: string,
  proof: MonetizationTaskProofInput,
  now?: string,
): { workspace: MonetizationWorkspace; error?: string } {
  const task = workspace.tasks.find((t) => t.id === taskId);
  if (!task) return { workspace, error: "Task not found." };
  const errors = validateMonetizationTaskProof(task, proof);
  if (errors.length) return { workspace, error: errors.join(" ") };
  const tasks = workspace.tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          status: "shipped" as const,
          proof: {
            pr_url: proof.pr_url?.trim(),
            issue_url: proof.issue_url?.trim(),
            note: proof.note?.trim(),
            metric_value: proof.metric_value,
            metric_name: proof.metric_name,
            completed_at: now ?? new Date().toISOString(),
          },
        }
      : t,
  );
  return { workspace: { ...workspace, tasks } };
}

export function skipMonetizationTask(
  workspace: MonetizationWorkspace,
  taskId: string,
  reason: string,
): MonetizationWorkspace {
  return {
    ...workspace,
    tasks: workspace.tasks.map((t) =>
      t.id === taskId ? { ...t, status: "skipped" as const, skip_reason: reason.trim() } : t,
    ),
  };
}

export function completeLinkedMonetizationTaskOnApply(
  workspace: MonetizationWorkspace,
  laneAItemId: string,
  now?: string,
): MonetizationWorkspace {
  return {
    ...workspace,
    tasks: workspace.tasks.map((t) =>
      t.linked_lane_a_item_id === laneAItemId && t.status !== "shipped"
        ? {
            ...t,
            status: "shipped" as const,
            proof: {
              completed_at: now ?? new Date().toISOString(),
              note: "Auto-completed via Lane A apply.",
            },
          }
        : t,
    ),
  };
}

export function logRevenueAttribution(
  profile: RevenueProfile,
  row: Omit<RevenueAttributionRow, "cac_usd" | "cac_confidence"> & {
    paid_customers: number;
  },
): RevenueProfile {
  const hasCac =
    row.spend_usd != null && row.spend_usd > 0 && row.paid_customers > 0;
  const cac = hasCac ? roundMoney(row.spend_usd! / row.paid_customers) : undefined;
  const nextRow: RevenueAttributionRow = {
    ...row,
    attribution_confidence: "measured",
    cac_usd: cac,
    cac_confidence: hasCac ? "measured" : "insufficient_data",
  };
  const existing = profile.attributions.findIndex((r) => r.source_id === row.source_id);
  const attributions = [...profile.attributions];
  if (existing >= 0) attributions[existing] = { ...attributions[existing], ...nextRow };
  else attributions.push(nextRow);
  return { ...profile, attributions, updated_at: new Date().toISOString() };
}

export function monetizationProgress(workspace: MonetizationWorkspace): {
  total: number;
  shipped: number;
  pending: number;
} {
  const total = workspace.tasks.length;
  const shipped = workspace.tasks.filter((t) => t.status === "shipped" || t.status === "skipped").length;
  return { total, shipped, pending: total - shipped };
}

export function hydrateRevenueProfileFromJson(raw: unknown): RevenueProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.pricing_thesis || !o.revenue_target) return null;
  const thesis = o.pricing_thesis as PricingThesis;
  const target = o.revenue_target as RevenueTarget;
  const stages = Array.isArray(o.funnel_stages)
    ? (o.funnel_stages as PaymentFunnelStage[])
    : [];
  return {
    id: o.id,
    pricing_thesis: thesis,
    payment_provider: (o.payment_provider as PaymentProvider) ?? "none_detected",
    funnel_stages: stages,
    revenue_target: target,
    attributions: Array.isArray(o.attributions) ? (o.attributions as RevenueAttributionRow[]) : [],
    mrr_usd: finiteNonNegative(o.mrr_usd),
    arpu_usd: finiteNonNegative(o.arpu_usd),
    ltv_usd: finiteNonNegative(o.ltv_usd),
    metric_confidence: (o.metric_confidence as Record<string, RevenueMetricConfidence>) ?? {},
    configured_at: String(o.configured_at ?? new Date().toISOString()),
    updated_at: String(o.updated_at ?? new Date().toISOString()),
  };
}

export function hydrateMonetizationWorkspaceFromJson(raw: unknown): MonetizationWorkspace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.revenue_binding || !Array.isArray(o.tasks)) return null;
  return {
    id: o.id,
    thesis_id: o.thesis_id as ChannelThesisId,
    started_at: String(o.started_at),
    revenue_binding: o.revenue_binding as RevenueBinding,
    tasks: (o.tasks as MonetizationTask[]).map((t) => ({
      ...t,
      priority: (t.priority ?? "P0") as MonetizationTask["priority"],
      status: (t.status ?? "pending") as MonetizationTaskStatus,
      fix_scope: (t.fix_scope ?? "site_level") as MonetizationFixScope,
    })),
  };
}

export function buildRevenueScanSignals(
  scan?: Pick<ProjectProfile, "routes"> | null,
  gaps?: string[],
  billingDeps?: string[],
): RevenueScanSignals {
  const routes = scan?.routes ?? [];
  return {
    routes,
    hasPricing: hasRoute(routes, /pricing/i),
    hasCheckout: hasRoute(routes, /(checkout|subscribe|billing)/i),
    hasSignup: hasRoute(routes, /(signup|register|trial)/i),
    billingDeps,
    hasAnalytics: !(gaps ?? []).includes("measurement.analytics_missing"),
  };
}
