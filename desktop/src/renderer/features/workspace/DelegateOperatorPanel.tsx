import { CheckCircle2, ClipboardCopy, ClipboardList, Users } from "lucide-react";
import type { ChannelThesis } from "@shared/cmoIntake";
import type { DelegateOperatorWorkspace } from "@shared/cmoDelegateOperator";
import {
  rubricCompletionSummary,
} from "@shared/cmoDelegateOperator";
import {
  buildDelegateHandoffMarkdown,
  delegateRoleLabel,
  delegateWorkspaceProgress,
  getNextDelegateBrief,
  type CmoDelegateBrief,
  type CmoDelegateWorkspace,
} from "@shared/cmoLaneC";
import { useApp } from "@renderer/state/store";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";

function BriefRow({
  brief,
  workspace,
  thesis,
}: {
  brief: CmoDelegateBrief;
  workspace: CmoDelegateWorkspace;
  thesis?: ChannelThesis | null;
}) {
  const openModal = useApp((s) => s.openDelegateBriefModal);
  const openHire = useApp((s) => s.openDelegateHireModal);
  const skipBrief = useApp((s) => s.skipDelegateBrief);

  const tone =
    brief.status === "done"
      ? "ok"
      : brief.status === "handed_off" || brief.status === "in_progress"
        ? "accent"
        : brief.status === "skipped"
          ? "neutral"
          : "warn";

  return (
    <tr data-testid={`delegate-brief-${brief.id}`}>
      <td className="px-3 py-2 text-[10px] text-text-3">D{brief.due_day}</td>
      <td className="px-3 py-2">
        <div className="text-body-sm text-text">{brief.title}</div>
        <div className="text-[10px] text-text-3">{delegateRoleLabel(brief.role)}</div>
        {brief.assignee_name && (
          <div className="text-[10px] text-text-2">→ {brief.assignee_name}</div>
        )}
      </td>
      <td className="px-3 py-2 text-[10px] text-text-3">
        {brief.linked_lane_b_ids?.length
          ? `${brief.linked_lane_b_ids.length} rows`
          : (brief.lane_link_target?.replace(/_/g, " ") ?? "—")}
      </td>
      <td className="px-3 py-2">
        <Badge tone={tone}>{brief.status.replace(/_/g, " ")}</Badge>
      </td>
      <td className="px-3 py-2 text-right">
        {brief.status === "done" || brief.status === "skipped" ? (
          brief.proof?.url ? (
            <a
              href={brief.proof.url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-accent"
            >
              Proof
            </a>
          ) : (
            <span className="text-[10px] text-text-3">{brief.proof?.note?.slice(0, 32)}</span>
          )
        ) : (
          <div className="flex flex-wrap justify-end gap-1">
            {brief.status === "draft" && (
              <Button variant="subtle" size="sm" onClick={() => openHire(brief.id)}>
                Hire
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => openModal(brief.id)}>
              {brief.status === "draft" ? "Hand off" : "Mark delivered"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => skipBrief(brief.id)}>
              Skip
            </Button>
            {thesis && brief.status === "draft" && (
              <Button
                variant="subtle"
                size="sm"
                iconLeft={<ClipboardCopy size={10} />}
                onClick={() => {
                  const md = buildDelegateHandoffMarkdown(workspace, thesis, brief.id);
                  if (md) void navigator.clipboard.writeText(md);
                }}
              >
                Copy
              </Button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export function DelegateOperatorPanel({
  workspace,
  thesis,
  compact = false,
}: {
  workspace: DelegateOperatorWorkspace;
  thesis?: ChannelThesis | null;
  compact?: boolean;
}) {
  const openHire = useApp((s) => s.openDelegateHireModal);
  const openRubric = useApp((s) => s.openDelegateRubricModal);
  const prog = delegateWorkspaceProgress(workspace);
  const next = getNextDelegateBrief(workspace);
  const activeBrief = workspace.briefs.find(
    (b) => b.status === "handed_off" || b.status === "in_progress",
  );
  const rubrics = activeBrief
    ? workspace.daily_rubrics.filter((r) => r.brief_id === activeBrief.id)
    : [];

  return (
    <Card
      className="border-warn/25 bg-warn-soft/5"
      data-testid="delegate-operator-panel"
      role="region"
      aria-label="Lane C delegation operator"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-warn" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-warn">
              Lane C · Delegation operator
            </div>
            <h2 className={`font-semibold text-text ${compact ? "text-body" : "text-body"}`}>
              Hire · rubric · lane sync
            </h2>
          </div>
        </div>
        <div className="text-right text-[10px] text-text-3">
          <div className="text-h3 font-semibold tabular-nums text-text">
            {prog.done}/{prog.total}
          </div>
          {prog.handedOff} handed off
        </div>
      </div>

      {workspace.verdict && (
        <p className="mt-2 text-mini text-text-2">{workspace.verdict.headline}</p>
      )}

      {next && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-warn/20 bg-warn-soft/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-warn" />
            <span className="text-mini text-text">
              <span className="font-semibold">Next:</span> {next.title}
            </span>
          </div>
          {next.status === "draft" && (
            <Button variant="subtle" size="sm" onClick={() => openHire(next.id)}>
              View hire post
            </Button>
          )}
        </div>
      )}

      {rubrics.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-text-3">
            <ClipboardList size={12} />
            Daily rubric · {rubricCompletionSummary(workspace, activeBrief!.id)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {rubrics.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`rounded border px-1 py-2 text-center text-[9px] ${
                  r.status === "done"
                    ? "border-ok/40 bg-ok-soft/20 text-ok"
                    : r.status === "partial"
                      ? "border-warn/40 bg-warn-soft/15"
                      : "border-line bg-surface-2 text-text-3"
                }`}
                onClick={() => openRubric(r.id)}
              >
                D{r.day_index}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-line">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[10px] font-semibold uppercase tracking-wide text-text-3">
              <th className="w-12 px-3 py-2">Due</th>
              <th className="px-3 py-2">Brief</th>
              <th className="px-3 py-2">Link</th>
              <th className="w-24 px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {workspace.briefs.map((brief) => (
              <BriefRow
                key={brief.id}
                brief={brief}
                workspace={workspace}
                thesis={thesis}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
