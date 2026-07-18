/**
 * P4 — Continuous CMO: measuring → intake with delta → Week N replan.
 * See CMO_CONTINUOUS_SPEC.md and PRODUCT_NORTH_STAR.md §11 P4.
 */
import type { ChannelThesis, ChannelThesisId, CmoIntakeContext } from "./cmoIntake";
import type { CampaignPhase, CampaignSession } from "./campaignSession";
import type { CmoOpsCadence, CmoPivotSuggestion } from "./cmoOpsCadence";
import type { Week1MetricAssessment } from "./cmoProofLoop";
import type { PivotVerdict } from "./cmoOpsCadence";
import type { BudgetSnapshot } from "./cmoBudgetPlane";
import type { RevenueSnapshot } from "./cmoRevenuePlane";

export type CmoCyclePhase = "executing" | "measuring" | "pivot_ready";

export interface CmoCycleKpiSnapshot {
  kpi_id?: string;
  kpi_name?: string;
  value?: number;
  target?: number;
  verdict?: PivotVerdict;
}

export interface CmoCycleRecord {
  cycle_index: number;
  thesis_id: ChannelThesisId;
  thesis_title: string;
  started_at: string;
  completed_at?: string;
  week_review_summary?: string;
  pivot_verdict?: PivotVerdict;
  primary_kpi?: CmoCycleKpiSnapshot;
  ops_cadence_id: string;
  lane_b_workspace_id?: string;
  /** P8 — archived hook performance from distribution operator */
  hook_summary?: string;
  delegate_summary?: string;
  /** P11 — archived experiment and message-learning snapshot. */
  memory_summary?: string;
  experiment_count?: number;
  winning_message_labels?: string[];
  /** P14 — immutable spend/CPA truth captured at week close. */
  budget_snapshot?: BudgetSnapshot;
  /** P16 — immutable revenue funnel/target truth captured at week close. */
  revenue_snapshot?: RevenueSnapshot;
}

export interface CmoSignalChange {
  key: string;
  before: string;
  after: string;
}

export interface CmoIntakeDelta {
  from_cycle_index: number;
  to_cycle_index: number;
  previous_thesis_id: ChannelThesisId;
  new_thesis_id: ChannelThesisId;
  thesis_changed: boolean;
  pivot_verdict?: PivotVerdict;
  signal_changes: CmoSignalChange[];
  kpi_movement?: {
    kpi_id: string;
    before?: number;
    after?: number;
    pct_of_target?: number;
  };
  headline: string;
  rationale: string[];
  /** P11 — experiment/message evidence that shaped the replan. */
  memory_rationale?: string[];
  computed_at: string;
}

export interface CmoContinuousState {
  current_cycle_index: number;
  phase: CmoCyclePhase;
  cycles: CmoCycleRecord[];
  pending_delta?: CmoIntakeDelta;
  accepted_pivot_thesis_id?: ChannelThesisId;
  campaign_session_id?: string;
  /** P15 — explicit governance while product/activation is binding. */
  marketing_paused?: boolean;
  marketing_paused_reason?: string;
  product_loop_started_at?: string;
  marketing_resumed_at?: string;
  updated_at: string;
}

export type NextCycleMode = "pivot" | "double_down";

const SIGNAL_LABELS: Record<string, string> = {
  persona: "Persona",
  framework: "Framework",
  routes: "Routes",
  hero: "Hero route",
  bottleneck: "Bottleneck",
  bottleneck_label: "Bottleneck label",
  company_stage: "Company stage",
  has_analytics: "Analytics",
  product_class: "Product class",
  controversial_hook: "Viral hook",
  days_until_launch: "Days to launch",
  email_list: "Email list",
};

export function weekLabel(weekIndex: number): string {
  return `Week ${weekIndex}`;
}

export function createInitialContinuousState(opts?: {
  campaignSessionId?: string;
  now?: string;
}): CmoContinuousState {
  const now = opts?.now ?? new Date().toISOString();
  return {
    current_cycle_index: 1,
    phase: "executing",
    cycles: [],
    campaign_session_id: opts?.campaignSessionId,
    updated_at: now,
  };
}

