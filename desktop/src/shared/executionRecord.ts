/**
 * Part 0 — Execution Record view-model: composes P0–P17 slices into one accountability card.
 */
import type { ExecutionKernelState } from "./executionKernel";
import { executionTaskStatusToRecordLifecycle } from "./executionKernel";
import type { ChannelThesis } from "./cmoIntake";
import type { CmoContinuousState, CmoCycleRecord } from "./cmoContinuous";
import type { CmoOpsCadence, CmoOpsProof, CmoOpsTask } from "./cmoOpsCadence";
import { getNowTask } from "./cmoOpsCadence";
import type { GrowthMemoryState } from "./cmoGrowthMemory";
import type { GrowthControlPlane } from "./cmoGrowthPlane";
import {
  buildCommandSurfaceModel,
  resolveCommandSurfaceAction,
  type BuildCommandSurfaceModelInput,
  type CommandSurfaceAction,
  type CommandSurfaceGovernance,
} from "./cmoCommandSurface";
import { buildMorningBriefView, type MorningBriefView } from "./morningBrief";
import {
  shipReceiptToDoneItems,
  shipReceiptToResultChips,
  type ShipReceipt,
} from "./shipReceipt";
import { computeRunSummary, runChangedFiles } from "./runs";
import type { RunEvent, RunStatus, CampaignSession } from "./types";
import {
  evaluateDayPulse,
  resolveHonestEmptyKpiCopy,
  resolvePulseKpiPresetId,
  type DayPulseView,
} from "./measurementPulse";
import { buildHookLeaderboard, type HookLeaderboardRow } from "./hookLeaderboard";
import { buildKpiTrendSeries, type KpiTrendPoint } from "./kpiTrendSeries";
import {
  evaluateWeek1MetricsWithGa4Priority,
  readGa4MetricValue,
  resolveOpsKpiGate,
  hasGa4Connected,
} from "./cmoProofLoop";

export type ExecutionRecordLifecycle =
  | "intake"
  | "queued"
  | "running"
  | "paused"
  | "failed"
  | "verifying"
  | "awaiting_approval"
  | "awaiting_proof"
  | "applied"
  | "measured"
  | "learned"
  | "closed";

export type ExecutionRecordDetailTab = "diff" | "browser" | "proof" | "record";

export interface ExecutionDoneItem {
  id: string;
  label: string;
  detail?: string;
}

export interface ExecutionResultChip {
  id: string;
  label: string;
  value?: string;
  tone: "ok" | "warn" | "neutral" | "missing";
}

export interface ExecutionRecordView {
  id: string;
  goal: string;
  experiment: string;
  lifecycle: ExecutionRecordLifecycle;
  lifecycleLabel: string;
  done: ExecutionDoneItem[];
  results: ExecutionResultChip[];
  learned?: string;
  next: { label: string; action: CommandSurfaceAction };
  bottleneckSentence: string;
  detailHint: ExecutionRecordDetailTab;
  growthStatePlaceholder?: string;
  governance?: CommandSurfaceGovernance;
  morningBrief?: MorningBriefView;
  approvalHeroLine?: string;
  productLoopPaused?: boolean;
  dayPulse?: DayPulseView | null;
  hookLeaderboard?: HookLeaderboardRow[];
  kpiTrend?: KpiTrendPoint[];
}

export interface ExecutionHistoryEntry {
  id: string;
  goal: string;
  experiment: string;
  lifecycle: ExecutionRecordLifecycle;
  lifecycleLabel: string;
  done: ExecutionDoneItem[];
  results: ExecutionResultChip[];
  learned?: string;
  closedAt: string;
  weekIndex: number;
}

export interface ActiveRunSnapshot {
  runId: string;
  goal: string;
  status: RunStatus;
  kind?: "edit" | "browse" | "ask";
  events: RunEvent[];
  pendingApproval?: { approvalId: string };
  planTaskId?: string;
}

export interface BuildActiveExecutionRecordInput extends Omit<BuildCommandSurfaceModelInput, "plane"> {
  plane?: GrowthControlPlane;
  campaignSession?: CampaignSession | null;
  channelThesis?: ChannelThesis | null;
  growthMemory?: GrowthMemoryState | null;
  continuous?: CmoContinuousState | null;
  activeRun?: ActiveRunSnapshot | null;
  hasPendingApply?: boolean;
  firstShipAt?: number | null;
  wedgePhase?: string | null;
  narrativeOneLiner?: string;
  shipReceipt?: ShipReceipt | null;
  pendingVerify?: boolean;
  approvalFileCount?: number;
  marketingProfile?: import("./types").MarketingProfile | null;
  project?: import("./types").ProjectProfile | null;
  executionKernel?: ExecutionKernelState | null;
}

