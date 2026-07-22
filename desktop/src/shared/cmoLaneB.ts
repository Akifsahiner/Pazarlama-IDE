/**
 * P3 — Lane B task system: posting calendar, outreach tracker, launch runbook.
 * See CMO_LANE_B_SPEC.md and PRODUCT_NORTH_STAR.md §11 P3.
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import { resolveNarrativeContext, withNarrativePrefix } from "./cmoNarrativeContext";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import { stableWeekTaskId } from "./cmoOpsCadence";
import { measureUserOpsTaskId, primaryUserOpsTaskId } from "./cmoHumanExecutionBind";
import type { GrowthNarrative } from "./types";

export type LaneBMode =
  | "posting_calendar"
  | "outreach_tracker"
  | "launch_runbook"
  | "distribution_log";

export type LaneBItemStatus = "pending" | "scheduled" | "done" | "skipped";

export interface LaneBProof {
  url?: string;
  note?: string;
  metric?: string;
  /** P14 — logged cash spend; never inferred from an estimate. */
  spend_usd?: number;
  completed_at: string;
}

export interface LaneBItem {
  id: string;
  mode: LaneBMode;
  title: string;
  detail?: string;
  channel?: string;
  /** P14 — deterministic plan estimate, not an invoice or actual. */
  cost_estimate_usd?: number;
  /** Week-1 day slot (1–7). */
  day?: number;
  /** Launch offset label e.g. T-3, T-0, H+2. */
  runbook_offset?: string;
  status: LaneBItemStatus;
  proof?: LaneBProof;
  linked_ops_task_id?: string;
  /** Outreach tracker — editable target. */
  target_name?: string;
  target_handle?: string;
  sort_order: number;
}

export interface LaneBWorkspace {
  id: string;
  thesis_id: ChannelThesisId;
  mode: LaneBMode;
  started_at: string;
  ops_cadence_id?: string;
  items: LaneBItem[];
}

export interface LaneBProofInput {
  url?: string;
  note?: string;
  metric?: string;
  spend_usd?: number;
}

export interface LaneBProgress {
  done: number;
  total: number;
  percent: number;
  dueToday: number;
  doneToday: number;
}

const MODE_BY_THESIS: Record<ChannelThesisId, LaneBMode> = {
  viral_short_form: "posting_calendar",
  founder_social: "posting_calendar",
  product_hunt_launch: "launch_runbook",
  landing_conversion: "distribution_log",
  seo_content: "distribution_log",
  outbound_sales: "outreach_tracker",
  community_launch: "launch_runbook",
  influencer_partnerships: "outreach_tracker",
};

const URL_RE = /^https?:\/\/[^\s]+$/i;

export function resolveLaneBMode(thesisId: ChannelThesisId): LaneBMode {
  return MODE_BY_THESIS[thesisId] ?? "distribution_log";
}

function resolveLinkedOpsId(
  thesis: ChannelThesis,
  opsCadence?: CmoOpsCadence,
  measure = false,
): string | undefined {
  if (opsCadence) {
    return measure ? measureUserOpsTaskId(opsCadence) : primaryUserOpsTaskId(opsCadence);
  }
  const idx = thesis.week1_priorities.findIndex((p) =>
    measure
      ? p.owner === "user" && /\bkpi\b|\bmetric\b|snapshot|log/i.test(p.done_when)
      : p.owner === "user",
  );
  if (idx < 0 && measure) return undefined;
  const humanIdx =
    idx >= 0 ? idx : thesis.week1_priorities.findIndex((p) => p.owner === "user");
  if (humanIdx < 0) return undefined;
  const p = thesis.week1_priorities[humanIdx]!;
  return stableWeekTaskId(thesis.id, p, humanIdx, 1);
}

function userOpsTaskId(thesis: ChannelThesis, opsCadence?: CmoOpsCadence): string | undefined {
  return resolveLinkedOpsId(thesis, opsCadence, false);
}

function measureOpsTaskId(thesis: ChannelThesis, opsCadence?: CmoOpsCadence): string | undefined {
  return resolveLinkedOpsId(thesis, opsCadence, true);
}

function item(
  partial: Omit<LaneBItem, "status" | "sort_order"> & { sort_order: number },
): LaneBItem {
  return { status: "pending", ...partial };
}