export function hydrateContinuousStateFromJson(raw: unknown): CmoContinuousState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const phase = o.phase;
  if (phase !== "executing" && phase !== "measuring" && phase !== "pivot_ready") return null;

  const cycles: CmoCycleRecord[] = Array.isArray(o.cycles)
    ? o.cycles
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c) => ({
          cycle_index: Number(c.cycle_index ?? 1),
          thesis_id: String(c.thesis_id) as ChannelThesisId,
          thesis_title: String(c.thesis_title ?? ""),
          started_at: String(c.started_at ?? new Date().toISOString()),
          completed_at: typeof c.completed_at === "string" ? c.completed_at : undefined,
          week_review_summary:
            typeof c.week_review_summary === "string" ? c.week_review_summary : undefined,
          pivot_verdict:
            c.pivot_verdict === "flat" ||
            c.pivot_verdict === "promising" ||
            c.pivot_verdict === "insufficient_data"
              ? (c.pivot_verdict as PivotVerdict)
              : undefined,
          primary_kpi:
            c.primary_kpi && typeof c.primary_kpi === "object"
              ? (c.primary_kpi as CmoCycleKpiSnapshot)
              : undefined,
          ops_cadence_id: String(c.ops_cadence_id ?? ""),
          lane_b_workspace_id:
            typeof c.lane_b_workspace_id === "string" ? c.lane_b_workspace_id : undefined,
          hook_summary: typeof c.hook_summary === "string" ? c.hook_summary : undefined,
          delegate_summary:
            typeof c.delegate_summary === "string" ? c.delegate_summary : undefined,
          memory_summary:
            typeof c.memory_summary === "string" ? c.memory_summary : undefined,
          experiment_count:
            typeof c.experiment_count === "number" ? c.experiment_count : undefined,
          winning_message_labels: Array.isArray(c.winning_message_labels)
            ? c.winning_message_labels.filter(
                (label): label is string => typeof label === "string",
              )
            : undefined,
          budget_snapshot:
            c.budget_snapshot && typeof c.budget_snapshot === "object"
              ? (c.budget_snapshot as BudgetSnapshot)
              : undefined,
          revenue_snapshot:
            c.revenue_snapshot && typeof c.revenue_snapshot === "object"
              ? (c.revenue_snapshot as RevenueSnapshot)
              : undefined,
        }))
        .filter((c) => c.ops_cadence_id.length > 0)
    : [];

  let pending_delta: CmoIntakeDelta | undefined;
  if (o.pending_delta && typeof o.pending_delta === "object") {
    const d = o.pending_delta as Record<string, unknown>;
    pending_delta = {
      from_cycle_index: Number(d.from_cycle_index ?? 1),
      to_cycle_index: Number(d.to_cycle_index ?? 2),
      previous_thesis_id: String(d.previous_thesis_id) as ChannelThesisId,
      new_thesis_id: String(d.new_thesis_id) as ChannelThesisId,
      thesis_changed: Boolean(d.thesis_changed),
      pivot_verdict:
        d.pivot_verdict === "flat" ||
        d.pivot_verdict === "promising" ||
        d.pivot_verdict === "insufficient_data"
          ? d.pivot_verdict
          : undefined,
      signal_changes: Array.isArray(d.signal_changes)
        ? d.signal_changes
            .filter((s): s is CmoSignalChange => !!s && typeof s === "object")
            .map((s) => ({
              key: String((s as CmoSignalChange).key),
              before: String((s as CmoSignalChange).before),
              after: String((s as CmoSignalChange).after),
            }))
        : [],
      headline: String(d.headline ?? ""),
      rationale: Array.isArray(d.rationale)
        ? d.rationale.filter((r): r is string => typeof r === "string")
        : [],
      memory_rationale: Array.isArray(d.memory_rationale)
        ? d.memory_rationale.filter((r): r is string => typeof r === "string")
        : undefined,
      computed_at: String(d.computed_at ?? new Date().toISOString()),
      kpi_movement:
        d.kpi_movement && typeof d.kpi_movement === "object"
          ? (d.kpi_movement as CmoIntakeDelta["kpi_movement"])
          : undefined,
    };
  }

  return {
    current_cycle_index: Number(o.current_cycle_index ?? 1),
    phase,
    cycles,
    pending_delta,
    accepted_pivot_thesis_id:
      typeof o.accepted_pivot_thesis_id === "string"
        ? (o.accepted_pivot_thesis_id as ChannelThesisId)
        : undefined,
    campaign_session_id:
      typeof o.campaign_session_id === "string" ? o.campaign_session_id : undefined,
    marketing_paused: o.marketing_paused === true,
    marketing_paused_reason:
      typeof o.marketing_paused_reason === "string" ? o.marketing_paused_reason : undefined,
    product_loop_started_at:
      typeof o.product_loop_started_at === "string" ? o.product_loop_started_at : undefined,
    marketing_resumed_at:
      typeof o.marketing_resumed_at === "string" ? o.marketing_resumed_at : undefined,
    updated_at: typeof o.updated_at === "string" ? o.updated_at : new Date().toISOString(),
  };
}

