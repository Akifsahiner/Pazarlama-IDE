/**
 * P2 — KPI proof loop: tie ops task closure to manual_kpis / GA4 + flat-metric pivot.
 * See CMO_PROOF_LOOP_SPEC.md and PRODUCT_NORTH_STAR.md §11 P2.
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import {
  needsOpsProof,
  type CmoOpsCadence,
  type CmoOpsTask,
  type CmoPivotSuggestion,
  type OpsProofInput,
  type OpsProofValidation,
  type PivotVerdict,
  validateOpsProof,
} from "./cmoOpsCadence";
import { KPI_PRESETS, inferKpiPresetFromText, kpiFromPreset } from "./kpiPresets";
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import type { DelegateOperatorWorkspace } from "./cmoDelegateOperator";
import type { GrowthMemoryState } from "./cmoGrowthMemory";
import type { LaneDWorkspace } from "./cmoLaneD";
import {
  getNextMonetizationTask,
  type MonetizationWorkspace,
  type RevenueProfile,
} from "./cmoRevenuePlane";
import type { ManualKpi, MarketingProfile } from "./types";
import { isMeasurableForReview } from "./marketingTaskContract";

export interface OpsKpiGate {
  presetId: string;
  label: string;
  name: string;
  unit?: string;
  defaultTarget?: number;
  ga4MetricName?: "sessions" | "activeUsers" | "conversions";
}

export interface Week1MetricAssessment {
  verdict: PivotVerdict;
  primaryKpiId?: string;
  primaryValue?: number;
  primaryTarget?: number;
  pctOfTarget?: number;
  loggedCount: number;
  doneUserTasks: number;
  /** Faz 5 — GA4 vs manual source transparency */
  ga4Value?: number;
  manualValue?: number;
  kpiSourceUsed?: "ga4" | "manual" | "operator" | "proof";
  ga4SyncedAt?: string;
  /** P8 — hook verdict context for distribution theses */
  distributionVerdictNote?: string;
  /** P9 — pitch verdict context for influencer thesis */
  influencerVerdictNote?: string;
  /** P10 — delegate verdict context */
  delegateVerdictNote?: string;
  /** P11 — prior-cycle experiment/message evidence. */
  memoryNote?: string;
  /** P16 — paying-customer progress when thirty_day_win is paying_customers. */
  revenueNote?: string;
}

/** P16 — week review nudge for paying-customer goals (informational, not a KPI blocker). */
export function buildRevenueWeekReviewNudge(
  profile: MarketingProfile | null | undefined,
  revenueProfile?: RevenueProfile | null,
): string | undefined {
  if (profile?.founder_fit?.thirty_day_win !== "paying_customers") return undefined;
  const target = revenueProfile?.revenue_target;
  if (!target) {
    return "30-day win is paying customers — configure revenue profile and log paid_customers when measurable.";
  }
  const manualPaid = profile?.manual_kpis?.find((k) => k.id === "paid_customers")?.value;
  const funnelPaid = revenueProfile?.funnel_stages.find((s) => s.id === "paid")?.count;
  const current = target.current ?? funnelPaid ?? manualPaid;
  if (current != null) {
    return `Paying customers: ${current}/${target.target} (${target.confidence}) toward 30-day target.`;
  }
  return `Paying-customer target: ${target.target} (${target.confidence}) — log paid_customers when measurable.`;
}

/** Read rolled-up KPI value from profile manual_kpis (includes operator rollup). */
export function resolveKpiValueFromProfile(
  presetId: string,
  profile: MarketingProfile | null | undefined,
): { value?: number; target?: number } {
  const manual = profile?.manual_kpis?.find((k) => k.id === presetId);
  if (!manual || manual.value == null) return {};
  return { value: manual.value, target: manual.target };
}

/** P8/P9/P10 — prefer operator primary KPI when ops proofs are thin. */
export function resolveOpsKpiFromOperatorRollup(
  profile: MarketingProfile | null | undefined,
  distributionOperator?: DistributionOperatorWorkspace | null,
  influencerOperator?: InfluencerOperatorWorkspace | null,
  delegateOperator?: DelegateOperatorWorkspace | null,
): { presetId?: string; value?: number; target?: number } {
  const operator = distributionOperator ?? influencerOperator;
  if (operator) {
    const presetId = operator.primary_kpi_id;
    const rolled = resolveKpiValueFromProfile(presetId, profile);
    if (rolled.value == null) return { presetId };
    return { presetId, ...rolled };
  }
  if (delegateOperator?.daily_rubrics.length) {
    const presetId = "delegate_rubric_completion_pct";
    const rolled = resolveKpiValueFromProfile(presetId, profile);
    if (rolled.value != null) return { presetId, ...rolled };
    return { presetId };
  }
  return {};
}

