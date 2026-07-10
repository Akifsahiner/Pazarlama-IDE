import type { MarketingDecision } from "../schemas/decision.js";
import { TACTIC_BY_BOTTLENECK, tacticLabel } from "./gtmCatalog.js";

export type GtmBottleneck =
  | "awareness"
  | "conversion"
  | "distribution"
  | "revenue"
  | "measurement";

export const BOTTLENECK_PLAYBOOKS: Record<GtmBottleneck, string[]> = {
  awareness: ["waitlist-hype", "short-form-viral", "influencer", "content-engine"],
  conversion: ["landing-conversion", "paid-ads-opt", "paid-ads"],
  distribution: ["ph-number-one", "ph-launch", "linkedin-gtm", "content-engine"],
  revenue: ["sales-outbound"],
  measurement: ["analytics-measurement"],
};

export function inferBottleneckFromDecision(bottleneckText: string): GtmBottleneck {
  const t = bottleneckText.toLowerCase();
  if (/revenue|sales|deal|close|pipeline|cold email|reply rate|outbound/i.test(t)) return "revenue";
  if (/convert|signup|landing|cta|cr\b|cpa|paid ads|meta ads|ads creative|bounce/i.test(t)) return "conversion";
  if (/analytics|measure|track|kpi|ga4|attribution|what works|events not/i.test(t)) return "measurement";
  if (/launch|product hunt|distribution|\breach\b|ph\b|no users|ready no user/i.test(t)) return "distribution";
  if (/influencer|linkedin|viral|waitlist|awareness|audience/i.test(t)) return "awareness";
  return "awareness";
}

export function primaryPlaybookFor(bottleneck: GtmBottleneck, persona: "marketing" | "sales"): string {
  if (persona === "sales" && bottleneck === "revenue") return "sales-outbound";
  return BOTTLENECK_PLAYBOOKS[bottleneck][0] ?? "landing-conversion";
}

/** Fill gtm_bottleneck + primary_playbook_id when the model omits them. */
export function enrichDecision(
  decision: MarketingDecision,
  persona: "marketing" | "sales" = "marketing",
): MarketingDecision {
  const gtm_bottleneck =
    decision.gtm_bottleneck ?? inferBottleneckFromDecision(decision.bottleneck);
  const primary_playbook_id =
    decision.primary_playbook_id ?? primaryPlaybookFor(gtm_bottleneck, persona);
  const channelIds = BOTTLENECK_PLAYBOOKS[gtm_bottleneck] ?? [];
  const channel_priority =
    decision.channel_priority?.length > 0
      ? decision.channel_priority.slice(0, 3)
      : channelIds.slice(0, 3);
  const next_playbook =
    decision.next_playbook ?? channel_priority[1] ?? channelIds[1];
  const tacticId = TACTIC_BY_BOTTLENECK[gtm_bottleneck];
  const tactic_you_may_not_know =
    decision.tactic_you_may_not_know ?? tacticLabel(tacticId);
  const bottleneck_why =
    decision.bottleneck_why ??
    `Primary constraint is ${gtm_bottleneck}. Focus ${primary_playbook_id} before adding channels.`;
  return {
    ...decision,
    gtm_bottleneck,
    primary_playbook_id,
    channel_priority,
    next_playbook,
    tactic_you_may_not_know,
    bottleneck_why,
  };
}
