/**
 * P1 — CMO operating cadence: daily focus tasks + user accountability.
 * See CMO_OPS_SPEC.md and PRODUCT_NORTH_STAR.md §11 P1.
 */
import type { ChannelThesis, ChannelThesisId, CmoTaskOwner, CmoWeek1Priority } from "./cmoIntake";
import { capWeek1Priorities, capWeekPriorities } from "./cmoExecutionBind";
import type { ExpectedProofKind, OpsExecutionPlan } from "./opsExecutionPlan";
import type { BrowserEvidenceProof } from "./browserVerify";
import type { HumanExecutionRef } from "./humanExecutionPlan";
import type { HumanExecutionAsset } from "./humanExecutionAsset";

export type PivotVerdict = "flat" | "promising" | "insufficient_data";

export interface CmoPivotSuggestion {
  verdict: PivotVerdict;
  headline: string;
  rationale: string[];
  suggested_thesis_ids: ChannelThesisId[];
  suggested_actions: string[];
  generated_at: string;
  dismissed_at?: string;
}

export type CmoOpsTaskStatus = "pending" | "in_progress" | "done" | "skipped";
export type CmoOpsDaySlot = "now" | "today" | "up_next" | "later";

export interface CmoOpsProof {
  urls?: string[];
  note?: string;
  commit_sha?: string;
  metric_snapshot?: string;
  completed_at: string;
  /** P2 — logged KPI tied to manual_kpis / GA4. */
  kpi_id?: string;
  kpi_name?: string;
  kpi_value?: number;
  kpi_target?: number;
  kpi_source?: "manual" | "ga4";
  kpi_unit?: string;
  browser_evidence?: BrowserEvidenceProof;
}

export interface CmoOpsTask {
  id: string;
  priority_index: number;
  what: string;
  why: string;
  owner: CmoTaskOwner;
  done_when: string;
  status: CmoOpsTaskStatus;
  day_slot: CmoOpsDaySlot;
  proof?: CmoOpsProof;
  linked_run_id?: string;
  skip_reason?: string;
  unlocked_at?: string;
  /** P14 — planned spend for paid ops; never used as actual spend. */
  cost_estimate_usd?: number;
  /** Faz 2 — frozen Lane A run plan (system tasks only). */
  execution_plan?: OpsExecutionPlan;
  /** Faz 2 — proof UX hint for user/delegate tasks. */
  expected_proof_kind?: ExpectedProofKind;
  /** Faz 3 — frozen human execution ref (user/delegate tasks only). */
  human_execution_ref?: HumanExecutionRef;
  /** Faz 5 — frozen Post Kit / outreach pack (never re-freeze on retry). */
  human_execution_asset?: HumanExecutionAsset;
}

export type CmoOpsWeekReviewStatus = "pending" | "due" | "completed";

export interface CmoOpsWeekReview {
  week_index: number;
  due_at: string;
  status: CmoOpsWeekReviewStatus;
  summary?: string;
  completed_at?: string;
}

export interface CmoOpsCadence {
  id: string;
  thesis_id: ChannelThesisId;
  campaign_session_id?: string;
  /** P4 — lineage when replanning from a prior ops week. */
  prior_ops_cadence_id?: string;
  started_at: string;
  week_index: number;
  day_index: number;
  tasks: CmoOpsTask[];
  week_review: CmoOpsWeekReview;
  last_focus_reset_at: string;
  /** P2 — auto-pivot when Week 1 metrics are flat. */
  pivot_suggestion?: CmoPivotSuggestion;
}

export interface OpsCadenceProgress {
  done: number;
  total: number;
  skipped: number;
  focusDone: number;
  focusTotal: number;
  percent: number;
}

export interface OpsProofInput {
  urls?: string[];
  note?: string;
  commit_sha?: string;
  metric_snapshot?: string;
  /** P2 — required numeric KPI for user/delegate tasks. */
  kpi_value?: number;
  kpi_preset_id?: string;
  kpi_source?: "manual" | "ga4";
  kpi_id?: string;
  kpi_name?: string;
  kpi_target?: number;
  kpi_unit?: string;
  browser_evidence?: BrowserEvidenceProof;
}

export interface OpsProofValidation {
  ok: boolean;
  errors: string[];
}

const URL_RE = /^https?:\/\/[^\s]+$/i;
const METRIC_RE = /\d/;

/** Stable id for a week-1 priority (supports legacy thesis rows without id). */
export function stableWeek1TaskId(
  thesisId: ChannelThesisId,
  priority: CmoWeek1Priority,
  index: number,
): string {
  return stableWeekTaskId(thesisId, priority, index, 1);
}