export interface BuildExecutionHistoryInput extends BuildActiveExecutionRecordInput {
  now?: number;
}

const LIFECYCLE_LABELS: Record<ExecutionRecordLifecycle, string> = {
  intake: "Setup",
  queued: "Queued",
  running: "Running",
  paused: "Paused",
  failed: "Failed — retry available",
  verifying: "Verifying live page",
  awaiting_approval: "Awaiting approval",
  awaiting_proof: "Awaiting proof",
  applied: "Applied",
  measured: "Measured",
  learned: "Learned",
  closed: "Closed",
};

const LIFECYCLE_RAIL: ExecutionRecordLifecycle[] = [
  "queued",
  "running",
  "verifying",
  "awaiting_approval",
  "applied",
  "measured",
  "learned",
];

export function executionLifecycleLabel(lifecycle: ExecutionRecordLifecycle): string {
  return LIFECYCLE_LABELS[lifecycle];
}

export function executionLifecycleRail(): ExecutionRecordLifecycle[] {
  return [...LIFECYCLE_RAIL];
}

export function buildBottleneckSentence(input: {
  bottleneck: string;
  nextMove: string;
}): string {
  const bottleneck = input.bottleneck.trim();
  const nextMove = input.nextMove.trim();
  if (!bottleneck && !nextMove) return "Bottleneck pending → next move planning";
  if (!nextMove) return `Bottleneck ${bottleneck} → next move pending`;
  if (!bottleneck) return `Bottleneck pending → next move ${nextMove}`;
  return `Bottleneck ${bottleneck} → next move ${nextMove}`;
}

function resolveGoal(input: BuildActiveExecutionRecordInput): string {
  if (input.campaignSession?.goal?.trim()) return input.campaignSession.goal.trim();
  if (input.channelThesis?.headline?.trim()) return input.channelThesis.headline.trim();
  return "Growth goal not defined";
}

function resolveExperimentFromInput(
  input: BuildActiveExecutionRecordInput,
  task: CmoOpsTask | null,
): string {
  if (task) {
    const why = task.why.trim();
    return why ? `${task.what.trim()} — ${why}` : task.what.trim();
  }
  if (input.plane?.today?.what) {
    const why = input.plane.today.why?.trim();
    return why ? `${input.plane.today.what.trim()} — ${why}` : input.plane.today.what.trim();
  }
  if (input.channelThesis?.week1_priorities?.[0]) {
    const p = input.channelThesis.week1_priorities[0];
    return p.why ? `${p.what} — ${p.why}` : p.what;
  }
  return "Week 1 experiment will start here";
}

function isRunActive(run: ActiveRunSnapshot | null | undefined): boolean {
  if (!run) return false;
  return run.status === "running" || run.status === "planning" || run.status === "created";
}

function resolveLifecycle(input: {
  cadence?: CmoOpsCadence | null;
  task: CmoOpsTask | null;
  activeRun?: ActiveRunSnapshot | null;
  hasPendingApply?: boolean;
  channelThesis?: ChannelThesis | null;
  pendingVerify?: boolean;
  shipReceipt?: ShipReceipt | null;
  governanceKind?: string;
  executionKernel?: ExecutionKernelState | null;
}): ExecutionRecordLifecycle {
  const {
    cadence,
    task,
    activeRun,
    hasPendingApply,
    channelThesis,
    pendingVerify,
    shipReceipt,
    governanceKind,
    executionKernel,
  } = input;

  if (!cadence) return channelThesis ? "intake" : "intake";

  if (governanceKind === "product_loop") return "running";

  if (pendingVerify || shipReceipt?.verifyStatus === "running") return "verifying";
  if (activeRun?.kind === "browse" && isRunActive(activeRun) && pendingVerify) return "verifying";

  if (executionKernel && task) {
    const inst = executionKernel.instances[task.id];
    if (inst) {
      const mapped = executionTaskStatusToRecordLifecycle(inst.status);
      if (mapped !== "queued" || inst.status === "proposed" || inst.status === "ready") {
        if (inst.status === "ready" || inst.status === "proposed") return "queued";
        if (
          (task.owner === "user" || task.owner === "delegate") &&
          (inst.status === "running" || inst.status === "applied")
        ) {
          return "awaiting_proof";
        }
        return mapped;
      }
    }
  }

  if (activeRun?.pendingApproval) return "awaiting_approval";
  if (isRunActive(activeRun)) return "running";
  if (hasPendingApply) return "awaiting_approval";

  if (!task) {
    if (cadence.week_review.status === "completed") return "learned";
    return "closed";
  }

  if (task.status === "skipped") return "closed";
  if (task.status === "done") {
    if (task.proof?.kpi_value != null) return "measured";
    if (task.proof) return "applied";
    return "applied";
  }

  if (task.owner === "user" || task.owner === "delegate") {
    if (task.status === "in_progress" || task.status === "pending") return "awaiting_proof";
  }

  if (task.status === "in_progress") return "running";
  return "queued";
}

