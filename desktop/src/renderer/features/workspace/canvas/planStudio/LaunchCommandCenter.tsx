import { useMemo } from "react";
import { ArrowRight, BarChart3, Gauge, Target, Zap } from "lucide-react";
import type { MarketingPlanSuite } from "@shared/planPlaybooks";
import { getPlaybook } from "@shared/planPlaybooks";
import {
  BOTTLENECK_LABELS,
  primaryPlaybookForBottleneck,
  resolveBottleneckFromText,
  type GtmBottleneck,
} from "@shared/bottleneck";
import { playbookTitle } from "@shared/gtmCatalog";
import { useApp } from "@renderer/state/store";
import { Badge } from "@renderer/components/ui/Badge";
import { taskStatusFromSnapshot, type PlanProgressSnapshot } from "@shared/planProgress";
import { resolveChannelActuals, formatActual } from "@shared/measurementMerge";

const CHANNEL_LABELS: Record<string, string> = {
  "waitlist-hype": "Waitlist",
  "ph-number-one": "Product Hunt",
  "ph-launch": "Product Hunt",
  "linkedin-gtm": "LinkedIn",
  influencer: "Influencer",
  "short-form-viral": "Short video",
  "paid-ads-opt": "Paid ads",
  "paid-ads": "Paid ads",
  "content-engine": "Content",
  "sales-outbound": "Outbound",
  "analytics-measurement": "Analytics",
};

function playbookProgress(
  plan: MarketingPlanSuite,
  playbookId: string,
  planProgress: PlanProgressSnapshot | null,
): { done: number; total: number; nextTitle?: string; nextDay?: number } {
  const pb = getPlaybook(plan, playbookId);
  if (!pb) return { done: 0, total: 0 };
  let done = 0;
  let nextTitle: string | undefined;
  let nextDay: number | undefined;
  for (const t of pb.tasks) {
    const st = taskStatusFromSnapshot(planProgress, t.id);
    if (st === "done" || st === "skipped") done += 1;
    else if (!nextTitle) {
      nextTitle = t.title;
      nextDay = t.day;
    }
  }
  return { done, total: pb.tasks.length, nextTitle, nextDay };
}

/**
 * Launch progress section — bottleneck, execution velocity, and per-channel
 * KPI/progress. Honest-data rule: no placeholder spend/CPA columns until real
 * connector metrics exist.
 */
