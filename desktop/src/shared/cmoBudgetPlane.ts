/**
 * P14 — deterministic marketing budget allocation, closeout, and reallocation.
 * Money math is pure and evidence-bound: estimates never become actuals.
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import type { DelegateOperatorWorkspace } from "./cmoDelegateOperator";
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import type { CmoDelegateWorkspace } from "./cmoLaneC";
import type { LaneBWorkspace } from "./cmoLaneB";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import type { FounderFitProfile, MarketingProfile } from "./types";

export type BudgetBucketId =
  | "primary_channel"
  | "paid_ads"
  | "influencer"
  | "delegate_labor"
  | "tools"
  | "reserve";

export type MoneyConfidence = "measured" | "assumption" | "stretch";
export type CpaConfidence = "measured" | "insufficient_data";

export interface BudgetBucketAllocation {
  bucket_id: BudgetBucketId;
  pct: number;
  amount_usd: number;
  weekly_cap_usd: number;
}

export interface BudgetActionCost {
  action_id: string;
  source: "lane_b" | "lane_c" | "distribution" | "influencer" | "delegate" | "ops";
  bucket_id: BudgetBucketId;
  cost_estimate_usd?: number;
  actual_spend_usd?: number;
}

export interface BudgetPlan {
  id: string;
  monthly_amount_usd: number;
  amount_confidence: Extract<MoneyConfidence, "measured" | "assumption">;
  amount_source: "user_entry" | "band_midpoint";
  currency: "USD";
  thesis_id: ChannelThesisId;
  allocations: BudgetBucketAllocation[];
  action_costs: BudgetActionCost[];
  cpa_ceiling_usd?: number;
  cpa_ceiling_confidence: Extract<MoneyConfidence, "measured" | "assumption">;
  configured_at: string;
  updated_at: string;
}

export interface BudgetChannelCloseout {
  bucket_id: BudgetBucketId;
  allocated_usd: number;
  actual_spend_usd: number;
  outcomes?: number;
  outcome_metric_id?: string;
  cpa_usd?: number;
  cpa_confidence: CpaConfidence;
  burn_pct: number;
}

export interface BudgetSnapshot {
  plan: BudgetPlan;
  closeout: BudgetChannelCloseout[];
  total_spend_usd: number;
  headline: string;
}

export interface BudgetMutation {
  bucket_id: BudgetBucketId;
  from_pct: number;
  to_pct: number;
  reason: string;
}

export interface BudgetReplanPreview {
  mutations: BudgetMutation[];
  scale_bucket_id?: BudgetBucketId;
  cut_bucket_ids: BudgetBucketId[];
  weekly_cap_overrides: Partial<Record<BudgetBucketId, number>>;
  confidence: MoneyConfidence;
  rationale: string[];
}

export interface BudgetWorkspaces {
  laneB?: LaneBWorkspace | null;
  laneC?: CmoDelegateWorkspace | null;
  distribution?: DistributionOperatorWorkspace | null;
  influencer?: InfluencerOperatorWorkspace | null;
  delegate?: DelegateOperatorWorkspace | null;
  cadence?: CmoOpsCadence | null;
}

const BUCKETS: BudgetBucketId[] = [
  "primary_channel",
  "paid_ads",
  "influencer",
  "delegate_labor",
  "tools",
  "reserve",
];

const TEMPLATES: Record<ChannelThesisId, Record<BudgetBucketId, number>> = {
  viral_short_form: {
    primary_channel: 15,
    paid_ads: 15,
    influencer: 10,
    delegate_labor: 20,
    tools: 5,
    reserve: 35,
  },
  founder_social: {
    primary_channel: 35,
    paid_ads: 10,
    influencer: 10,
    delegate_labor: 15,
    tools: 5,
    reserve: 25,
  },
  product_hunt_launch: {
    primary_channel: 30,
    paid_ads: 10,
    influencer: 15,
    delegate_labor: 20,
    tools: 10,
    reserve: 15,
  },
  landing_conversion: {
    primary_channel: 20,
    paid_ads: 40,
    influencer: 5,
    delegate_labor: 10,
    tools: 10,
    reserve: 15,
  },
  seo_content: {
    primary_channel: 35,
    paid_ads: 5,
    influencer: 5,
    delegate_labor: 30,
    tools: 10,
    reserve: 15,
  },
  outbound_sales: {
    primary_channel: 25,
    paid_ads: 5,
    influencer: 5,
    delegate_labor: 40,
    tools: 10,
    reserve: 15,
  },
  community_launch: {
    primary_channel: 35,
    paid_ads: 5,
    influencer: 10,
    delegate_labor: 20,
    tools: 5,
    reserve: 25,
  },
  influencer_partnerships: {
    primary_channel: 10,
    paid_ads: 10,
    influencer: 55,
    delegate_labor: 15,
    tools: 5,
    reserve: 5,
  },
};

const BAND_AMOUNT: Record<FounderFitProfile["monthly_budget_band"], number> = {
  "0": 0,
  under_500: 250,
  "500_2000": 1250,
  over_2000: 2500,
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function safeMoney(value: number | undefined): number {
  return value != null && Number.isFinite(value) && value >= 0 ? value : 0;
}

function shiftPct(
  pct: Record<BudgetBucketId, number>,
  from: BudgetBucketId,
  to: BudgetBucketId,
  requested: number,
): void {
  const amount = Math.min(requested, pct[from]);
  pct[from] -= amount;
  pct[to] += amount;
}

export function budgetAmountFromBand(band: FounderFitProfile["monthly_budget_band"]): number {
  return BAND_AMOUNT[band];
}

export function allocationTemplate(thesisId: ChannelThesisId): Record<BudgetBucketId, number> {
  return { ...TEMPLATES[thesisId] };
}

export function buildBudgetAllocation(
  thesis: Pick<ChannelThesis, "id">,
  founderFit: FounderFitProfile,
  opts?: { monthlyAmountUsd?: number; cpaCeilingUsd?: number; now?: string },
): BudgetPlan {
  const entered = opts?.monthlyAmountUsd;
  const hasEnteredAmount = entered != null && Number.isFinite(entered) && entered >= 0;
  const amount = roundMoney(hasEnteredAmount ? entered : BAND_AMOUNT[founderFit.monthly_budget_band]);
  const pct = allocationTemplate(thesis.id);

  if (amount === 0) {
    for (const bucket of BUCKETS) pct[bucket] = bucket === "primary_channel" ? 100 : 0;
  } else {
    if (founderFit.brand_face_readiness === "never") {
      shiftPct(pct, "primary_channel", "delegate_labor", 5);
    }
    if (founderFit.weekly_marketing_hours === "under_3") {
      shiftPct(pct, "primary_channel", "reserve", 10);
    }
  }

  let allocatedCents = 0;
  const totalCents = Math.round(amount * 100);
  const allocations = BUCKETS.map((bucket) => {
    const cents =
      bucket === "reserve" ? 0 : Math.floor((totalCents * pct[bucket]) / 100);
    allocatedCents += cents;
    return {
      bucket_id: bucket,
      pct: pct[bucket],
      amount_usd: cents / 100,
      weekly_cap_usd: roundMoney(cents / 100 / 4),
    };
  });
  const reserve = allocations.find((row) => row.bucket_id === "reserve")!;
  const reserveCents = totalCents - allocatedCents;
  reserve.amount_usd = reserveCents / 100;
  reserve.weekly_cap_usd = roundMoney(reserve.amount_usd / 4);

  const now = opts?.now ?? new Date().toISOString();
  const hasUserCpaCeiling =
    opts?.cpaCeilingUsd != null &&
    Number.isFinite(opts.cpaCeilingUsd) &&
    opts.cpaCeilingUsd > 0;
  return {
    id: `budget.${thesis.id}`,
    monthly_amount_usd: amount,
    amount_confidence: hasEnteredAmount ? "measured" : "assumption",
    amount_source: hasEnteredAmount ? "user_entry" : "band_midpoint",
    currency: "USD",
    thesis_id: thesis.id,
    allocations,
    action_costs: [],
    cpa_ceiling_usd: hasUserCpaCeiling
      ? roundMoney(opts!.cpaCeilingUsd!)
      : thesis.id === "outbound_sales"
        ? 400
        : 80,
    cpa_ceiling_confidence: hasUserCpaCeiling ? "measured" : "assumption",
    configured_at: now,
    updated_at: now,
  };
}

function weeklyCap(plan: BudgetPlan, bucket: BudgetBucketId): number {
  return plan.allocations.find((row) => row.bucket_id === bucket)?.weekly_cap_usd ?? 0;
}

function distribute(
  ids: string[],
  source: BudgetActionCost["source"],
  bucket: BudgetBucketId,
  cap: number,
): BudgetActionCost[] {
  if (!ids.length) return [];
  const perAction = roundMoney(cap / ids.length);
  let used = 0;
  return ids.map((action_id, index) => {
    const estimate = index === ids.length - 1 ? roundMoney(cap - used) : perAction;
    used = roundMoney(used + estimate);
    return { action_id, source, bucket_id: bucket, cost_estimate_usd: estimate };
  });
}

function laneBBucket(channel?: string): BudgetBucketId {
  if (/paid|ad|sponsor|newsletter/i.test(channel ?? "")) return "paid_ads";
  if (/dm|creator|influencer/i.test(channel ?? "")) return "influencer";
  return "primary_channel";
}

/** Build an auditable estimate ledger. It never writes actual spend. */
export function seedActionCosts(plan: BudgetPlan, workspaces: BudgetWorkspaces): BudgetPlan {
  const costs: BudgetActionCost[] = [];
  const laneB = workspaces.laneB?.items ?? [];
  for (const bucket of ["primary_channel", "paid_ads", "influencer"] as const) {
    costs.push(
      ...distribute(
        laneB.filter((item) => laneBBucket(item.channel) === bucket).map((item) => item.id),
        "lane_b",
        bucket,
        weeklyCap(plan, bucket),
      ),
    );
  }
  costs.push(
    ...distribute(
      (workspaces.laneC?.briefs ?? []).map((brief) => brief.id),
      "lane_c",
      "delegate_labor",
      weeklyCap(plan, "delegate_labor"),
    ),
  );
  costs.push(
    ...distribute(
      (workspaces.influencer?.touches ?? []).map((touch) => touch.id),
      "influencer",
      "influencer",
      weeklyCap(plan, "influencer"),
    ),
  );
  costs.push(
    ...distribute(
      (workspaces.delegate?.hire_blocks ?? []).map((block) => block.brief_id),
      "delegate",
      "delegate_labor",
      weeklyCap(plan, "delegate_labor"),
    ),
  );
  costs.push(
    ...(workspaces.distribution?.slots ?? []).map((slot) => ({
      action_id: slot.id,
      source: "distribution" as const,
      bucket_id: "primary_channel" as const,
      cost_estimate_usd: 0,
    })),
  );
  costs.push(
    ...distribute(
      (workspaces.cadence?.tasks ?? [])
        .filter((task) => /paid|ad spend|budget/i.test(`${task.what} ${task.why}`))
        .map((task) => task.id),
      "ops",
      "paid_ads",
      weeklyCap(plan, "paid_ads"),
    ),
  );

  return { ...plan, action_costs: costs, updated_at: new Date().toISOString() };
}