function formatDoneFromProof(proof: CmoOpsProof, task: CmoOpsTask): ExecutionDoneItem[] {
  const items: ExecutionDoneItem[] = [];
  if (proof.commit_sha) {
    items.push({
      id: `${task.id}-commit`,
      label: `Commit ${proof.commit_sha.slice(0, 7)}`,
      detail: proof.note,
    });
  }
  if (proof.urls?.length) {
    for (const [i, url] of proof.urls.entries()) {
      items.push({ id: `${task.id}-url-${i}`, label: "Proof URL", detail: url });
    }
  }
  if (proof.note && !proof.commit_sha) {
    items.push({ id: `${task.id}-note`, label: proof.note });
  }
  if (proof.browser_evidence) {
    const passed = proof.browser_evidence.validations.filter((v) => v.passed).length;
    items.push({
      id: `${task.id}-browser`,
      label: "Browser doğrulama",
      detail: `${passed}/${proof.browser_evidence.validations.length} · ${proof.browser_evidence.url}`,
    });
  }
  if (proof.metric_snapshot) {
    items.push({ id: `${task.id}-metric`, label: proof.metric_snapshot });
  }
  return items;
}

function formatDoneFromRun(run: ActiveRunSnapshot): ExecutionDoneItem[] {
  const items: ExecutionDoneItem[] = [];
  const files = runChangedFiles(run.events);
  if (files.length > 0) {
    items.push({
      id: `${run.runId}-files`,
      label: `${files.length} dosya diff`,
      detail: files.slice(0, 3).join(", ") + (files.length > 3 ? "…" : ""),
    });
  }
  const summary = computeRunSummary(run.events);
  if (summary.findingsCount) {
    items.push({
      id: `${run.runId}-findings`,
      label: `${summary.findingsCount} bulgu`,
    });
  }
  if (summary.browserSteps) {
    items.push({
      id: `${run.runId}-browser-steps`,
      label: `${summary.browserSteps} browser adımı`,
    });
  }
  if (run.goal) {
    items.push({ id: `${run.runId}-intent`, label: run.goal.slice(0, 120) });
  }
  return items;
}

export function formatExecutionDone(input: {
  task?: CmoOpsTask | null;
  activeRun?: ActiveRunSnapshot | null;
  shipReceipt?: ShipReceipt | null;
}): ExecutionDoneItem[] {
  const receiptItems = shipReceiptToDoneItems(input.shipReceipt);
  const items: ExecutionDoneItem[] = [...receiptItems];
  if (input.activeRun && isRunActive(input.activeRun)) {
    items.push(...formatDoneFromRun(input.activeRun));
  }
  if (input.task?.proof) {
    items.push(...formatDoneFromProof(input.task.proof, input.task));
  } else if (input.task && input.task.status !== "pending" && receiptItems.length === 0) {
    items.push({ id: `${input.task.id}-what`, label: input.task.what });
  }
  return items;
}

