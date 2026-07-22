/**
 * Faz 4 — Ship Receipt SSOT: apply → verify → Record chips + Proof tab.
 */
import type { FirstShipSnapshot } from "./firstShipSnapshot";
import type { VerifyValidation } from "./browserVerify";
import type { RunEvent } from "./types";
import type { FirstShipLedger } from "./types";
import { aggregatePatchStats } from "./turnReceipt";
import type { ShipQualityFinding } from "./shipQualityLint";
import type { ExecutionResultChip, ExecutionDoneItem } from "./executionRecord";
import type { BrowserEvidenceProof } from "./browserVerify";

export type ShipVerifyStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface ShipReceipt {
  runId: string;
  appliedAt: number;
  commitSha?: string;
  branch?: string;
  filesChanged: number;
  files: string[];
  linesAdded: number;
  linesRemoved: number;
  previewUrl?: string;
  liveUrl?: string;
  before?: FirstShipSnapshot;
  after?: Partial<FirstShipSnapshot>;
  browserValidations?: VerifyValidation[];
  screenshotPath?: string;
  verifyStatus: ShipVerifyStatus;
  qualityWarnings?: ShipQualityFinding[];
}

export interface BuildShipReceiptFromApplyInput {
  runId: string;
  appliedAt?: number;
  commitSha?: string;
  branch?: string;
  filesApplied: string[];
  linesAdded?: number;
  linesRemoved?: number;
  previewUrl?: string;
  before?: FirstShipSnapshot;
  after?: Partial<FirstShipSnapshot>;
  events?: RunEvent[];
  ledger?: FirstShipLedger | null;
  /** When true, verify stays pending even without preview URL (done_when requires live proof). */
  requiresVerify?: boolean;
}

export function buildShipReceiptFromApply(input: BuildShipReceiptFromApplyInput): ShipReceipt {
  const patchStats = input.events ? aggregatePatchStats(input.events) : null;
  const files = input.filesApplied.length
    ? input.filesApplied
    : input.ledger?.files ?? [];
  const linesAdded = input.linesAdded ?? patchStats?.linesAdded ?? input.ledger?.linesDelta?.add ?? 0;
  const linesRemoved =
    input.linesRemoved ?? patchStats?.linesRemoved ?? input.ledger?.linesDelta?.del ?? 0;
  const previewUrl = input.previewUrl ?? input.ledger?.previewUrl;
  const requiresVerify = input.requiresVerify ?? Boolean(previewUrl);

  return {
    runId: input.runId,
    appliedAt: input.appliedAt ?? input.ledger?.at ?? Date.now(),
    commitSha: input.commitSha ?? input.ledger?.commitSha,
    branch: input.branch,
    filesChanged: files.length,
    files,
    linesAdded,
    linesRemoved,
    previewUrl,
    before: input.before ?? (input.ledger?.before
      ? {
          heroPath: input.ledger.before.heroPath,
          metaTitle: input.ledger.before.metaTitle,
          metaDesc: input.ledger.before.metaDesc,
          heroHeadline: input.ledger.before.heroHeadline,
          capturedAt: Date.now(),
        }
      : undefined),
    after: input.after ?? input.ledger?.after,
    verifyStatus: requiresVerify ? "pending" : "skipped",
    qualityWarnings: [],
  };
}

export function enrichShipReceiptWithVerify(
  receipt: ShipReceipt,
  evidence: BrowserEvidenceProof,
  passed: boolean,
): ShipReceipt {
  return {
    ...receipt,
    liveUrl: passed ? evidence.url : receipt.liveUrl,
    previewUrl: receipt.previewUrl ?? evidence.url,
    browserValidations: evidence.validations,
    screenshotPath: evidence.screenshot_path,
    verifyStatus: passed ? "passed" : "failed",
  };
}

export function markShipReceiptVerifyRunning(receipt: ShipReceipt): ShipReceipt {
  if (receipt.verifyStatus === "passed") return receipt;
  return { ...receipt, verifyStatus: "running" };
}

export function markShipReceiptVerifySkipped(receipt: ShipReceipt): ShipReceipt {
  if (receipt.verifyStatus === "passed" || receipt.verifyStatus === "failed") return receipt;
  return { ...receipt, verifyStatus: "skipped" };
}

/** Founder confirmed diff locally when Computer Use is unavailable. */
export function markShipReceiptVerifyLocalPassed(receipt: ShipReceipt): ShipReceipt {
  return { ...receipt, verifyStatus: "passed" };
}

