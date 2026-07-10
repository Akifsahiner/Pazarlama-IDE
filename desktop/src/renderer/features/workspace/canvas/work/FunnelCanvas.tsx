import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, Filter, LayoutGrid } from "lucide-react";
import { taskStatusFromSnapshot } from "@shared/planProgress";
import { getPlaybook, normalizePlan, type PlaybookIconKey } from "@shared/planPlaybooks";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { useApp } from "@renderer/state/store";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { Badge } from "@renderer/components/ui/Badge";
import { FUNNEL_STAGES, stageForContent, stageForTask } from "./surfaceData";

const PLAYBOOK_CHIP: Partial<Record<PlaybookIconKey, string>> = {
  product_hunt: "var(--playbook-ph)",
  paid_ads: "var(--playbook-ads)",
  email: "var(--playbook-email)",
  content: "var(--playbook-content)",
  seo: "var(--playbook-seo)",
  sales_outbound: "var(--playbook-sales)",
  analytics: "var(--playbook-analytics)",
  landing: "var(--playbook-landing)",
};

export function FunnelCanvas() {
  const plan = useApp((s) => s.plan);
  const planProgress = useApp((s) => s.planProgress);
  const connected = useApp((s) => s.runtime === "connected");
  const guide = SURFACE_UNLOCK.funnel;
  const [playbookFilter, setPlaybookFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"filter" | "group">("filter");

  const suite = useMemo(() => (plan ? normalizePlan(plan) : null), [plan]);

  const playbooks = suite?.playbooks ?? [];

  const stages = useMemo(() => {
    if (!plan) return [];
    const filterPlaybook = playbookFilter === "all" ? null : playbookFilter;
    return FUNNEL_STAGES.map((stage) => {
      const tasks = plan.taskGraph.filter((t) => {
        if (stageForTask(t) !== stage.id) return false;
        if (filterPlaybook && t.playbookId !== filterPlaybook) return false;
        return true;
      });
      const content = plan.contentCalendar.filter((c) => stageForContent(c) === stage.id);
      return { ...stage, tasks, content };
    });
  }, [plan, playbookFilter]);

  const bottleneck = useMemo(() => {
    if (!stages.length) return null;
    const sorted = [...stages].sort(
      (a, b) => a.tasks.length + a.content.length - (b.tasks.length + b.content.length),
    );
    return sorted[0]?.tasks.length + sorted[0]?.content.length === 0 ? sorted[0] : null;
  }, [stages]);

  if (!plan) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-8">
        <GuidedEmptyState
          icon={ArrowDown}
          title={guide.unlockTitle}
          description={guide.unlockReason}
          steps={guide.steps}
          primaryAction={{
            label: connected ? guide.primaryLabel : "Preview outline",
            onClick: () =>
              runSurfaceUnlockAction(connected ? guide.primaryAction : "preview_plan"),
          }}
          secondaryAction={
            guide.secondaryAction
              ? {
                  label: guide.secondaryLabel!,
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
      {playbooks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-text-3" />
          <button
            type="button"
            onClick={() => setViewMode("filter")}
            className={`rounded-full border px-2.5 py-0.5 text-[10.5px] ${
              viewMode === "filter" ? "border-accent/40 bg-accent-soft/30 text-accent" : "border-line text-text-3"
            }`}
          >
            Filter
          </button>
          <button
            type="button"
            onClick={() => setViewMode("group")}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] ${
              viewMode === "group" ? "border-accent/40 bg-accent-soft/30 text-accent" : "border-line text-text-3"
            }`}
          >
            <LayoutGrid size={11} /> Group by playbook
          </button>
          {viewMode === "filter" && (
            <>
              <button
                type="button"
                onClick={() => setPlaybookFilter("all")}
                className={`rounded-full border px-2.5 py-0.5 text-[10.5px] ${
                  playbookFilter === "all"
                    ? "border-accent/40 bg-accent-soft/30 text-accent"
                    : "border-line text-text-3 hover:text-text-2"
                }`}
              >
                All playbooks
              </button>
              {playbooks.map((pb) => {
                const accent = PLAYBOOK_CHIP[pb.iconKey] ?? "var(--accent)";
                return (
                  <button
                    key={pb.id}
                    type="button"
                    onClick={() => setPlaybookFilter(pb.id)}
                    className={`rounded-full border px-2.5 py-0.5 text-[10.5px] transition-colors ${
                      playbookFilter === pb.id ? "text-text" : "text-text-3 hover:text-text-2"
                    }`}
                    style={{
                      borderColor: playbookFilter === pb.id ? accent : undefined,
                      backgroundColor: playbookFilter === pb.id ? `${accent}22` : undefined,
                    }}
                  >
                    {pb.title}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}

      {bottleneck && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-warn/30 bg-warn/5 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" />
          <div>
            <p className="text-mini font-medium text-text">Bottleneck: {bottleneck.label}</p>
            <p className="text-micro text-text-2">
              No tasks or content mapped here yet — consider adding {bottleneck.hint.toLowerCase()}{" "}
              activities.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-5">
        {stages.map((stage, i) => (
          <div key={stage.id} className="relative flex flex-col">
            {i < stages.length - 1 && (
              <div className="absolute -right-2 top-8 z-10 hidden text-text-3 md:block">
                <ArrowDown size={14} className="rotate-[-90deg]" />
              </div>
            )}
            <div className="flex h-full flex-col rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
              <div className="mb-2">
                <div className="text-micro font-semibold uppercase tracking-wider text-accent">
                  {stage.label}
                </div>
                <div className="text-[10.5px] text-text-3">{stage.hint}</div>
              </div>
              <div className="mb-2 flex gap-1">
                <Badge tone="neutral">{stage.tasks.length} tasks</Badge>
                <Badge tone="neutral">{stage.content.length} content</Badge>
              </div>
              <ul className="flex-1 space-y-1.5 overflow-y-auto">
                {viewMode === "group" && playbooks.length > 0 ? (
                  <div className="space-y-2">
                    {playbooks.map((pb) => {
                      const pbTasks = stage.tasks.filter((t) => t.playbookId === pb.id);
                      if (pbTasks.length === 0) return null;
                      const accent = PLAYBOOK_CHIP[pb.iconKey] ?? "var(--accent)";
                      return (
                        <div
                          key={pb.id}
                          className="rounded-[6px] border border-line/60 bg-surface/80 p-1.5"
                          style={{ borderLeftWidth: 3, borderLeftColor: accent }}
                        >
                          <div
                            className="mb-1 truncate text-[10px] font-semibold text-text-2"
                            title={pb.title}
                          >
                            {pb.title}
                          </div>
                          <ul className="space-y-1">
                            {pbTasks.map((t) => {
                              const st = taskStatusFromSnapshot(planProgress, t.id);
                              const tone =
                                st === "done"
                                  ? "border-ok/30 bg-ok/5 text-ok"
                                  : st === "running"
                                    ? "border-accent/30 bg-accent-soft/30"
                                    : st === "failed"
                                      ? "border-danger/30 bg-danger/5"
                                      : "border-line/70 bg-surface text-text";
                              return (
                                <li
                                  key={t.id}
                                  className={`rounded-[4px] border px-2 py-1 text-[10px] ${tone}`}
                                >
                                  Day {t.day}: {t.title}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                    {stage.content.map((c, idx) => (
                      <li
                        key={`${c.day}-${idx}`}
                        className="list-none rounded-[6px] border border-dashed border-line/70 px-2 py-1.5 text-[10.5px] text-text-2"
                      >
                        {c.channel}: {c.title}
                      </li>
                    ))}
                    {stage.tasks.length === 0 && stage.content.length === 0 && (
                      <li className="list-none text-[10.5px] text-text-3">Empty stage</li>
                    )}
                  </div>
                ) : (
                  <>
                {stage.tasks.map((t) => {
                  const st = taskStatusFromSnapshot(planProgress, t.id);
                  const tone =
                    st === "done"
                      ? "border-ok/30 bg-ok/5 text-ok"
                      : st === "running"
                        ? "border-accent/30 bg-accent-soft/30"
                        : st === "failed"
                          ? "border-danger/30 bg-danger/5"
                          : "border-line/70 bg-surface text-text";
                  const pb = t.playbookId && suite ? getPlaybook(suite, t.playbookId) : null;
                  const accent = pb ? (PLAYBOOK_CHIP[pb.iconKey] ?? "var(--accent)") : undefined;
                  return (
                    <li
                      key={t.id}
                      className={`rounded-[6px] border px-2 py-1.5 text-[10.5px] ${tone}`}
                      style={accent ? { borderLeftWidth: 3, borderLeftColor: accent } : undefined}
                    >
                      {pb && playbookFilter === "all" && (
                        <span
                          className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                          style={{ backgroundColor: accent }}
                          title={pb.title}
                        />
                      )}
                      Day {t.day}: {t.title}
                    </li>
                  );
                })}
                {stage.content.map((c, idx) => (
                  <li
                    key={`${c.day}-${idx}`}
                    className="rounded-[6px] border border-dashed border-line/70 px-2 py-1.5 text-[10.5px] text-text-2"
                  >
                    {c.channel}: {c.title}
                  </li>
                ))}
                {stage.tasks.length === 0 && stage.content.length === 0 && (
                  <li className="text-[10.5px] text-text-3">Empty stage</li>
                )}
                  </>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