export function formatExecutionResults(input: {
  proof?: CmoOpsProof | null;
  taskStatus?: CmoOpsTask["status"];
  taskOwner?: CmoOpsTask["owner"];
  activeRun?: ActiveRunSnapshot | null;
  shipReceipt?: ShipReceipt | null;
  thesisId?: import("./cmoIntake").ChannelThesisId;
  marketingProfile?: import("./types").MarketingProfile | null;
  cadence?: CmoOpsCadence | null;
}): ExecutionResultChip[] {
  const receiptChips = shipReceiptToResultChips(input.shipReceipt);
  if (receiptChips.length > 0) return receiptChips;

  const chips: ExecutionResultChip[] = [];
  const proof = input.proof;

  if (proof?.kpi_name || proof?.kpi_value != null) {
    const value =
      proof.kpi_value != null
        ? proof.kpi_target != null
          ? `${proof.kpi_value}/${proof.kpi_target}${proof.kpi_unit ? ` ${proof.kpi_unit}` : ""}`
          : `${proof.kpi_value}${proof.kpi_unit ? ` ${proof.kpi_unit}` : ""}`
        : undefined;
    chips.push({
      id: "kpi-primary",
      label: proof.kpi_name ?? "KPI",
      value,
      tone: proof.kpi_value != null ? "ok" : "missing",
    });
  } else if (
    input.taskStatus === "done" &&
    (input.taskOwner === "user" || input.taskOwner === "delegate")
  ) {
    chips.push({
      id: "kpi-pending",
      label: "KPI",
      value: resolveHonestEmptyKpiCopy(input.thesisId ?? input.cadence?.thesis_id),
      tone: "missing",
    });
  }

  if (proof?.commit_sha) {
    chips.push({
      id: "commit",
      label: "Commit",
      value: proof.commit_sha.slice(0, 7),
      tone: "ok",
    });
  }

  if (proof?.urls?.length) {
    chips.push({
      id: "proof-urls",
      label: "Proof",
      value: `${proof.urls.length} URL`,
      tone: "ok",
    });
  }

  if (input.activeRun?.status === "completed") {
    const summary = computeRunSummary(input.activeRun.events);
    if (summary.filesChanged != null && summary.filesChanged > 0) {
      chips.push({
        id: "run-files",
        label: "Dosya",
        value: String(summary.filesChanged),
        tone: "ok",
      });
    }
  }

  if (chips.length === 0) {
    const gateTask = input.cadence?.tasks?.find(
      (t) => t.owner === "user" || t.owner === "delegate",
    );
    const gate = gateTask
      ? resolveOpsKpiGate(gateTask, input.cadence?.thesis_id ?? input.thesisId)
      : null;
    if (gate?.ga4MetricName && hasGa4Connected(input.marketingProfile)) {
      const ga4Val = readGa4MetricValue(input.marketingProfile, gate.ga4MetricName);
      if (ga4Val != null) {
        chips.push({
          id: "ga4-kpi",
          label: gate.label,
          value: String(ga4Val),
          tone: "ok",
        });
      }
    }
  }

  if (chips.length === 0) {
    chips.push({
      id: "results-empty",
      label: "Sonuç",
      value: resolveHonestEmptyKpiCopy(input.thesisId ?? input.cadence?.thesis_id),
      tone: "missing",
    });
  }

  return chips;
}

function resolveLearned(input: {
  task?: CmoOpsTask | null;
  growthMemory?: GrowthMemoryState | null;
  cadence?: CmoOpsCadence | null;
}): string | undefined {
  const taskId = input.task?.id;
  if (taskId && input.growthMemory?.experiments?.length) {
    const match = input.growthMemory.experiments.find(
      (e) => e.source_id === taskId && e.learning?.trim(),
    );
    if (match?.learning) return match.learning.trim();
  }
  if (input.task?.proof?.note?.trim()) return input.task.proof.note.trim();
  if (input.cadence?.week_review.summary?.trim()) return input.cadence.week_review.summary.trim();
  return undefined;
}

function buildLifecycleProgressLabel(lifecycle: ExecutionRecordLifecycle): string {
  const idx = LIFECYCLE_RAIL.indexOf(lifecycle);
  if (idx < 0) return executionLifecycleLabel(lifecycle);
  const parts = LIFECYCLE_RAIL.slice(0, idx + 1).map((s) => executionLifecycleLabel(s));
  return parts.join(" → ");
}

export function resolveRecordDetailTab(input: {
  record: Pick<ExecutionRecordView, "lifecycle" | "detailHint">;
  activeRun?: ActiveRunSnapshot | null;
  preferredTab?: ExecutionRecordDetailTab;
}): ExecutionRecordDetailTab {
  if (input.preferredTab && input.preferredTab !== "record") return input.preferredTab;
  if (input.activeRun?.pendingApproval) {
    return input.activeRun.kind === "browse" ? "browser" : "diff";
  }
  if (isRunActive(input.activeRun)) {
    return input.activeRun?.kind === "browse" ? "browser" : "diff";
  }
  if (input.record.lifecycle === "awaiting_proof" || input.record.lifecycle === "measured") {
    return "proof";
  }
  return input.record.detailHint;
}

