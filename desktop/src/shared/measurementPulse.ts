/**
 * Faz 6 — Day 3/5/7 Pulse SSOT: unified measurement read for Execution Record.
 * See CMO_DAY3_PULSE_SPEC.md
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import type { DelegateOperatorWorkspace } from "./cmoDelegateOperator";
import type {
  DistributionOperatorWorkspace,
  DistributionHook,
} from "./cmoDistributionOperator";
import { evaluateHookPerformance, getNextDistributionSlot } from "./cmoDistributionOperator";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import type { CmoOpsCadence, PivotVerdict } from "./cmoOpsCadence";
import {
  evaluateWeek1MetricsWithGa4Priority,
  readGa4MetricValue,
  resolveOpsKpiGate,
  type Week1MetricAssessment,
} from "./cmoProofLoop";
import { KPI_PRESETS } from "./kpiPresets";
import type { MeasurementBaselineAssessment } from "./measurementBaseline";
import { assessMeasurementBaseline } from "./measurementBaseline";
import type { MarketingProfile } from "./types";

export type PulseCheckpointDay = 3 | 5 | 7;

export interface DayPulsePrimaryKpi {
  name: string;
  value?: number;
  target?: number;
  pct?: number;
  unit?: string;
  tone: "ok" | "warn" | "missing";
  display: string;
}

export interface DayPulseView {
  checkpoint: PulseCheckpointDay;
  title: string;
  primaryKpi: DayPulsePrimaryKpi;
  leadingIndicator?: { label: string; value: string };
  actionSuggestion: string;
  verdict: PivotVerdict;
  sourceUsed?: Week1MetricAssessment["kpiSourceUsed"];
  visible: boolean;
  waitMessage?: string;
}

export interface EvaluateDayPulseInput {
  cadence: CmoOpsCadence;
  profile?: MarketingProfile | null;
  thesis?: ChannelThesis | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
}

const CHECKPOINTS: PulseCheckpointDay[] = [3, 5, 7];

export function resolveActivePulseCheckpoint(dayIndex: number): PulseCheckpointDay | null {
  if (dayIndex < 3) return null;
  let active: PulseCheckpointDay | null = null;
  for (const cp of CHECKPOINTS) {
    if (dayIndex >= cp) active = cp;
  }
  return active;
}

const HONEST_EMPTY_COPY: Record<ChannelThesisId, string> = {
  viral_short_form: "Short-form needs 24–72h — log views when ready",
  founder_social: "Founder posts need 48h — log impressions or connect analytics",
  landing_conversion: "Connect GA4 or log sessions manually",
  outbound_sales: "Log reply count when prospects respond",
  product_hunt_launch: "Launch metrics land T+24h — log upvotes + signups",
  seo_content: "Indexation takes days — log GSC clicks when available",
  community_launch: "Community posts need engagement window — log URL + replies",
  influencer_partnerships: "Replies take 48–72h — log warm/hot when they land",
};

const PULSE_WAIT_COPY: Record<ChannelThesisId, string> = {
  viral_short_form: "24–72h is normal — log views when TikTok/Reels analytics land",
  founder_social: "Give posts 48h — log impressions when analytics refresh",
  landing_conversion: "Connect GA4 or log session count manually",
  outbound_sales: "Replies take time — log count when prospects respond",
  product_hunt_launch: "Launch metrics land T+24h — log upvotes + signups",
  seo_content: "Indexation takes days — log GSC clicks when available",
  community_launch: "Community posts need engagement window — log URL + replies",
  influencer_partnerships: "Replies take 48–72h — log warm/hot when they land",
};

export function resolvePulseKpiPresetId(
  cadence: CmoOpsCadence,
  assessment: Week1MetricAssessment,
): string {
  if (assessment.primaryKpiId) return assessment.primaryKpiId;
  const gateTask = cadence.tasks.find((t) => t.owner === "user" || t.owner === "delegate");
  const gate = gateTask ? resolveOpsKpiGate(gateTask, cadence.thesis_id) : null;
  return gate?.presetId ?? "targeted_visitors";
}

export function resolveHonestEmptyKpiCopy(
  thesisId?: ChannelThesisId,
  _baseline?: MeasurementBaselineAssessment | null,
): string {
  if (thesisId && HONEST_EMPTY_COPY[thesisId]) return HONEST_EMPTY_COPY[thesisId];
  return "Log a KPI or connect analytics — no fabricated numbers";
}

function resolveLeadingIndicator(input: EvaluateDayPulseInput): DayPulseView["leadingIndicator"] {
  const { distributionOperator, influencerOperator, thesis, profile } = input;
  if (distributionOperator) {
    let bestHook: DistributionHook | undefined;
    let bestRetention = -1;
    let bestViews = -1;
    for (const hook of distributionOperator.hooks) {
      const slots = distributionOperator.slots.filter(
        (s) => s.hook_id === hook.id && s.slot_kind === "post",
      );
      const retentions = slots
        .map((s) => s.proof?.retention_3s_pct)
        .filter((v): v is number => v != null);
      const views = slots
        .map((s) => s.proof?.views_24h)
        .filter((v): v is number => v != null);
      const maxRet = retentions.length ? Math.max(...retentions) : -1;
      const maxViews = views.length ? Math.max(...views) : -1;
      if (maxRet > bestRetention || (maxRet === bestRetention && maxViews > bestViews)) {
        bestRetention = maxRet;
        bestViews = maxViews;
        bestHook = hook;
      }
    }
    if (bestHook && bestRetention >= 0) {
      return {
        label: "Leading",
        value: `${bestHook.label} (${bestRetention}% 3s retention)`,
      };
    }
    if (bestHook && bestViews >= 0) {
      return {
        label: "Leading",
        value: `${bestHook.label} (${bestViews} 24h views)`,
      };
    }
  }
  if (influencerOperator) {
    const replies = influencerOperator.touches.filter((t) => t.proof?.reply_received).length;
    if (replies > 0) {
      return { label: "Leading", value: `${replies} warm/hot replies logged` };
    }
  }
  if (thesis?.id === "outbound_sales") {
    const replies = profile?.manual_kpis?.find((k) => k.id === "outbound_replies")?.value;
    if (replies != null && replies > 0) {
      return { label: "Leading", value: `${replies} outbound replies` };
    }
  }
  if (thesis?.id === "landing_conversion" || thesis?.id === "seo_content") {
    const sessions =
      readGa4MetricValue(profile ?? null, "sessions") ??
      profile?.manual_kpis?.find((k) => k.id === "targeted_visitors")?.value;
    if (sessions != null && sessions > 0) {
      return { label: "Leading", value: `${sessions} sessions logged` };
    }
  }
  return undefined;
}

function resolveActionSuggestion(input: EvaluateDayPulseInput): string {
  const { distributionOperator, cadence, thesis } = input;
  if (distributionOperator) {
    const verdict = evaluateHookPerformance(distributionOperator);
    const next = getNextDistributionSlot(distributionOperator);
    const hook = next
      ? distributionOperator.hooks.find((h) => h.id === next.hook_id)
      : undefined;
    if (verdict.kind === "kill" && verdict.hook_id) {
      const killed = distributionOperator.hooks.find((h) => h.id === verdict.hook_id);
      return `Rewrite ${killed?.label ?? "losing hook"} — retention failed after 3 posts`;
    }
    if (next && hook) {
      return `Post ${hook.label} today — ${verdict.kind === "scale" ? "scale winning pattern" : "variant test"}`;
    }
    return verdict.headline;
  }
  const task = cadence.tasks.find((t) => t.owner === "user" && t.status !== "done");
  if (task) return task.what;
  if (thesis?.week1_priorities[0]?.what) return thesis.week1_priorities[0].what;
  return "Keep executing Week 1 ops — log proof when live";
}

function formatPrimaryKpiDisplay(
  _name: string,
  value?: number,
  target?: number,
  unit?: string,
): { display: string; pct?: number; tone: DayPulsePrimaryKpi["tone"] } {
  if (value == null) {
    return { display: "—", tone: "missing" };
  }
  const pct =
    target != null && target > 0 ? Math.round((value / target) * 100) : undefined;
  const unitSuffix = unit ? ` ${unit}` : "";
  const base = target != null ? `${value} / ${target}${unitSuffix}` : `${value}${unitSuffix}`;
  const display = pct != null ? `${base} (${pct}%)` : base;
  let tone: DayPulsePrimaryKpi["tone"] = "ok";
  if (pct != null) {
    if (pct >= 50) tone = "ok";
    else if (pct > 0) tone = "warn";
    else tone = "warn";
  } else if (value === 0) {
    tone = "warn";
  }
  return { display, pct, tone };
}

export function evaluateDayPulse(input: EvaluateDayPulseInput): DayPulseView | null {
  const checkpoint = resolveActivePulseCheckpoint(input.cadence.day_index);
  if (!checkpoint) return null;

  const assessment = evaluateWeek1MetricsWithGa4Priority(
    input.cadence,
    input.profile,
    input.thesis,
    input.distributionOperator,
    input.influencerOperator,
    input.delegateOperator,
  );

  const gateTask = input.cadence.tasks.find((t) => t.owner === "user" || t.owner === "delegate");
  const gate = gateTask ? resolveOpsKpiGate(gateTask, input.cadence.thesis_id) : null;
  const preset = assessment.primaryKpiId
    ? KPI_PRESETS.find((p) => p.id === assessment.primaryKpiId)
    : gate
      ? KPI_PRESETS.find((p) => p.id === gate.presetId)
      : undefined;

  const name = preset?.name ?? gate?.name ?? "Primary KPI";
  const target = assessment.primaryTarget ?? preset?.defaultTarget ?? gate?.defaultTarget;
  const value = assessment.primaryValue;
  const formatted = formatPrimaryKpiDisplay(name, value, target, preset?.unit);

  const thesisId = input.thesis?.id ?? input.cadence.thesis_id;
  const waitMessage =
    value == null && thesisId ? PULSE_WAIT_COPY[thesisId] : undefined;

  return {
    checkpoint,
    title: `Day ${checkpoint} Pulse`,
    primaryKpi: {
      name,
      value,
      target,
      pct: formatted.pct,
      unit: preset?.unit,
      tone: formatted.tone,
      display: formatted.display,
    },
    leadingIndicator: resolveLeadingIndicator(input),
    actionSuggestion: resolveActionSuggestion(input),
    verdict: assessment.verdict,
    sourceUsed: assessment.kpiSourceUsed,
    visible: true,
    waitMessage,
  };
}

export function buildMeasurementBaselineForPulse(
  profile?: MarketingProfile | null,
  project?: { hasAnalytics?: boolean } | null,
): MeasurementBaselineAssessment {
  return assessMeasurementBaseline(profile ?? null, project as import("./types").ProjectProfile | null);
}