const PIVOT_ALTERNATIVES: Partial<Record<ChannelThesisId, ChannelThesisId[]>> = {
  viral_short_form: ["landing_conversion", "founder_social"],
  founder_social: ["outbound_sales", "landing_conversion"],
  product_hunt_launch: ["landing_conversion", "community_launch"],
  landing_conversion: ["founder_social", "seo_content"],
  seo_content: ["founder_social", "community_launch"],
  outbound_sales: ["founder_social", "landing_conversion"],
  community_launch: ["founder_social", "seo_content"],
  influencer_partnerships: ["viral_short_form", "landing_conversion"],
};

const GA4_PRESET_MAP: Record<string, OpsKpiGate["ga4MetricName"]> = {
  ga4_sessions: "sessions",
  ga4_conversions: "conversions",
  waitlist_signups: "conversions",
  targeted_visitors: "sessions",
  signup_rate_pct: "conversions",
};

/** Resolve the KPI gate for an ops task — contract metric first, then text inference. */
export function resolveOpsKpiGate(
  task: Pick<CmoOpsTask, "what" | "done_when" | "owner" | "metric">,
  thesisId?: ChannelThesisId,
): OpsKpiGate | null {
  if (!needsOpsProof(task.owner)) return null;
  if (task.metric?.measurable === false) return null;
  if (task.metric?.measurable === true) {
    return {
      presetId: task.metric.id,
      label: task.metric.name,
      name: task.metric.name,
      unit: task.metric.unit,
      defaultTarget: task.metric.target,
      ga4MetricName: task.metric.ga4_metric_name,
    };
  }

  const blob = `${task.what} ${task.done_when}`.toLowerCase();

  let presetId = inferKpiPresetFromText(blob);
  if (!presetId && thesisId === "landing_conversion") presetId = "targeted_visitors";
  if (!presetId && thesisId === "viral_short_form") presetId = "short_form_views";
  if (!presetId && thesisId === "outbound_sales") presetId = "outbound_replies";
  if (!presetId && thesisId === "influencer_partnerships") presetId = "influencer_replies";
  if (!presetId) presetId = "targeted_visitors";

  const preset = KPI_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;

  return {
    presetId: preset.id,
    label: preset.label,
    name: preset.name,
    unit: preset.unit,
    defaultTarget: preset.defaultTarget,
    ga4MetricName: GA4_PRESET_MAP[preset.id],
  };
}

export function readGa4MetricValue(
  profile: MarketingProfile | null | undefined,
  metricName: NonNullable<OpsKpiGate["ga4MetricName"]>,
): number | null {
  const metrics = profile?.connector_snapshots?.ga4?.metrics ?? [];
  const hit = metrics.find((m) => m.name === metricName);
  return hit?.value != null && !Number.isNaN(hit.value) ? hit.value : null;
}

export function hasGa4Connected(profile: MarketingProfile | null | undefined): boolean {
  return Boolean(
    profile?.ga4_oauth?.refresh_token ||
      (profile?.connector_snapshots?.ga4?.metrics?.length ?? 0) > 0,
  );
}

/** P2 — user/delegate tasks need a logged numeric KPI, not just free text. */
export function validateKpiProof(
  task: Pick<CmoOpsTask, "what" | "done_when" | "owner">,
  proof: OpsProofInput,
  _profile?: MarketingProfile | null,
): OpsProofValidation {
  const gate = resolveOpsKpiGate(task);
  if (!gate) return { ok: true, errors: [] };

  const value = proof.kpi_value;
  if (value == null || Number.isNaN(value)) {
    return {
      ok: false,
      errors: [
        `Log a numeric KPI for "${gate.label}" — this task closes on measured outcome, not vibes.`,
      ],
    };
  }
  if (value < 0) {
    return { ok: false, errors: ["KPI value must be zero or positive."] };
  }
  return { ok: true, errors: [] };
}