export function buildActiveExecutionRecord(
  input: BuildActiveExecutionRecordInput,
): ExecutionRecordView {
  const commandInput =
    input.plane && input.cadence
      ? ({ ...input, plane: input.plane, cadence: input.cadence } as BuildCommandSurfaceModelInput)
      : null;
  const model = commandInput ? buildCommandSurfaceModel(commandInput) : null;
  const task = input.cadence ? getNowTask(input.cadence) : null;
  const goal = resolveGoal(input);
  const experiment = resolveExperimentFromInput(input, task);
  const lifecycle = resolveLifecycle({
    cadence: input.cadence,
    task,
    activeRun: input.activeRun,
    hasPendingApply: input.hasPendingApply,
    channelThesis: input.channelThesis,
    pendingVerify: input.pendingVerify,
    shipReceipt: input.shipReceipt,
    governanceKind: model?.governance?.kind,
    executionKernel: input.executionKernel,
  });

  const nextAction = commandInput
    ? resolveCommandSurfaceAction({
        ...commandInput,
        profile: input.marketingProfile,
        channelThesis: input.channelThesis,
        executionKernel: input.executionKernel,
        hasActiveRun: Boolean(
          input.activeRun?.runId &&
            (input.activeRun.status === "completed" || isRunActive(input.activeRun)),
        ),
      })
    : ({ kind: "none", reason: "Week 1 not started" } satisfies CommandSurfaceAction);

  const bottleneck =
    model?.bottleneck ??
    input.plane?.binding.headline ??
    input.channelThesis?.primary_bottleneck ??
    "";
  const nextMove =
    model?.today ?? task?.what ?? input.channelThesis?.week1_priorities?.[0]?.what ?? "";

  const recordId = task?.id ?? (input.cadence?.id ? `cadence-${input.cadence.id}` : "pre-week1");

  const detailHint: ExecutionRecordDetailTab =
    isRunActive(input.activeRun) || input.hasPendingApply
      ? input.activeRun?.kind === "browse"
        ? "browser"
        : "diff"
      : lifecycle === "awaiting_proof" || lifecycle === "measured"
        ? "proof"
        : "record";

  const morningBrief = commandInput
    ? buildMorningBriefView({
        ...commandInput,
        firstShipAt: input.firstShipAt,
        wedgePhase: input.wedgePhase,
        hasActiveRun: Boolean(
          input.activeRun?.runId &&
            (input.activeRun.status === "completed" || isRunActive(input.activeRun)),
        ),
        mechanismFallback: input.channelThesis?.title,
      }) ?? undefined
    : undefined;

  const lifecycleLabel =
    model?.governance?.kind === "product_loop"
      ? `Marketing paused — ${input.laneDWorkspace?.paused_reason ?? model.bottleneck}`
      : lifecycle === "awaiting_approval" && input.approvalFileCount
        ? `Awaiting approval — ${input.approvalFileCount} file(s) to review → Apply to ship`
        : lifecycle === "queued" && morningBrief?.queuedHint
          ? morningBrief.queuedHint.message
          : buildLifecycleProgressLabel(lifecycle);

  const approvalHeroLine =
    lifecycle === "awaiting_approval" && input.approvalFileCount
      ? `Awaiting approval — ${input.approvalFileCount} file(s) to review → Apply to ship`
      : undefined;

  const pulseAssessment =
    input.cadence
      ? evaluateWeek1MetricsWithGa4Priority(
          input.cadence,
          input.marketingProfile,
          input.channelThesis,
          input.distributionOperator,
          input.influencerOperator,
          input.delegateOperator,
        )
      : null;

  const dayPulse = input.cadence
    ? evaluateDayPulse({
        cadence: input.cadence,
        profile: input.marketingProfile,
        thesis: input.channelThesis,
        distributionOperator: input.distributionOperator,
        influencerOperator: input.influencerOperator,
        delegateOperator: input.delegateOperator,
      })
    : null;

  const hookLeaderboard = input.distributionOperator
    ? buildHookLeaderboard(input.distributionOperator)
    : undefined;

  const kpiTrendPreset =
    input.cadence && pulseAssessment
      ? resolvePulseKpiPresetId(input.cadence, pulseAssessment)
      : undefined;

  const kpiTrend =
    dayPulse?.primaryKpi && input.cadence && kpiTrendPreset
      ? buildKpiTrendSeries(
          input.cadence,
          input.marketingProfile,
          kpiTrendPreset,
          input.distributionOperator,
        )
      : undefined;

  return {
    id: recordId,
    goal,
    experiment,
    lifecycle,
    lifecycleLabel,
    done: formatExecutionDone({
      task,
      activeRun: input.activeRun,
      shipReceipt: input.shipReceipt,
    }),
    results: formatExecutionResults({
      proof: task?.proof,
      taskStatus: task?.status,
      taskOwner: task?.owner,
      activeRun: input.activeRun,
      shipReceipt: input.shipReceipt,
      thesisId: input.channelThesis?.id ?? input.cadence?.thesis_id,
      marketingProfile: input.marketingProfile,
      cadence: input.cadence,
    }),
    learned: resolveLearned({
      task,
      growthMemory: input.growthMemory,
      cadence: input.cadence,
    }),
    next: {
      label: nextAction.kind === "none" ? "Continue" : nextAction.label,
      action: nextAction,
    },
    bottleneckSentence: buildBottleneckSentence({ bottleneck, nextMove }),
    detailHint,
    growthStatePlaceholder: input.plane?.binding.headline,
    governance: model?.governance,
    morningBrief,
    approvalHeroLine,
    productLoopPaused: model?.governance?.kind === "product_loop",
    dayPulse,
    hookLeaderboard,
    kpiTrend,
  };
}