export function shipReceiptToResultChips(receipt: ShipReceipt | null | undefined): ExecutionResultChip[] {
  if (!receipt) return [];

  const chips: ExecutionResultChip[] = [];

  if (receipt.commitSha) {
    chips.push({
      id: "receipt-commit",
      label: "Commit",
      value: receipt.commitSha.slice(0, 7),
      tone: "ok",
    });
  }

  if (receipt.filesChanged > 0) {
    chips.push({
      id: "receipt-files",
      label: "Files",
      value: String(receipt.filesChanged),
      tone: "ok",
    });
  }

  if (receipt.linesAdded + receipt.linesRemoved > 0) {
    chips.push({
      id: "receipt-lines",
      label: "Lines",
      value: `+${receipt.linesAdded}/−${receipt.linesRemoved}`,
      tone: "ok",
    });
  }

  if (receipt.liveUrl) {
    chips.push({
      id: "receipt-live-url",
      label: "Live URL",
      value: "Verified",
      tone: "ok",
    });
  } else if (receipt.previewUrl && receipt.verifyStatus === "pending") {
    chips.push({
      id: "receipt-live-pending",
      label: "Live URL",
      value: "Pending verify",
      tone: "missing",
    });
  } else if (receipt.previewUrl && receipt.verifyStatus === "running") {
    chips.push({
      id: "receipt-live-running",
      label: "Live URL",
      value: "Verifying…",
      tone: "neutral",
    });
  } else if (
    receipt.verifyStatus === "pending" &&
    !receipt.previewUrl &&
    !receipt.liveUrl
  ) {
    chips.push({
      id: "receipt-verify-no-preview",
      label: "Live URL",
      value: "No preview URL",
      tone: "missing",
    });
  } else if (receipt.verifyStatus === "failed") {
    chips.push({
      id: "receipt-verify-failed",
      label: "Verify",
      value: "Failed",
      tone: "warn",
    });
  }

  if (receipt.browserValidations?.length) {
    const passed = receipt.browserValidations.filter((v) => v.passed).length;
    chips.push({
      id: "receipt-browser",
      label: "Browser",
      value: `${passed}/${receipt.browserValidations.length} pass`,
      tone: passed === receipt.browserValidations.length ? "ok" : "warn",
    });
  }

  for (const w of receipt.qualityWarnings ?? []) {
    chips.push({
      id: `quality-${w.id}`,
      label: "Quality",
      value: w.label.slice(0, 24),
      tone: w.severity === "block" ? "warn" : "neutral",
    });
  }

  return chips;
}

export interface ShipReceiptProofView {
  taskLabel?: string;
  doneWhen?: string;
  receipt: ShipReceipt;
}

export function shipReceiptToProofView(
  receipt: ShipReceipt,
  task?: { what: string; done_when: string } | null,
): ShipReceiptProofView {
  return {
    taskLabel: task?.what,
    doneWhen: task?.done_when,
    receipt,
  };
}

export function shipReceiptToDoneItems(receipt: ShipReceipt | null | undefined): ExecutionDoneItem[] {
  if (!receipt) return [];
  const items: ExecutionDoneItem[] = [];

  if (receipt.commitSha) {
    items.push({
      id: "receipt-commit",
      label: `Commit ${receipt.commitSha.slice(0, 7)}`,
      detail: receipt.branch ? `Branch ${receipt.branch}` : undefined,
    });
  }

  if (receipt.filesChanged > 0) {
    items.push({
      id: "receipt-files",
      label: `${receipt.filesChanged} file(s) applied`,
      detail: receipt.files.slice(0, 3).join(", ") + (receipt.files.length > 3 ? "…" : ""),
    });
  }

  if (receipt.linesAdded + receipt.linesRemoved > 0) {
    items.push({
      id: "receipt-lines",
      label: `+${receipt.linesAdded}/−${receipt.linesRemoved} lines`,
    });
  }

  if (receipt.before?.metaTitle && receipt.after?.metaTitle) {
    items.push({
      id: "receipt-meta",
      label: "Meta title updated",
      detail: `${receipt.before.metaTitle} → ${receipt.after.metaTitle}`,
    });
  }

  if (receipt.browserValidations?.length) {
    const passed = receipt.browserValidations.filter((v) => v.passed).length;
    items.push({
      id: "receipt-browser",
      label: "Browser verification",
      detail: `${passed}/${receipt.browserValidations.length} · ${receipt.liveUrl ?? receipt.previewUrl ?? ""}`,
    });
  }

  return items;
}