/** Full P1 + P2 validation chain. */
export function validateFullOpsProof(
  task: CmoOpsTask,
  proof: OpsProofInput,
  profile?: MarketingProfile | null,
): OpsProofValidation {
  const base = validateOpsProof(task, proof);
  if (!base.ok) return base;
  if (!needsOpsProof(task.owner)) return base;
  return validateKpiProof(task, proof, profile);
}

export function buildManualKpiFromOpsProof(
  task: CmoOpsTask,
  proof: OpsProofInput,
  thesisId?: ChannelThesisId,
): ManualKpi | null {
  if (!needsOpsProof(task.owner)) return null;
  const gate = resolveOpsKpiGate(task, thesisId);
  if (!gate || proof.kpi_value == null || Number.isNaN(proof.kpi_value)) return null;

  const fromPreset = kpiFromPreset(gate.presetId, proof.kpi_value, gate.defaultTarget);
  if (!fromPreset) return null;

  return {
    ...fromPreset,
    updated_at: new Date().toISOString(),
    source: "manual",
  };
}

export function enrichProofWithKpi(
  proof: OpsProofInput,
  task: CmoOpsTask,
  thesisId?: ChannelThesisId,
): OpsProofInput {
  const gate = resolveOpsKpiGate(task, thesisId);
  if (!gate || proof.kpi_value == null) return proof;
  return {
    ...proof,
    kpi_preset_id: gate.presetId,
    metric_snapshot:
      proof.metric_snapshot ??
      `${gate.label}: ${proof.kpi_value}${gate.unit ? ` ${gate.unit}` : ""}`,
  };
}

export function allOpsTasksTerminal(cadence: CmoOpsCadence): boolean {
  return cadence.tasks.every((t) => t.status === "done" || t.status === "skipped");
}

export function doneUserOpsTasks(cadence: CmoOpsCadence): CmoOpsTask[] {
  return cadence.tasks.filter((t) => needsOpsProof(t.owner) && t.status === "done");
}

export function measurableUserOpsTasks(cadence: CmoOpsCadence): CmoOpsTask[] {
  return cadence.tasks.filter((t) => needsOpsProof(t.owner) && isMeasurableForReview(t));
}

export function weekReviewMeasurableStatus(cadence: CmoOpsCadence): Array<{
  task: CmoOpsTask;
  logged: boolean;
  target?: number;
  value?: number;
}> {
  return measurableUserOpsTasks(cadence).map((task) => ({
    task,
    logged: task.proof?.kpi_value != null,
    target: task.metric?.target ?? task.proof?.kpi_target,
    value: task.proof?.kpi_value,
  }));
}

