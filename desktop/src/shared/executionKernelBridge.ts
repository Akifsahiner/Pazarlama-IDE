/**
 * Faz 4 — testable bridge for apply → verify → complete path.
 */
import type { CmoOpsTask } from "./cmoOpsCadence";
import type { ChannelThesis } from "./cmoIntake";
import type { VerifyRunResult } from "./browserVerify";
import {
  buildVerifyChecklistFromTask,
  doneWhenRequiresBrowserVerify,
  toBrowserEvidenceProof,
  verifyPassed,
} from "./browserVerify";
import type { ShipReceipt } from "./shipReceipt";
import {
  enrichShipReceiptWithVerify,
  markShipReceiptVerifyRunning,
  markShipReceiptVerifySkipped,
} from "./shipReceipt";
import { runShipQualityLint, hasBlockingQualityFinding, type ShipQualityFinding } from "./shipQualityLint";
import type { ShipRecoveryAction } from "./shipPipelineRecovery";
import { buildShipRecovery } from "./shipPipelineRecovery";
import type { BrowserEvidenceProof } from "./browserVerify";

export interface VerifyAfterApplyPlan {
  url: string;
  checklist: string[];
  shouldSchedule: boolean;
  skipReason?: string;
}

export interface FinalizeVerifyInput {
  receipt: ShipReceipt;
  runId: string;
  url: string;
  report?: {
    validations?: Array<{ label: string; passed: boolean; detail?: string }>;
  };
  failed?: boolean;
  summary?: string;
  screenshotPath?: string;
  thesisId?: ChannelThesis["id"] | null;
  afterSnapshot?: Partial<import("./firstShipSnapshot").FirstShipSnapshot>;
  diffText?: string;
}

export interface FinalizeVerifyResult {
  receipt: ShipReceipt;
  evidence: BrowserEvidenceProof;
  passed: boolean;
  pipelineEvent: "verify.completed" | "verify.failed";
  pipelineError?: string;
  recovery?: ShipRecoveryAction;
  qualityFindings: ShipQualityFinding[];
  blockAutoComplete: boolean;
}

export function planVerifyAfterApply(input: {
  previewUrl?: string | null;
  canBrowse: boolean;
  task?: CmoOpsTask | null;
  thesis?: ChannelThesis | null;
  lastVerifyAt?: number;
  now?: number;
}): VerifyAfterApplyPlan | null {
  const url = input.previewUrl?.trim();
  if (!url) return null;

  const checklist = buildVerifyChecklistFromTask(input.task, input.thesis);
  const now = input.now ?? Date.now();
  if (input.lastVerifyAt && now - input.lastVerifyAt < 10 * 60_000) {
    return { url, checklist, shouldSchedule: false, skipReason: "debounced" };
  }

  if (!input.canBrowse) {
    return { url, checklist, shouldSchedule: false, skipReason: "cu_unavailable" };
  }

  return { url, checklist, shouldSchedule: true };
}

export function finalizeVerifyRun(input: FinalizeVerifyInput): FinalizeVerifyResult {
  const verifyResult: VerifyRunResult = {
    url: input.url,
    run_id: input.runId,
    validations: input.report?.validations ?? [],
    findings: [],
    verified_at: new Date().toISOString(),
  };

  const evidence = toBrowserEvidenceProof(verifyResult, input.screenshotPath);
  const passed = !input.failed && verifyPassed(verifyResult, 1);

  const qualityFindings = runShipQualityLint({
    after: input.afterSnapshot,
    diffText: input.diffText,
    thesisId: input.thesisId ?? null,
  });

  let receipt = enrichShipReceiptWithVerify(input.receipt, evidence, passed);
  receipt = { ...receipt, qualityWarnings: qualityFindings };

  return {
    receipt,
    evidence,
    passed,
    pipelineEvent: passed ? "verify.completed" : "verify.failed",
    pipelineError: passed ? undefined : input.summary ?? "VERIFY_FAILED",
    recovery: passed ? undefined : buildShipRecovery("verify_failed"),
    qualityFindings,
    blockAutoComplete: !passed || hasBlockingQualityFinding(qualityFindings),
  };
}

export function shouldBlockTaskComplete(input: {
  task: CmoOpsTask;
  receipt?: ShipReceipt | null;
  qualityFindings?: ShipQualityFinding[];
}): { blocked: boolean; reason?: string } {
  if (input.task.expected_proof_kind === "browser_evidence") {
    if (!input.receipt || input.receipt.verifyStatus !== "passed") {
      return {
        blocked: true,
        reason: "Browser verification must pass before completing this task.",
      };
    }
  }

  if (doneWhenRequiresBrowserVerify(input.task.done_when, input.task)) {
    if (!input.receipt || input.receipt.verifyStatus !== "passed") {
      return {
        blocked: true,
        reason: "Live URL verification required by done_when criteria.",
      };
    }
  }

  const findings = input.qualityFindings ?? input.receipt?.qualityWarnings ?? [];
  if (hasBlockingQualityFinding(findings)) {
    return {
      blocked: true,
      reason: findings.find((f) => f.severity === "block")?.detail ?? "Quality gate blocked.",
    };
  }

  return { blocked: false };
}

export function receiptForVerifyStart(receipt: ShipReceipt | null | undefined): ShipReceipt | null {
  if (!receipt) return null;
  return markShipReceiptVerifyRunning(receipt);
}

export function receiptForVerifySkipped(receipt: ShipReceipt | null | undefined): ShipReceipt | null {
  if (!receipt) return null;
  return markShipReceiptVerifySkipped(receipt);
}
