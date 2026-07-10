import { eq, persistenceEnabled, sb } from "../client.js";

export interface UsageEventRow {
  id: number;
  user_id: string;
  kind: string | null;
  tokens_in: number;
  tokens_out: number;
  browser_ms: number;
  cost_cents: number;
  created_at: string;
}

export interface InsertUsageInput {
  kind: string;
  tokens_in?: number;
  tokens_out?: number;
  browser_ms?: number;
  cost_cents?: number;
}

export interface UsageSummary {
  /** Number of plan generations this month. */
  plan: number;
  /** Number of agent turns this month. */
  agent: number;
  /** Browser minutes used this month (rounded). */
  browser_min: number;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
}

function monthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function insert(userId: string, input: InsertUsageInput): Promise<void> {
  if (!persistenceEnabled) return;
  await sb("/usage_events", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify([
      {
        user_id: userId,
        kind: input.kind,
        tokens_in: input.tokens_in ?? 0,
        tokens_out: input.tokens_out ?? 0,
        browser_ms: input.browser_ms ?? 0,
        cost_cents: input.cost_cents ?? 0,
      },
    ]),
  });
}

/** Current-month usage summed and grouped by kind. */
export async function summary(userId: string): Promise<UsageSummary> {
  const empty: UsageSummary = {
    plan: 0,
    agent: 0,
    browser_min: 0,
    tokens_in: 0,
    tokens_out: 0,
    cost_cents: 0,
  };
  if (!persistenceEnabled) return empty;

  const since = encodeURIComponent(monthStartISO());
  const rows =
    (await sb<UsageEventRow[]>(`/usage_events?user_id=${eq(userId)}&created_at=gte.${since}`)) ?? [];

  let browserMs = 0;
  return rows.reduce((acc, r) => {
    if (r.kind === "plan") acc.plan += 1;
    else if (r.kind === "agent") acc.agent += 1;
    acc.tokens_in += r.tokens_in ?? 0;
    acc.tokens_out += r.tokens_out ?? 0;
    acc.cost_cents += Number(r.cost_cents ?? 0);
    browserMs += r.browser_ms ?? 0;
    acc.browser_min = Math.round(browserMs / 60000);
    return acc;
  }, empty);
}