function buildPostingCalendar(
  thesis: ChannelThesis,
  linkedOps?: string,
  measureOps?: string,
): LaneBItem[] {
  const mode: LaneBMode = "posting_calendar";
  const isViral = thesis.id === "viral_short_form";
  const posts = isViral
    ? [
        { day: 1, title: "Post hook A — primary short-form", channel: "short-form" },
        { day: 1, title: "Post hook B variant", channel: "short-form" },
        { day: 2, title: "Post hook C variant", channel: "short-form" },
        { day: 3, title: "Engage comments (30 min)", channel: "engage" },
        { day: 4, title: "Post follow-up / story thread", channel: "short-form" },
        { day: 5, title: "Log 24h views + signup snapshot", channel: "measure", linked: true },
      ]
    : [
        { day: 1, title: "Publish founder post #1", channel: "linkedin" },
        { day: 2, title: "Publish founder post #2", channel: "linkedin" },
        { day: 3, title: "Publish founder post #3", channel: "linkedin" },
        { day: 3, title: "Engage 30 min after post #3", channel: "engage" },
        { day: 4, title: "Comment on 5 ICP threads (substance)", channel: "engage" },
        { day: 5, title: "Comment on 5 more ICP threads", channel: "engage" },
        { day: 7, title: "Log impressions + replies", channel: "measure", linked: true },
      ];

  return posts.map((p, i) =>
    item({
      id: `${thesis.id}.laneb.post.${i}`,
      mode,
      title: p.title,
      detail: thesis.lane_b[0],
      channel: p.channel,
      day: p.day,
      linked_ops_task_id: (p as { linked?: boolean }).linked
        ? (measureOps ?? linkedOps)
        : undefined,
      sort_order: i,
    }),
  );
}

function buildOutreachTracker(
  thesis: ChannelThesis,
  linkedOps?: string,
  measureOps?: string,
): LaneBItem[] {
  const count = thesis.id === "influencer_partnerships" ? 15 : 20;
  const channel = thesis.id === "influencer_partnerships" ? "dm" : "email";
  const header = item({
    id: `${thesis.id}.laneb.outreach.prep`,
    mode: "outreach_tracker",
    title: "Review outreach templates + personalize opener",
    detail: thesis.lane_b[0],
    day: 1,
    sort_order: 0,
  });
  const touches = Array.from({ length: count }, (_, i) =>
    item({
      id: `${thesis.id}.laneb.outreach.${i}`,
      mode: "outreach_tracker",
      title: `Touch ${i + 1}`,
      detail: thesis.lane_b[1] ?? thesis.lane_b[0],
      channel,
      day: Math.min(7, 1 + Math.floor((i / count) * 6)),
      target_name: `Target ${i + 1}`,
      linked_ops_task_id: i === count - 1 ? (measureOps ?? linkedOps) : undefined,
      sort_order: i + 1,
    }),
  );
  return [header, ...touches];
}

function buildLaunchRunbook(
  thesis: ChannelThesis,
  linkedOps?: string,
  measureOps?: string,
): LaneBItem[] {
  const isPh = thesis.id === "product_hunt_launch";
  const steps = isPh
    ? [
        { offset: "T-7d", title: "Confirm 10 supporters + hunter slot", day: 1 },
        { offset: "T-3d", title: "Dry-run maker comment + gallery copy", day: 3 },
        { offset: "T-1d", title: "Final asset review — tagline, bullets, CTA", day: 6 },
        { offset: "T-0", title: "Launch hour — gallery + maker comment live", day: 7 },
        { offset: "H+2h", title: "Reply to every comment (first wave)", day: 7 },
        { offset: "T+24h", title: "Log upvotes + signup snapshot", day: 7, linked: true },
      ]
    : [
        { offset: "T-1d", title: "Final README + demo check", day: 6 },
        { offset: "T-0", title: "Post to primary community (HN/IH/Reddit)", day: 7 },
        { offset: "H+2h", title: "Engage all comments (2h window)", day: 7 },
        { offset: "T+24h", title: "Log post URL + response notes", day: 7, linked: true },
      ];

  return steps.map((s, i) =>
    item({
      id: `${thesis.id}.laneb.runbook.${i}`,
      mode: "launch_runbook",
      title: s.title,
      detail: thesis.lane_b[i] ?? thesis.lane_b[0],
      runbook_offset: s.offset,
      day: s.day,
      linked_ops_task_id: (s as { linked?: boolean }).linked
        ? (measureOps ?? linkedOps)
        : undefined,
      sort_order: i,
    }),
  );
}

