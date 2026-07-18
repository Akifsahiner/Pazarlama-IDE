import { useEffect, useState } from "react";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { formatCostCents, formatTokenCount } from "@shared/contextBudget";
import type { UsageHistoryItem } from "@shared/types";
import { useApp } from "@renderer/state/store";
import { apiUsageHistory } from "@renderer/lib/api";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";

function UsageRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const ratio = limit > 0 && limit < 9999 ? Math.min(1, used / limit) : 0;
  const pct = Math.round(ratio * 100);
  const barClass =
    pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warn" : "bg-accent";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-body-sm">
        <span className="text-text-2">{label}</span>
        <span className="font-mono text-text">
          {used} / {limit >= 9999 ? "∞" : limit}
        </span>
      </div>
      {limit < 9999 && (
        <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-full)] bg-surface-2">
          <div
            className={`h-full rounded-[var(--radius-full)] transition-[width] ${barClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Monthly usage vs quota from GET /me — developer trust surface. */
export function UsageQuotaSection() {
  const auth = useApp((s) => s.auth);
  const settings = useApp((s) => s.settings);
  const loadMe = useApp((s) => s.loadMe);
  const runtime = useApp((s) => s.runtime);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<UsageHistoryItem[]>([]);

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

  const refresh = async () => {
    setLoading(true);
    try {
      await loadMe();
      const r = await apiUsageHistory(settings, auth.authEnabled, 20);
      setHistory(r.events);
    } catch {
      /* loadMe reports */
    } finally {
      setLoading(false);
    }
  };

  if (!auth.authEnabled) {
    return (
      <Card className="text-body-sm text-text-2">
        Usage tracking is disabled on this backend (local dev). Hosted Supabase mode records plan,
        agent, and browser minutes per month.
      </Card>
    );
  }

  if (!usage || !quota) {
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

  const agentPct = quota.agent_limit < 9999 ? usage.agent / quota.agent_limit : 0;
  const planPct = quota.plan_limit < 9999 ? usage.plan / quota.plan_limit : 0;
  const nearLimit = agentPct >= 0.8 || planPct >= 0.8;
  const tokens = (usage.tokens_in ?? 0) + (usage.tokens_out ?? 0);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-body-sm font-medium text-text">
          <BarChart3 size={15} className="text-accent" />
          This month
          {auth.user?.tier && (
            <span className="text-caption font-normal text-text-3">· {auth.user.tier}</span>
          )}
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

      <UsageRow label="Plan generations" used={usage.plan} limit={quota.plan_limit} />
      <UsageRow label="Agent turns" used={usage.agent} limit={quota.agent_limit} />
      <UsageRow label="Browser minutes" used={usage.browser_min} limit={quota.browser_min_limit} />

      <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-caption">
        <div>
          <div className="text-text-3">Tokens in</div>
          <div className="font-mono text-text">{formatTokenCount(usage.tokens_in ?? 0)}</div>
        </div>
        <div>
          <div className="text-text-3">Tokens out</div>
          <div className="font-mono text-text">{formatTokenCount(usage.tokens_out ?? 0)}</div>
        </div>
        <div>
          <div className="text-text-3">Est. cost</div>
          <div className="font-mono text-text">{formatCostCents(usage.cost_cents ?? 0)}</div>
        </div>
      </div>

      {nearLimit && (
        <p className="rounded-[var(--radius-md)] border border-warn/30 bg-warn/10 px-3 py-2 text-mini text-warn">
          Approaching monthly limits. Prefer Sonnet, run one plan task at a time, and avoid
          redundant regenerations.
        </p>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
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
        </div>
      )}

      <p className="text-caption text-text-3">
        Agent turns are metered via the cloud Anthropic proxy. This month: {formatTokenCount(tokens)}{" "}
        tokens · {formatCostCents(usage.cost_cents ?? 0)} estimated.
      </p>
    </Card>
  );
}
