import type { MarketingProfile } from "./types";

export type ActualSource = "manual" | "experiment" | "connector";

export interface ChannelActuals {
  signups?: number;
  signupsSource?: ActualSource;
  spend?: number;
  spendSource?: ActualSource;
  cpa?: number;
}

const WAITLIST_CHANNELS = new Set(["waitlist-hype", "waitlist"]);
const PH_CHANNELS = new Set(["ph-launch", "ph-number-one"]);
const PAID_CHANNELS = new Set(["paid-ads-opt", "paid-ads"]);

function matchesChannel(kpiChannel: string | undefined, playbookId: string): boolean {
  if (!kpiChannel) return false;
  if (kpiChannel === playbookId) return true;
  if (WAITLIST_CHANNELS.has(kpiChannel) && WAITLIST_CHANNELS.has(playbookId)) return true;
  if (PH_CHANNELS.has(kpiChannel) && PH_CHANNELS.has(playbookId)) return true;
  if (PAID_CHANNELS.has(kpiChannel) && PAID_CHANNELS.has(playbookId)) return true;
  return false;
}

function signupsFromExperiments(profile: MarketingProfile | null, playbookId: string): number | undefined {
  for (const exp of profile?.previous_experiments ?? []) {
    if (exp.outcome === "pending") continue;
    const name = exp.metric?.name?.toLowerCase() ?? "";
    if (!/signup|waitlist|upvote|conversion/i.test(name)) continue;
    if (WAITLIST_CHANNELS.has(playbookId) && /signup|waitlist/i.test(name)) {
      return exp.metric?.value;
    }
    if (PH_CHANNELS.has(playbookId) && /upvote|ph/i.test(name)) {
      return exp.metric?.value;
    }
  }
  return undefined;
}

/** Resolve real actuals for Launch Command Center channel columns — never fabricate. */
export function resolveChannelActuals(
  playbookId: string,
  profile: MarketingProfile | null,
): ChannelActuals {
  const result: ChannelActuals = {};
  const kpis = profile?.manual_kpis ?? [];

  for (const kpi of kpis) {
    if (!matchesChannel(kpi.channel, playbookId)) continue;
    if (kpi.id === "paid_spend" || kpi.unit === "€" || /spend/i.test(kpi.name)) {
      result.spend = kpi.value;
      result.spendSource = "manual";
    } else if (WAITLIST_CHANNELS.has(playbookId) || PH_CHANNELS.has(playbookId)) {
      result.signups = kpi.value;
      result.signupsSource = "manual";
    } else if (/signup|waitlist|upvote|conversion/i.test(kpi.name)) {
      result.signups = kpi.value;
      result.signupsSource = "manual";
    }
  }

  if (result.signups == null) {
    const fromExp = signupsFromExperiments(profile, playbookId);
    if (fromExp != null) {
      result.signups = fromExp;
      result.signupsSource = "experiment";
    }
  }

  if (result.spend != null && result.signups != null && result.signups > 0) {
    result.cpa = Math.round((result.spend / result.signups) * 100) / 100;
  }

  return result;
}

export function formatActual(value: number | undefined): string {
  if (value == null) return "—";
  return String(value);
}

export function actualSourceLabel(source?: ActualSource): string | undefined {
  if (source === "manual") return "Logged";
  if (source === "experiment") return "From experiment";
  if (source === "connector") return "Connector";
  return undefined;
}