function buildDistributionLog(
  thesis: ChannelThesis,
  linkedOps?: string,
  measureOps?: string,
): LaneBItem[] {
  const isSeo = thesis.id === "seo_content";
  const steps = isSeo
    ? [
        { day: 2, title: "Share pillar draft in community #1", channel: "community" },
        { day: 3, title: "Share pillar in community #2", channel: "community" },
        { day: 4, title: "Submit URL to Search Console", channel: "seo" },
        { day: 5, title: "Log indexation + initial clicks", channel: "measure", linked: true },
      ]
    : [
        { day: 1, title: "Share landing in community #1 (ICP-fit)", channel: "community" },
        { day: 2, title: "Newsletter / friends-of-product blast", channel: "email" },
        { day: 3, title: "DM 10 ICP contacts with landing link", channel: "dm" },
        { day: 4, title: "Drive 50 targeted visitors (batch 1)", channel: "traffic" },
        { day: 5, title: "Drive 50 targeted visitors (batch 2)", channel: "traffic" },
        { day: 6, title: "Log visitor count + signup %", channel: "measure", linked: true },
      ];

  return steps.map((s, i) =>
    item({
      id: `${thesis.id}.laneb.dist.${i}`,
      mode: "distribution_log",
      title: s.title,
      detail: thesis.lane_b[0],
      channel: s.channel,
      day: s.day,
      linked_ops_task_id: (s as { linked?: boolean }).linked
        ? (measureOps ?? linkedOps)
        : undefined,
      sort_order: i,
    }),
  );
}

export function createLaneBWorkspaceFromThesis(
  thesis: ChannelThesis,
  opts?: {
    opsCadence?: CmoOpsCadence;
    narrative?: GrowthNarrative;
    now?: string;
    laneBMode?: LaneBMode;
  },
): LaneBWorkspace {
  const mode = opts?.laneBMode ?? resolveLaneBMode(thesis.id);
  const linkedOps = userOpsTaskId(thesis, opts?.opsCadence);
  const measureOps = measureOpsTaskId(thesis, opts?.opsCadence);
  let items: LaneBItem[];
  switch (mode) {
    case "posting_calendar":
      items = buildPostingCalendar(thesis, linkedOps, measureOps);
      break;
    case "outreach_tracker":
      items = buildOutreachTracker(thesis, linkedOps, measureOps);
      break;
    case "launch_runbook":
      items = buildLaunchRunbook(thesis, linkedOps, measureOps);
      break;
    default:
      items = buildDistributionLog(thesis, linkedOps, measureOps);
  }
  const narrative = resolveNarrativeContext(opts?.narrative);
  items = items.map((item, index) => ({
    ...item,
    detail:
      index < 3
        ? withNarrativePrefix(item.detail ?? item.title, narrative)
        : item.detail,
  }));

  return {
    id: `laneb.${thesis.id}.${Date.now()}`,
    thesis_id: thesis.id,
    mode,
    started_at: opts?.now ?? new Date().toISOString(),
    ops_cadence_id: opts?.opsCadence?.id,
    items,
  };
}

export function laneBProgress(workspace: LaneBWorkspace): LaneBProgress {
  const total = workspace.items.length;
  const done = workspace.items.filter((i) => i.status === "done" || i.status === "skipped").length;
  const today = inferLaneBDay(workspace);
  const todayItems = workspace.items.filter((i) => i.day === today);
  const doneToday = todayItems.filter((i) => i.status === "done").length;
  return {
    done,
    total,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
    dueToday: todayItems.filter((i) => i.status === "pending" || i.status === "scheduled").length,
    doneToday,
  };
}

