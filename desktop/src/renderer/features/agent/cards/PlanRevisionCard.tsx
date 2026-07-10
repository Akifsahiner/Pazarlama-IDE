import { GitBranch, ListPlus, ListX } from "lucide-react";
import type { PlanRevisionDiff } from "@shared/planDiff";
import { formatPlanRevisionMarkdown } from "@shared/planDiff";
import { AgentMarkdown } from "@renderer/features/agent/AgentMarkdown";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { useApp } from "@renderer/state/store";

export function PlanRevisionCard({
  summary,
  diff,
  sourcePlanId,
}: {
  summary: string;
  diff: PlanRevisionDiff;
  sourcePlanId?: string;
}) {
  const plan = useApp((s) => s.plan);
  const loadPlanHistory = useApp((s) => s.loadPlanHistory);
  const setPlanCompareBaseline = useApp((s) => s.setPlanCompareBaseline);
  const setWorkSurface = useApp((s) => s.setWorkSurface);

  const markdown = formatPlanRevisionMarkdown(diff);

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-accent-border bg-accent-soft/20 p-4"
      data-testid="plan-revision-card"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <GitBranch size={14} className="text-accent" />
        <span className="text-body-sm font-semibold text-text">Plan revision</span>
        <Badge tone="accent">New version</Badge>
        {sourcePlanId && (
          <span className="text-micro text-text-3">from {sourcePlanId.slice(0, 8)}…</span>
        )}
      </div>
      <p className="text-body-sm text-text-2">{summary}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-mini text-text-2">
        {diff.addedTasks.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListPlus size={12} className="text-ok" /> +{diff.addedTasks.length} tasks
          </span>
        )}
        {diff.removedTasks.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListX size={12} className="text-warn" /> −{diff.removedTasks.length} tasks
          </span>
        )}
        {diff.addedPlaybooks.length > 0 && (
          <span>+{diff.addedPlaybooks.length} playbooks</span>
        )}
      </div>
      <div className="agent-prose mt-3 max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-line bg-surface p-3 text-body-sm">
        <AgentMarkdown content={markdown} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setWorkSurface("campaign-plan");
            void loadPlanHistory();
          }}
        >
          Open updated plan
        </Button>
        {plan && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setWorkSurface("campaign-plan");
              void loadPlanHistory().then(() => {
                const history = useApp.getState().planHistory;
                const baseline =
                  history.find((row) => row.id !== useApp.getState().activePlanRowId) ??
                  history[1];
                if (baseline) setPlanCompareBaseline(baseline);
              });
            }}
          >
            Compare in Plan Studio
          </Button>
        )}
      </div>
    </div>
  );
}