/** P4 — stable ops task id for any week index. */
export function stableWeekTaskId(
  thesisId: ChannelThesisId,
  priority: CmoWeek1Priority,
  index: number,
  weekIndex = 1,
): string {
  if (priority.id) {
    const legacy = priority.id.match(/^(.+)\.w\d+\.(\d+)$/);
    if (legacy) return `${legacy[1]}.w${weekIndex}.${legacy[2]}`;
    return priority.id;
  }
  return `${thesisId}.w${weekIndex}.${index}`;
}

function slotForIndex(index: number, firstActive: boolean): CmoOpsDaySlot {
  if (index === 0 && firstActive) return "now";
  if (index === 0) return "today";
  if (index === 1) return "up_next";
  return "later";
}

function weekReviewDueAt(startedAt: string): string {
  const d = new Date(startedAt);
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

function sortedTasks(tasks: CmoOpsTask[]): CmoOpsTask[] {
  return [...tasks].sort((a, b) => a.priority_index - b.priority_index);
}

/** Whether all tasks before `task` are done or skipped. */
export function isOpsTaskUnlocked(cadence: CmoOpsCadence, task: CmoOpsTask): boolean {
  const ordered = sortedTasks(cadence.tasks);
  const idx = ordered.findIndex((t) => t.id === task.id);
  if (idx <= 0) return true;
  return ordered.slice(0, idx).every((t) => t.status === "done" || t.status === "skipped");
}

export function needsOpsProof(owner: CmoTaskOwner): boolean {
  return owner === "user" || owner === "delegate";
}

/** User/delegate tasks require evidence — URL, metric, or substantive note. */
export function validateOpsProof(
  task: Pick<CmoOpsTask, "owner" | "done_when">,
  proof: OpsProofInput,
): OpsProofValidation {
  if (!needsOpsProof(task.owner)) {
    return { ok: true, errors: [] };
  }

  const errors: string[] = [];
  const urls = (proof.urls ?? []).map((u) => u.trim()).filter(Boolean);
  const note = proof.note?.trim() ?? "";
  const metric = proof.metric_snapshot?.trim() ?? "";

  const validUrls = urls.filter((u) => URL_RE.test(u));
  if (urls.length > 0 && validUrls.length === 0) {
    errors.push("Add at least one valid URL (https://…).");
  }

  const hasMetric = METRIC_RE.test(metric) || METRIC_RE.test(note);
  const hasSubstantiveNote = note.length >= 20;

  if (validUrls.length === 0 && !hasMetric && !hasSubstantiveNote) {
    errors.push(
      "Accountability required: post URL(s), a metric (numbers), or a note (20+ chars) matching the done gate.",
    );
  }

  if (/URL|link|live post/i.test(task.done_when) && validUrls.length === 0 && !hasMetric) {
    errors.push("This task's done gate expects live URL(s) — add at least one link.");
  }

  return { ok: errors.length === 0, errors };
}

export function createOpsCadenceFromThesis(
  thesis: ChannelThesis,
  opts?: {
    campaignSessionId?: string;
    now?: string;
    week_index?: number;
    prior_ops_cadence_id?: string;
  },
): CmoOpsCadence {
  const now = opts?.now ?? new Date().toISOString();
  const weekIndex = Math.max(1, opts?.week_index ?? 1);
  const priorities =
    weekIndex <= 1
      ? capWeek1Priorities(thesis.week1_priorities)
      : capWeekPriorities(thesis.week1_priorities, weekIndex);

  const tasks: CmoOpsTask[] = priorities.map((p, index) => {
    const id = stableWeekTaskId(thesis.id, p, index, weekIndex);
    const isFirst = index === 0;
    return {
      id,
      priority_index: index,
      what: p.what,
      why: p.why,
      owner: p.owner,
      done_when: p.done_when,
      status: isFirst ? "in_progress" : "pending",
      day_slot: slotForIndex(index, isFirst),
      unlocked_at: isFirst ? now : undefined,
    };
  });

  return {
    id: `ops.${thesis.id}.w${weekIndex}.${Date.now()}`,
    thesis_id: thesis.id,
    campaign_session_id: opts?.campaignSessionId,
    prior_ops_cadence_id: opts?.prior_ops_cadence_id,
    started_at: now,
    week_index: weekIndex,
    day_index: 1,
    tasks,
    week_review: {
      week_index: weekIndex,
      due_at: weekReviewDueAt(now),
      status: "pending",
    },
    last_focus_reset_at: now,
  };
}

/** Recompute day_slot labels from current unlock state. */
export function refreshOpsDaySlots(cadence: CmoOpsCadence): CmoOpsCadence {
  const focus = getFocusTasks(cadence, 3);
  const focusIds = new Set(focus.map((t) => t.id));
  const nowId = focus[0]?.id;

  const tasks = cadence.tasks.map((t) => {
    if (t.status === "done" || t.status === "skipped") {
      return { ...t, day_slot: "later" as const };
    }
    if (!focusIds.has(t.id)) {
      return { ...t, day_slot: "later" as const };
    }
    if (t.id === nowId) return { ...t, day_slot: "now" as const };
    const fi = focus.findIndex((f) => f.id === t.id);
    return { ...t, day_slot: fi === 1 ? ("up_next" as const) : ("today" as const) };
  });

  return { ...cadence, tasks };
}

/** Up to `max` actionable tasks in order (sequential unlock). */
export function getFocusTasks(cadence: CmoOpsCadence, max = 3): CmoOpsTask[] {
  const ordered = sortedTasks(cadence.tasks);
  const focus: CmoOpsTask[] = [];

  for (const task of ordered) {
    if (task.status === "done" || task.status === "skipped") continue;
    if (!isOpsTaskUnlocked(cadence, task)) break;
    focus.push(task);
    if (focus.length >= max) break;
  }

  return focus;
}

export function getNowTask(cadence: CmoOpsCadence): CmoOpsTask | null {
  return getFocusTasks(cadence, 1)[0] ?? null;
}

export function opsCadenceProgress(cadence: CmoOpsCadence): OpsCadenceProgress {
  const total = cadence.tasks.length;
  const done = cadence.tasks.filter((t) => t.status === "done").length;
  const skipped = cadence.tasks.filter((t) => t.status === "skipped").length;
  const focus = getFocusTasks(cadence, 3);
  const focusDone = cadence.tasks.filter(
    (t) => (t.day_slot === "now" || t.day_slot === "today" || t.day_slot === "up_next") && t.status === "done",
  ).length;

  return {
    done,
    total,
    skipped,
    focusDone,
    focusTotal: Math.min(3, total - done - skipped + focus.length),
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function isWeekReviewDue(cadence: CmoOpsCadence, now = Date.now()): boolean {
  if (cadence.week_review.status === "completed") return false;
  return new Date(cadence.week_review.due_at).getTime() <= now;
}

/** Lane B/C next-action stays hidden while ops tasks or week review still need you. */
export function opsQueueBlocksLaneWork(
  cadence: CmoOpsCadence,
  marketingPaused = false,
): boolean {
  if (marketingPaused) return true;
  if (isWeekReviewDue(cadence) && cadence.week_review.status !== "completed") {
    return true;
  }
  const now = getNowTask(cadence);
  return !!(now && now.status !== "done" && now.status !== "skipped");
}

export function markWeekReviewDue(cadence: CmoOpsCadence): CmoOpsCadence {
  if (cadence.week_review.status !== "pending") return cadence;
  if (!isWeekReviewDue(cadence)) return cadence;
  return {
    ...cadence,
    week_review: { ...cadence.week_review, status: "due" },
  };
}

function unlockNextPending(cadence: CmoOpsCadence, now: string): CmoOpsCadence {
  const ordered = sortedTasks(cadence.tasks);
  const hasActive = ordered.some((t) => t.status === "in_progress");
  if (hasActive) return cadence;

  const next = ordered.find(
    (t) => t.status === "pending" && isOpsTaskUnlocked({ ...cadence, tasks: ordered }, t),
  );
  if (!next) return cadence;

  const tasks = cadence.tasks.map((t) =>
    t.id === next.id
      ? { ...t, status: "in_progress" as const, unlocked_at: t.unlocked_at ?? now }
      : t,
  );
  return refreshOpsDaySlots({ ...cadence, tasks });
}

export function markOpsTaskInProgress(
  cadence: CmoOpsCadence,
  taskId: string,
  linkedRunId?: string,
): CmoOpsCadence {
  const now = new Date().toISOString();
  const tasks = cadence.tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          status: "in_progress" as const,
          linked_run_id: linkedRunId ?? t.linked_run_id,
          unlocked_at: t.unlocked_at ?? now,
        }
      : t,
  );
  return refreshOpsDaySlots({ ...cadence, tasks });
}

export function completeOpsTask(
  cadence: CmoOpsCadence,
  taskId: string,
  proof?: OpsProofInput,
): { cadence: CmoOpsCadence; error?: OpsProofValidation } {
  const task = cadence.tasks.find((t) => t.id === taskId);
  if (!task) return { cadence };
  if (task.status === "done") return { cadence };
  if (!isOpsTaskUnlocked(cadence, task)) {
    return {
      cadence,
      error: { ok: false, errors: ["Complete earlier tasks first."] },
    };
  }

  const validation = validateOpsProof(task, proof ?? {});
  if (!validation.ok) return { cadence, error: validation };

  const now = new Date().toISOString();
  const completedProof: CmoOpsProof = {
    urls: proof?.urls?.filter((u) => URL_RE.test(u.trim())),
    note: proof?.note?.trim(),
    commit_sha: proof?.commit_sha,
    metric_snapshot: proof?.metric_snapshot?.trim(),
    kpi_id: proof?.kpi_id ?? proof?.kpi_preset_id,
    kpi_name: proof?.kpi_name,
    kpi_value: proof?.kpi_value,
    kpi_target: proof?.kpi_target,
    kpi_source: proof?.kpi_source,
    kpi_unit: proof?.kpi_unit,
    browser_evidence: proof?.browser_evidence,
    completed_at: now,
  };

  let tasks = cadence.tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          status: "done" as const,
          proof: completedProof,
          day_slot: "later" as const,
        }
      : t,
  );

  let next: CmoOpsCadence = refreshOpsDaySlots({
    ...cadence,
    tasks,
    day_index: cadence.day_index + (task.owner === "user" ? 1 : 0),
  });
  next = unlockNextPending(next, now);
  next = markWeekReviewDue(next);
  return { cadence: next };
}

