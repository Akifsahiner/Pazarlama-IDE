/**
 * Enrich edit-run goals with ask-turn context (answer, assets, citations).
 */
import { extractCodeCitations } from "./codeCitation";
import type { Mention } from "./orchestration";
import type { TurnReceipt } from "./turnReceipt";
import type { MarketingAsset } from "./types";

export interface EditGoalEnrichInput {
  userGoal: string;
  turnReceipt?: TurnReceipt | null;
  lastAnswerText?: string;
  lastAssets?: MarketingAsset[];
  mentions?: Mention[];
}

const DO_THIS_NEXT_RE = /###\s*Do this next\s*([\s\S]*?)(?=###|$)/i;

function extractDoThisNext(text: string): string | undefined {
  const m = text.match(DO_THIS_NEXT_RE);
  const section = m?.[1]?.trim();
  if (!section || section.length < 10) return undefined;
  return section.replace(/\n+/g, " ").slice(0, 500);
}

export function enrichEditGoal(input: EditGoalEnrichInput): string {
  const parts: string[] = [];
  const base = input.userGoal.trim();
  if (base) parts.push(base);

  const doThisNext =
    input.turnReceipt?.primaryAction?.kind === "edit_run"
      ? undefined
      : input.lastAnswerText
        ? extractDoThisNext(input.lastAnswerText)
        : undefined;

  if (doThisNext && !base.toLowerCase().includes(doThisNext.slice(0, 40).toLowerCase())) {
    parts.push(`Context from last answer — Do this next: ${doThisNext}`);
  }

  const actionGoal =
    input.turnReceipt?.primaryAction?.kind === "edit_run"
      ? input.turnReceipt.primaryAction.goal
      : undefined;
  if (actionGoal && actionGoal !== base && !parts.some((p) => p.includes(actionGoal.slice(0, 30)))) {
    parts.push(`Executable action: ${actionGoal}`);
  }

  const assets = input.lastAssets ?? [];
  for (const asset of assets.slice(0, 2)) {
    if (asset.after?.trim()) {
      const label = asset.targetFile ? `${asset.targetFile}` : asset.type;
      parts.push(`Draft copy for ${label}:\n${asset.after.trim().slice(0, 2000)}`);
    }
  }

  const citationPaths = new Set<string>();
  if (input.lastAnswerText) {
    for (const c of extractCodeCitations(input.lastAnswerText)) citationPaths.add(c.path);
  }
  if (input.turnReceipt?.deliverables.citations) {
    for (const p of input.turnReceipt.deliverables.citations) citationPaths.add(p);
  }
  if (input.turnReceipt?.primaryAction?.kind === "edit_run" && input.turnReceipt.primaryAction.targetFiles) {
    for (const p of input.turnReceipt.primaryAction.targetFiles) citationPaths.add(p);
  }
  if (citationPaths.size) {
    parts.push(`Focus files: ${[...citationPaths].join(", ")}`);
  }

  return parts.join("\n\n").trim() || base || "Make concrete marketing file changes in the worktree.";
}

export function mentionsFromEditContext(input: EditGoalEnrichInput): Mention[] {
  const paths = new Set<string>();
  for (const m of input.mentions ?? []) {
    if (m.path) paths.add(m.path);
  }
  if (input.turnReceipt?.primaryAction?.kind === "edit_run") {
    for (const p of input.turnReceipt.primaryAction.targetFiles ?? []) paths.add(p);
  }
  if (input.lastAnswerText) {
    for (const c of extractCodeCitations(input.lastAnswerText)) paths.add(c.path);
  }
  return [...paths].map((path) => ({ type: "file" as const, path }));
}
