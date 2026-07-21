/**
 * Faz 4 — deterministic ship quality gates (no LLM).
 */
import type { ChannelThesisId } from "./cmoIntake";
import type { FirstShipSnapshot } from "./firstShipSnapshot";

export type ShipQualitySeverity = "warn" | "block";

export interface ShipQualityFinding {
  id: string;
  label: string;
  severity: ShipQualitySeverity;
  detail: string;
}

export interface ShipQualityLintInput {
  after?: Partial<FirstShipSnapshot> | null;
  diffText?: string;
  thesisId?: ChannelThesisId | null;
}

export function runShipQualityLint(input: ShipQualityLintInput): ShipQualityFinding[] {
  const findings: ShipQualityFinding[] = [];
  const diff = input.diffText ?? "";
  const heroHeadline = input.after?.heroHeadline?.trim() ?? "";

  const ctaMatch =
    heroHeadline ||
    diff.match(/<(?:button|a)[^>]*>([^<]{1,80})</i)?.[1]?.trim() ||
    diff.match(/cta[^"']*["']([^"']{1,80})["']/i)?.[1]?.trim() ||
    "";

  if (ctaMatch && ctaMatch.length < 5) {
    findings.push({
      id: "cta-vague",
      label: "Too vague for conversion",
      severity: "warn",
      detail: `Hero CTA "${ctaMatch}" is under 5 characters — sharpen before scaling traffic.`,
    });
  }

  if (input.thesisId === "landing_conversion") {
    const metaDesc = input.after?.metaDesc?.trim();
    if (!metaDesc) {
      findings.push({
        id: "seo-meta-desc",
        label: "Meta description missing",
        severity: "block",
        detail: "Landing conversion thesis requires a meta description before marking ship complete.",
      });
    }
  }

  const hasTracking =
    /gtag|analytics|pixel|trackEvent|data-track|plausible|segment\.track/i.test(diff) ||
    /gtag|analytics|pixel/i.test(input.after?.metaDesc ?? "");

  if (!hasTracking && (diff.includes("href=") || heroHeadline)) {
    findings.push({
      id: "tracking-missing",
      label: "No CTA click tracking",
      severity: "warn",
      detail: "No analytics event detected on CTA — add tracking before paid traffic.",
    });
  }

  return findings;
}

export function hasBlockingQualityFinding(findings: ShipQualityFinding[]): boolean {
  return findings.some((f) => f.severity === "block");
}
