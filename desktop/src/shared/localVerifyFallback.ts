/**
 * When Computer Use is offline, local diff review counts as verify for first-ship wow.
 */
import type { ShipRecoveryAction } from "./shipPipelineRecovery";

export interface LocalVerifyOption {
  title: string;
  detail: string;
  checklist: string[];
}

export function buildLocalVerifyOption(input?: {
  heroPath?: string;
  previewUrl?: string;
}): LocalVerifyOption {
  const target = input?.heroPath ?? "landing page";
  return {
    title: "Review diff locally",
    detail: input?.previewUrl
      ? `Computer Use is offline — open ${input.previewUrl} or your dev server and confirm the hero + meta changes.`
      : `Computer Use is offline — open ${target} in your editor or dev preview and confirm hero headline, meta title, and CTA.`,
    checklist: [
      "Hero headline states one clear outcome",
      "Meta title ≤ 60 chars with product name",
      "Primary CTA is visible above the fold",
    ],
  };
}

export function buildLocalVerifyRecovery(
  input?: { heroPath?: string; previewUrl?: string },
): ShipRecoveryAction {
  const local = buildLocalVerifyOption(input);
  return {
    kind: "verify_unavailable",
    title: local.title,
    detail: `${local.detail} Mark verified when the diff looks correct — live browser proof is optional for first ship.`,
  };
}
