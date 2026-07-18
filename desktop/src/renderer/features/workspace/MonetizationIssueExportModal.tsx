import { useMemo, useState } from "react";
import { Copy, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { buildBillingIssueMarkdown } from "@shared/cmoRevenuePlane";

export function MonetizationIssueExportModal() {
  const taskId = useApp((state) => state.pendingMonetizationIssueTaskId);
  const workspace = useApp(
    (state) => state.monetizationWorkspace ?? state.marketingProfile?.monetization_workspace,
  );
  const dismiss = useApp((state) => state.dismissMonetizationIssueModal);
  const complete = useApp((state) => state.completeMonetizationTask);
  const [issueUrl, setIssueUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const task = useMemo(
    () => workspace?.tasks.find((item) => item.id === taskId),
    [taskId, workspace],
  );

  if (!taskId || !task) return null;
  const markdown = buildBillingIssueMarkdown(task);

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
  };

  const submit = () => {
    const result = complete(task.id, { issue_url: issueUrl });
    if (result) {
      setError(result);
      return;
    }
    setIssueUrl("");
    setError(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="monetization-issue-export-modal"
    >
      <div className="w-full max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-accent">Core billing issue</p>
            <h2 className="mt-1 text-body-sm font-semibold text-text">{task.title}</h2>
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={dismiss}>
            <X size={16} />
          </button>
        </div>
        <pre className="mt-4 max-h-64 overflow-auto rounded border border-line bg-surface-2 p-3 text-micro text-text-2">
          {markdown}
        </pre>
        <Button className="mt-2" size="sm" variant="secondary" onClick={() => void copy()}>
          <Copy size={13} /> Copy markdown
        </Button>
        <label className="mt-4 block text-[10px] font-semibold uppercase text-text-3">
          Issue URL (required)
          <input
            type="url"
            value={issueUrl}
            data-testid="monetization-proof-issue-url"
            placeholder="https://github.com/…/issues/…"
            className="mt-1.5 w-full rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
            onChange={(event) => setIssueUrl(event.target.value)}
          />
        </label>
        {error && <p className="mt-2 text-mini text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={dismiss}>
            Cancel
          </Button>
          <Button variant="primary" data-testid="monetization-proof-confirm" onClick={submit}>
            Log issue filed
          </Button>
        </div>
      </div>
    </div>
  );
}
