/**
 * Turn receipt — instant "what did this give me?" after ask/edit/apply.
 */
import { extractCodeCitations } from "./codeCitation";
import type { ExecutableAction, ExecutableActionBundle } from "./executableAction";
import type { MarketingAsset, RunEvent } from "./types";
import { runChangedFiles } from "./runs";

export interface TurnReceiptDeliverables {
  filesProposed?: string[];
  filesApplied?: string[];
  assetsCreated?: number;
  decisionsCount?: number;
  citations?: string[];
  linesAdded?: number;
  linesRemoved?: number;
  branch?: string;
  commitSha?: string;
  durationMs?: number;
  costCents?: number;
}

export interface TurnReceipt {
  turnId: string;
  runId: string;
  completedAt: number;
  summaryLine: string;
  deliverables: TurnReceiptDeliverables;
  primaryAction?: ExecutableAction;
  secondaryActions?: ExecutableAction[];
  shipped?: boolean;
}

export interface ApplyReceiptInput {
  files: string[];
  branch?: string;
  commitSha?: string;
  linesAdded?: number;
  linesRemoved?: number;
}

export interface BuildTurnReceiptInput {
  turnId: string;
  runId: string;
  startedAt?: number;
  completedAt?: number;
  answerText?: string;
  assets?: MarketingAsset[];
  actions?: ExecutableActionBundle;
  events?: RunEvent[];
  applyResult?: ApplyReceiptInput;
  costCents?: number;
  decisionsCount?: number;
}

/** Concatenate unified patch hunks from run events for quality lint / diff analysis. */
export function aggregatePatchDiffText(events: RunEvent[]): string {
  const parts: string[] = [];
  for (const e of events) {
    if (e.type !== "file.patch_created" && e.type !== "file.patch_updated") continue;
    const patch = (e.payload as { patch?: string } | undefined)?.patch;
    if (patch) parts.push(patch);
  }
  return parts.join("\n");
}

export function aggregatePatchStats(events: RunEvent[]): {
  linesAdded: number;
  linesRemoved: number;
  files: string[];
} {
  let linesAdded = 0;
  let linesRemoved = 0;
  const files = runChangedFiles(events);
  for (const e of events) {
    if (e.type !== "file.patch_created" && e.type !== "file.patch_updated") continue;
    const p = e.payload as { additions?: number; deletions?: number };
    linesAdded += p.additions ?? 0;
    linesRemoved += p.deletions ?? 0;
  }
  return { linesAdded, linesRemoved, files };
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatCost(cents: number): string {
  if (cents < 1) return "<$0.01";
  return `~$${(cents / 100).toFixed(2)}`;
}

export function formatReceiptLine(receipt: TurnReceipt): string {
  const d = receipt.deliverables;
  const parts: string[] = [];

  if (receipt.shipped && d.filesApplied?.length) {
    parts.push(`Shipped ${d.filesApplied.length} file${d.filesApplied.length === 1 ? "" : "s"}`);
  } else if (d.filesProposed?.length) {
    parts.push(`${d.filesProposed.length} file${d.filesProposed.length === 1 ? "" : "s"} proposed`);
  }

  if (d.assetsCreated) {
    parts.push(`${d.assetsCreated} asset${d.assetsCreated === 1 ? "" : "s"}`);
  }

  if (d.linesAdded != null && d.linesRemoved != null && (d.linesAdded > 0 || d.linesRemoved > 0)) {
    parts.push(`+${d.linesAdded}/−${d.linesRemoved}`);
  }

  if (d.commitSha) {
    parts.push(`commit ${d.commitSha.slice(0, 7)}`);
  }

  if (d.durationMs) {
    parts.push(formatDuration(d.durationMs));
  }

  if (d.costCents != null && d.costCents > 0) {
    parts.push(formatCost(d.costCents));
  }

  if (!parts.length) {
    if (receipt.primaryAction?.kind === "edit_run") return "Ready to run in project";
    if (receipt.primaryAction?.kind === "generate_plan") return "Ready to generate launch plan";
    return "Turn complete";
  }

  return parts.join(" · ");
}

export function buildTurnReceipt(input: BuildTurnReceiptInput): TurnReceipt {
  const completedAt = input.completedAt ?? Date.now();
  const durationMs =
    input.startedAt && completedAt > input.startedAt ? completedAt - input.startedAt : undefined;

  const citations = input.answerText ? extractCodeCitations(input.answerText).map((c) => c.path) : [];
  const patchStats = input.events ? aggregatePatchStats(input.events) : null;

  const filesProposed = patchStats?.files.length
    ? patchStats.files
    : input.actions?.primary?.kind === "edit_run"
      ? input.actions.primary.targetFiles
      : undefined;

  const deliverables: TurnReceiptDeliverables = {
    filesProposed,
    filesApplied: input.applyResult?.files,
    assetsCreated: input.assets?.length || undefined,
    decisionsCount: input.decisionsCount || undefined,
    citations: citations.length ? [...new Set(citations)] : undefined,
    linesAdded: input.applyResult?.linesAdded ?? patchStats?.linesAdded,
    linesRemoved: input.applyResult?.linesRemoved ?? patchStats?.linesRemoved,
    branch: input.applyResult?.branch,
    commitSha: input.applyResult?.commitSha,
    durationMs,
    costCents: input.costCents,
  };

  const receipt: TurnReceipt = {
    turnId: input.turnId,
    runId: input.runId,
    completedAt,
    deliverables,
    primaryAction: input.actions?.primary,
    secondaryActions: input.actions?.secondary,
    shipped: Boolean(input.applyResult?.files?.length),
    summaryLine: "",
  };

  receipt.summaryLine = formatReceiptLine(receipt);
  return receipt;
}
