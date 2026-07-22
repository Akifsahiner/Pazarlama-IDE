import { ArrowRight, CheckCircle2, LockKeyhole, Target } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { buildContractView, formatThirtyDayTarget } from "@shared/contractView";
import { resolveWeek1PreviewTasks, week1OwnerBadge } from "@shared/week1Preview";
import type { StrategicOption } from "@shared/types";

const POSTURE_LABEL: Record<StrategicOption["posture"], string> = {
  safe: "Safe foundation",
  balanced: "Balanced bet",
  category_attack: "Category attack",
};

export function Week1BriefingModal() {
  const open = useApp((s) => s.week1BriefingOpen);
  const closeWeek1Briefing = useApp((s) => s.closeWeek1Briefing);
  const openLaunchReadiness = useApp((s) => s.openLaunchReadiness);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const channelThesis = useApp((s) => s.channelThesis ?? marketingProfile?.channel_thesis);

  if (!open || !marketingProfile || !channelThesis) return null;

  const contract = buildContractView(marketingProfile);
  if (!contract) return null;

  const { tasks } = resolveWeek1PreviewTasks(channelThesis, true);
  const kpi = formatThirtyDayTarget(contract.thirtyDayTarget);
  const isAttack = contract.posture === "category_attack";
  const sealedDate = new Date(contract.sealedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const continueToSetup = () => {
    closeWeek1Briefing();
    openLaunchReadiness();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-bg/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="week1-briefing-title"
      data-testid="week1-briefing-modal"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
          <LockKeyhole size={14} />
          Week 1 briefing · Sealed {sealedDate}
        </div>

        <h1 id="week1-briefing-title" className="mt-4 text-h2 font-semibold text-text">
          We agreed — here is Week 1
        </h1>
        <p className="mt-2 text-body-sm text-text-2">
          Option {contract.optionId} · {contract.title}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{POSTURE_LABEL[contract.posture]}</Badge>
          {contract.mechanismLabel && <Badge tone="neutral">{contract.mechanismLabel}</Badge>}
          <Badge tone="ok">Sealed</Badge>
        </div>

        {isAttack && contract.founderCommits[0] && (
          <div
            className="mt-4 rounded-[var(--radius-lg)] border border-warn/30 bg-warn-soft/15 px-4 py-3"
            data-testid="week1-briefing-attack-volume"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-warn">
              Higher volume commitment
            </p>
            <p className="mt-1 text-body-sm font-medium text-text">{contract.founderCommits[0]}</p>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-accent" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                From CMO
              </p>
            </div>
            <ul className="mt-3 space-y-1.5 text-mini text-text-2">
              {contract.cmoCommits.map((commit) => (
                <li key={commit}>· {commit}</li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-text-3">
              Week 1 ships {tasks.filter((t) => t.owner === "system").length} repo tasks, prepares{" "}
              {tasks.filter((t) => t.owner === "user").length} human handoffs, and gates every move
              on measurement.
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-ok" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ok">From you</p>
            </div>
            <ul className="mt-3 space-y-1.5 text-mini text-text-2">
              {contract.founderCommits.map((commit) => (
                <li key={commit}>· {commit}</li>
              ))}
            </ul>
            {marketingProfile.founder_fit && (
              <p className="mt-3 text-[10px] text-text-3">
                Weekly commitment:{" "}
                {marketingProfile.founder_fit.weekly_marketing_hours.replace(/_/g, " ")} · KPI
                logging required by Day 7.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
            Week 1 queue preview
          </p>
          <div className="mt-3 overflow-hidden rounded-[var(--radius-lg)] border border-line">
            <table className="w-full text-left text-mini" data-testid="week1-briefing-task-table">
              <thead className="border-b border-line bg-surface-2/60 text-[10px] uppercase tracking-wide text-text-3">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={task.id ?? index} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2.5 tabular-nums text-text-3">{index + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-text">{task.what}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        tone={
                          task.owner === "system"
                            ? "accent"
                            : task.owner === "user"
                              ? "marketing"
                              : "warn"
                        }
                      >
                        {week1OwnerBadge(task.owner)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="mt-6 rounded-[var(--radius-lg)] border border-accent/25 bg-accent-soft/10 p-4"
          data-testid="week1-briefing-day7-kpi"
        >
          <div className="flex items-center gap-2">
            <Target size={14} className="text-accent" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Day 7 primary KPI
            </p>
            <Badge
              tone={
                contract.thirtyDayTarget.confidence === "measured"
                  ? "ok"
                  : contract.thirtyDayTarget.confidence === "stretch"
                    ? "warn"
                    : "neutral"
              }
            >
              {contract.thirtyDayTarget.confidence}
            </Badge>
          </div>
          <p className="mt-2 text-body-sm font-semibold text-text">{kpi.headline}</p>
          {kpi.detail && <p className="mt-1 text-mini text-text-3">{kpi.detail}</p>}
        </div>

        <div className="mt-8 flex justify-end gap-3 pb-8">
          <Button
            variant="primary"
            iconRight={<ArrowRight size={15} />}
            onClick={continueToSetup}
            data-testid="week1-briefing-continue"
          >
            Continue to launch setup
          </Button>
        </div>
      </div>
    </div>
  );
}