/** Mirror plan estimates onto execution entities while preserving actual-proof fields. */
export function applyActionCostEstimates(
  plan: BudgetPlan,
  workspaces: BudgetWorkspaces,
): BudgetWorkspaces {
  const estimate = (id: string) =>
    plan.action_costs.find((action) => action.action_id === id)?.cost_estimate_usd;
  return {
    ...workspaces,
    laneB: workspaces.laneB
      ? {
          ...workspaces.laneB,
          items: workspaces.laneB.items.map((item) => ({
            ...item,
            cost_estimate_usd: estimate(item.id),
          })),
        }
      : workspaces.laneB,
    laneC: workspaces.laneC
      ? {
          ...workspaces.laneC,
          briefs: workspaces.laneC.briefs.map((brief) => ({
            ...brief,
            cost_estimate_usd: estimate(brief.id),
          })),
        }
      : workspaces.laneC,
    distribution: workspaces.distribution
      ? {
          ...workspaces.distribution,
          slots: workspaces.distribution.slots.map((slot) => ({
            ...slot,
            cost_estimate_usd: estimate(slot.id) ?? 0,
          })),
        }
      : workspaces.distribution,
    influencer: workspaces.influencer
      ? {
          ...workspaces.influencer,
          touches: workspaces.influencer.touches.map((touch) => ({
            ...touch,
            cost_estimate_usd: estimate(touch.id),
            deal:
              estimate(touch.id) != null
                ? { ...touch.deal, base_comp_usd: touch.deal?.base_comp_usd ?? estimate(touch.id) }
                : touch.deal,
          })),
        }
      : workspaces.influencer,
    delegate: workspaces.delegate
      ? {
          ...workspaces.delegate,
          briefs: workspaces.delegate.briefs.map((brief) => ({
            ...brief,
            cost_estimate_usd: estimate(brief.id),
          })),
          hire_blocks: workspaces.delegate.hire_blocks.map((block) => ({
            ...block,
            cost_estimate_usd: estimate(block.brief_id),
          })),
        }
      : workspaces.delegate,
    cadence: workspaces.cadence
      ? {
          ...workspaces.cadence,
          tasks: workspaces.cadence.tasks.map((task) => ({
            ...task,
            cost_estimate_usd: estimate(task.id),
          })),
        }
      : workspaces.cadence,
  };
}

