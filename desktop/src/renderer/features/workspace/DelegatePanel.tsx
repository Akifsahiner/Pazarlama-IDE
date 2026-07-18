import { CheckCircle2, ClipboardCopy, Send, Users, X } from "lucide-react";
import type { CmoDelegateBrief, CmoDelegateWorkspace } from "@shared/cmoLaneC";
import {
  buildDelegateHandoffMarkdown,
  delegateRoleLabel,
  delegateWorkspaceProgress,
  getNextDelegateBrief,
  validateDelegateHandoff,
  validateDelegateProof,
} from "@shared/cmoLaneC";
import type { ChannelThesis } from "@shared/cmoIntake";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { useApp } from "@renderer/state/store";
import { useMemo, useState } from "react";

export function DelegateBriefModal() {
  const briefId = useApp((s) => s.pendingDelegateBriefId);
  const workspace = useApp((s) => s.delegateWorkspace);
  const thesis = useApp((s) => s.channelThesis ?? s.marketingProfile?.channel_thesis);
  const dismiss = useApp((s) => s.dismissDelegateBriefModal);
  const handOff = useApp((s) => s.handOffDelegateBrief);
  const complete = useApp((s) => s.completeDelegateBrief);

  const [mode, setMode] = useState<"handoff" | "proof">("handoff");
  const [assigneeName, setAssigneeName] = useState("");
  const [assigneeContact, setAssigneeContact] = useState("");
  const [handoffNote, setHandoffNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [actualSpend, setActualSpend] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const brief = useMemo(
    () => (briefId && workspace ? workspace.briefs.find((b) => b.id === briefId) : undefined),
    [briefId, workspace],
  );

  if (!briefId || !brief || !workspace) return null;

  const showHandoff = brief.status === "draft";
  const showProof = brief.status === "handed_off" || brief.status === "in_progress";
  const activeMode = showProof && !showHandoff ? "proof" : mode;

  const copyMarkdown = async () => {
    if (!thesis) return;
    const md = buildDelegateHandoffMarkdown(workspace, thesis, brief.id);
    if (!md) return;
    await navigator.clipboard.writeText(md);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleHandoff = () => {
    const err = validateDelegateHandoff({
      assignee_name: assigneeName,
      assignee_contact: assigneeContact,
      handoff_note: handoffNote,
    });
    if (err) {
      setError(err);
      return;
    }
    const storeErr = handOff(brief.id, {
      assignee_name: assigneeName,
      assignee_contact: assigneeContact,
      handoff_note: handoffNote,
    });
    if (storeErr) {
      setError(storeErr);
      return;
    }
    void copyMarkdown();
    setError(null);
    dismiss();
  };

  const handleProof = () => {
    const proof = {
      url: proofUrl,
      note: proofNote,
      actual_spend_usd: actualSpend ? Number(actualSpend) : undefined,
    };
    const err = validateDelegateProof(proof);
    if (err) {
      setError(err);
      return;
    }
    const storeErr = complete(brief.id, proof);
    if (storeErr) {
      setError(storeErr);
      return;
    }
    setError(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="delegate-brief-modal"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge tone="warn">{delegateRoleLabel(brief.role)}</Badge>
            <h2 className="mt-2 text-body-sm font-semibold text-text">{brief.title}</h2>
            <p className="mt-1 text-mini text-text-2">{brief.what}</p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Close">
            <X size={14} className="text-text-3" />
          </button>
        </div>

        <ul className="mt-3 space-y-1 text-[10px] text-text-3">
          {brief.acceptance_criteria.map((a) => (
            <li key={a}>· Done when: {a}</li>
          ))}
        </ul>

        {showHandoff && showProof && (
          <div className="mt-3 flex gap-2">
            <Button
              variant={activeMode === "handoff" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setMode("handoff")}
            >
              Hand off
            </Button>
            <Button
              variant={activeMode === "proof" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setMode("proof")}
            >
              Mark delivered
            </Button>
          </div>
        )}

        {activeMode === "handoff" && showHandoff && (
          <div className="mt-3 space-y-2">
            <input
              className="w-full rounded border border-line bg-surface-2 px-2.5 py-2 text-body-sm"
              placeholder="Assignee name (required)"
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
            />
            <input
              className="w-full rounded border border-line bg-surface-2 px-2.5 py-2 text-body-sm"
              placeholder="Email / Slack / agency contact"
              value={assigneeContact}
              onChange={(e) => setAssigneeContact(e.target.value)}
            />
            <textarea
              className="w-full resize-none rounded border border-line bg-surface-2 px-2.5 py-2 text-body-sm"
              rows={3}
              placeholder="Handoff note — CSV attached, deadline, context…"
              value={handoffNote}
              onChange={(e) => setHandoffNote(e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<ClipboardCopy size={12} />}
              onClick={() => void copyMarkdown()}
            >
              {copied ? "Copied brief" : "Copy brief markdown"}
            </Button>
          </div>
        )}

        {activeMode === "proof" && (
          <div className="mt-3 space-y-2">
            <input
              className="w-full rounded border border-line bg-surface-2 px-2.5 py-2 text-body-sm"
              placeholder="Proof URL (optional)"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
            <textarea
              className="w-full resize-none rounded border border-line bg-surface-2 px-2.5 py-2 text-body-sm"
              rows={3}
              placeholder="Delivery note — what the delegate shipped"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded border border-line bg-surface-2 px-2.5 py-2 text-body-sm"
              placeholder={brief.cost_estimate_usd != null ? `Actual spend USD · estimate $${brief.cost_estimate_usd}` : "Actual spend USD (optional)"}
              value={actualSpend}
              onChange={(e) => setActualSpend(e.target.value)}
            />
          </div>
        )}

        {error && <p className="mt-2 text-mini text-warn">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Cancel
          </Button>
          {activeMode === "handoff" && showHandoff ? (
            <Button variant="primary" size="sm" iconLeft={<Send size={12} />} onClick={handleHandoff}>
              Hand off
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleProof}>
              Mark delivered
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

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

export function DelegatePanel({
  workspace,
  thesis,
  compact = false,
}: {
  workspace: CmoDelegateWorkspace;
  thesis?: ChannelThesis | null;
  compact?: boolean;
}) {
  const prog = delegateWorkspaceProgress(workspace);
  const next = getNextDelegateBrief(workspace);

  return (
    <Card
      className="border-warn/25 bg-warn-soft/5"
      data-testid="delegate-panel"
      role="region"
      aria-label="Lane C delegate briefs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-warn" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-warn">
              Lane C · Delegate
            </div>
            <h2 className={`font-semibold text-text ${compact ? "text-body" : "text-body"}`}>
              Hand off — you review delivery
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

      {next && (
        <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-warn/20 bg-warn-soft/10 px-3 py-2">
          <CheckCircle2 size={14} className="text-warn" />
          <span className="text-mini text-text">
            <span className="font-semibold">Next:</span> {next.title}
          </span>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-line">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[10px] font-semibold uppercase tracking-wide text-text-3">
              <th className="w-12 px-3 py-2">Due</th>
              <th className="px-3 py-2">Brief</th>
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
