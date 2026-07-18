import { Code2, Globe, FileText, Sparkles, Play, ExternalLink } from "lucide-react";
import type { LaneAItem, LaneAWorkspace } from "@shared/cmoLaneA";
import { laneAModeLabel, laneAProgress } from "@shared/cmoLaneA";
import type { ChannelThesis } from "@shared/cmoIntake";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { useApp } from "@renderer/state/store";

const MODE_ICON = {
  repo_edit: Code2,
  browser_research: Globe,
  content_draft: FileText,
  scout_then_edit: Sparkles,
} as const;

function LaneARow({ item }: { item: LaneAItem }) {
  const startOpsSystemTask = useApp((s) => s.startOpsSystemTask);
  const run = useApp((s) => s.run);
  const Icon = MODE_ICON[item.mode] ?? Code2;
  const isActive = Boolean(
    item.status === "in_progress" &&
      item.linked_run_id &&
      run?.runId === item.linked_run_id,
  );

  if (item.status === "done" || item.status === "skipped") {
    return (
      <tr className={item.status === "skipped" ? "opacity-60" : "opacity-80"}>
        <td className="px-3 py-2">
          <Icon size={14} className="text-text-3" />
        </td>
        <td className="px-3 py-2 text-body-sm text-text">{item.title}</td>
        <td className="px-3 py-2">
          <Badge tone={item.status === "done" ? "ok" : "neutral"}>
            {item.status === "done" ? "Shipped" : "Skipped"}
          </Badge>
        </td>
        <td className="px-3 py-2 text-right text-[10px] text-text-3">
          {item.proof?.commit_sha ? (
            <span className="font-mono">commit {item.proof.commit_sha.slice(0, 7)}</span>
          ) : item.proof?.run_id ? (
            <span>run linked</span>
          ) : null}
        </td>
      </tr>
    );
  }

  return (
    <tr className={isActive ? "bg-accent-soft/20" : undefined}>
      <td className="px-3 py-2">
        <Icon size={14} className="text-accent" />
      </td>
      <td className="px-3 py-2">
        <div className="text-body-sm text-text">{item.title}</div>
        {item.detail && item.detail !== item.title && (
          <div className="mt-0.5 text-[10px] text-text-3">{item.detail}</div>
        )}
        {item.skills.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.skills.slice(0, 2).map((s) => (
              <Badge key={s} tone="neutral">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <Badge tone={item.status === "in_progress" ? "accent" : "warn"}>
          {item.status === "in_progress" ? "In IDE" : laneAModeLabel(item.mode)}
        </Badge>
      </td>
      <td className="px-3 py-2 text-right">
        {item.linked_ops_task_id && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => startOpsSystemTask(item.linked_ops_task_id!)}
            disabled={isActive}
          >
            <Play size={12} className="mr-1" />
            {item.status === "in_progress" ? "Running…" : "Start in IDE"}
          </Button>
        )}
      </td>
    </tr>
  );
}

export function LaneAPanel({
  workspace,
  thesis,
}: {
  workspace: LaneAWorkspace;
  thesis?: ChannelThesis | null;
}) {
  const progress = laneAProgress(workspace);

  return (
    <Card
      className="mt-4"
      data-testid="lane-a-panel"
      role="region"
      aria-label="Lane A — IDE ships"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-accent" />
            <span className="text-h3 text-text">Lane A — IDE ships</span>
            <Badge tone="accent">Repo + research</Badge>
          </div>
          <p className="mt-1 text-mini text-text-3">
            {thesis?.lane_a[0] ?? "Landing, tracking, SEO, drafts — agent runs in your repo."}
          </p>
        </div>
        <div className="text-right text-[10px] text-text-3">
          <span className="font-medium tabular-nums text-text-2">
            {progress.done}/{progress.total}
          </span>{" "}
          shipped
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wider text-text-3">
              <th className="px-3 py-2 w-8" />
              <th className="px-3 py-2">What IDE ships</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {workspace.items.map((item) => (
              <LaneARow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
      {progress.percent === 100 && (
        <p className="border-t border-line px-4 py-2 text-[10px] text-ok">
          Lane A complete for this week — human Lane B steps are next.{" "}
          <ExternalLink size={9} className="inline opacity-60" />
        </p>
      )}
    </Card>
  );
}
