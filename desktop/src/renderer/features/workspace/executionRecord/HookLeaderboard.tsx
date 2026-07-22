import type { HookLeaderboardRow } from "@shared/hookLeaderboard";
import { Badge } from "@renderer/components/ui/Badge";

const VERDICT_LABEL: Record<string, string> = {
  leading: "leading",
  kill: "kill",
  pending: "pending",
};

const VERDICT_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  leading: "ok",
  kill: "warn",
  pending: "neutral",
};

export function HookLeaderboard({ rows }: { rows: HookLeaderboardRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div
      className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-line/70"
      data-testid="hook-leaderboard"
    >
      <table className="w-full min-w-[280px] text-left text-body-sm">
        <thead>
          <tr className="border-b border-line/60 bg-surface-2/40 text-mini uppercase tracking-wide text-text-3">
            <th className="px-3 py-2 font-semibold">Hook</th>
            <th className="px-3 py-2 font-semibold">3s Ret</th>
            <th className="px-3 py-2 font-semibold">24h Views</th>
            <th className="px-3 py-2 font-semibold">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hook_id} className="border-b border-line/40 last:border-0" data-testid={`hook-lb-${row.hook_id}`}>
              <td className="px-3 py-2 font-medium text-text">{row.hook_label}</td>
              <td className="px-3 py-2 tabular-nums text-text-2">
                {row.retention_3s_pct != null ? `${row.retention_3s_pct}%` : "—"}
              </td>
              <td className="px-3 py-2 tabular-nums text-text-2">
                {row.views_24h != null ? row.views_24h : "—"}
              </td>
              <td className="px-3 py-2">
                <Badge tone={VERDICT_TONE[row.verdict] ?? "neutral"}>
                  {VERDICT_LABEL[row.verdict] ?? row.verdict}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