/** Archive a completed ops week into cycle history and enter measuring phase. */
export function archiveCompletedCycle(
  state: CmoContinuousState,
  input: {
    cadence: CmoOpsCadence;
    thesis: ChannelThesis;
    assessment: Week1MetricAssessment;
    weekReviewSummary: string;
    pivot?: CmoPivotSuggestion | null;
    laneBWorkspaceId?: string;
    hookSummary?: string;
    delegateSummary?: string;
    memorySummary?: string;
    experimentCount?: number;
    winningMessageLabels?: string[];
    budgetSnapshot?: BudgetSnapshot;
    revenueSnapshot?: RevenueSnapshot;
    now?: string;
  },
): CmoContinuousState {
  const now = input.now ?? new Date().toISOString();
  const record: CmoCycleRecord = {
    cycle_index: input.cadence.week_index,
    thesis_id: input.thesis.id,
    thesis_title: input.thesis.title,
    started_at: input.cadence.started_at,
    completed_at: input.cadence.week_review.completed_at ?? now,
    week_review_summary: input.weekReviewSummary.trim(),
    pivot_verdict: input.pivot?.verdict ?? input.assessment.verdict,
    primary_kpi:
      input.assessment.primaryKpiId != null
        ? {
            kpi_id: input.assessment.primaryKpiId,
            value: input.assessment.primaryValue,
            target: input.assessment.primaryTarget,
            verdict: input.assessment.verdict,
          }
        : undefined,
    ops_cadence_id: input.cadence.id,
    lane_b_workspace_id: input.laneBWorkspaceId,
    hook_summary: input.hookSummary,
    delegate_summary: input.delegateSummary,
    memory_summary: input.memorySummary,
    experiment_count: input.experimentCount,
    winning_message_labels: input.winningMessageLabels,
    budget_snapshot: input.budgetSnapshot,
    revenue_snapshot: input.revenueSnapshot,
  };

  const cycles = [
    ...state.cycles.filter((c) => c.cycle_index !== record.cycle_index),
    record,
  ].sort((a, b) => a.cycle_index - b.cycle_index);

  const phase: CmoCyclePhase =
    input.pivot?.verdict === "flat" && !input.pivot.dismissed_at
      ? "pivot_ready"
      : "measuring";

  return {
    ...state,
    current_cycle_index: input.cadence.week_index,
    phase,
    cycles,
    updated_at: now,
  };
}

export function buildIntakeDelta(
  priorThesis: ChannelThesis,
  nextThesis: ChannelThesis,
  opts: {
    fromCycleIndex: number;
    toCycleIndex: number;
    assessment?: Week1MetricAssessment;
    pivot?: CmoPivotSuggestion | null;
    memoryRationale?: string[];
    priorKpiValue?: number;
    now?: string;
  },
): CmoIntakeDelta {
  const signal_changes: CmoSignalChange[] = [];
  const keys = new Set([
    ...Object.keys(priorThesis.signals),
    ...Object.keys(nextThesis.signals),
  ]);

  for (const key of keys) {
    const before = priorThesis.signals[key] ?? "—";
    const after = nextThesis.signals[key] ?? "—";
    if (before !== after) {
      signal_changes.push({ key, before, after });
    }
  }

  const thesis_changed = priorThesis.id !== nextThesis.id;
  const wl = weekLabel(opts.toCycleIndex);
  const headline = thesis_changed
    ? `${wl}: pivot ${priorThesis.title} → ${nextThesis.title}`
    : `${wl}: double down on ${nextThesis.title}`;

  const rationale: string[] = [];
  if (opts.pivot?.rationale[0]) rationale.push(opts.pivot.rationale[0]);
  if (thesis_changed) {
    rationale.push(
      `Channel thesis shifts from ${priorThesis.headline.slice(0, 100)} to ${nextThesis.headline.slice(0, 100)}.`,
    );
  } else {
    rationale.push(
      "Metrics were flat but thesis still has room — tighten execution before switching channels.",
    );
  }
  if (signal_changes.length > 0) {
    const top = signal_changes
      .slice(0, 3)
      .map((s) => `${SIGNAL_LABELS[s.key] ?? s.key}: ${s.before} → ${s.after}`);
    rationale.push(`Scan delta: ${top.join(" · ")}`);
  }

  let kpi_movement: CmoIntakeDelta["kpi_movement"];
  if (opts.assessment?.primaryKpiId) {
    const after = opts.assessment.primaryValue;
    const before = opts.priorKpiValue ?? after;
    kpi_movement = {
      kpi_id: opts.assessment.primaryKpiId,
      before,
      after,
      pct_of_target: opts.assessment.pctOfTarget,
    };
  }

  return {
    from_cycle_index: opts.fromCycleIndex,
    to_cycle_index: opts.toCycleIndex,
    previous_thesis_id: priorThesis.id,
    new_thesis_id: nextThesis.id,
    thesis_changed,
    pivot_verdict: opts.pivot?.verdict ?? opts.assessment?.verdict,
    signal_changes,
    kpi_movement,
    headline,
    rationale,
    memory_rationale: opts.memoryRationale,
    computed_at: opts.now ?? new Date().toISOString(),
  };
}

