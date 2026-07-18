import { useMemo, useState } from "react";
import { Link2, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { validateLaneBProof } from "@shared/cmoLaneB";

export function LaneBItemProofModal() {
  const itemId = useApp((s) => s.pendingLaneBProofItemId);
  const workspace = useApp((s) => s.laneBWorkspace);
  const dismiss = useApp((s) => s.dismissLaneBProofModal);
  const complete = useApp((s) => s.completeLaneBItem);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [metric, setMetric] = useState("");
  const [spend, setSpend] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const item = useMemo(
    () => (itemId && workspace ? workspace.items.find((i) => i.id === itemId) : undefined),
    [itemId, workspace],
  );

  if (!itemId || !item) return null;

  const proof = { url, note, metric, spend_usd: spend ? Number(spend) : undefined };
  const validation = validateLaneBProof(proof);

  const handleSubmit = () => {
    const err = complete(item.id, proof);
    if (err) {
      setSubmitError(err);
      return;
    }
    setUrl("");
    setNote("");
    setMetric("");
    setSpend("");
    setSubmitError(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="lane-b-proof-modal"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-body-sm font-semibold text-text">Mark done — Lane B</h2>
            <p className="mt-1 text-mini text-text-2">{item.title}</p>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Actual spend USD (optional)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={spend}
              placeholder={item.cost_estimate_usd != null ? `Estimate: $${item.cost_estimate_usd}` : "$0"}
              className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
              onChange={(e) => setSpend(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-text-3">Log actual cash only. Estimates never count as spend.</p>
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={dismiss}>
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Post / send URL (optional)
            </label>
            <div className="relative mt-1.5">
              <Link2
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3"
              />
              <input
                type="url"
                value={url}
                placeholder="https://…"
                className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 py-1.5 pl-8 pr-2 text-body-sm text-text"
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Notes
            </label>
            <textarea
              rows={3}
              value={note}
              placeholder="What you posted, replies, blockers…"
              className="mt-1.5 w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Quick metric (optional)
            </label>
            <input
              type="text"
              value={metric}
              placeholder="e.g. 3 replies · 400 views"
              className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
              onChange={(e) => setMetric(e.target.value)}
            />
          </div>
        </div>
        {(submitError || !validation.ok) && (
          <p className="mt-2 text-mini text-warn">{submitError ?? validation.errors.join(" ")}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Mark done
          </Button>
        </div>
      </div>
    </div>
  );
}