export function skipOpsTask(
  cadence: CmoOpsCadence,
  taskId: string,
  reason?: string,
): CmoOpsCadence {
  const task = cadence.tasks.find((t) => t.id === taskId);
  if (!task || task.status === "done") return cadence;

  const now = new Date().toISOString();
  let tasks = cadence.tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          status: "skipped" as const,
          skip_reason: reason?.trim() || "Skipped",
          day_slot: "later" as const,
        }
      : t,
  );

  let next = refreshOpsDaySlots({ ...cadence, tasks });
  next = unlockNextPending(next, now);
  return next;
}

export function completeWeekReview(
  cadence: CmoOpsCadence,
  summary: string,
  pivot?: CmoPivotSuggestion | null,
): CmoOpsCadence {
  const now = new Date().toISOString();
  return {
    ...cadence,
    week_review: {
      ...cadence.week_review,
      status: "completed",
      summary: summary.trim(),
      completed_at: now,
    },
    pivot_suggestion: pivot ?? cadence.pivot_suggestion,
  };
}

/** Attach browser verify evidence to active system task; close when pass threshold met. */
export function attachBrowserEvidenceToSystemTask(
  cadence: CmoOpsCadence,
  evidence: BrowserEvidenceProof,
  opts?: { minPassRate?: number },
): { cadence: CmoOpsCadence; closed: boolean } {
  const minRate = opts?.minPassRate ?? 1;
  const passRate =
    evidence.validations.length > 0
      ? evidence.validations.filter((v) => v.passed).length / evidence.validations.length
      : 0;
  const passed = evidence.validations.length > 0 && passRate >= minRate;

  const ordered = sortedTasks(cadence.tasks);
  const target =
    ordered.find((t) => t.owner === "system" && t.status === "in_progress") ??
    ordered.find(
      (t) =>
        t.owner === "system" &&
        t.status === "pending" &&
        isOpsTaskUnlocked(cadence, t),
    );
  if (!target) return { cadence, closed: false };

  const note = passed
    ? `Browser verify passed (${Math.round(passRate * 100)}%)`
    : `Browser verify incomplete (${Math.round(passRate * 100)}%)`;

  if (!passed) {
    return {
      cadence: {
        ...cadence,
        tasks: cadence.tasks.map((t) =>
          t.id === target.id
            ? {
                ...t,
                proof: {
                  ...(t.proof ?? { completed_at: new Date().toISOString() }),
                  note,
                  browser_evidence: evidence,
                  urls: evidence.url ? [evidence.url] : t.proof?.urls,
                },
              }
            : t,
        ),
      },
      closed: false,
    };
  }

  const { cadence: next } = completeOpsTask(cadence, target.id, {
    note,
    urls: evidence.url ? [evidence.url] : undefined,
    browser_evidence: evidence,
  });
  return { cadence: next, closed: true };
}

