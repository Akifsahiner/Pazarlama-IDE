import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { HandoffConfirmState } from "@shared/workspaceHandoff";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";

export type { HandoffConfirmState };

/** Risk summary before edit / integrate runs — user must acknowledge file edits. */
export function HandoffConfirmModal() {
  const pending = useApp((s) => s.pendingHandoffConfirm);
  const confirm = useApp((s) => s.confirmPendingHandoff);
  const cancel = useApp((s) => s.cancelPendingHandoff);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!pending) return null;

  const needsAck = pending.mode === "edit" || pending.mode === "integrate";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="handoff-confirm-title"
      data-testid="handoff-confirm-modal"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-warn/15 text-warn">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="handoff-confirm-title" className="text-body-sm font-semibold text-text">
              {pending.title}
            </h2>
            {pending.planTaskLabel && (
              <p className="mt-0.5 text-micro text-accent">{pending.planTaskLabel}</p>
            )}
            <p className="mt-2 text-mini text-text-2">{pending.detail}</p>
            {pending.patchCount != null && pending.patchCount > 0 && (
              <p className="mt-2 text-micro text-warn">
                {pending.patchCount} file{pending.patchCount === 1 ? "" : "s"} may change in an
                isolated git worktree.
              </p>
            )}
            {needsAck && (
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-mini text-text-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>Agent will edit files in my project (isolated worktree until I apply).</span>
              </label>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setAcknowledged(false); cancel(); }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={needsAck && !acknowledged}
            onClick={() => {
              confirm();
              setAcknowledged(false);
            }}
          >
            Run
          </Button>
        </div>
      </div>
    </div>
  );
}
