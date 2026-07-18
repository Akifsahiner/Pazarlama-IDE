/**
 * P11 — Growth Memory: deterministic experiment ledger, message learning,
 * and memory-aware Week N+1 replanning.
 */
import type { ChannelThesis, ChannelThesisId, CmoWeek1Priority } from "./cmoIntake";
import { createOpsCadenceFromThesis, type CmoOpsCadence, type PivotVerdict } from "./cmoOpsCadence";
import type { LaneBWorkspace } from "./cmoLaneB";
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import type { DelegateOperatorWorkspace } from "./cmoDelegateOperator";
import type { LaneDWorkspace } from "./cmoLaneD";
import type { RevenueCloseout, RevenueProfile } from "./cmoRevenuePlane";
import { buildRevenueReplanPreview, harvestRevenueFromCycle } from "./cmoRevenuePlane";
import type { ExperimentRun, ManualKpi } from "./types";
import {
  buildBudgetReplanPreview,
  type BudgetBucketId,
  type BudgetChannelCloseout,
  type BudgetPlan,
} from "./cmoBudgetPlane";
import {
  buildEngineReplanHints,
  harvestEngineSignalsFromCycle,
  type GrowthMechanismProfile,
} from "./cmoGrowthEngine";
import type { GrowthMechanismId } from "./cmoGrowthMechanismKnowledge";

export type GrowthMessageKind =
  | "hook"
  | "pitch"
  | "outbound_opener"
  | "post_copy"
  | "ops_proof_note";

export type GrowthMessageVerdict = "winner" | "loser" | "neutral" | "unscored";

export interface GrowthMessageRecord {
  id: string;
  cycle_index: number;
  thesis_id: ChannelThesisId;
  kind: GrowthMessageKind;
  label: string;
  body: string;
  source_ref: string;
  metric_name?: string;
  metric_value?: number;
  metric_target?: number;
  verdict: GrowthMessageVerdict;
  evidence: string[];
  recorded_at: string;
}

export type GrowthExperimentSource =
  | "ops_task"
  | "lane_b"
  | "distribution_slot"
  | "influencer_touch"
  | "delegate_rubric"
  | "lane_a_run"
  | "budget_bucket"
  | "product_fix"
  | "revenue_signal"
  | "engine_signal";

export type GrowthExperimentOutcome = "won" | "lost" | "inconclusive" | "running";

export interface GrowthExperimentRecord {
  id: string;
  cycle_index: number;
  thesis_id: ChannelThesisId;
  source: GrowthExperimentSource;
  source_id: string;
  hypothesis: string;
  primary_metric?: { id: string; value: number; target?: number };
  outcome: GrowthExperimentOutcome;
  learning: string;
  message_ids: string[];
  evidence_urls?: string[];
  spend_usd?: number;
  outcomes?: number;
  cpa_usd?: number;
  cpa_confidence?: "measured" | "insufficient_data";
  bucket_id?: BudgetBucketId;
  recorded_at: string;
}

export interface GrowthReplanRecommendation {
  mode: "double_down" | "pivot";
  target_thesis_id?: ChannelThesisId;
  rationale: string[];
  winning_message_ids: string[];
  losing_message_ids: string[];
  ops_mutations: Array<{
    priority_index: number;
    what: string;
    why: string;
    done_when: string;
  }>;
  operator_hints: {
    winning_hook_id?: string;
    winning_pitch_id?: string;
    kill_hook_ids?: string[];
    kill_pitch_ids?: string[];
  };
  budget_mutations?: Array<{
    bucket_id: BudgetBucketId;
    from_pct: number;
    to_pct: number;
    reason: string;
  }>;
  budget_hints?: {
    scale_bucket_id?: BudgetBucketId;
    cut_bucket_ids?: BudgetBucketId[];
    weekly_cap_overrides?: Partial<Record<BudgetBucketId, number>>;
    confidence?: "measured" | "assumption" | "stretch";
  };
  product_hints?: {
    marketing_status: "paused" | "resume_ready";
    open_request_count: number;
    confidence: "measured" | "assumption" | "missing";
    reason: string;
  };
  revenue_hints?: {
    hints: Array<{ kind: string; headline: string; rationale: string }>;
    pricing_pivot?: string;
    confidence: "measured" | "assumption" | "missing";
  };
  /** P17 — mechanism failure-mode watch list for replan. */
  engine_hints?: Array<{ headline: string; rationale: string }>;
  headline: string;
  computed_at: string;
}

export interface GrowthMemoryState {
  id: string;
  project_id?: string;
  messages: GrowthMessageRecord[];
  experiments: GrowthExperimentRecord[];
  pending_replan?: GrowthReplanRecommendation;
  last_harvest_cycle_index?: number;
  updated_at: string;
}

