import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { validateProductRequestProof } from "@shared/cmoLaneD";

export function ProductRequestProofModal() {
  const requestId = useApp((state) => state.pendingProductRequestId);
  const workspace = useApp(
    (state) => state.laneDWorkspace ?? state.marketingProfile?.lane_d_workspace,
  );
  const dismiss = useApp((state) => state.dismissProductRequestModal);
  const complete = useApp((state) => state.completeProductRequest);
  const [prUrl, setPrUrl] = useState("");
  const [issueUrl, setIssueUrl] = useState("");
  const [metric, setMetric] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const request = useMemo(
    () => workspace?.requests.find((item) => item.id === requestId),
    [requestId, workspace],
  );

  if (!requestId || !request) return null;
  const proof = {
    pr_url: prUrl,
    issue_url: issueUrl,
    note,
    metric_value: metric === "" ? undefined : Number(metric),
    metric_name: request.target_metric?.name,
  };
  const validation = validateProductRequestProof(request, proof);
  const submit = () => {
    const result = complete(request.id, proof);
    if (result) {
      setError(result);
      return;
    }
    setPrUrl("");
    setIssueUrl("");
    setMetric("");
    setNote("");
    setError(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="product-request-proof-modal"
    >
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-warn">P0 PRODUCT REQUEST</p>
            <h2 className="mt-1 text-body-sm font-semibold text-text">{request.title}</h2>
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={dismiss}>
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-[10px] font-semibold uppercase text-text-3">
            PR URL {request.fix_scope === "site_level" ? "(recommended)" : ""}
            <input
              type="url"
              value={prUrl}
              placeholder="https://…"
              className="mt-1.5 w-full rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
              onChange={(event) => setPrUrl(event.target.value)}
            />
          </label>
          <label className="text-[10px] font-semibold uppercase text-text-3">
            Issue URL {request.fix_scope === "core_product" ? "(required unless PR)" : ""}
            <input
              type="url"
              value={issueUrl}
              placeholder="https://…"
              className="mt-1.5 w-full rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
              onChange={(event) => setIssueUrl(event.target.value)}
            />
          </label>
        </div>
        {request.target_metric && (
          <label className="mt-3 block text-[10px] font-semibold uppercase text-text-3">
            {request.target_metric.name} ({request.target_metric.unit})
            <input
              type="number"
              min={0}
              step="0.1"
              value={metric}
              placeholder={`Target ${request.target_metric.value}${request.target_metric.unit}`}
              className="mt-1.5 w-full rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
              onChange={(event) => setMetric(event.target.value)}
            />
          </label>
        )}
        <label className="mt-3 block text-[10px] font-semibold uppercase text-text-3">
          Shipped note
          <textarea
            rows={3}
            value={note}
            placeholder="What changed, what remains, and how first value was verified."
            className="mt-1.5 w-full resize-none rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {(error || !validation.ok) && (
          <p className="mt-2 text-mini text-warn">{error ?? validation.errors.join(" ")}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit}>Mark shipped</Button>
        </div>
      </div>
    </div>
  );
}