/** Assess Week 1 outcomes from logged KPIs + task proofs. */
export function evaluateWeek1Metrics(
  cadence: CmoOpsCadence,
  profile: MarketingProfile | null | undefined,
  _thesis?: ChannelThesis | null,
  distributionOperator?: DistributionOperatorWorkspace | null,
  influencerOperator?: InfluencerOperatorWorkspace | null,
  delegateOperator?: DelegateOperatorWorkspace | null,
  growthMemory?: GrowthMemoryState | null,
  revenueProfile?: RevenueProfile | null,
): Week1MetricAssessment {
  const userDone = doneUserOpsTasks(cadence);
  const measurableDone = userDone.filter((t) => isMeasurableForReview(t));
  const proofsWithKpi = measurableDone.filter((t) => t.proof?.kpi_value != null);
  const loggedCount = proofsWithKpi.length;

  if (userDone.length === 0) {
    const allSkipped = cadence.tasks
      .filter((t) => needsOpsProof(t.owner))
      .every((t) => t.status === "skipped");
    return {
      verdict: allSkipped ? "insufficient_data" : "insufficient_data",
      loggedCount: 0,
      doneUserTasks: 0,
    };
  }

  let primaryKpiId: string | undefined;
  let primaryValue: number | undefined;
  let primaryTarget: number | undefined;

  const lastUser = measurableDone[measurableDone.length - 1] ?? userDone[userDone.length - 1];
  if (lastUser?.proof?.kpi_id) {
    primaryKpiId = lastUser.proof.kpi_id;
    primaryValue = lastUser.proof.kpi_value;
    primaryTarget = lastUser.proof.kpi_target;
  } else if (lastUser) {
    const gate = resolveOpsKpiGate(lastUser, cadence.thesis_id);
    primaryKpiId = gate?.presetId;
    primaryValue = lastUser.proof?.kpi_value;
    primaryTarget = gate?.defaultTarget;
  }

  if (primaryKpiId && primaryValue == null) {
    const manual = profile?.manual_kpis?.find((k) => k.id === primaryKpiId);
    if (manual) {
      primaryValue = manual.value;
      primaryTarget = manual.target ?? primaryTarget;
    }
  }

  const operatorRollup = resolveOpsKpiFromOperatorRollup(
    profile,
    distributionOperator,
    influencerOperator,
    delegateOperator,
  );
  if (
    operatorRollup.value != null &&
    (primaryValue == null || distributionOperator || influencerOperator || delegateOperator)
  ) {
    primaryKpiId = operatorRollup.presetId ?? primaryKpiId;
    primaryValue = operatorRollup.value;
    primaryTarget = operatorRollup.target ?? primaryTarget;
  }

  const distributionVerdictNote = distributionOperator?.verdict
    ? `${distributionOperator.verdict.headline} — ${distributionOperator.verdict.rationale[0] ?? ""}`
    : undefined;
  const influencerVerdictNote = influencerOperator?.verdict
    ? `${influencerOperator.verdict.headline} — ${influencerOperator.verdict.rationale[0] ?? ""}`
    : undefined;
  const delegateVerdictNote = delegateOperator?.verdict
    ? `${delegateOperator.verdict.headline} — ${delegateOperator.verdict.rationale[0] ?? ""}`
    : undefined;
  const memoryWinner = growthMemory?.messages.find(
    (message) =>
      message.verdict === "winner" &&
      message.thesis_id === cadence.thesis_id &&
      message.cycle_index === growthMemory.last_harvest_cycle_index,
  );
  const memoryNote = memoryWinner
    ? `Growth memory winner: ${memoryWinner.label} — ${memoryWinner.evidence[0] ?? "verified signal"}`
    : undefined;

  const pctOfTarget =
    primaryValue != null && primaryTarget != null && primaryTarget > 0
      ? Math.round((primaryValue / primaryTarget) * 100)
      : undefined;

  let verdict: PivotVerdict = "insufficient_data";
  if (loggedCount === 0) {
    verdict = "insufficient_data";
  } else if (primaryValue === 0) {
    verdict = "flat";
  } else if (pctOfTarget != null && pctOfTarget < 20) {
    verdict = "flat";
  } else if (primaryValue != null && primaryValue > 0) {
    verdict = pctOfTarget != null && pctOfTarget >= 50 ? "promising" : "flat";
  }

  if (verdict === "insufficient_data" && loggedCount > 0 && primaryValue == null) {
    verdict = "insufficient_data";
  }

  return {
    verdict,
    primaryKpiId,
    primaryValue,
    primaryTarget,
    pctOfTarget,
    loggedCount,
    doneUserTasks: userDone.length,
    distributionVerdictNote,
    influencerVerdictNote,
    delegateVerdictNote,
    memoryNote,
    revenueNote: buildRevenueWeekReviewNudge(profile, revenueProfile),
  };
}

