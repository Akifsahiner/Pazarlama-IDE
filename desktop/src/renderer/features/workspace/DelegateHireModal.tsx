import { useMemo, useState } from "react";
import { ClipboardCopy, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { buildDelegateHireMarkdown, buildDelegateSowMarkdown } from "@shared/cmoDelegateOperator";

export function DelegateHireModal() {
  const briefId = useApp((s) => s.pendingDelegateHireBriefId);
  const workspace = useApp((s) => s.delegateOperator ?? s.delegateWorkspace);
  const dismiss = useApp((s) => s.dismissDelegateHireModal);
  const openHandoff = useApp((s) => s.openDelegateBriefModal);
  const [copied, setCopied] = useState(false);
  const [copiedSow, setCopiedSow] = useState(false);

  const hire = useMemo(
    () =>
      briefId && workspace
        ? workspace.hire_blocks.find((h) => h.brief_id === briefId)
        : undefined,
    [briefId, workspace],
  );
  const brief = useMemo(
    () => (briefId && workspace ? workspace.briefs.find((b) => b.id === briefId) : undefined),
    [briefId, workspace],
  );

  if (!briefId || !hire || !brief) return null;

  const md = buildDelegateHireMarkdown(hire);
  const sowMd = buildDelegateSowMarkdown(hire, brief);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="delegate-hire-modal"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-body-sm font-semibold text-text">Hire brief</h2>
            <p className="mt-1 text-mini text-text-2">{hire.job_title}</p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-line bg-surface-2 p-3 text-[11px] text-text-2">
          {md}
        </pre>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<ClipboardCopy size={12} />}
            onClick={() => {
              void navigator.clipboard.writeText(sowMd);
              setCopiedSow(true);
              window.setTimeout(() => setCopiedSow(false), 2000);
            }}
          >
            {copiedSow ? "Copied SOW" : "Copy SOW"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<ClipboardCopy size={12} />}
            onClick={() => {
              void navigator.clipboard.writeText(md);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied" : "Copy job post"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              dismiss();
              openHandoff(briefId);
            }}
          >
            Continue to handoff
          </Button>
        </div>
      </div>
    </div>
  );
}