interface ActualAccumulator {
  spend: number;
  outcomes?: number;
  metric?: string;
}

function addActual(
  map: Record<BudgetBucketId, ActualAccumulator>,
  bucket: BudgetBucketId,
  spend?: number,
  outcomes?: number,
  metric?: string,
): void {
  map[bucket].spend = roundMoney(map[bucket].spend + safeMoney(spend));
  if (outcomes != null && Number.isFinite(outcomes) && outcomes >= 0) {
    map[bucket].outcomes = (map[bucket].outcomes ?? 0) + outcomes;
    map[bucket].metric = metric;
  }
}

export function rollupBudgetActuals(
  plan: BudgetPlan,
  profile: MarketingProfile | null,
  workspaces: BudgetWorkspaces,
): BudgetChannelCloseout[] {
  const actuals = Object.fromEntries(
    BUCKETS.map((bucket) => [bucket, { spend: 0 }]),
  ) as Record<BudgetBucketId, ActualAccumulator>;

  for (const touch of workspaces.influencer?.touches ?? []) {
    addActual(
      actuals,
      "influencer",
      touch.proof?.spend_usd,
      touch.proof?.signups,
      "influencer_referral_signups",
    );
  }
  const delegateSource = workspaces.delegate?.briefs ?? workspaces.laneC?.briefs ?? [];
  for (const brief of delegateSource) {
    addActual(actuals, "delegate_labor", brief.proof?.actual_spend_usd);
  }
  if (workspaces.delegate) {
    for (const rubric of workspaces.delegate.daily_rubrics) {
      const briefHasTotal = workspaces.delegate.briefs.some(
        (brief) => brief.id === rubric.brief_id && brief.proof?.actual_spend_usd != null,
      );
      if (!briefHasTotal) addActual(actuals, "delegate_labor", rubric.actual_spend_usd);
    }
  }
  for (const item of workspaces.laneB?.items ?? []) {
    const bucket = laneBBucket(item.channel);
    // Influencer operator is source of truth when active; Lane B is its mirror.
    if (bucket !== "influencer" || !workspaces.influencer) {
      addActual(actuals, bucket, item.proof?.spend_usd);
    }
  }
  for (const kpi of profile?.manual_kpis ?? []) {
    // Direct action proof wins over a potentially mirrored aggregate KPI.
    if (kpi.id === "paid_spend" && actuals.paid_ads.spend === 0) {
      addActual(actuals, "paid_ads", kpi.value);
    }
    if (kpi.id === "tools_spend") addActual(actuals, "tools", kpi.value);
    if (/signup|conversion/i.test(kpi.name) && kpi.channel === "paid-ads-opt") {
      addActual(actuals, "paid_ads", undefined, kpi.value, kpi.id);
    }
  }

  return plan.allocations.map((allocation) => {
    const actual = actuals[allocation.bucket_id];
    const hasCpa = actual.spend > 0 && (actual.outcomes ?? 0) > 0;
    return {
      bucket_id: allocation.bucket_id,
      allocated_usd: allocation.amount_usd,
      actual_spend_usd: actual.spend,
      outcomes: actual.outcomes,
      outcome_metric_id: actual.metric,
      cpa_usd: hasCpa ? roundMoney(actual.spend / actual.outcomes!) : undefined,
      cpa_confidence: hasCpa ? "measured" : "insufficient_data",
      burn_pct:
        allocation.amount_usd > 0
          ? Math.round((actual.spend / allocation.amount_usd) * 100)
          : 0,
    };
  });
}