/** Auto-close the active system task after a successful apply. */
export function tryAutoCompleteSystemTask(
  cadence: CmoOpsCadence,
  opts: {
    runId?: string;
    commitSha?: string;
    filesApplied?: number;
    summaryNote?: string;
  },
): CmoOpsCadence {
  const ordered = sortedTasks(cadence.tasks);
  const target =
    ordered.find((t) => t.owner === "system" && t.status === "in_progress") ??
    ordered.find(
      (t) =>
        t.owner === "system" &&
        t.status === "pending" &&
        isOpsTaskUnlocked(cadence, t),
    );
  if (!target) return cadence;

  if (target.expected_proof_kind === "browser_evidence") {
    return cadence;
  }

  const note =
    opts.summaryNote?.trim() ||
    (opts.filesApplied != null
      ? `Applied ${opts.filesApplied} file(s)${opts.runId ? ` · run ${opts.runId.slice(0, 8)}` : ""}`
      : opts.runId
        ? `Run ${opts.runId.slice(0, 8)} shipped`
        : undefined);

  const { cadence: next } = completeOpsTask(cadence, target.id, {
    commit_sha: opts.commitSha,
    note,
    metric_snapshot:
      opts.filesApplied != null ? String(opts.filesApplied) : undefined,
  });
  return next;
}

