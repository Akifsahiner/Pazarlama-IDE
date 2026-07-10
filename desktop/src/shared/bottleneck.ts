/** GTM constraint types — maps to primary playbook recommendations. */
export type GtmBottleneck =
  | "awareness"
  | "conversion"
  | "distribution"
  | "revenue"
  | "measurement";

export interface BottleneckResolution {
  bottleneck: GtmBottleneck;
  label: string;
  primaryPlaybookId: string;
  successMetric: { name: string; target: string };
  rationale: string;
}

export const BOTTLENECK_PLAYBOOKS: Record<GtmBottleneck, string[]> = {
  awareness: ["waitlist-hype", "short-form-viral", "influencer", "content-engine"],
  conversion: ["landing-conversion", "paid-ads-opt", "paid-ads"],
  distribution: ["ph-number-one", "ph-launch", "linkedin-gtm", "content-engine"],
  revenue: ["sales-outbound"],
  measurement: ["analytics-measurement"],
};

export const BOTTLENECK_LABELS: Record<GtmBottleneck, string> = {
  awareness: "Awareness — not enough people know you exist",
  conversion: "Conversion — traffic does not sign up or buy",
  distribution: "Distribution — product ready but no coordinated launch reach",
  revenue: "Revenue — leads exist but deals are not closing",
  measurement: "Measurement — cannot tell what is working",
};

export function resolveBottleneckFromText(text: string): GtmBottleneck {
  const t = text.toLowerCase();
  if (/revenue|sales|deal|close|pipeline|demo request/i.test(t)) return "revenue";
  if (/convert|signup|landing|cta|cr\b|bounce/i.test(t)) return "conversion";
  if (/analytics|measure|track|kpi|data/i.test(t)) return "measurement";
  if (/launch|product hunt|ph\b|distribution|reach/i.test(t)) return "distribution";
  if (/waitlist|awareness|traffic|viral|influencer|audience/i.test(t)) return "awareness";
  return "awareness";
}

export function primaryPlaybookForBottleneck(
  bottleneck: GtmBottleneck,
  persona: "marketing" | "sales" = "marketing",
): BottleneckResolution {
  const ids = BOTTLENECK_PLAYBOOKS[bottleneck];
  const primaryPlaybookId =
    persona === "sales" && bottleneck === "revenue"
      ? "sales-outbound"
      : ids[0] ?? "landing-conversion";

  const metrics: Record<GtmBottleneck, { name: string; target: string }> = {
    awareness: { name: "Waitlist signups", target: "+20% in 14 days" },
    conversion: { name: "Landing signup rate", target: "≥ 3% from cold traffic" },
    distribution: { name: "Launch-day signups", target: "2× baseline daily signups" },
    revenue: { name: "Qualified replies", target: "≥ 15% on outbound sequence" },
    measurement: { name: "Tracked funnel events", target: "100% of key events firing" },
  };

  return {
    bottleneck,
    label: BOTTLENECK_LABELS[bottleneck],
    primaryPlaybookId,
    successMetric: metrics[bottleneck],
    rationale: `Primary constraint is ${bottleneck}. Focus one playbook before adding channels.`,
  };
}
