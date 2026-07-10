import { useMemo, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { useApp } from "@renderer/state/store";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { buildConnectorMetricRows, buildPerformanceRows } from "./surfaceData";

const STATUS_LABEL = {
  on_track: { label: "On track", tone: "accent" as const },
  behind: { label: "Behind", tone: "warn" as const },
  pending: { label: "Pending", tone: "neutral" as const },
  won: { label: "Won", tone: "ok" as const },
  lost: { label: "Lost", tone: "danger" as const },
};

export function PerformanceTableCanvas() {
  const plan = useApp((s) => s.plan);
  const profile = useApp((s) => s.marketingProfile);
  const planProgress = useApp((s) => s.planProgress);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const connectGa4 = useApp((s) => s.connectGa4);
  const syncGa4Metrics = useApp((s) => s.syncGa4Metrics);
  const openKpiLog = useApp((s) => s.openKpiLog);
  const navigate = useApp((s) => s.navigate);
  const ga4OAuthAvailable = useApp((s) => s.connection.connectors?.ga4OAuth !== false);
  const [syncing, setSyncing] = useState(false);

  const ga4Connected = !!profile?.ga4_oauth?.refresh_token;
  const lastSynced = profile?.connector_snapshots?.ga4?.fetched_at;

  const connectorRows = useMemo(() => buildConnectorMetricRows(profile), [profile]);

  const rows = useMemo(
    () => buildPerformanceRows(plan, profile, planProgress),
    [plan, profile, planProgress],
  );

  const winRate = useMemo(() => {
    const exps = profile?.previous_experiments ?? [];
    if (exps.length === 0) return null;
    const wins = exps.filter((e) => e.outcome === "success").length;
    return Math.round((wins / exps.length) * 100);
  }, [profile]);

  if (rows.length === 0 && connectorRows.length === 0) {
    const guide = SURFACE_UNLOCK.performance;
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-8">
        <GuidedEmptyState
          icon={BarChart3}
          title={guide.unlockTitle}
          description={guide.unlockReason}
          steps={guide.steps}
          primaryAction={{
            label: guide.primaryLabel,
            onClick: () => runSurfaceUnlockAction(guide.primaryAction),
          }}
          secondaryAction={
            guide.secondaryLabel
              ? {
                  label: guide.secondaryLabel,
                  onClick: () => runSurfaceUnlockAction(guide.secondaryAction!),
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {connectorRows.length > 0 ? (
        <div className="mb-4 rounded-[var(--radius-md)] border border-line bg-surface-2 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-micro font-semibold uppercase tracking-wider text-text-3">
              Connector read-only (GA4)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lastSynced && (
                <span className="text-micro text-text-3">
                  Last synced {new Date(lastSynced).toLocaleString()}
                </span>
              )}
              {ga4Connected && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={syncing}
                  onClick={() => {
                    setSyncing(true);
                    void syncGa4Metrics().finally(() => setSyncing(false));
                  }}
                >
                  <RefreshCw size={12} className="mr-1" />
                  Sync GA4
                </Button>
              )}
            </div>
          </div>
          <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-line">
            <table className="w-full border-collapse text-left text-mini">
              <thead>
                <tr className="bg-surface text-[10px] uppercase tracking-wider text-text-3">
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Metric</th>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2 font-medium">Actual</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {connectorRows.map((row) => {
                  const st = STATUS_LABEL[row.status];
                  return (
                    <tr key={row.id} className="border-t border-line">
                      <td className="px-3 py-2.5 text-text-2">{row.source}</td>
                      <td className="px-3 py-2.5 font-medium text-text">{row.name}</td>
                      <td className="px-3 py-2.5 text-text-2">{row.target}</td>
                      <td className="px-3 py-2.5 text-text">{row.actual}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-4 py-3">
          <div>
            <div className="text-micro font-semibold uppercase tracking-wider text-text-3">
              Live analytics
            </div>
            <p className="mt-1 text-mini text-text-2">
              {ga4OAuthAvailable
                ? "Connect GA4 when your server has OAuth configured — otherwise log KPIs manually in Plan Studio. No fabricated numbers."
                : "GA4 OAuth is not configured on this server. Log KPIs manually — no fabricated numbers."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ga4OAuthAvailable && !ga4Connected && (
              <Button variant="secondary" size="sm" onClick={() => void connectGa4()}>
                Connect GA4
              </Button>
            )}
            {ga4Connected && (
              <Button
                variant="secondary"
                size="sm"
                loading={syncing}
                onClick={() => {
                  setSyncing(true);
                  void syncGa4Metrics().finally(() => setSyncing(false));
                }}
              >
                <RefreshCw size={12} className="mr-1" />
                Sync GA4
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                openKpiLog("waitlist_signups");
                navigate("workspace");
                setWorkSurface("campaign-plan");
              }}
            >
              Log KPI manually
            </Button>
          </div>
        </div>
      )}

      {winRate != null && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-line bg-surface-2 px-4 py-3">
          <span className="text-mini text-text-2">Experiment win rate: </span>
          <span className="text-[14px] font-semibold text-accent">{winRate}%</span>
        </div>
      )}
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-line">
        <table className="w-full border-collapse text-left text-mini">
          <thead>
            <tr className="bg-surface-2 text-[10px] uppercase tracking-wider text-text-3">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Metric</th>
              <th className="px-4 py-2.5 font-medium">Target</th>
              <th className="px-4 py-2.5 font-medium">Actual</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const st = STATUS_LABEL[row.status];
              return (
                <tr
                  key={row.id}
                  className="border-t border-line hover:bg-elevated/50"
                  onClick={() => {
                    if (row.owner === "Experiment") {
                      setWorkSurface("experiment", { experimentId: row.id });
                    }
                  }}
                  role={row.owner === "Experiment" ? "button" : undefined}
                >
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium text-text">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-text-2">{row.metric}</td>
                  <td className="px-4 py-3 text-text-2">{row.target}</td>
                  <td className="px-4 py-3 text-text">{row.actual}</td>
                  <td className="px-4 py-3">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-3">{row.owner}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