export function LaunchCommandCenter({
  plan,
  activePlaybookId,
}: {
  plan: MarketingPlanSuite;
  activePlaybookId?: string;
}) {
  const planProgress = useApp((s) => s.planProgress);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const sessionOutcomes = useApp((s) => s.sessionOutcomes);
  const thread = useApp((s) => s.thread);
  const persona = useApp((s) => s.settings.persona);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const setActivePlaybook = useApp((s) => s.setActivePlaybook);

  const bottleneck: GtmBottleneck = useMemo(() => {
    if (plan.primaryBottleneck) return plan.primaryBottleneck;
    for (let i = thread.length - 1; i >= 0; i--) {
      const ev = thread[i];
      if (ev.kind === "decision" && ev.decision?.gtm_bottleneck) {
        return ev.decision.gtm_bottleneck;
      }
      if (ev.kind === "decision" && ev.decision?.bottleneck) {
        return resolveBottleneckFromText(ev.decision.bottleneck);
      }
    }
    return resolveBottleneckFromText(plan.thesis ?? plan.positioning);
  }, [plan.primaryBottleneck, thread, plan.thesis, plan.positioning]);

  const primaryPlaybookId =
    plan.primaryPlaybookId ?? primaryPlaybookForBottleneck(bottleneck, persona).primaryPlaybookId;
  const resolution = primaryPlaybookForBottleneck(bottleneck, persona);
  const primaryProgress = playbookProgress(plan, primaryPlaybookId, planProgress);
  const primaryLabel = CHANNEL_LABELS[primaryPlaybookId] ?? playbookTitle(primaryPlaybookId);

  const executionStats = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const pb of plan.playbooks) {
      for (const t of pb.tasks) {
        total += 1;
        const st = taskStatusFromSnapshot(planProgress, t.id);
        if (st === "done" || st === "skipped") done += 1;
      }
    }
    const sessionRuns = sessionOutcomes.filter((o) => o.kind === "run" || o.kind === "research").length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0, sessionRuns };
  }, [plan, planProgress, sessionOutcomes]);

  const channelRows = useMemo(() => {
    return plan.playbooks.map((pb) => {
      const prog = playbookProgress(plan, pb.id, planProgress);
      const actuals = resolveChannelActuals(pb.id, marketingProfile);
      return {
        id: pb.id,
        label: CHANNEL_LABELS[pb.id] ?? pb.title,
        metric: pb.primaryMetric.name,
        target: pb.primaryMetric.target,
        progress: prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0,
        done: prog.done,
        total: prog.total,
        nextDay: prog.nextDay,
        actuals,
      };
    });
  }, [plan, planProgress, marketingProfile]);

  const adsPlaybook = plan.playbooks.find((p) => p.id === "paid-ads-opt" || p.id === "paid-ads");
  const weeklyAdsTask = adsPlaybook?.tasks.find((t) => /week|hypothesis|creative|test/i.test(t.title));

  return (
    <section className="space-y-4">
      <div className="surface rounded-[var(--radius-lg)] border border-accent/20 bg-accent-soft/5 p-5">
        <div className="mb-2 flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-accent">
          <Gauge size={14} /> Current bottleneck
        </div>
        <p className="text-[15px] font-medium text-text">
          Now: {BOTTLENECK_LABELS[bottleneck]?.split(" — ")[0] ?? bottleneck}
          {primaryProgress.nextDay
            ? ` → ${primaryLabel} Day ${primaryProgress.nextDay}`
            : ` → ${primaryLabel}`}
        </p>
        <p className="mt-1 text-body-sm text-text-2">
          {plan.bottleneckWhy ?? resolution.rationale}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="accent">Primary · {primaryLabel}</Badge>
          <span className="text-mini text-text-2">
            {resolution.successMetric.name} · target {resolution.successMetric.target}
          </span>
        </div>
        {primaryProgress.nextTitle && (
          <button
            type="button"
            onClick={() => {
              setActivePlaybook(primaryPlaybookId);
              focusPlanTask({ playbookId: primaryPlaybookId });
            }}
            className="mt-3 flex items-center gap-1.5 text-mini text-accent hover:underline"
          >
            Next: Day {primaryProgress.nextDay} — {primaryProgress.nextTitle}
            <ArrowRight size={12} />
          </button>
        )}
      </div>

      <div className="surface rounded-[var(--radius-lg)] border border-line p-4">
        <div className="mb-3 flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-text-3">
          <Zap size={14} className="text-accent" /> Execution velocity
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3">Reach</div>
            <p className="mt-1 text-mini text-text-2">
              Plan tasks{" "}
              <span className="font-medium tabular-nums text-accent">
                {executionStats.done}/{executionStats.total}
              </span>{" "}
              ({executionStats.pct}%)
            </p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
              Conversion
            </div>
            <p className="mt-1 text-mini text-text-2">
              This session ·{" "}
              <span className="font-medium tabular-nums text-text">
                {executionStats.sessionRuns}
              </span>{" "}
              runs / research completed
            </p>
          </div>
        </div>
      </div>

      <div className="surface rounded-[var(--radius-lg)] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-text-3">
            <BarChart3 size={14} className="text-accent" /> Channel progress
          </div>
        </div>
        <div className="overflow-x-auto overflow-hidden rounded-[var(--radius-md)] border border-line">
          <table className="w-full min-w-[480px] border-collapse text-left text-mini">
            <thead>
              <tr className="bg-surface-2 text-[10px] uppercase tracking-wider text-text-3">
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">KPI · target</th>
                <th className="px-3 py-2 font-medium">Tasks</th>
                <th className="px-3 py-2 font-medium">Progress</th>
                <th className="px-3 py-2 font-medium" title="Requires analytics connector">
                  Spend
                </th>
                <th className="px-3 py-2 font-medium" title="Requires analytics connector">
                  Signups
                </th>
                <th className="px-3 py-2 font-medium" title="Requires analytics connector">
                  CPA
                </th>
              </tr>
            </thead>
            <tbody>
              {channelRows.map((row) => (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-t border-line transition-colors hover:bg-elevated/40 ${
                    activePlaybookId === row.id ? "bg-accent-soft/15" : ""
                  }`}
                  onClick={() => setActivePlaybook(row.id)}
                >
                  <td className="px-3 py-2.5 font-medium text-text">{row.label}</td>
                  <td className="px-3 py-2.5 text-text-2">
                    {row.metric}
                    <span className="block text-[10px] text-text-3">target {row.target}</span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-text">
                    {row.done}/{row.total}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-elevated">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-text-2">{row.progress}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={row.actuals.spendSource ? "font-medium text-text" : "text-text-3"}>
                        {formatActual(row.actuals.spend)}
                      </span>
                      {row.actuals.spendSource === "manual" && (
                        <Badge tone="ok" className="text-[9px]">
                          Logged
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={row.actuals.signupsSource ? "font-medium text-ok" : "text-text-3"}>
                        {formatActual(row.actuals.signups)}
                      </span>
                      {row.actuals.signupsSource === "manual" && (
                        <Badge tone="ok" className="text-[9px]">
                          Logged
                        </Badge>
                      )}
                      {row.actuals.signupsSource === "experiment" && (
                        <Badge tone="neutral" className="text-[9px]">
                          Experiment
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td
                    className={`px-3 py-2.5 tabular-nums ${row.actuals.cpa != null ? "font-medium text-text" : "text-text-3"}`}
                    title="Computed when spend and signups are both logged"
                  >
                    {formatActual(row.actuals.cpa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-text-3">
          Log KPIs below for real Signups/Spend/CPA — or connect GA4 when available. No fabricated
          numbers.
        </p>
      </div>

      {weeklyAdsTask && (
        <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-4 py-3">
          <Target size={16} className="mt-0.5 shrink-0 text-warn" />
          <div className="min-w-0 flex-1">
            <div className="text-mini font-medium text-text">Weekly ads optimization loop</div>
            <p className="mt-0.5 text-mini text-text-2">
              Hypothesis → 2–3 creatives → small budget test → measure → kill or scale. Next:{" "}
              {weeklyAdsTask.title}
            </p>
            <button
              type="button"
              onClick={() =>
                focusPlanTask({ playbookId: adsPlaybook!.id, taskId: weeklyAdsTask.id, startRun: true })
              }
              className="mt-2 text-micro text-accent hover:underline"
            >
              Run ads loop task
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
