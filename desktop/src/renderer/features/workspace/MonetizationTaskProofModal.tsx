import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { validateMonetizationTaskProof } from "@shared/cmoRevenuePlane";

export function MonetizationTaskProofModal() {
  const taskId = useApp((state) => state.pendingMonetizationTaskId);
  const workspace = useApp(
    (state) => state.monetizationWorkspace ?? state.marketingProfile?.monetization_workspace,
  );
  const dismiss = useApp((state) => state.dismissMonetizationTaskModal);
  const complete = useApp((state) => state.completeMonetizationTask);
  const [prUrl, setPrUrl] = useState("");
  const [metric, setMetric] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const task = useMemo(
    () => workspace?.tasks.find((item) => item.id === taskId),
    [taskId, workspace],
  );

  if (!taskId || !task) return null;
  const proof = {
    pr_url: prUrl,
    note,
    metric_value: metric === "" ? undefined : Number(metric),
    metric_name: "paid_customers",
  };
  const validation = validateMonetizationTaskProof(task, proof);

  const submit = () => {
    const result = complete(task.id, proof);
    if (result) {
      setError(result);
      return;
    }
    setPrUrl("");
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
      data-testid="monetization-task-proof-modal"
    >
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-accent">P0 MONETIZATION</p>
            <h2 className="mt-1 text-body-sm font-semibold text-text">{task.title}</h2>
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={dismiss}>
            <X size={16} />
          </button>
        </div>
        <label className="mt-4 block text-[10px] font-semibold uppercase text-text-3">
          PR URL
          <input
            type="url"
            value={prUrl}
            data-testid="monetization-proof-pr-url"
            className="mt-1.5 w-full rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
            onChange={(event) => setPrUrl(event.target.value)}
          />
        </label>
        <label className="mt-3 block text-[10px] font-semibold uppercase text-text-3">
          Metric value (optional)
          <input
            type="number"
            min={0}
            value={metric}
            data-testid="monetization-proof-metric"
            className="mt-1.5 w-full rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
            onChange={(event) => setMetric(event.target.value)}
          />
        </label>
        <label className="mt-3 block text-[10px] font-semibold uppercase text-text-3">
          Note
          <textarea
            value={note}
            data-testid="monetization-proof-note"
            className="mt-1.5 w-full rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
            rows={3}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {(validation.length > 0 || error) && (
          <p className="mt-2 text-mini text-danger">{error ?? validation.join(" ")}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={dismiss}>
            Cancel
          </Button>
          <Button variant="primary" data-testid="monetization-proof-confirm" onClick={submit}>
            Mark shipped
          </Button>
        </div>
      </div>
    </div>
  );
}