/** Week review assessment — GA4 snapshot beats manual when gate maps to GA4 metric. */
export function evaluateWeek1MetricsWithGa4Priority(
  cadence: CmoOpsCadence,
  profile: MarketingProfile | null | undefined,
  thesis?: ChannelThesis | null,
  distributionOperator?: DistributionOperatorWorkspace | null,
  influencerOperator?: InfluencerOperatorWorkspace | null,
  delegateOperator?: DelegateOperatorWorkspace | null,
  growthMemory?: GrowthMemoryState | null,
  revenueProfile?: RevenueProfile | null,
): Week1MetricAssessment {
  const base = evaluateWeek1Metrics(
    cadence,
    profile,
    thesis,
    distributionOperator,
    influencerOperator,
    delegateOperator,
    growthMemory,
    revenueProfile,
  );

  const gatePreset = base.primaryKpiId;
  const ga4Metric = gatePreset ? GA4_PRESET_MAP[gatePreset] : undefined;
  let ga4Value: number | undefined;
  let manualValue = base.primaryValue;
  let kpiSourceUsed: Week1MetricAssessment["kpiSourceUsed"] =
    base.primaryValue != null ? "proof" : undefined;

  if (ga4Metric) {
    const ga4Read = readGa4MetricValue(profile, ga4Metric);
    if (ga4Read != null) ga4Value = ga4Read;
  }

  const manualFromProfile = gatePreset
    ? profile?.manual_kpis?.find((k) => k.id === gatePreset)?.value
    : undefined;
  if (manualFromProfile != null && !Number.isNaN(manualFromProfile)) {
    manualValue = manualFromProfile;
  }

  const ga4Proof = doneUserOpsTasks(cadence).find((t) => t.proof?.kpi_source === "ga4");
  if (ga4Proof?.proof?.kpi_value != null) {
    manualValue = ga4Proof.proof.kpi_value;
  }

  let primaryValue = base.primaryValue;
  if (ga4Value != null) {
    primaryValue = ga4Value;
    kpiSourceUsed = "ga4";
  } else if (manualValue != null) {
    primaryValue = manualValue;
    kpiSourceUsed = "manual";
  }

  const primaryTarget = base.primaryTarget;
  const pctOfTarget =
    primaryValue != null && primaryTarget != null && primaryTarget > 0
      ? Math.round((primaryValue / primaryTarget) * 100)
      : base.pctOfTarget;

  let verdict = base.verdict;
  if (primaryValue === 0) verdict = "flat";
  else if (pctOfTarget != null && pctOfTarget < 20 && primaryValue != null) verdict = "flat";
  else if (primaryValue != null && primaryValue > 0) {
    verdict = pctOfTarget != null && pctOfTarget >= 50 ? "promising" : "flat";
  } else if (base.loggedCount === 0) {
    verdict = "insufficient_data";
  }

  return {
    ...base,
    verdict,
    primaryValue,
    pctOfTarget,
    ga4Value,
    manualValue,
    kpiSourceUsed,
    ga4SyncedAt: profile?.connector_snapshots?.ga4?.fetched_at,
  };
}

export function buildPivotSuggestion(
  cadence: CmoOpsCadence,
  profile: MarketingProfile | null | undefined,
  thesis: ChannelThesis,
  distributionVerdict?: { kind: string } | null,
  influencerVerdict?: { kind: string } | null,
  delegateVerdict?: { kind: string } | null,
  growthMemory?: GrowthMemoryState | null,
): CmoPivotSuggestion | null {
  if (distributionVerdict?.kind === "double_down" || distributionVerdict?.kind === "scale") {
    return null;
  }
  if (influencerVerdict?.kind === "double_down" || influencerVerdict?.kind === "scale") {
    return null;
  }
  if (delegateVerdict?.kind === "promote") {
    return null;
  }
  const memoryWinners =
    growthMemory?.messages.filter(
      (message) =>
        message.thesis_id === thesis.id &&
        message.verdict === "winner" &&
        message.cycle_index === growthMemory.last_harvest_cycle_index,
    ) ?? [];
  if (memoryWinners.length >= 2) {
    return null;
  }
  const assessment = evaluateWeek1Metrics(cadence, profile, thesis);
  if (assessment.verdict === "promising") return null;
  if (assessment.verdict === "insufficient_data" && !allOpsTasksTerminal(cadence)) {
    return null;
  }

  const alts = PIVOT_ALTERNATIVES[thesis.id] ?? ["landing_conversion", "founder_social"];
  const now = new Date().toISOString();

  const weekLabel = `Week ${cadence.week_index}`;

  if (assessment.verdict === "flat") {
    const val =
      assessment.primaryValue != null
        ? `${assessment.primaryValue}${assessment.pctOfTarget != null ? ` (${assessment.pctOfTarget}% of target)` : ""}`
        : "zero signal";
    return {
      verdict: "flat",
      headline: `${weekLabel} flat on ${thesis.title} — time to pivot`,
      rationale: [
        `Primary KPI (${assessment.primaryKpiId ?? "outcome"}) logged ${val} — below CMO kill threshold.`,
        `Current thesis emphasized: ${thesis.headline}`,
        `Deprioritized for a reason — reconsider: ${thesis.deprioritize.slice(0, 2).join(" · ")}`,
      ],
      suggested_thesis_ids: alts.filter((id) => id !== thesis.id).slice(0, 2) as ChannelThesisId[],
      suggested_actions: [
        "Accept pivot to start the next ops week",
        `Test ${alts[0]?.replace(/_/g, " ") ?? "alternate channel"} for ${weekLabel.replace("Week", "week")}`,
        "Log baseline KPI before next distribution push",
      ],
      generated_at: now,
    };
  }

  return {
    verdict: "insufficient_data",
    headline: `${weekLabel} needs measurement before scaling`,
    rationale: [
      `${assessment.doneUserTasks} user task(s) done but only ${assessment.loggedCount} KPI(s) logged.`,
      "A CMO cannot pivot on guesses — log outcomes or mark tasks skipped honestly.",
      thesis.signals?.has_analytics === "no"
        ? "Wire analytics in repo, then sync GA4 or log manual KPIs."
        : "Connect GA4 or log manual KPIs in the proof modal.",
    ],
    suggested_thesis_ids: [],
    suggested_actions: [
      "Complete pending user ops tasks with KPI proof",
      "Sync GA4 from Performance surface",
      "Run week review only after metrics are logged",
    ],
    generated_at: now,
  };
}