export function buildIntakeContextForNextCycle(
  cadence: CmoOpsCadence,
  continuous: CmoContinuousState,
  forceThesisId: ChannelThesisId,
  mode: NextCycleMode,
): CmoIntakeContext {
  const nextWeek = cadence.week_index + 1;
  const priorCycle = continuous.cycles.find((c) => c.cycle_index === cadence.week_index);
  return {
    cycle_index: nextWeek,
    force_thesis_id: forceThesisId,
    previous_thesis_id: cadence.thesis_id,
    pivot_verdict: cadence.pivot_suggestion?.verdict ?? priorCycle?.pivot_verdict,
    prior_primary_kpi_value: priorCycle?.primary_kpi?.value,
    prior_primary_kpi_target: priorCycle?.primary_kpi?.target,
    mode,
  };
}

export function resolveNextCycleThesisId(
  cadence: CmoOpsCadence,
  opts: { mode: NextCycleMode; explicitThesisId?: ChannelThesisId },
): ChannelThesisId {
  if (opts.explicitThesisId) return opts.explicitThesisId;
  if (opts.mode === "double_down") return cadence.thesis_id;
  const pivot = cadence.pivot_suggestion;
  if (pivot?.suggested_thesis_ids[0]) return pivot.suggested_thesis_ids[0];
  return cadence.thesis_id;
}

export function canStartNextCycle(
  continuous: CmoContinuousState | null | undefined,
  cadence: CmoOpsCadence | null | undefined,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!continuous) errors.push("No CMO cycle history — complete Week 1 first.");
  if (!cadence) errors.push("No active ops cadence.");
  if (cadence && cadence.week_review.status !== "completed") {
    errors.push(`Close ${weekLabel(cadence.week_index)} review before starting the next cycle.`);
  }
  if (
    continuous &&
    continuous.phase !== "measuring" &&
    continuous.phase !== "pivot_ready"
  ) {
    errors.push("Finish the current executing week before replanning.");
  }
  if (continuous && cadence) {
    const archived = continuous.cycles.some((c) => c.cycle_index === cadence.week_index);
    if (!archived) {
      errors.push(`${weekLabel(cadence.week_index)} outcomes not archived yet.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Campaign is in measuring and week review closed — ready for Week N+1 CTA. */
export function isContinuousReplanReady(
  continuous: CmoContinuousState | null | undefined,
  cadence: CmoOpsCadence | null | undefined,
  campaignPhase?: CampaignPhase | null,
): boolean {
  if (!continuous || !cadence) return false;
  if (cadence.week_review.status !== "completed") return false;
  if (continuous.phase !== "measuring" && continuous.phase !== "pivot_ready") return false;
  if (campaignPhase && campaignPhase !== "measuring") return false;
  return continuous.cycles.some((c) => c.cycle_index === cadence.week_index);
}

export function applyNextCycleStarted(
  state: CmoContinuousState,
  delta: CmoIntakeDelta,
  opts: { weekIndex: number; thesisId: ChannelThesisId; mode: NextCycleMode; now?: string },
): CmoContinuousState {
  const now = opts.now ?? new Date().toISOString();
  return {
    ...state,
    current_cycle_index: opts.weekIndex,
    phase: "executing",
    pending_delta: delta,
    accepted_pivot_thesis_id: opts.mode === "pivot" ? opts.thesisId : undefined,
    updated_at: now,
  };
}

export function cycleHistorySummary(state: CmoContinuousState): string {
  if (state.cycles.length === 0) return "No completed cycles yet.";
  const last = state.cycles[state.cycles.length - 1]!;
  const kpi =
    last.primary_kpi?.value != null
      ? `${last.primary_kpi.kpi_id}: ${last.primary_kpi.value}`
      : "KPI not logged";
  return `${weekLabel(last.cycle_index)} · ${last.thesis_title} · ${kpi}`;
}

export function priorCycleForIndex(
  state: CmoContinuousState,
  cycleIndex: number,
): CmoCycleRecord | undefined {
  return state.cycles.find((c) => c.cycle_index === cycleIndex);
}

export function shouldPromptMeasuringIntake(
  session: CampaignSession | null | undefined,
  continuous: CmoContinuousState | null | undefined,
): boolean {
  return session?.phase === "measuring" && continuous?.phase === "pivot_ready";
}
