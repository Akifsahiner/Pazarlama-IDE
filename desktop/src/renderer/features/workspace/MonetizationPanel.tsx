import { CreditCard, ExternalLink, Play } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";
import {
  getNextMonetizationTask,
  monetizationProgress,
  type MonetizationWorkspace,
} from "@shared/cmoRevenuePlane";

export function MonetizationPanel({
  workspace,
  compact,
}: {
  workspace: MonetizationWorkspace;
  compact?: boolean;
}) {
  const openProof = useApp((state) => state.openMonetizationTaskModal);
  const openIssue = useApp((state) => state.openMonetizationIssueModal);
  const skipTask = useApp((state) => state.skipMonetizationTask);
  const progress = monetizationProgress(workspace);
  const next = getNextMonetizationTask(workspace);

  const action = (taskId: string) => {
    const task = workspace.tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (task.fix_scope === "core_billing") openIssue(task.id);
    else openProof(task.id);
  };

  return (
    <Card data-testid="monetization-panel" className={compact ? "p-3" : "p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <CreditCard size={15} className="mt-0.5 text-accent" />
          <div>
            <h3 className="text-body-sm font-semibold text-text">Monetization focus</h3>
            <p className="mt-1 text-mini text-text-2">{workspace.revenue_binding.headline}</p>
          </div>
        </div>
        <Badge tone="neutral">
          {progress.shipped}/{progress.total} done
        </Badge>
      </div>

      {next && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded border border-accent/25 bg-accent-soft/10 p-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase text-accent">Next P0</p>
            <p className="text-mini font-medium text-text">{next.title}</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            data-testid="monetization-log-proof"
            onClick={() => action(next.id)}
          >
            {next.fix_scope === "core_billing" ? <ExternalLink size={13} /> : <Play size={13} />}
            {next.fix_scope === "core_billing" ? "Export issue" : "Log proof"}
          </Button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {workspace.tasks.map((task) => (
          <div key={task.id} className="rounded border border-line bg-surface-2/50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="accent">{task.priority}</Badge>
                  <p className="text-mini font-medium text-text">{task.title}</p>
                </div>
                <p className="mt-1 text-micro text-text-2">{task.growth_impact}</p>
              </div>
              <Badge tone={task.status === "shipped" ? "ok" : "neutral"}>{task.status}</Badge>
            </div>
            {task.status !== "shipped" && task.status !== "skipped" && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  data-testid="monetization-task-ship"
                  onClick={() => action(task.id)}
                >
                  {task.fix_scope === "core_billing" ? "Export issue" : "Complete"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="monetization-task-skip"
                  onClick={() => skipTask(task.id, "Deferred for this cycle")}
                >
                  Skip
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
