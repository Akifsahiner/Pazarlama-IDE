import { useMemo, useState } from "react";
import { ClipboardCopy, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { buildProductIssueMarkdown } from "@shared/cmoLaneD";

export function ProductIssueExportModal() {
  const requestId = useApp((state) => state.pendingProductIssueRequestId);
  const workspace = useApp(
    (state) => state.laneDWorkspace ?? state.marketingProfile?.lane_d_workspace,
  );
  const dismiss = useApp((state) => state.dismissProductIssueModal);
  const openProof = useApp((state) => state.openProductRequestModal);
  const [copied, setCopied] = useState(false);
  const request = useMemo(
    () => workspace?.requests.find((item) => item.id === requestId),
    [requestId, workspace],
  );

  if (!requestId || !request) return null;
  const markdown = buildProductIssueMarkdown(request);
  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="product-issue-export-modal"
    >
      <div className="w-full max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-warn">Core product handoff</p>
            <h2 className="mt-1 text-body-sm font-semibold text-text">Export developer issue</h2>
            <p className="mt-1 text-mini text-text-2">
              Nothing is filed automatically. Copy this body into your issue tracker, then log the
              issue URL as Lane D proof.
            </p>
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={dismiss}>
            <X size={16} />
          </button>
        </div>
        <pre className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded border border-line bg-surface-2 p-3 text-mini text-text-2">
          {markdown}
        </pre>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>Cancel</Button>
          <Button variant="secondary" size="sm" onClick={() => void copy()}>
            <ClipboardCopy size={13} />
            {copied ? "Copied" : "Copy issue"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              dismiss();
              openProof(request.id);
            }}
          >
            Log issue URL
          </Button>
        </div>
      </div>
    </div>
  );
}
