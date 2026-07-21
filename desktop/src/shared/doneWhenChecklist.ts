/**
 * Faz 4 — live done_when checklist for Diff tab header.
 */
import type { CmoOpsTask } from "./cmoOpsCadence";
import type { ChannelThesis } from "./cmoIntake";
import { buildVerifyChecklistFromTask } from "./browserVerify";
import type { ShipReceipt } from "./shipReceipt";
import type { ShipQualityFinding } from "./shipQualityLint";
import type { ShipPipelineStage } from "./shipPipeline";

export type ChecklistItemStatus = "pending" | "done" | "failed" | "skipped";

export interface DoneWhenChecklistItem {
  id: string;
  label: string;
  required: boolean;
  source: "done_when" | "apply" | "verify" | "quality";
  status: ChecklistItemStatus;
}

export interface DoneWhenChecklistContext {
  shipReceipt?: ShipReceipt | null;
  shipPipelineStage?: ShipPipelineStage;
  hasPendingApply?: boolean;
  qualityFindings?: ShipQualityFinding[];
}

export function buildDoneWhenChecklist(
  task: CmoOpsTask | null | undefined,
  thesis: ChannelThesis | null | undefined,
  context: DoneWhenChecklistContext = {},
): DoneWhenChecklistItem[] {
  const items: DoneWhenChecklistItem[] = [];

  if (task?.done_when) {
    const verifyItems = buildVerifyChecklistFromTask(task, thesis);
    for (const [i, label] of verifyItems.entries()) {
      items.push({
        id: `verify-${i}`,
        label,
        required: true,
        source: "done_when",
        status: "pending",
      });
    }

    if (/utm|param/i.test(task.done_when)) {
      items.push({
        id: "utm-params",
        label: "UTM params on CTA link",
        required: true,
        source: "done_when",
        status: "pending",
      });
    }
  }

  items.push({
    id: "diff-applied",
    label: "Diff applied to repo",
    required: true,
    source: "apply",
    status: "pending",
  });

  items.push({
    id: "live-verified",
    label: "Live URL verified in browser",
    required: Boolean(task && /live|url|https|link|published/i.test(task.done_when)),
    source: "verify",
    status: "pending",
  });

  for (const f of context.qualityFindings ?? []) {
    items.push({
      id: `quality-${f.id}`,
      label: f.label,
      required: f.severity === "block",
      source: "quality",
      status: "pending",
    });
  }

  return items.map((item) => ({
    ...item,
    status: resolveChecklistItemStatus(item, context),
  }));
}

export function resolveChecklistItemStatus(
  item: Omit<DoneWhenChecklistItem, "status">,
  context: DoneWhenChecklistContext,
): ChecklistItemStatus {
  const receipt = context.shipReceipt;
  const stage = context.shipPipelineStage;

  if (item.source === "apply") {
    if (receipt?.commitSha || receipt?.filesChanged) return "done";
    if (context.hasPendingApply || stage === "apply" || stage === "diff") return "pending";
    return "pending";
  }

  if (item.source === "verify") {
    if (!item.required) return "skipped";
    if (receipt?.verifyStatus === "passed") return "done";
    if (receipt?.verifyStatus === "failed") return "failed";
    if (receipt?.verifyStatus === "running" || stage === "verify") return "pending";
    if (receipt?.verifyStatus === "skipped") return "skipped";
    return "pending";
  }

  if (item.source === "quality") {
    const finding = context.qualityFindings?.find((f) => `quality-${f.id}` === item.id);
    if (!finding) return "done";
    if (finding.severity === "block" && receipt?.verifyStatus !== "passed") return "pending";
    return finding.severity === "block" ? "failed" : "pending";
  }

  if (item.source === "done_when") {
    const validations = receipt?.browserValidations ?? [];
    const match = validations.find((v) =>
      v.label.toLowerCase().includes(item.label.split(" ")[0]?.toLowerCase() ?? ""),
    );
    if (match) return match.passed ? "done" : "failed";
    if (receipt?.verifyStatus === "passed") return "done";
    return "pending";
  }

  return "pending";
}

export function countIncompleteRequiredItems(items: DoneWhenChecklistItem[]): number {
  return items.filter((i) => i.required && i.status !== "done" && i.status !== "skipped").length;
}
