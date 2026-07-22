/**
 * Faz 6 — ranked hook leaderboard for distribution operator on Execution Record.
 */
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import { shouldKillHook } from "./cmoDistributionOperator";

export type HookLeaderboardVerdict = "leading" | "trailing" | "kill" | "pending";

export interface HookLeaderboardRow {
  hook_id: string;
  hook_label: string;
  retention_3s_pct?: number;
  views_24h?: number;
  measured_count: number;
  verdict: HookLeaderboardVerdict;
}

function hookStats(
  workspace: DistributionOperatorWorkspace,
  hookId: string,
): { retention?: number; views?: number; measured: number; hasUrl: boolean } {
  const postSlots = workspace.slots.filter(
    (s) => s.hook_id === hookId && s.slot_kind === "post",
  );
  const retentions = postSlots
    .map((s) => s.proof?.retention_3s_pct)
    .filter((v): v is number => v != null);
  const viewsList = postSlots
    .map((s) => s.proof?.views_24h)
    .filter((v): v is number => v != null);
  const hasUrl = postSlots.some((s) => Boolean(s.proof?.post_url?.trim()));
  return {
    retention: retentions.length ? Math.max(...retentions) : undefined,
    views: viewsList.length ? Math.max(...viewsList) : undefined,
    measured: retentions.length + viewsList.length,
    hasUrl,
  };
}

export function buildHookLeaderboard(
  workspace: DistributionOperatorWorkspace,
): HookLeaderboardRow[] {
  const rows: HookLeaderboardRow[] = workspace.hooks.map((hook) => {
    const stats = hookStats(workspace, hook.id);
    const kill = shouldKillHook(workspace, hook.id);
    let verdict: HookLeaderboardVerdict = "pending";
    if (kill) {
      verdict = "kill";
    } else if (stats.measured === 0 && !stats.hasUrl) {
      verdict = "pending";
    } else if (stats.retention != null || stats.views != null) {
      verdict = "leading";
    }
    return {
      hook_id: hook.id,
      hook_label: hook.label,
      retention_3s_pct: stats.retention,
      views_24h: stats.views,
      measured_count: stats.measured,
      verdict,
    };
  });

  const scored = rows.filter((r) => r.verdict === "leading");
  if (scored.length > 1) {
    scored.sort((a, b) => {
      const scoreA = (a.retention_3s_pct ?? 0) * 10 + (a.views_24h ?? 0) / 100;
      const scoreB = (b.retention_3s_pct ?? 0) * 10 + (b.views_24h ?? 0) / 100;
      return scoreB - scoreA;
    });
    const topId = scored[0]?.hook_id;
    for (const row of rows) {
      if (row.verdict === "leading" && row.hook_id !== topId) {
        row.verdict = "trailing";
      }
    }
  }

  return rows;
}