function historyEntryFromTask(
  task: CmoOpsTask,
  input: BuildExecutionHistoryInput,
  weekIndex: number,
): ExecutionHistoryEntry {
  const lifecycle: ExecutionRecordLifecycle =
    task.status === "skipped"
      ? "closed"
      : task.proof?.kpi_value != null
        ? "measured"
        : task.proof
          ? "applied"
          : "closed";

  const learned =
    input.growthMemory?.experiments.find((e) => e.source_id === task.id)?.learning ??
    task.proof?.note;

  return {
    id: task.id,
    goal: resolveGoal(input),
    experiment: task.why ? `${task.what} — ${task.why}` : task.what,
    lifecycle,
    lifecycleLabel: buildLifecycleProgressLabel(lifecycle),
    done: formatExecutionDone({ task }),
    results: formatExecutionResults({
      proof: task.proof,
      taskStatus: task.status,
      taskOwner: task.owner,
      thesisId: input.channelThesis?.id ?? input.cadence?.thesis_id,
      marketingProfile: input.marketingProfile,
      cadence: input.cadence,
    }),
    learned: learned?.trim() || undefined,
    closedAt: task.proof?.completed_at ?? input.cadence?.started_at ?? new Date().toISOString(),
    weekIndex,
  };
}

function historyEntryFromCycle(cycle: CmoCycleRecord): ExecutionHistoryEntry {
  const kpi = cycle.primary_kpi;
  const results: ExecutionResultChip[] = [];
  if (kpi?.kpi_name || kpi?.value != null) {
    results.push({
      id: `cycle-${cycle.cycle_index}-kpi`,
      label: kpi.kpi_name ?? "KPI",
      value:
        kpi.value != null && kpi.target != null
          ? `${kpi.value}/${kpi.target}`
          : kpi.value != null
            ? String(kpi.value)
            : undefined,
      tone: kpi.value != null ? "ok" : "missing",
    });
  } else {
    results.push({
      id: `cycle-${cycle.cycle_index}-empty`,
      label: "Sonuç",
      value: resolveHonestEmptyKpiCopy(cycle.thesis_id),
      tone: "missing",
    });
  }

  return {
    id: `cycle-${cycle.cycle_index}`,
    goal: cycle.thesis_title,
    experiment: cycle.week_review_summary ?? `Hafta ${cycle.cycle_index} kapanışı`,
    lifecycle: "learned",
    lifecycleLabel: buildLifecycleProgressLabel("learned"),
    done: cycle.memory_summary
      ? [{ id: `cycle-${cycle.cycle_index}-memory`, label: cycle.memory_summary }]
      : [],
    results,
    learned: cycle.memory_summary ?? cycle.week_review_summary,
    closedAt: cycle.completed_at ?? cycle.started_at,
    weekIndex: cycle.cycle_index,
  };
}

export function buildExecutionHistory(input: BuildExecutionHistoryInput): ExecutionHistoryEntry[] {
  const entries: ExecutionHistoryEntry[] = [];

  if (input.cadence) {
    const doneTasks = input.cadence.tasks.filter((t) => t.status === "done");
    for (const task of doneTasks) {
      entries.push(historyEntryFromTask(task, input, input.cadence.week_index));
    }
  }

  if (input.continuous?.cycles?.length) {
    for (const cycle of input.continuous.cycles) {
      entries.push(historyEntryFromCycle(cycle));
    }
  }

  return entries.sort(
    (a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
  );
}
