import { Calendar, CheckCircle2, ClipboardList, Download, ExternalLink, Megaphone, Users } from "lucide-react";
import type { LaneBItem, LaneBWorkspace } from "@shared/cmoLaneB";
import {
  getNextLaneBItem,
  inferLaneBDay,
  laneBModeLabel,
  laneBProgress,
} from "@shared/cmoLaneB";
import {
  outreachExportFilename,
  outreachTouchRows,
  outreachTrackerToCsv,
} from "@shared/cmoOutreachExport";
import type { ChannelThesis } from "@shared/cmoIntake";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { useApp } from "@renderer/state/store";

const MODE_ICON = {
  posting_calendar: Calendar,
  outreach_tracker: Users,
  launch_runbook: ClipboardList,
  distribution_log: Megaphone,
} as const;

function LaneBRow({ item, workspace }: { item: LaneBItem; workspace: LaneBWorkspace }) {
  const openProof = useApp((s) => s.openLaneBProofModal);
  const skipItem = useApp((s) => s.skipLaneBItem);
  const updateTarget = useApp((s) => s.updateLaneBTarget);
  const openOpsProof = useApp((s) => s.openOpsProofModal);
  const isOutreach = workspace.mode === "outreach_tracker" && item.title.startsWith("Touch ");

  if (item.status === "done" || item.status === "skipped") {
    return (
      <tr className={item.status === "skipped" ? "opacity-60" : "opacity-80"}>
        <td className="px-3 py-2 text-[10px] text-text-3">
          {item.runbook_offset ?? (item.day ? `D${item.day}` : "—")}
        </td>
        <td className="px-3 py-2 text-body-sm text-text">{item.title}</td>
        <td className="px-3 py-2">
          <Badge tone={item.status === "done" ? "ok" : "neutral"}>
            {item.status === "done" ? "Done" : "Skipped"}
          </Badge>
        </td>
        <td className="px-3 py-2 text-right text-[10px]">
          {item.proof?.url ? (
            <a href={item.proof.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Proof <ExternalLink size={9} className="inline" />
            </a>
          ) : item.proof?.note ? (
            <span className="text-text-3">{item.proof.note.slice(0, 40)}</span>
          ) : null}
        </td>
      </tr>
    );
  }

  return (
    <tr data-testid={`lane-b-item-${item.id}`}>
      <td className="px-3 py-2 text-[10px] tabular-nums text-text-3">
        {item.runbook_offset ?? (item.day ? `D${item.day}` : "—")}
      </td>
      <td className="px-3 py-2">
        {isOutreach ? (
          <div className="flex flex-col gap-1">
            <input
              className="w-full rounded border border-line bg-surface-2 px-2 py-1 text-body-sm text-text"
              value={item.target_name ?? ""}
              placeholder="Target name"
              onChange={(e) => updateTarget(item.id, { target_name: e.target.value })}
            />
            <input
              className="w-full rounded border border-line bg-surface-2 px-2 py-1 text-[10px] text-text-2"
              value={item.target_handle ?? ""}
              placeholder="@handle or email"
              onChange={(e) => updateTarget(item.id, { target_handle: e.target.value })}
            />
          </div>
        ) : (
          <span className="text-body-sm text-text">{item.title}</span>
        )}
        {item.channel && (
          <span className="ml-1 text-[10px] text-text-3">· {item.channel}</span>
        )}
      </td>
      <td className="px-3 py-2">
        <Badge tone="marketing">Pending</Badge>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex flex-wrap justify-end gap-1">
          <Button variant="primary" size="sm" onClick={() => openProof(item.id)}>
            Mark done
          </Button>
          <Button variant="ghost" size="sm" onClick={() => skipItem(item.id)}>
            Skip
          </Button>
          {item.linked_ops_task_id && (
            <Button variant="subtle" size="sm" onClick={() => openOpsProof(item.linked_ops_task_id!)}>
              Ops KPI
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function LaneBPanel({
  workspace,
  thesis,
  compact = false,
}: {
  workspace: LaneBWorkspace;
  thesis?: ChannelThesis | null;
  compact?: boolean;
}) {
  const progress = laneBProgress(workspace);
  const today = inferLaneBDay(workspace);
  const next = getNextLaneBItem(workspace);
  const ModeIcon = MODE_ICON[workspace.mode];
  const project = useApp((s) => s.project);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const touchCount = outreachTouchRows(workspace).length;

  const exportCsv = () => {
    const csv = outreachTrackerToCsv(workspace);
    const filename = outreachExportFilename(
      project?.name ?? "project",
      opsCadence?.week_index ?? 1,
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-marketing/25 bg-marketing-soft/5" data-testid="lane-b-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ModeIcon size={14} className="text-marketing" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-marketing">
              Lane B · {laneBModeLabel(workspace.mode)}
            </div>
            <h2 className={`font-semibold text-text ${compact ? "text-body" : "text-body"}`}>
              You execute — IDE prepared the playbook
            </h2>
          </div>
        </div>
        <div className="text-right text-[10px] text-text-3">
          <div className="text-h3 font-semibold tabular-nums text-text">
            {progress.done}/{progress.total}
          </div>
          Day {today} · {progress.doneToday}/{progress.dueToday + progress.doneToday} today
          {workspace.mode === "outreach_tracker" && (
            <div className="mt-1">
              <Button
                variant="subtle"
                size="sm"
                iconLeft={<Download size={10} />}
                onClick={exportCsv}
                data-testid="outreach-export-csv"
              >
                Export CSV ({touchCount})
              </Button>
            </div>
          )}
        </div>
      </div>

      {thesis && !compact && (
        <p className="mt-2 text-mini text-text-2">
          {thesis.lane_b.join(" · ")}
        </p>
      )}

      {next && (
        <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-marketing/20 bg-marketing-soft/10 px-3 py-2">
          <CheckCircle2 size={14} className="text-marketing" />
          <span className="text-mini text-text">
            <span className="font-semibold">Next:</span> {next.title}
          </span>
        </div>
      )}

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-marketing transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-line">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[10px] font-semibold uppercase tracking-wide text-text-3">
              <th className="px-3 py-2 w-16">When</th>
              <th className="px-3 py-2">Task</th>
              <th className="px-3 py-2 w-24">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {workspace.items.map((item) => (
              <LaneBRow key={item.id} item={item} workspace={workspace} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