export function buildBudgetSnapshot(
  plan: BudgetPlan,
  closeout: BudgetChannelCloseout[],
): BudgetSnapshot {
  const total = roundMoney(closeout.reduce((sum, row) => sum + row.actual_spend_usd, 0));
  const measured = closeout.filter((row) => row.cpa_confidence === "measured");
  const headline = measured.length
    ? measured
        .map((row) => `${row.bucket_id.replace(/_/g, " ")} CPA $${row.cpa_usd} (measured)`)
        .join(" · ")
    : `$${total} logged · CPA unavailable until spend and outcomes are measured`;
  return { plan, closeout, total_spend_usd: total, headline };
}

function normalizedPct(rows: BudgetBucketAllocation[]): Record<BudgetBucketId, number> {
  return Object.fromEntries(rows.map((row) => [row.bucket_id, row.pct])) as Record<
    BudgetBucketId,
    number
  >;
}

export function buildBudgetReplanPreview(
  plan: BudgetPlan,
  closeout: BudgetChannelCloseout[],
  opts: {
    mode: "double_down" | "pivot";
    targetThesisId?: ChannelThesisId;
    founderFit?: FounderFitProfile;
  },
): BudgetReplanPreview {
  const current = normalizedPct(plan.allocations);
  let next = { ...current };
  const rationale: string[] = [];
  const cut: BudgetBucketId[] = [];
  let scale: BudgetBucketId | undefined;
  let confidence: MoneyConfidence = "assumption";

  if (opts.mode === "pivot" && opts.targetThesisId && opts.founderFit) {
    next = normalizedPct(
      buildBudgetAllocation(
        { id: opts.targetThesisId },
        opts.founderFit,
        { monthlyAmountUsd: plan.monthly_amount_usd, cpaCeilingUsd: plan.cpa_ceiling_usd },
      ).allocations,
    );
    rationale.push(`Reset allocation to the ${opts.targetThesisId} deterministic template.`);
  } else {
    for (const row of closeout) {
      if (
        row.bucket_id !== "reserve" &&
        row.allocated_usd > 0 &&
        row.actual_spend_usd >= row.allocated_usd * 0.5 &&
        row.outcomes === 0
      ) {
        next.reserve += next[row.bucket_id];
        next[row.bucket_id] = 0;
        cut.push(row.bucket_id);
        rationale.push(`${row.bucket_id} logged spend with zero measured outcomes; move it to reserve.`);
      }
    }
    if (plan.cpa_ceiling_usd != null) {
      const candidate = closeout
        .filter(
          (row) =>
            row.bucket_id !== "reserve" &&
            row.cpa_confidence === "measured" &&
            row.cpa_usd! <= plan.cpa_ceiling_usd!,
        )
        .sort((a, b) => a.cpa_usd! - b.cpa_usd!)[0];
      if (candidate && next.reserve > 0) {
        const delta = Math.min(10, next.reserve);
        next.reserve -= delta;
        next[candidate.bucket_id] += delta;
        scale = candidate.bucket_id;
        confidence = "stretch";
        rationale.push(
          `${candidate.bucket_id} CPA $${candidate.cpa_usd} is within the ${
            plan.cpa_ceiling_confidence === "measured" ? "user" : "assumption"
          } ceiling; preview +${delta}%.`,
        );
      }
    }
  }

  const mutations = BUCKETS.filter((bucket) => next[bucket] !== current[bucket]).map((bucket) => ({
    bucket_id: bucket,
    from_pct: current[bucket],
    to_pct: next[bucket],
    reason:
      bucket === scale
        ? `Measured CPA is within the ${plan.cpa_ceiling_confidence === "measured" ? "user" : "assumption"} ceiling.`
        : cut.includes(bucket)
          ? "Logged spend has zero measured outcomes."
          : opts.mode === "pivot"
            ? "New thesis template."
            : "Balancing reserve.",
  }));
  const weekly_cap_overrides = Object.fromEntries(
    mutations.map((mutation) => [
      mutation.bucket_id,
      roundMoney((plan.monthly_amount_usd * mutation.to_pct) / 100 / 4),
    ]),
  ) as Partial<Record<BudgetBucketId, number>>;
  if (!mutations.length) {
    rationale.push("Insufficient measured CPA evidence; keep allocation unchanged.");
  }
  return {
    mutations,
    scale_bucket_id: scale,
    cut_bucket_ids: cut,
    weekly_cap_overrides,
    confidence,
    rationale,
  };
}

