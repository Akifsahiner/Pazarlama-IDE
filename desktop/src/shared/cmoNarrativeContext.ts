/**
 * P13 — Shared narrative adapter for execution lane factories.
 */
import type { GrowthNarrative, MarketingProfile } from "./types";

export interface NarrativeContext {
  one_liner?: string;
  cultural_tension?: string;
  proof_angle?: string;
}

export function resolveNarrativeContext(
  source?: MarketingProfile | GrowthNarrative | null,
): NarrativeContext {
  if (!source) return {};
  const narrative: GrowthNarrative | undefined =
    "one_liner" in source ? source : source.growth_narrative;
  return {
    one_liner: narrative?.one_liner,
    cultural_tension: narrative?.cultural_tension,
    proof_angle: narrative?.proof_angle,
  };
}

export function withNarrativePrefix(
  text: string,
  context?: NarrativeContext | null,
  maxLen = 220,
): string {
  const narrative = context?.one_liner?.trim();
  if (!narrative || text.includes(narrative)) return text;
  const combined = `${narrative} — ${text}`;
  if (combined.length <= maxLen) return combined;
  const available = Math.max(0, maxLen - text.length - 3);
  if (available < 16) return text.slice(0, maxLen);
  return `${narrative.slice(0, available).trimEnd()}… — ${text}`;
}
