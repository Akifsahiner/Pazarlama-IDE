/**
 * Faz 5 — contract lint for human ops tasks (mükemmeliyetçi CMO gates).
 */
import type { ChannelThesisId } from "./cmoIntake";
import type { CmoOpsTask } from "./cmoOpsCadence";
import type { HumanExecutionAsset } from "./humanExecutionAsset";

export type HumanContractSeverity = "block" | "warn";

export interface HumanContractFinding {
  id: string;
  severity: HumanContractSeverity;
  label: string;
  detail: string;
}

const GENERIC_POST_RE = /\bpost on social\b|\bpost to social\b|\bshare on social media\b/i;

export function lintHumanOpsTaskDoneWhen(task: CmoOpsTask): HumanContractFinding[] {
  const findings: HumanContractFinding[] = [];
  if (GENERIC_POST_RE.test(task.done_when)) {
    findings.push({
      id: "generic-post-done-when",
      severity: "block",
      label: "Generic social instruction",
      detail:
        'Replace "post on social" with platform, hook, and measurable done_when (URL + metric).',
    });
  }
  return findings;
}

export function lintHumanExecutionAsset(
  asset: HumanExecutionAsset,
  thesisId: ChannelThesisId,
): HumanContractFinding[] {
  const findings: HumanContractFinding[] = [];
  if (asset.copy_blocks.length === 0) {
    findings.push({
      id: "empty-copy-blocks",
      severity: "block",
      label: "No copy blocks",
      detail: "Human execution asset must include at least one copy block.",
    });
  }
  if (thesisId === "viral_short_form") {
    const hookCount = asset.hook_grid_count ?? 0;
    if (hookCount < 20) {
      findings.push({
        id: "cluely-hook-grid",
        severity: "warn",
        label: "Hook grid below Week 1 volume",
        detail: `Cluely viral path expects ≥20 hook slots; got ${hookCount}.`,
      });
    }
  }
  if (thesisId === "outbound_sales" && !asset.honesty_note) {
    findings.push({
      id: "outbound-honesty",
      severity: "block",
      label: "Missing honesty note",
      detail: "Outbound pack must state that sends happen from the user's email tool.",
    });
  }
  return findings;
}

export function lintHumanPostedProof(input: {
  note?: string;
  url?: string;
}): HumanContractFinding[] {
  const url = input.url?.trim() ?? "";
  const note = input.note?.trim() ?? "";
  if (/^i posted$/i.test(note) && url.length < 8) {
    return [
      {
        id: "posted-without-url",
        severity: "block",
        label: '"I posted" without URL',
        detail: "Add the live post URL (min 8 characters) before marking posted.",
      },
    ];
  }
  return [];
}
