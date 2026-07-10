import { useEffect } from "react";
import type { MarketingPlanSuite, PlaybookStub } from "@shared/planPlaybooks";
import { computePlaybookRollupStats, formatPlaybookRollupLabel } from "@shared/playbookStats";
import { playbookProgress, playbookDependsSatisfied } from "@shared/planPlaybooks";
import { useApp } from "@renderer/state/store";
import { PlaybookCard } from "./PlaybookCard";

export function PlaybookCardGrid({
  plan,
  stubs,
  loadingIds,
  activePlaybookId,
  celebratePlaybookId,
  onSelect,
  onStart,
}: {
  plan?: MarketingPlanSuite | null;
  stubs?: PlaybookStub[];
  loadingIds?: Set<string>;
  activePlaybookId?: string;
  celebratePlaybookId?: string;
  onSelect: (id: string) => void;
  onStart: (id: string) => void;
}) {
  const planProgress = useApp((s) => s.planProgress);
  const clearPlanMilestone = useApp((s) => s.clearPlanMilestone);
  const byTaskId = planProgress?.byTaskId ?? {};

  useEffect(() => {
    if (!celebratePlaybookId) return;
    const t = window.setTimeout(() => clearPlanMilestone("lastPlaybookId"), 900);
    return () => window.clearTimeout(t);
  }, [celebratePlaybookId, clearPlanMilestone]);

  const playbooks = plan?.playbooks?.length
    ? [...plan.playbooks].sort((a, b) => a.sortOrder - b.sortOrder)
    : (stubs ?? []);

  const rollupLabel = plan
    ? formatPlaybookRollupLabel(computePlaybookRollupStats(plan, byTaskId))
    : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-mini font-semibold uppercase tracking-wider text-text-3">Your playbooks</h3>
          {plan && (
            <p className="mt-0.5 text-mini text-text-2">
              {rollupLabel ?? `${plan.playbooks.length} named tracks`}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {playbooks.map((pb) => {
          const full = "tasks" in pb ? pb : plan?.playbooks.find((p) => p.id === pb.id);
          const stub = "tasks" in pb ? null : pb;
          const card = full ?? stub ?? pb;
          const prog =
            plan && full && "tasks" in full
              ? playbookProgress(plan, full.id, byTaskId)
              : { done: 0, total: full && "tasks" in full ? full.tasks.length : 0 };
          const blocked =
            plan && full && "dependsOnPlaybookIds" in full
              ? !playbookDependsSatisfied(plan, full.id, byTaskId)
              : false;
          return (
            <PlaybookCard
              key={pb.id}
              playbook={card}
              done={prog.done}
              total={prog.total}
              selected={activePlaybookId === pb.id}
              celebrate={celebratePlaybookId === pb.id}
              loading={loadingIds?.has(pb.id)}
              blocked={blocked}
              skipHint={"skipIf" in (full ?? {}) ? (full as { skipIf?: string }).skipIf : undefined}
              onSelect={() => onSelect(pb.id)}
              onStart={prog.total > 0 && !blocked ? () => onStart(pb.id) : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