/** Current Week-1 day (1–7) from workspace start. */
export function inferLaneBDay(workspace: LaneBWorkspace, now = Date.now()): number {
  const start = new Date(workspace.started_at).getTime();
  const elapsed = Math.max(0, now - start);
  const day = Math.floor(elapsed / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(7, Math.max(1, day));
}

export function getNextLaneBItem(workspace: LaneBWorkspace): LaneBItem | null {
  const today = inferLaneBDay(workspace);
  const ordered = [...workspace.items].sort((a, b) => a.sort_order - b.sort_order);
  const todayPending = ordered.find(
    (i) => i.day === today && (i.status === "pending" || i.status === "scheduled"),
  );
  if (todayPending) return todayPending;
  return (
    ordered.find((i) => i.status === "pending" || i.status === "scheduled") ?? null
  );
}

const RUNBOOK_OFFSET_ORDER = ["T-7d", "T-3d", "T-1d", "T-0", "H+2h", "T+24h"];

/** Faz 5 — current runbook step for launch-day CTA (first pending by T-offset). */
export function resolveCurrentRunbookStep(workspace: LaneBWorkspace): LaneBItem | null {
  if (workspace.mode !== "launch_runbook") return null;
  const pending = workspace.items.filter(
    (i) => i.status === "pending" || i.status === "scheduled",
  );
  if (pending.length === 0) return null;
  const sorted = [...pending].sort((a, b) => {
    const ai = RUNBOOK_OFFSET_ORDER.indexOf(a.runbook_offset ?? "");
    const bi = RUNBOOK_OFFSET_ORDER.indexOf(b.runbook_offset ?? "");
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  return sorted[0] ?? null;
}

export function validateLaneBProof(proof: LaneBProofInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (proof.spend_usd != null && (!Number.isFinite(proof.spend_usd) || proof.spend_usd < 0)) {
    errors.push("Actual spend must be a non-negative USD amount.");
  }
  const url = proof.url?.trim();
  const note = proof.note?.trim() ?? "";
  if (url && !URL_RE.test(url)) errors.push("URL must start with http:// or https://");
  if (!url && note.length < 8) {
    errors.push("Add a post URL or a short note (8+ chars) — Lane B still needs accountability.");
  }
  return { ok: errors.length === 0, errors };
}

export function completeLaneBItem(
  workspace: LaneBWorkspace,
  itemId: string,
  proof?: LaneBProofInput,
): { workspace: LaneBWorkspace; error?: string } {
  const target = workspace.items.find((i) => i.id === itemId);
  if (!target) return { workspace };
  if (target.status === "done") return { workspace };

  const validation = validateLaneBProof(proof ?? {});
  if (!validation.ok) return { workspace, error: validation.errors.join(" ") };

  const now = new Date().toISOString();
  const items = workspace.items.map((i) =>
    i.id === itemId
      ? {
          ...i,
          status: "done" as const,
          proof: {
            url: proof?.url?.trim() && URL_RE.test(proof.url.trim()) ? proof.url.trim() : undefined,
            note: proof?.note?.trim(),
            metric: proof?.metric?.trim(),
            spend_usd: proof?.spend_usd,
            completed_at: now,
          },
        }
      : i,
  );
  return { workspace: { ...workspace, items } };
}

export function skipLaneBItem(workspace: LaneBWorkspace, itemId: string): LaneBWorkspace {
  const items = workspace.items.map((i) =>
    i.id === itemId ? { ...i, status: "skipped" as const } : i,
  );
  return { ...workspace, items };
}

export function updateLaneBTarget(
  workspace: LaneBWorkspace,
  itemId: string,
  patch: { target_name?: string; target_handle?: string },
): LaneBWorkspace {
  const items = workspace.items.map((i) =>
    i.id === itemId
      ? {
          ...i,
          target_name: patch.target_name?.trim() || i.target_name,
          target_handle: patch.target_handle?.trim() || i.target_handle,
        }
      : i,
  );
  return { ...workspace, items };
}

export function laneBModeLabel(mode: LaneBMode): string {
  switch (mode) {
    case "posting_calendar":
      return "Posting calendar";
    case "outreach_tracker":
      return "Outreach tracker";
    case "launch_runbook":
      return "Launch runbook";
    default:
      return "Distribution log";
  }
}

export function hydrateLaneBWorkspaceFromJson(raw: unknown): LaneBWorkspace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.thesis_id !== "string" || !Array.isArray(o.items)) {
    return null;
  }
  const items: LaneBItem[] = o.items
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x, index) => ({
      id: String(x.id ?? `legacy.laneb.${index}`),
      mode: (x.mode as LaneBMode) ?? "distribution_log",
      title: String(x.title ?? ""),
      detail: typeof x.detail === "string" ? x.detail : undefined,
      channel: typeof x.channel === "string" ? x.channel : undefined,
      day: typeof x.day === "number" ? x.day : undefined,
      runbook_offset: typeof x.runbook_offset === "string" ? x.runbook_offset : undefined,
      status: (
        x.status === "done" || x.status === "skipped" || x.status === "scheduled"
          ? x.status
          : "pending"
      ) as LaneBItemStatus,
      proof: x.proof as LaneBProof | undefined,
      linked_ops_task_id:
        typeof x.linked_ops_task_id === "string" ? x.linked_ops_task_id : undefined,
      target_name: typeof x.target_name === "string" ? x.target_name : undefined,
      target_handle: typeof x.target_handle === "string" ? x.target_handle : undefined,
      sort_order: Number(x.sort_order ?? index),
    }));
  return {
    id: o.id,
    thesis_id: o.thesis_id as ChannelThesisId,
    mode: (o.mode as LaneBMode) ?? resolveLaneBMode(o.thesis_id as ChannelThesisId),
    started_at: String(o.started_at ?? new Date().toISOString()),
    ops_cadence_id: typeof o.ops_cadence_id === "string" ? o.ops_cadence_id : undefined,
    items,
  };
}
