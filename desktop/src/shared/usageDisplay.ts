import type { QuotaInfo, UsageInfo } from "./types.js";

/** Subscription packages — keep in sync with src/lib/pricing.ts on the website. */
export const SUBSCRIPTION_PACKAGES = {
  free: {
    id: "free" as const,
    name: "Free",
    priceLabel: "$0",
    periodLabel: "forever",
    tagline: "Scan & preview your launch outline offline.",
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    priceLabel: "$20",
    periodLabel: "/ month",
    tagline: "Marketing execution — daily ops, agent runs, and browser research.",
  },
  team: {
    id: "team" as const,
    name: "Team",
    priceLabel: "$49",
    periodLabel: "/ month",
    tagline: "Higher limits, collaboration, and client reports.",
  },
  enterprise: {
    id: "enterprise" as const,
    name: "Enterprise",
    priceLabel: "Custom",
    periodLabel: "",
    tagline: "Dedicated limits and support.",
  },
} as const;

export type SubscriptionTierId = keyof typeof SUBSCRIPTION_PACKAGES;

export interface UsageDimension {
  id: "agent" | "plan" | "browser" | "cost";
  label: string;
  used: number;
  limit: number;
  pct: number;
  unit?: "turns" | "minutes" | "cents";
}

export interface UsageSummary {
  tierId: SubscriptionTierId;
  tierLabel: string;
  hasAiAccess: boolean;
  /** Highest normalized consumption across metered dimensions (0–100). */
  primaryPct: number;
  /** 100 - primaryPct when limited; null when unlimited/dev. */
  remainingPct: number | null;
  primaryLabel: string;
  dimensions: UsageDimension[];
  nearLimit: boolean;
  atLimit: boolean;
  totalTokens: number;
  costCents: number;
  costBudgetCents: number;
  agentTurnsRemaining: number | null;
  resetsAt: string | null;
  resetLabel: string | null;
  daysUntilReset: number | null;
}

function isUnlimited(limit: number): boolean {
  return limit >= 9999;
}

function ratio(used: number, limit: number): number {
  if (limit <= 0 || isUnlimited(limit)) return 0;
  return Math.min(1, Math.max(0, used / limit));
}

/** UTC first day of next calendar month (quota reset). */
export function utcNextMonthStartISO(from = new Date()): string {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1)).toISOString();
}

export function formatQuotaResetLabel(resetsAt: string | null | undefined): string | null {
  if (!resetsAt) return null;
  const d = new Date(resetsAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function daysUntilUtcDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function packageForTier(tier?: string | null) {
  const key = (tier ?? "free") as SubscriptionTierId;
  return SUBSCRIPTION_PACKAGES[key] ?? SUBSCRIPTION_PACKAGES.free;
}

/**
 * Cursor-style unified usage summary — one primary % plus dimensional breakdown.
 */
export function summarizeUsage(input: {
  usage: UsageInfo;
  quota: QuotaInfo;
  tier?: string | null;
  tierLabel?: string | null;
}): UsageSummary {
  const { usage, quota } = input;
  const tierId = (input.tier ?? "free") as SubscriptionTierId;
  const pkg = packageForTier(tierId);
  const tierLabel = input.tierLabel ?? pkg.name;

  const costBudget = quota.cost_budget_cents ?? 0;
  const hasCostBudget = costBudget > 0 && !isUnlimited(costBudget);

  const dimensions: UsageDimension[] = [
    {
      id: "agent",
      label: "Agent turns",
      used: usage.agent,
      limit: quota.agent_limit,
      pct: Math.round(ratio(usage.agent, quota.agent_limit) * 100),
      unit: "turns",
    },
    {
      id: "plan",
      label: "Plan generations",
      used: usage.plan,
      limit: quota.plan_limit,
      pct: Math.round(ratio(usage.plan, quota.plan_limit) * 100),
      unit: "turns",
    },
    {
      id: "browser",
      label: "Browser minutes",
      used: usage.browser_min,
      limit: quota.browser_min_limit,
      pct: Math.round(ratio(usage.browser_min, quota.browser_min_limit) * 100),
      unit: "minutes",
    },
  ];

  if (hasCostBudget) {
    dimensions.push({
      id: "cost",
      label: "Included API usage",
      used: Math.round(usage.cost_cents ?? 0),
      limit: Math.round(costBudget),
      pct: Math.round(ratio(usage.cost_cents ?? 0, costBudget) * 100),
      unit: "cents",
    });
  }

  const limitedDims = dimensions.filter((d) => d.limit > 0 && !isUnlimited(d.limit));
  const primaryPct =
    limitedDims.length > 0 ? Math.max(...limitedDims.map((d) => d.pct)) : 0;
  const atLimit = limitedDims.some((d) => d.used >= d.limit);
  const nearLimit = !atLimit && primaryPct >= 80;

  const hasAiAccess =
    tierId !== "free" &&
    (quota.agent_limit > 0 || quota.plan_limit > 0 || isUnlimited(quota.agent_limit));

  const agentTurnsRemaining =
    quota.agent_limit > 0 && !isUnlimited(quota.agent_limit)
      ? Math.max(0, quota.agent_limit - usage.agent)
      : null;

  const resetsAt = quota.resets_at ?? utcNextMonthStartISO();
  const resetLabel = formatQuotaResetLabel(resetsAt);
  const daysUntilReset = daysUntilUtcDate(resetsAt);

  let primaryLabel = "Included usage";
  if (!hasAiAccess) {
    primaryLabel = "Upgrade to unlock AI";
  } else if (hasCostBudget) {
    const top = [...limitedDims].sort((a, b) => b.pct - a.pct)[0];
    primaryLabel = top?.label ?? "Included usage";
  }

  return {
    tierId,
    tierLabel,
    hasAiAccess,
    primaryPct,
    remainingPct:
      limitedDims.length > 0 && !isUnlimited(quota.agent_limit) ? Math.max(0, 100 - primaryPct) : null,
    primaryLabel,
    dimensions,
    nearLimit,
    atLimit,
    totalTokens: (usage.tokens_in ?? 0) + (usage.tokens_out ?? 0),
    costCents: usage.cost_cents ?? 0,
    costBudgetCents: costBudget,
    agentTurnsRemaining,
    resetsAt,
    resetLabel,
    daysUntilReset,
  };
}

/** Short label for status bar chip — e.g. "Pro · 62% used". */
export function usageStatusChip(summary: UsageSummary): string {
  if (!summary.hasAiAccess) return `${summary.tierLabel} · Upgrade`;
  if (summary.atLimit) return `${summary.tierLabel} · Limit reached`;
  if (summary.remainingPct != null) {
    return `${summary.tierLabel} · ${summary.primaryPct}% used`;
  }
  return summary.tierLabel;
}
