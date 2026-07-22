import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react";
import { formatCostCents, formatTokenCount } from "@shared/contextBudget";
import { packageForTier, summarizeUsage } from "@shared/usageDisplay";
import type { UsageHistoryItem } from "@shared/types";
import { normalizeTier } from "@shared/tierFeatures";
import { useApp } from "@renderer/state/store";
import { apiUsageHistory } from "@renderer/lib/api";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";

function UsageRow({
  label,
  used,
  limit,
  pct,
  formatUsed,
  formatLimit,
}: {
  label: string;
  used: number;
  limit: number;
  pct: number;
  formatUsed?: (n: number) => string;
  formatLimit?: (n: number) => string;
}) {
  if (limit <= 0 || limit >= 9999) return null;
  const barClass = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warn" : "bg-accent";
  const fmt = formatUsed ?? String;
  const fmtLimit = formatLimit ?? String;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-body-sm">
        <span className="text-text-2">{label}</span>
        <span className="font-mono text-text">
          {fmt(used)} / {fmtLimit(limit)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-full)] bg-surface-2">
        <div
          className={`h-full rounded-[var(--radius-full)] transition-[width] ${barClass}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

/** Cursor-style usage & subscription panel — plan, included usage %, reset date, breakdown. */
export function UsageQuotaSection() {
  const auth = useApp((s) => s.auth);
  const tierLabel = useApp((s) => s.tierLabel);
  const settings = useApp((s) => s.settings);
  const loadMe = useApp((s) => s.loadMe);
  const startCheckout = useApp((s) => s.startCheckout);
  const runtime = useApp((s) => s.runtime);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<UsageHistoryItem[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (runtime === "connected" && auth.authEnabled) void loadMe();
  }, [runtime, auth.authEnabled, loadMe]);

  useEffect(() => {
    if (runtime !== "connected" || !auth.authEnabled) return;
    void apiUsageHistory(settings, auth.authEnabled, 20)
      .then((r) => setHistory(r.events))
      .catch(() => setHistory([]));
  }, [runtime, auth.authEnabled, settings, auth.usage?.agent, auth.usage?.plan]);

  const usage = auth.usage;
  const quota = auth.quota;
  const tier = normalizeTier(auth.user?.tier);

  const summary = useMemo(() => {
    if (!usage || !quota) return null;
    return summarizeUsage({
      usage,
      quota,
      tier,
      tierLabel: tierLabel ?? packageForTier(tier).name,
    });
  }, [usage, quota, tier, tierLabel]);

  const pkg = packageForTier(tier);

  const refresh = async () => {
    setLoading(true);
    try {
      await loadMe();
      const r = await apiUsageHistory(settings, auth.authEnabled, 20);
      setHistory(r.events);
    } finally {
      setLoading(false);
    }
  };

  if (!auth.authEnabled) {
    return (
      <Card className="text-body-sm text-text-2">
        Usage tracking is disabled on this backend (local dev). Hosted mode records plan, agent,
        browser minutes, and API cost per month.
      </Card>
    );
  }

  if (!usage || !quota || !summary) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <span className="text-body-sm text-text-2">
          {runtime === "connected" ? "Usage not loaded yet." : "Connect to view usage."}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={loading || runtime !== "connected"}
          iconLeft={loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          onClick={() => void refresh()}
        >
          Refresh
        </Button>
      </Card>
    );
  }

  const primaryBarClass = summary.atLimit
    ? "bg-danger"
    : summary.nearLimit
      ? "bg-warn"
      : "bg-accent";

  return (
    <div className="space-y-4">
      {/* Plan card */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-body font-semibold text-text">{summary.tierLabel}</span>
              <Badge tone={tier === "free" ? "warn" : "ok"}>{pkg.priceLabel}{pkg.periodLabel}</Badge>
            </div>
            <p className="mt-1 text-caption text-text-3">{pkg.tagline}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            iconLeft={loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        </div>

        {summary.hasAiAccess ? (
          <>
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-caption text-text-3">Included usage this month</div>
                  <div className="font-mono text-2xl font-semibold tabular-nums text-text">
                    {summary.primaryPct}%
                    <span className="ml-1 text-body font-normal text-text-3">used</span>
                  </div>
                </div>
                {summary.remainingPct != null && (
                  <div className="text-right text-caption text-text-3">
                    <div>{100 - summary.primaryPct}% remaining</div>
                    {summary.resetLabel && (
                      <div className="mt-0.5">
                        Resets {summary.resetLabel}
                        {summary.daysUntilReset != null && summary.daysUntilReset <= 14
                          ? ` · ${summary.daysUntilReset}d`
                          : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-[var(--radius-full)] bg-surface-2">
                <div
                  className={`h-full rounded-[var(--radius-full)] transition-[width] ${primaryBarClass}`}
                  style={{ width: `${Math.min(100, summary.primaryPct)}%` }}
                />
              </div>
              <p className="text-mini text-text-3">
                Driven by {summary.primaryLabel.toLowerCase()}. Token cost estimated at provider list
                rates — same model as Cursor.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-caption">
              <div>
                <div className="text-text-3">Tokens</div>
                <div className="font-mono text-text">{formatTokenCount(summary.totalTokens)}</div>
              </div>
              <div>
                <div className="text-text-3">Est. cost</div>
                <div className="font-mono text-text">{formatCostCents(summary.costCents)}</div>
              </div>
              <div>
                <div className="text-text-3">Agent left</div>
                <div className="font-mono text-text">
                  {summary.agentTurnsRemaining ?? "∞"}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-accent/25 bg-accent-soft/15 px-4 py-3">
            <p className="text-body-sm text-text-2">
              Free tier includes scan and preview only. Subscribe to Pro for AI plan generation, agent
              runs, and browser research.
            </p>
            {auth.billingConfigured && (
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => void startCheckout("pro")}
              >
                Upgrade to Pro — {packageForTier("pro").priceLabel}/mo
              </Button>
            )}
          </div>
        )}

        {(summary.nearLimit || summary.atLimit) && summary.hasAiAccess && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-warn/30 bg-warn/10 px-3 py-2">
            <p className="text-mini text-warn">
              {summary.atLimit
                ? "Monthly limit reached. Upgrade or wait until reset."
                : "Approaching limit — prefer Sonnet, one plan task at a time, avoid redundant regens."}
            </p>
            {auth.billingConfigured && tier !== "team" && (
              <Button variant="secondary" size="sm" onClick={() => void startCheckout(tier === "free" ? "pro" : "team")}>
                {tier === "free" ? "Upgrade to Pro" : "Upgrade to Team"}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Breakdown */}
      {summary.hasAiAccess && (
        <Card className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowBreakdown((v) => !v)}
          >
            <span className="flex items-center gap-2 text-body-sm font-medium text-text">
              <BarChart3 size={15} className="text-accent" />
              Usage breakdown
            </span>
            <span className="text-caption text-text-3">{showBreakdown ? "Hide" : "Show"}</span>
          </button>
          {showBreakdown && (
            <div className="space-y-3">
              {summary.dimensions.map((d) => (
                <UsageRow
                  key={d.id}
                  label={d.label}
                  used={d.used}
                  limit={d.limit}
                  pct={d.pct}
                  formatUsed={d.unit === "cents" ? (n) => formatCostCents(n) : undefined}
                  formatLimit={d.unit === "cents" ? (n) => formatCostCents(n) : undefined}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Token efficiency */}
      {summary.hasAiAccess && (
        <Card className="space-y-2">
          <div className="flex items-center gap-2 text-body-sm font-medium text-text">
            <Zap size={14} className="text-accent" />
            Token efficiency
          </div>
          <ul className="space-y-1.5 text-caption text-text-2">
            <li className="flex gap-2">
              <Sparkles size={12} className="mt-0.5 shrink-0 text-text-3" />
              Sonnet is the default — fast and strong for marketing work.
            </li>
            <li className="flex gap-2">
              <Sparkles size={12} className="mt-0.5 shrink-0 text-text-3" />
              Context is trimmed automatically — older thread turns drop first.
            </li>
            <li className="flex gap-2">
              <Sparkles size={12} className="mt-0.5 shrink-0 text-text-3" />
              Run one plan task at a time instead of parallel regenerations.
            </li>
          </ul>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="space-y-2">
          <div className="text-caption font-medium text-text-2">Recent events</div>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-mini text-text-3">
            {history.map((ev) => (
              <li key={ev.id} className="flex justify-between gap-2 font-mono">
                <span>
                  {ev.kind ?? "?"} · {formatTokenCount(ev.tokens_in + ev.tokens_out)}
                </span>
                <span>
                  {formatCostCents(ev.cost_cents)} ·{" "}
                  {new Date(ev.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
