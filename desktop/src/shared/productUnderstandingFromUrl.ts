/**
 * Part 6 — live URL scan → claims (URL-only projects).
 */
import type { UrlScanClaimsInput } from "./productUnderstandingInput";
import { createEvidenceRef, type ProductClaim } from "./productUnderstandingInput";

const NOW = () => new Date().toISOString();

export function buildClaimsFromUrlScan(input: UrlScanClaimsInput): ProductClaim[] {
  const evidence = [
    createEvidenceRef({
      kind: "live_url",
      label: input.title ?? input.url,
      ref: input.url,
      excerpt: input.description?.slice(0, 240),
    }),
  ];
  const routes = input.routes ?? [];
  for (const r of routes.slice(0, 8)) {
    evidence.push(
      createEvidenceRef({
        kind: "live_url",
        label: `Internal path: ${r}`,
        ref: `${input.url}${r}`,
        rule_id: "url.internal_path",
      }),
    );
  }
  if (input.hasAnalytics) {
    evidence.push(
      createEvidenceRef({
        kind: "scan_heuristic",
        label: "Analytics snippet on live page",
        ref: input.url,
        rule_id: "analytics.detected",
      }),
    );
  }

  const siteSummary = routes.length
    ? routes.slice(0, 6).join(", ")
    : input.description?.slice(0, 80) ?? null;

  return [
    {
      dimension: "site_structure",
      value: siteSummary,
      confidence: routes.length ? "measured" : "assumption",
      evidence,
      updated_at: NOW(),
    },
    {
      dimension: "traffic_analytics",
      value: input.hasAnalytics ? "analytics_detected" : null,
      confidence: input.hasAnalytics ? "measured" : "missing",
      evidence: input.hasAnalytics
        ? evidence.filter((e) => e.rule_id === "analytics.detected")
        : [],
      updated_at: NOW(),
    },
  ];
}