export interface GrowthMemoryAssessment {
  verdict?: PivotVerdict;
  pctOfTarget?: number;
}

export interface HarvestGrowthMemoryInput {
  memory: GrowthMemoryState;
  cadence: CmoOpsCadence;
  thesis: ChannelThesis;
  laneB?: LaneBWorkspace | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
  budgetCloseout?: BudgetChannelCloseout[];
  laneD?: LaneDWorkspace | null;
  revenueCloseout?: RevenueCloseout;
  growthMechanismProfile?: GrowthMechanismProfile | null;
  now?: string;
}

function stableId(...parts: Array<string | number>): string {
  return parts
    .join(".")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

function outcomeFromVerdict(verdict: GrowthMessageVerdict): GrowthExperimentOutcome {
  if (verdict === "winner") return "won";
  if (verdict === "loser") return "lost";
  return verdict === "unscored" ? "running" : "inconclusive";
}

function firstMetricNumber(text?: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function classifyTextProof(text: string, hasUrl: boolean): GrowthMessageVerdict {
  const lower = text.toLowerCase();
  if (/\b(?:0|zero)\s+(?:repl(?:y|ies)|signup|conversion)/.test(lower)) return "loser";
  if (/\b(?:reply|replies|signup|conversion|booked|qualified)\b/.test(lower) && /\d/.test(lower)) {
    return firstMetricNumber(lower) === 0 ? "loser" : "winner";
  }
  return hasUrl || text.trim().length >= 8 ? "neutral" : "unscored";
}

export function createInitialGrowthMemory(projectId?: string, now = new Date().toISOString()): GrowthMemoryState {
  return {
    id: `memory.${projectId ?? "local"}`,
    project_id: projectId,
    messages: [],
    experiments: [],
    updated_at: now,
  };
}

export function isGrowthMemoryGate(
  memory: GrowthMemoryState | null | undefined,
  cycleCount?: number,
): boolean {
  return !!memory && (memory.experiments.length > 0 || (cycleCount ?? 0) > 0);
}

function harvestDistribution(
  operator: DistributionOperatorWorkspace,
  cycleIndex: number,
  thesisId: ChannelThesisId,
  now: string,
): { messages: GrowthMessageRecord[]; experiments: GrowthExperimentRecord[] } {
  const messages: GrowthMessageRecord[] = [];
  const experiments: GrowthExperimentRecord[] = [];

  for (const hook of operator.hooks) {
    const measured = operator.slots.filter(
      (slot) => slot.hook_id === hook.id && slot.slot_kind === "post" && slot.proof?.retention_3s_pct != null,
    );
    if (!measured.length) continue;
    const target = hook.retention_target_3s ?? 60;
    const hits = measured.filter((slot) => (slot.proof?.retention_3s_pct ?? 0) >= target);
    const allLow = measured.every((slot) => (slot.proof?.retention_3s_pct ?? 0) < 45);
    const verdict: GrowthMessageVerdict = hits.length >= 2 ? "winner" : allLow ? "loser" : "neutral";
    const best = Math.max(...measured.map((slot) => slot.proof?.retention_3s_pct ?? 0));
    const messageId = stableId("memory", cycleIndex, "hook", hook.id);
    const evidence = [
      `${hits.length}/${measured.length} posts met ${target}% retention target`,
      `Best 3-second retention: ${best}%`,
    ];
    messages.push({
      id: messageId,
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      kind: "hook",
      label: hook.label,
      body: hook.script_hint,
      source_ref: hook.id,
      metric_name: "hook_retention_3s_pct",
      metric_value: best,
      metric_target: target,
      verdict,
      evidence,
      recorded_at: now,
    });
    experiments.push({
      id: stableId("experiment", cycleIndex, "hook", hook.id),
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      source: "distribution_slot",
      source_id: hook.id,
      hypothesis: `Hook ${hook.label} retention test`,
      primary_metric: { id: "hook_retention_3s_pct", value: best, target },
      outcome: outcomeFromVerdict(verdict),
      learning: evidence.join(" · "),
      message_ids: [messageId],
      evidence_urls: measured.flatMap((slot) => (slot.proof?.post_url ? [slot.proof.post_url] : [])),
      recorded_at: now,
    });
  }
  return { messages, experiments };
}

function harvestInfluencer(
  operator: InfluencerOperatorWorkspace,
  cycleIndex: number,
  thesisId: ChannelThesisId,
  now: string,
): { messages: GrowthMessageRecord[]; experiments: GrowthExperimentRecord[] } {
  const messages: GrowthMessageRecord[] = [];
  const experiments: GrowthExperimentRecord[] = [];

  for (const pitch of operator.pitches) {
    const sent = operator.touches.filter(
      (touch) => touch.pitch_id === pitch.id && !!touch.proof,
    );
    if (!sent.length) continue;
    const warm = sent.filter(
      (touch) =>
        touch.proof?.reply_received &&
        (touch.proof.reply_interest === "warm" || touch.proof.reply_interest === "hot"),
    );
    const replies = sent.filter((touch) => touch.proof?.reply_received).length;
    const verdict: GrowthMessageVerdict =
      warm.length >= 2 ? "winner" : sent.length >= 5 && replies === 0 ? "loser" : "neutral";
    const replyRate = Math.round((replies / sent.length) * 100);
    const messageId = stableId("memory", cycleIndex, "pitch", pitch.id);
    const evidence = [
      `${replies}/${sent.length} replies (${replyRate}%)`,
      `${warm.length} warm/hot replies`,
    ];
    messages.push({
      id: messageId,
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      kind: "pitch",
      label: pitch.label,
      body: pitch.script_scaffold,
      source_ref: pitch.id,
      metric_name: "influencer_pitch_reply_rate",
      metric_value: replyRate,
      metric_target: pitch.reply_target,
      verdict,
      evidence,
      recorded_at: now,
    });
    experiments.push({
      id: stableId("experiment", cycleIndex, "pitch", pitch.id),
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      source: "influencer_touch",
      source_id: pitch.id,
      hypothesis: `Pitch ${pitch.label} DM test`,
      primary_metric: {
        id: "influencer_pitch_reply_rate",
        value: replyRate,
        target: pitch.reply_target,
      },
      outcome: outcomeFromVerdict(verdict),
      learning: evidence.join(" · "),
      message_ids: [messageId],
      evidence_urls: sent.flatMap((touch) => (touch.proof?.thread_url ? [touch.proof.thread_url] : [])),
      recorded_at: now,
    });
  }
  return { messages, experiments };
}

function harvestLaneB(
  laneB: LaneBWorkspace,
  cycleIndex: number,
  thesisId: ChannelThesisId,
  now: string,
): { messages: GrowthMessageRecord[]; experiments: GrowthExperimentRecord[] } {
  const messages: GrowthMessageRecord[] = [];
  const experiments: GrowthExperimentRecord[] = [];
  for (const item of laneB.items.filter((candidate) => candidate.status === "done" && candidate.proof)) {
    const proof = item.proof!;
    const body = (proof.note ?? item.detail ?? item.title).trim();
    const kind: GrowthMessageKind =
      item.mode === "outreach_tracker" ? "outbound_opener" : "post_copy";
    const verdict =
      kind === "post_copy" && !proof.url && !proof.metric
        ? "loser"
        : classifyTextProof(`${proof.metric ?? ""} ${proof.note ?? ""}`, !!proof.url);
    const messageId = stableId("memory", cycleIndex, kind, item.id);
    messages.push({
      id: messageId,
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      kind,
      label: item.target_name || item.title,
      body,
      source_ref: item.id,
      metric_name: proof.metric ? "lane_b_proof" : undefined,
      metric_value: firstMetricNumber(proof.metric),
      verdict,
      evidence: [proof.metric, proof.url, proof.note].filter((value): value is string => !!value),
      recorded_at: now,
    });
    experiments.push({
      id: stableId("experiment", cycleIndex, "lane-b", item.id),
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      source: "lane_b",
      source_id: item.id,
      hypothesis: kind === "outbound_opener" ? "Outreach opener batch" : "Post copy test",
      primary_metric:
        proof.metric && firstMetricNumber(proof.metric) != null
          ? { id: "lane_b_proof", value: firstMetricNumber(proof.metric)! }
          : undefined,
      outcome: outcomeFromVerdict(verdict),
      learning: body || "Delivery recorded; more metric evidence needed.",
      message_ids: [messageId],
      evidence_urls: proof.url ? [proof.url] : undefined,
      recorded_at: now,
    });
  }
  return { messages, experiments };
}

function harvestOps(
  cadence: CmoOpsCadence,
  thesisId: ChannelThesisId,
  now: string,
): { messages: GrowthMessageRecord[]; experiments: GrowthExperimentRecord[] } {
  const messages: GrowthMessageRecord[] = [];
  const experiments: GrowthExperimentRecord[] = [];
  for (const task of cadence.tasks.filter((candidate) => candidate.status === "done" && candidate.proof)) {
    const proof = task.proof!;
    const body = (proof.note ?? proof.metric_snapshot ?? task.what).trim();
    const hasUrl = !!proof.urls?.length || !!proof.commit_sha;
    const verdict =
      proof.kpi_value != null && proof.kpi_target != null && proof.kpi_target > 0
        ? proof.kpi_value >= proof.kpi_target * 0.5
          ? "winner"
          : proof.kpi_value < proof.kpi_target * 0.2
            ? "loser"
            : "neutral"
        : classifyTextProof(`${proof.metric_snapshot ?? ""} ${proof.note ?? ""}`, hasUrl);
    const messageId = stableId("memory", cadence.week_index, "ops", task.id);
    messages.push({
      id: messageId,
      cycle_index: cadence.week_index,
      thesis_id: thesisId,
      kind: "ops_proof_note",
      label: task.what,
      body,
      source_ref: task.id,
      metric_name: proof.kpi_id,
      metric_value: proof.kpi_value,
      metric_target: proof.kpi_target,
      verdict,
      evidence: [
        ...(proof.urls ?? []),
        proof.metric_snapshot,
        proof.note,
      ].filter((value): value is string => !!value),
      recorded_at: now,
    });
    experiments.push({
      id: stableId("experiment", cadence.week_index, "ops", task.id),
      cycle_index: cadence.week_index,
      thesis_id: thesisId,
      source: "ops_task",
      source_id: task.id,
      hypothesis: `Ops execution: ${task.what}`,
      primary_metric:
        proof.kpi_id && proof.kpi_value != null
          ? { id: proof.kpi_id, value: proof.kpi_value, target: proof.kpi_target }
          : undefined,
      outcome: outcomeFromVerdict(verdict),
      learning: body || "Execution completed; more evidence needed.",
      message_ids: [messageId],
      evidence_urls: proof.urls,
      recorded_at: now,
    });
  }
  return { messages, experiments };
}

function harvestDelegate(
  operator: DelegateOperatorWorkspace,
  cycleIndex: number,
  thesisId: ChannelThesisId,
  now: string,
): GrowthExperimentRecord[] {
  const experiments: GrowthExperimentRecord[] = [];
  for (const brief of operator.briefs) {
    const rubrics = operator.daily_rubrics.filter((rubric) => rubric.brief_id === brief.id);
    if (!rubrics.length) continue;
    const done = rubrics.filter((rubric) => rubric.status === "done").length;
    const pct = Math.round((done / rubrics.length) * 100);
    experiments.push({
      id: stableId("experiment", cycleIndex, "delegate", brief.id),
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      source: "delegate_rubric",
      source_id: brief.id,
      hypothesis: `Delegate trial: ${brief.title}`,
      primary_metric: { id: "delegate_rubric_completion_pct", value: pct, target: 85 },
      outcome: pct >= 85 ? "won" : pct < 40 ? "lost" : "inconclusive",
      learning: `${done}/${rubrics.length} rubric days completed (${pct}%).`,
      message_ids: [],
      evidence_urls: rubrics.flatMap((rubric) => (rubric.proof_url ? [rubric.proof_url] : [])),
      recorded_at: now,
    });
  }
  return experiments;
}

export function harvestBudgetFromCycle(
  closeout: BudgetChannelCloseout[],
  cycleIndex: number,
  thesisId: ChannelThesisId,
  now = new Date().toISOString(),
): GrowthExperimentRecord[] {
  return closeout
    .filter((row) => row.actual_spend_usd > 0)
    .map((row) => ({
      id: stableId("experiment", cycleIndex, "budget", row.bucket_id),
      cycle_index: cycleIndex,
      thesis_id: thesisId,
      source: "budget_bucket" as const,
      source_id: row.bucket_id,
      hypothesis: `Week ${cycleIndex} ${row.bucket_id} spend efficiency`,
      primary_metric:
        row.cpa_usd != null
          ? { id: `${row.bucket_id}_cpa_usd`, value: row.cpa_usd }
          : { id: `${row.bucket_id}_spend_usd`, value: row.actual_spend_usd },
      outcome: "inconclusive" as const,
      learning:
        row.cpa_confidence === "measured"
          ? `Spent $${row.actual_spend_usd}, ${row.outcomes} outcomes, CPA $${row.cpa_usd} measured.`
          : `Spent $${row.actual_spend_usd}; CPA unavailable until outcomes are measured.`,
      message_ids: [],
      spend_usd: row.actual_spend_usd,
      outcomes: row.outcomes,
      cpa_usd: row.cpa_usd,
      cpa_confidence: row.cpa_confidence,
      bucket_id: row.bucket_id,
      recorded_at: now,
    }));
}

export function harvestProductFixesFromCycle(
  workspace: LaneDWorkspace,
  cycleIndex: number,
  thesisId: ChannelThesisId,
  now = new Date().toISOString(),
): GrowthExperimentRecord[] {
  return workspace.requests
    .filter((request) => request.status === "shipped")
    .map((request) => {
      const value = request.proof?.metric_value;
      const target = request.target_metric?.value;
      return {
        id: stableId("experiment", cycleIndex, "product", request.id),
        cycle_index: cycleIndex,
        thesis_id: thesisId,
        source: "product_fix" as const,
        source_id: request.id,
        hypothesis: request.growth_impact,
        primary_metric:
          value != null
            ? { id: request.proof?.metric_name ?? "activation_metric", value, target }
            : undefined,
        outcome:
          value != null && target != null
            ? value >= target
              ? ("won" as const)
              : ("lost" as const)
            : ("inconclusive" as const),
        learning:
          value != null
            ? `${request.title} shipped; measured ${request.proof?.metric_name ?? "activation"}: ${value}.`
            : `${request.title} shipped; activation outcome still needs measurement.`,
        message_ids: [],
        evidence_urls: [request.proof?.pr_url, request.proof?.issue_url].filter(
          (url): url is string => Boolean(url),
        ),
        recorded_at: now,
      };
    });
}

export function classifyGrowthMessages(messages: GrowthMessageRecord[]): GrowthMessageRecord[] {
  return messages.map((message) => {
    if (message.kind === "hook" && message.metric_value != null) {
      return {
        ...message,
        verdict:
          message.evidence[0]?.startsWith("2/") || message.evidence[0]?.match(/^[3-9]\//)
            ? "winner"
            : message.metric_value < 45
              ? "loser"
              : message.verdict,
      };
    }
    if (message.kind === "pitch" && message.metric_value != null) return message;
    return message;
  });
}

export function appendExperimentLedger(
  memory: GrowthMemoryState,
  messages: GrowthMessageRecord[],
  experiments: GrowthExperimentRecord[],
  cycleIndex: number,
  now = new Date().toISOString(),
): GrowthMemoryState {
  const messageKeys = new Set(messages.map((message) => message.id));
  const experimentKeys = new Set(experiments.map((experiment) => experiment.id));
  return {
    ...memory,
    messages: [
      ...memory.messages.filter((message) => !messageKeys.has(message.id)),
      ...messages,
    ],
    experiments: [
      ...memory.experiments.filter((experiment) => !experimentKeys.has(experiment.id)),
      ...experiments,
    ],
    last_harvest_cycle_index: cycleIndex,
    updated_at: now,
  };
}

export function harvestMemoryFromCycle(input: HarvestGrowthMemoryInput): GrowthMemoryState {
  const now = input.now ?? new Date().toISOString();
  const cycleIndex = input.cadence.week_index;
  const harvested = [
    harvestOps(input.cadence, input.thesis.id, now),
    input.laneB ? harvestLaneB(input.laneB, cycleIndex, input.thesis.id, now) : null,
    input.distributionOperator
      ? harvestDistribution(input.distributionOperator, cycleIndex, input.thesis.id, now)
      : null,
    input.influencerOperator
      ? harvestInfluencer(input.influencerOperator, cycleIndex, input.thesis.id, now)
      : null,
  ].filter((value): value is { messages: GrowthMessageRecord[]; experiments: GrowthExperimentRecord[] } => !!value);
  const messages = classifyGrowthMessages(harvested.flatMap((value) => value.messages));
  const experiments = harvested.flatMap((value) => value.experiments);
  if (input.delegateOperator) {
    experiments.push(...harvestDelegate(input.delegateOperator, cycleIndex, input.thesis.id, now));
  }
  if (input.budgetCloseout) {
    experiments.push(...harvestBudgetFromCycle(input.budgetCloseout, cycleIndex, input.thesis.id, now));
  }
  if (input.laneD) {
    experiments.push(...harvestProductFixesFromCycle(input.laneD, cycleIndex, input.thesis.id, now));
  }
  if (input.revenueCloseout) {
    experiments.push(
      ...harvestRevenueFromCycle(input.revenueCloseout, cycleIndex, input.thesis.id, now),
    );
  }
  const mechanismId =
    (input.thesis.signals?.primary_mechanism_id as GrowthMechanismId | undefined) ??
    input.growthMechanismProfile?.primary_mechanism_id;
  if (mechanismId) {
    const programSteps = input.cadence.tasks.filter((task) => task.status === "done").length;
    experiments.push(
      ...harvestEngineSignalsFromCycle({
        mechanismId,
        cycleIndex,
        thesisId: input.thesis.id,
        programStepsCompleted: programSteps,
        now,
      }),
    );
  }
  return appendExperimentLedger(input.memory, messages, experiments, cycleIndex, now);
}

export function recommendNextCycleMode(
  memory: GrowthMemoryState,
  assessment?: GrowthMemoryAssessment,
): "double_down" | "pivot" {
  const cycle = memory.last_harvest_cycle_index;
  const current = cycle == null ? memory.messages : memory.messages.filter((message) => message.cycle_index === cycle);
  const winners = current.filter((message) => message.verdict === "winner");
  const losers = current.filter((message) => message.verdict === "loser");
  if (winners.length > 0 && (assessment?.pctOfTarget ?? 50) >= 50) return "double_down";
  const loserKinds = new Map<GrowthMessageKind, number>();
  for (const loser of losers) loserKinds.set(loser.kind, (loserKinds.get(loser.kind) ?? 0) + 1);
  if (
    assessment?.verdict === "flat" ||
    [...loserKinds.values()].some((count) => count >= 2) ||
    ((assessment?.pctOfTarget ?? 100) < 20 && losers.length > 0)
  ) {
    return "pivot";
  }
  if (assessment?.verdict === "promising" || (assessment?.pctOfTarget ?? 0) >= 50) {
    return "double_down";
  }
  return winners.length > 0 ? "double_down" : "pivot";
}

export function mutatePrioritiesFromMemory(
  basePriorities: CmoWeek1Priority[],
  memory: GrowthMemoryState,
  weekIndex: number,
  mode: "double_down" | "pivot",
): CmoWeek1Priority[] {
  const relevant = memory.messages.filter((message) => message.cycle_index === memory.last_harvest_cycle_index);
  const winner = relevant.find((message) => message.verdict === "winner");
  const losers = relevant.filter((message) => message.verdict === "loser");
  const priorities = basePriorities.map((priority, index) => ({
    ...priority,
    id: priority.id.replace(/\.w\d+\./, `.w${weekIndex}.`),
    ...(index === 0 && mode === "double_down" && winner
      ? {
          what:
            winner.kind === "hook"
              ? `Film 5 variants of winning hook: ${winner.label}`
              : winner.kind === "pitch"
                ? `Send 25 DMs using winning pitch: ${winner.label}`
                : `Scale winning message: ${winner.label}`,
          why: `${winner.evidence[0] ?? "This message produced the strongest verified signal."}${
            losers.length ? ` Retire ${losers.map((message) => message.label).join(", ")}.` : ""
          }`,
          done_when:
            winner.kind === "hook"
              ? "5 variants published · retention proof logged"
              : winner.kind === "pitch"
                ? "25 DMs sent · replies logged by pitch"
                : priority.done_when,
        }
      : {}),
    ...(mode === "pivot" && losers.length
      ? {
          why: `${priority.why} Prior cycle losers: ${losers.map((message) => message.label).join(", ")}.`,
        }
      : {}),
  }));
  if (weekIndex >= 3 && priorities.length < 3) {
    priorities.push({
      id: `memory.w${weekIndex}.${priorities.length}`,
      what: "Review the message ledger and retire the bottom performer",
      why: "Keep the campaign focused on evidence-backed messages.",
      owner: "user",
      done_when: "One loser retired · next variant documented",
    });
  }
  return priorities;
}

export function buildReplanPreview(
  memory: GrowthMemoryState,
  input: {
    thesis: ChannelThesis;
    nextWeekIndex: number;
    assessment?: GrowthMemoryAssessment;
    preferredMode?: "double_down" | "pivot";
    budgetPlan?: BudgetPlan | null;
    budgetCloseout?: BudgetChannelCloseout[];
    founderFit?: import("./types").FounderFitProfile;
    laneD?: LaneDWorkspace | null;
    revenueProfile?: RevenueProfile | null;
    revenueCloseout?: RevenueCloseout;
    gaps?: string[];
    weekIndex?: number;
    growthMechanismProfile?: GrowthMechanismProfile | null;
    now?: string;
  },
): GrowthReplanRecommendation {
  const mode = input.preferredMode ?? recommendNextCycleMode(memory, input.assessment);
  const current = memory.messages.filter((message) => message.cycle_index === memory.last_harvest_cycle_index);
  const winners = current.filter((message) => message.verdict === "winner");
  const losers = current.filter((message) => message.verdict === "loser");
  const priorities = mutatePrioritiesFromMemory(
    input.thesis.week1_priorities,
    memory,
    input.nextWeekIndex,
    mode,
  );
  const winningHook = winners.find((message) => message.kind === "hook");
  const winningPitch = winners.find((message) => message.kind === "pitch");
  const headline =
    mode === "double_down"
      ? `Week ${input.nextWeekIndex}: double down on ${winners[0]?.label ?? input.thesis.title}`
      : `Week ${input.nextWeekIndex}: pivot to ${input.thesis.title}`;
  const budgetPreview =
    input.budgetPlan && input.budgetCloseout
      ? buildBudgetReplanPreview(input.budgetPlan, input.budgetCloseout, {
          mode,
          targetThesisId: input.thesis.id,
          founderFit: input.founderFit,
        })
      : undefined;
  const openProductRequests =
    input.laneD?.requests.filter(
      (request) => request.status !== "shipped" && request.status !== "skipped",
    ).length ?? 0;
  const productHints = input.laneD
    ? {
        marketing_status: (
          input.laneD.marketing_paused && openProductRequests > 0 ? "paused" : "resume_ready"
        ) as "paused" | "resume_ready",
        open_request_count: openProductRequests,
        confidence: input.laneD.product_binding.confidence,
        reason:
          openProductRequests > 0
            ? `${openProductRequests} P0 product request(s) remain open; keep marketing paused.`
            : "All P0 product requests are terminal; founder can resume marketing.",
      }
    : undefined;
  const revenuePreview =
    input.revenueProfile && input.revenueCloseout
      ? buildRevenueReplanPreview({
          profile: input.revenueProfile,
          closeout: input.revenueCloseout,
          weekIndex: input.weekIndex ?? input.nextWeekIndex,
          gaps: input.gaps,
        })
      : undefined;
  const engineHints = input.growthMechanismProfile
    ? buildEngineReplanHints(input.growthMechanismProfile)
    : undefined;
  return {
    mode,
    target_thesis_id: input.thesis.id,
    rationale: [
      ...(winners.length
        ? [`Winners: ${winners.map((message) => message.label).join(", ")}`]
        : []),
      ...(losers.length
        ? [`Losers: ${losers.map((message) => message.label).join(", ")}`]
        : []),
      `${memory.experiments.filter((experiment) => experiment.cycle_index === memory.last_harvest_cycle_index).length} experiments harvested.`,
      ...(budgetPreview?.rationale ?? []),
      ...(productHints ? [productHints.reason] : []),
      ...(revenuePreview?.hints.map((hint) => hint.headline) ?? []),
    ],
    winning_message_ids: winners.map((message) => message.id),
    losing_message_ids: losers.map((message) => message.id),
    ops_mutations: priorities.map((priority, priority_index) => ({
      priority_index,
      what: priority.what,
      why: priority.why,
      done_when: priority.done_when,
    })),
    operator_hints: {
      winning_hook_id: winningHook?.source_ref,
      winning_pitch_id: winningPitch?.source_ref,
      kill_hook_ids: losers.filter((message) => message.kind === "hook").map((message) => message.source_ref),
      kill_pitch_ids: losers.filter((message) => message.kind === "pitch").map((message) => message.source_ref),
    },
    budget_mutations: budgetPreview?.mutations,
    budget_hints: budgetPreview
      ? {
          scale_bucket_id: budgetPreview.scale_bucket_id,
          cut_bucket_ids: budgetPreview.cut_bucket_ids,
          weekly_cap_overrides: budgetPreview.weekly_cap_overrides,
          confidence: budgetPreview.confidence,
        }
      : undefined,
    product_hints: productHints,
    revenue_hints: revenuePreview
      ? {
          hints: revenuePreview.hints,
          pricing_pivot: revenuePreview.pricing_pivot,
          confidence: revenuePreview.confidence,
        }
      : undefined,
    engine_hints: engineHints,
    headline,
    computed_at: input.now ?? new Date().toISOString(),
  };
}

export function replanLaneBFromMemory(
  workspace: LaneBWorkspace,
  preview: GrowthReplanRecommendation,
  memory: GrowthMemoryState,
): LaneBWorkspace {
  const winner = memory.messages.find((message) => preview.winning_message_ids.includes(message.id));
  if (!winner || preview.mode !== "double_down") return workspace;
  return {
    ...workspace,
    items: workspace.items.map((item, index) =>
      index < 3 && (item.mode === "posting_calendar" || item.mode === "outreach_tracker")
        ? {
            ...item,
            title: `${item.title} · ${winner.label}`,
            detail: `${item.detail ?? ""}${item.detail ? " " : ""}Use proven ${winner.kind}: ${winner.body}`.trim(),
          }
        : item,
    ),
  };
}

export function applyMemoryReplan(
  memory: GrowthMemoryState,
  thesis: ChannelThesis,
  preview: GrowthReplanRecommendation,
  opts: {
    weekIndex: number;
    campaignSessionId?: string;
    priorOpsCadenceId?: string;
    laneB?: LaneBWorkspace | null;
    now?: string;
  },
): {
  memory: GrowthMemoryState;
  thesis: ChannelThesis;
  cadence: CmoOpsCadence;
  laneB?: LaneBWorkspace;
} {
  const priorities = mutatePrioritiesFromMemory(
    thesis.week1_priorities,
    memory,
    opts.weekIndex,
    preview.mode,
  );
  const nextThesis = {
    ...thesis,
    week1_priorities: priorities,
    rationale: [...preview.rationale, ...thesis.rationale],
  };
  const cadence = createOpsCadenceFromThesis(nextThesis, {
    campaignSessionId: opts.campaignSessionId,
    week_index: opts.weekIndex,
    prior_ops_cadence_id: opts.priorOpsCadenceId,
    now: opts.now,
  });
  return {
    memory: {
      ...memory,
      pending_replan: undefined,
      updated_at: opts.now ?? new Date().toISOString(),
    },
    thesis: nextThesis,
    cadence,
    laneB: opts.laneB ? replanLaneBFromMemory(opts.laneB, preview, memory) : undefined,
  };
}

export function growthMemorySummary(
  memory: GrowthMemoryState,
  cycleIndex = memory.last_harvest_cycle_index,
): string {
  const messages = cycleIndex == null ? memory.messages : memory.messages.filter((message) => message.cycle_index === cycleIndex);
  const experiments =
    cycleIndex == null
      ? memory.experiments
      : memory.experiments.filter((experiment) => experiment.cycle_index === cycleIndex);
  return `${messages.filter((message) => message.verdict === "winner").length} winners · ${messages.filter((message) => message.verdict === "loser").length} losers · ${experiments.length} experiments`;
}

export function rollupGrowthMemoryKpis(
  memory: GrowthMemoryState,
  replanApplied = false,
  now = new Date().toISOString(),
): ManualKpi[] {
  const cycle = memory.last_harvest_cycle_index;
  const experiments = memory.experiments.filter((item) => cycle == null || item.cycle_index === cycle).length;
  const winners = memory.messages.filter(
    (item) => (cycle == null || item.cycle_index === cycle) && item.verdict === "winner",
  ).length;
  return [
    {
      id: "memory_experiments_logged",
      name: "Growth experiments logged",
      value: experiments,
      unit: "experiments",
      channel: "growth-memory",
      updated_at: now,
      source: "manual",
    },
    {
      id: "memory_winner_messages",
      name: "Winning messages",
      value: winners,
      unit: "messages",
      channel: "growth-memory",
      updated_at: now,
      source: "manual",
    },
    {
      id: "memory_replan_applied",
      name: "Memory replans applied",
      value: replanApplied ? 1 : 0,
      unit: "replans",
      channel: "growth-memory",
      updated_at: now,
      source: "manual",
    },
  ];
}

function migrateLegacyExperiment(
  experiment: ExperimentRun,
  thesisId: ChannelThesisId,
): GrowthExperimentRecord {
  return {
    id: stableId("legacy", experiment.id),
    cycle_index: 0,
    thesis_id: thesisId,
    source: "lane_a_run",
    source_id: experiment.id,
    hypothesis: experiment.hypothesis,
    primary_metric: experiment.metric
      ? { id: experiment.metric.name, value: experiment.metric.value }
      : undefined,
    outcome:
      experiment.outcome === "success"
        ? "won"
        : experiment.outcome === "failure"
          ? "lost"
          : experiment.outcome === "pending"
            ? "running"
            : "inconclusive",
    learning: experiment.learning ?? "Migrated from the legacy experiment log.",
    message_ids: [],
    evidence_urls: experiment.evidence_urls,
    recorded_at: experiment.date,
  };
}

export function hydrateGrowthMemoryFromJson(
  raw: unknown,
  opts?: {
    projectId?: string;
    thesisId?: ChannelThesisId;
    legacyExperiments?: ExperimentRun[];
  },
): GrowthMemoryState | null {
  const now = new Date().toISOString();
  let state: GrowthMemoryState;
  if (!raw || typeof raw !== "object") {
    if (!opts?.legacyExperiments?.length) return null;
    state = createInitialGrowthMemory(opts.projectId, now);
  } else {
    const value = raw as Partial<GrowthMemoryState>;
    state = {
      id: typeof value.id === "string" ? value.id : `memory.${opts?.projectId ?? "local"}`,
      project_id: typeof value.project_id === "string" ? value.project_id : opts?.projectId,
      messages: Array.isArray(value.messages) ? value.messages : [],
      experiments: Array.isArray(value.experiments) ? value.experiments : [],
      pending_replan:
        value.pending_replan && typeof value.pending_replan === "object"
          ? value.pending_replan
          : undefined,
      last_harvest_cycle_index:
        typeof value.last_harvest_cycle_index === "number"
          ? value.last_harvest_cycle_index
          : undefined,
      updated_at: typeof value.updated_at === "string" ? value.updated_at : now,
    };
  }
  const thesisId = opts?.thesisId;
  if (thesisId && opts?.legacyExperiments?.length) {
    const existingSources = new Set(state.experiments.map((experiment) => experiment.source_id));
    state.experiments.push(
      ...opts.legacyExperiments
        .filter((experiment) => !existingSources.has(experiment.id))
        .map((experiment) => migrateLegacyExperiment(experiment, thesisId)),
    );
  }
  return state;
}
