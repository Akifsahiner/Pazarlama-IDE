import { useMemo } from "react";
import { formatCostCents, formatTokenCount } from "@shared/contextBudget";
import { summarizeUsage, usageStatusChip } from "@shared/usageDisplay";
import { normalizeTier } from "@shared/tierFeatures";
import { useApp } from "@renderer/state/store";

/** Cursor-style status bar usage chip — plan + % used, click for details. */
export function UsageMeter() {
  const auth = useApp((s) => s.auth);
  const tierLabel = useApp((s) => s.tierLabel);
  const navigate = useApp((s) => s.navigate);

  const summary = useMemo(() => {
    if (!auth.usage || !auth.quota) return null;
    return summarizeUsage({
      usage: auth.usage,
      quota: auth.quota,
      tier: normalizeTier(auth.user?.tier),
      tierLabel: tierLabel ?? undefined,
    });
  }, [auth.usage, auth.quota, auth.user?.tier, tierLabel]);

  if (!summary) return null;

  const chip = usageStatusChip(summary);
  const barPct = summary.hasAiAccess ? summary.primaryPct : 0;
  const barClass = summary.atLimit ? "bg-danger" : summary.nearLimit ? "bg-warn" : "bg-accent";

  return (
    <button
      type="button"
      className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-0.5 transition-colors hover:bg-elevated"
      onClick={() => navigate("settings", "usage")}
      title={`${chip} · ${formatTokenCount(summary.totalTokens)} tokens · ${formatCostCents(summary.costCents)} this month`}
    >
      <span className="hidden max-w-[8rem] truncate text-[10px] tabular-nums text-text-2 sm:inline">
        {chip}
      </span>
      {summary.hasAiAccess && (
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-12 overflow-hidden rounded-full bg-elevated">
            <span
              className={`block h-full rounded-full ${barClass}`}
              style={{ width: `${Math.min(100, barPct)}%` }}
            />
          </span>
          <span className="text-[10px] tabular-nums text-text-3">{barPct}%</span>
        </span>
      )}
    </button>
  );
}