export function hydrateOpsCadenceFromJson(raw: unknown): CmoOpsCadence | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.thesis_id !== "string") return null;
  if (!Array.isArray(o.tasks) || typeof o.started_at !== "string") return null;

  const tasks: CmoOpsTask[] = o.tasks
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t, index) => ({
      id: String(t.id ?? `legacy.w1.${index}`),
      priority_index: Number(t.priority_index ?? index),
      what: String(t.what ?? ""),
      why: String(t.why ?? ""),
      owner: (t.owner === "user" || t.owner === "delegate" ? t.owner : "system") as CmoTaskOwner,
      done_when: String(t.done_when ?? ""),
      status: (
        t.status === "done" || t.status === "skipped" || t.status === "in_progress"
          ? t.status
          : "pending"
      ) as CmoOpsTaskStatus,
      day_slot: (
        t.day_slot === "now" || t.day_slot === "today" || t.day_slot === "up_next"
          ? t.day_slot
          : "later"
      ) as CmoOpsDaySlot,
      proof: t.proof as CmoOpsProof | undefined,
      linked_run_id: typeof t.linked_run_id === "string" ? t.linked_run_id : undefined,
      skip_reason: typeof t.skip_reason === "string" ? t.skip_reason : undefined,
      unlocked_at: typeof t.unlocked_at === "string" ? t.unlocked_at : undefined,
      execution_plan: t.execution_plan as OpsExecutionPlan | undefined,
      expected_proof_kind: (
        t.expected_proof_kind === "live_url" ||
        t.expected_proof_kind === "kpi" ||
        t.expected_proof_kind === "note" ||
        t.expected_proof_kind === "browser_evidence"
          ? t.expected_proof_kind
          : undefined
      ) as ExpectedProofKind | undefined,
      human_execution_ref: t.human_execution_ref as HumanExecutionRef | undefined,
      human_execution_asset: t.human_execution_asset as HumanExecutionAsset | undefined,
    }));

  const wr = o.week_review as Record<string, unknown> | undefined;
  const week_review: CmoOpsWeekReview = wr
    ? {
        week_index: Number(wr.week_index ?? 1),
        due_at: String(wr.due_at ?? weekReviewDueAt(String(o.started_at))),
        status: (
          wr.status === "due" || wr.status === "completed" ? wr.status : "pending"
        ) as CmoOpsWeekReviewStatus,
        summary: typeof wr.summary === "string" ? wr.summary : undefined,
        completed_at: typeof wr.completed_at === "string" ? wr.completed_at : undefined,
      }
    : {
        week_index: 1,
        due_at: weekReviewDueAt(String(o.started_at)),
        status: "pending",
      };

  const cadence: CmoOpsCadence = {
    id: o.id,
    thesis_id: o.thesis_id as ChannelThesisId,
    campaign_session_id:
      typeof o.campaign_session_id === "string" ? o.campaign_session_id : undefined,
    started_at: o.started_at,
    week_index: Number(o.week_index ?? 1),
    day_index: Number(o.day_index ?? 1),
    tasks,
    week_review,
    last_focus_reset_at: String(o.last_focus_reset_at ?? o.started_at),
    pivot_suggestion: o.pivot_suggestion as CmoPivotSuggestion | undefined,
  };

  return refreshOpsDaySlots(markWeekReviewDue(cadence));
}