export function applyBudgetReallocation(
  plan: BudgetPlan,
  preview: Pick<BudgetReplanPreview, "mutations">,
  now = new Date().toISOString(),
): BudgetPlan {
  if (!preview.mutations.length) return plan;
  const pct = normalizedPct(plan.allocations);
  for (const mutation of preview.mutations) pct[mutation.bucket_id] = mutation.to_pct;
  let assigned = 0;
  const allocations = BUCKETS.map((bucket) => {
    const amount =
      bucket === "reserve"
        ? 0
        : Math.floor(plan.monthly_amount_usd * 100 * pct[bucket] / 100) / 100;
    assigned = roundMoney(assigned + amount);
    return {
      bucket_id: bucket,
      pct: pct[bucket],
      amount_usd: amount,
      weekly_cap_usd: roundMoney(amount / 4),
    };
  });
  const reserve = allocations.find((row) => row.bucket_id === "reserve")!;
  reserve.amount_usd = roundMoney(plan.monthly_amount_usd - assigned);
  reserve.weekly_cap_usd = roundMoney(reserve.amount_usd / 4);
  return { ...plan, allocations, action_costs: [], updated_at: now };
}

export function hydrateBudgetPlanFromJson(raw: unknown): BudgetPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const plan = raw as Partial<BudgetPlan>;
  if (
    plan.currency !== "USD" ||
    !Number.isFinite(plan.monthly_amount_usd) ||
    !Array.isArray(plan.allocations) ||
    !plan.thesis_id
  ) {
    return null;
  }
  return { ...plan, action_costs: plan.action_costs ?? [] } as BudgetPlan;
}

export function budgetPlanSummary(plan?: BudgetPlan | null): string | undefined {
  if (!plan) return undefined;
  const spent = roundMoney(
    plan.action_costs.reduce((sum, action) => sum + safeMoney(action.actual_spend_usd), 0),
  );
  return `Budget: $${plan.monthly_amount_usd}/mo · Spent $${spent}`;
}