export function canCompleteWeekReview(
  cadence: CmoOpsCadence,
  profile: MarketingProfile | null | undefined,
  thesis?: ChannelThesis | null,
  summary?: string,
  laneD?: LaneDWorkspace | null,
  monetizationWorkspace?: MonetizationWorkspace | null,
): OpsProofValidation {
  if (!summary?.trim()) {
    return { ok: false, errors: ["Week review summary is required."] };
  }

  if (monetizationWorkspace?.revenue_binding.active) {
    const next = getNextMonetizationTask(monetizationWorkspace);
    if (next) {
      return {
        ok: false,
        errors: [`Ship or explicitly skip monetization P0: ${next.title}`],
      };
    }
  }

  if (laneD?.marketing_paused) {
    const open = laneD.requests.filter(
      (request) => request.status !== "shipped" && request.status !== "skipped",
    );
    if (open.length > 0) {
      return {
        ok: false,
        errors: [`Ship or explicitly skip remaining P0 PRODUCT REQUESTs (${open.length} open).`],
      };
    }
    return { ok: true, errors: [] };
  }

  const userTasks = cadence.tasks.filter((t) => needsOpsProof(t.owner));
  const pending = userTasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  if (pending.length > 0) {
    return {
      ok: false,
      errors: [`Finish or skip remaining user tasks first (${pending.length} open).`],
    };
  }

  const done = userTasks.filter((t) => t.status === "done");
  const measurableDone = done.filter((t) => isMeasurableForReview(t));
  const missingKpi = measurableDone.filter((t) => t.proof?.kpi_value == null);
  if (missingKpi.length > 0) {
    return {
      ok: false,
      errors: [
        `${missingKpi.length} measurable task(s) lack logged KPI — reopen proof or skip honestly.`,
      ],
    };
  }

  const assessment = evaluateWeek1Metrics(cadence, profile, thesis);
  if (measurableDone.length > 0 && assessment.loggedCount === 0) {
    return { ok: false, errors: ["Log at least one measurable KPI before closing Week 1 review."] };
  }

  return { ok: true, errors: [] };
}

export function attachKpiToCompletedProof(
  proof: OpsProofInput,
  task: CmoOpsTask,
  thesisId?: ChannelThesisId,
): {
  proof: OpsProofInput;
  kpiFields: {
    kpi_id?: string;
    kpi_name?: string;
    kpi_value?: number;
    kpi_target?: number;
    kpi_source?: "manual" | "ga4";
    kpi_unit?: string;
  };
} {
  const gate = resolveOpsKpiGate(task, thesisId);
  const kpiFields = {
    kpi_id: gate?.presetId ?? proof.kpi_preset_id,
    kpi_name: gate?.name,
    kpi_value: proof.kpi_value,
    kpi_target: gate?.defaultTarget,
    kpi_source: proof.kpi_source ?? ("manual" as const),
    kpi_unit: gate?.unit,
  };
  return { proof: enrichProofWithKpi(proof, task, thesisId), kpiFields };
}
