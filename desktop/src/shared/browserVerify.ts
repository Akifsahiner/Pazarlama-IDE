/**
 * Faz 4 — structured browser verify after apply.
 * See CMO_BROWSER_VERIFY_SPEC.md
 */
import type { ChannelThesis } from "./cmoIntake";
import type { CmoOpsTask } from "./cmoOpsCadence";
import type { Finding } from "./types";

export interface VerifyValidation {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface VerifyRunResult {
  url: string;
  validations: VerifyValidation[];
  screenshotRef?: string;
  findings: Finding[];
  run_id?: string;
  verified_at?: string;
}

export interface BrowserEvidenceProof {
  run_id: string;
  url: string;
  screenshot_path?: string;
  validations: VerifyValidation[];
  findings?: Finding[];
  verified_at: string;
}

export function isVerifyChecklistGoal(goal: string): boolean {
  return /\bChecklist:\s*\n/i.test(goal) || /\bVerify the page at/i.test(goal);
}

export function verifyPassRate(result: Pick<VerifyRunResult, "validations">): number {
  if (result.validations.length === 0) return 0;
  const passed = result.validations.filter((v) => v.passed).length;
  return passed / result.validations.length;
}

export function verifyPassed(
  result: Pick<VerifyRunResult, "validations">,
  minRate = 1,
): boolean {
  if (result.validations.length === 0) return false;
  return verifyPassRate(result) >= minRate;
}

const DEFAULT_CHECKLIST = ["Hero CTA visible", "Page title updated"];

export function buildVerifyChecklistFromTask(
  task?: CmoOpsTask | null,
  thesis?: ChannelThesis | null,
): string[] {
  const items: string[] = [];
  if (task?.done_when) {
    if (/cta|button|hero/i.test(task.done_when)) items.push("Hero CTA visible");
    if (/title|headline|meta/i.test(task.done_when)) items.push("Page title updated");
    if (/track|analytics|gtag|pixel/i.test(task.done_when)) items.push("Tracking snippet present");
    if (/live url|https/i.test(task.done_when)) items.push("Primary page loads without error");
  }
  if (thesis?.id === "landing_conversion" && !items.some((i) => /cta/i.test(i))) {
    items.push("Hero CTA visible");
  }
  if (thesis?.id === "seo_content" && !items.some((i) => /title/i.test(i))) {
    items.push("Page title updated");
  }
  const unique = [...new Set(items)];
  return unique.length > 0 ? unique : [...DEFAULT_CHECKLIST];
}

export function buildVerifyGoal(url: string, checklist: string[]): string {
  return [
    `Verify the page at ${url || "the preview URL"}.`,
    checklist.length
      ? `Checklist:\n${checklist.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "Confirm the recent changes look correct and list any issues.",
    "For each checklist item emit exactly one line:",
    "VALIDATION: <label> | pass|fail | <detail>",
  ].join("\n");
}

export function parseValidationLine(line: string): VerifyValidation | null {
  const m = /^\s*VALIDATION:\s*(.+)$/i.exec(line);
  if (!m) return null;
  const parts = m[1].split("|").map((s) => s.trim());
  if (parts.length < 2) return null;
  const label = parts[0]!;
  const status = parts[1]!.toLowerCase();
  const passed = status === "pass" || status === "passed" || status === "ok" || status === "yes";
  const detail = parts.slice(2).join(" | ") || parts[2];
  if (!label) return null;
  return { label, passed, detail: detail || undefined };
}

export function validationsFromReport(
  report?: { validations?: VerifyValidation[] } | null,
  findings?: Finding[],
): VerifyValidation[] {
  if (report?.validations?.length) return report.validations;
  if (!findings?.length) return [];
  return findings.map((f) => ({
    label: f.title,
    passed: f.severity === "info" || f.severity === "low",
    detail: f.evidence,
  }));
}

export function toBrowserEvidenceProof(
  result: VerifyRunResult,
  screenshotPath?: string,
): BrowserEvidenceProof {
  return {
    run_id: result.run_id ?? `verify-${Date.now()}`,
    url: result.url,
    screenshot_path: screenshotPath ?? result.screenshotRef,
    validations: result.validations,
    findings: result.findings.length > 0 ? result.findings : undefined,
    verified_at: result.verified_at ?? new Date().toISOString(),
  };
}

export function buildVerifyFixGoal(
  failing: VerifyValidation[],
  url?: string,
): string {
  const labels = failing.filter((v) => !v.passed).map((v) => v.label);
  const detail = labels.length ? labels.join(", ") : "checklist items";
  return [
    `Fix browser verify failures on ${url ?? "the landing page"}: ${detail}.`,
    "Update hero CTA, page title, or tracking snippet as needed.",
    "Keep changes minimal and shippable in one edit run.",
  ].join(" ");
}

export function mergeReportToVerifyResult(input: {
  url: string;
  runId: string;
  report?: {
    validations?: VerifyValidation[];
    evidence?: Finding[];
  } | null;
  findings?: Finding[];
}): VerifyRunResult {
  const validations =
    input.report?.validations?.length
      ? input.report.validations
      : validationsFromReport(input.report, input.findings ?? input.report?.evidence);
  return {
    url: input.url,
    run_id: input.runId,
    validations,
    findings: input.findings ?? input.report?.evidence ?? [],
    verified_at: new Date().toISOString(),
  };
}
