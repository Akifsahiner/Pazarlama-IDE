import { Box, ExternalLink, Play } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";
import { canResumeMarketing, getNextProductRequest, laneDProgress, type LaneDWorkspace } from "@shared/cmoLaneD";

export function LaneDPanel({
  workspace,
  compact,
}: {
  workspace: LaneDWorkspace;
  compact?: boolean;
}) {
  const startOps = useApp((state) => state.startOpsSystemTask);
  const openProof = useApp((state) => state.openProductRequestModal);
  const openIssue = useApp((state) => state.openProductIssueModal);
  const resume = useApp((state) => state.resumeMarketingAfterProductLoop);
  const progress = laneDProgress(workspace);
  const next = getNextProductRequest(workspace);

  const action = (requestId: string) => {
    const request = workspace.requests.find((item) => item.id === requestId);
    if (!request) return;
    if (request.fix_scope === "site_level" && request.linked_ops_task_id) {
      startOps(request.linked_ops_task_id);
    } else if (request.fix_scope === "core_product") {
      openIssue(request.id);
    } else {
      openProof(request.id);
    }
  };

  return (
    <Card data-testid="lane-d-panel" className={compact ? "p-3" : "p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Box size={15} className="mt-0.5 text-warn" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body-sm font-semibold text-text">Lane D · Product Loop</h3>
              <Badge tone={workspace.marketing_paused ? "warn" : "accent"}>
                {workspace.marketing_paused ? "Marketing paused" : "Ready to resume"}
              </Badge>
            </div>
            <p className="mt-1 text-mini text-text-2">{workspace.paused_reason}</p>
          </div>
        </div>
        <Badge tone="neutral">{progress.done}/{progress.total} terminal</Badge>
      </div>

      {next && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded border border-warn/25 bg-warn-soft/10 p-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase text-warn">Next P0</p>
            <p className="text-mini font-medium text-text">{next.title}</p>
          </div>
          <Button size="sm" variant="primary" onClick={() => action(next.id)}>
            {next.fix_scope === "site_level" ? <Play size={13} /> : <ExternalLink size={13} />}
            {next.fix_scope === "site_level" ? "Start in IDE" : "Export issue"}
          </Button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {workspace.requests.map((request) => (
          <div key={request.id} className="rounded border border-line bg-surface-2/50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone="warn">{request.priority}</Badge>
                  <p className="text-mini font-medium text-text">{request.title}</p>
                </div>
                <p className="mt-1 text-micro text-text-2">{request.growth_impact}</p>
                <ul className="mt-2 space-y-0.5 text-micro text-text-3">
                  {request.acceptance_criteria.slice(0, compact ? 2 : 4).map((criterion) => (
                    <li key={criterion}>- {criterion}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone="neutral">{request.fix_scope.replace(/_/g, " ")}</Badge>
                <Badge tone={request.status === "shipped" ? "accent" : "neutral"}>
                  {request.status.replace(/_/g, " ")}
                </Badge>
                {request.status !== "shipped" && request.status !== "skipped" && (
                  <>
                    {request.fix_scope === "core_product" && (
                      <Button size="sm" variant="subtle" onClick={() => openIssue(request.id)}>
                        Export
                      </Button>
                    )}
                    <Button size="sm" variant="subtle" onClick={() => openProof(request.id)}>
                      Proof
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {canResumeMarketing(workspace) && workspace.marketing_paused && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="primary" onClick={() => resume()}>
            Resume marketing
          </Button>
        </div>
      )}
    </Card>
  );
}
