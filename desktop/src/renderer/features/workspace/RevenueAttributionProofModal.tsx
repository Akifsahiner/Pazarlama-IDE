import { useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";

export function RevenueAttributionProofModal() {
  const sourceId = useApp((state) => state.pendingRevenueAttributionSourceId);
  const profile = useApp((state) => state.revenueProfile ?? state.marketingProfile?.revenue_profile);
  const dismiss = useApp((state) => state.dismissRevenueAttributionModal);
  const log = useApp((state) => state.logRevenueAttributionForSource);
  const [paidCustomers, setPaidCustomers] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!sourceId || !profile) return null;
  const row = profile.attributions.find((item) => item.source_id === sourceId);

  const submit = () => {
    const value = Number(paidCustomers);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a non-negative paid customer count.");
      return;
    }
    const result = log(sourceId, value, note.trim() || undefined);
    if (result) {
      setError(result);
      return;
    }
    setPaidCustomers("");
    setNote("");
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="revenue-attribution-proof-modal"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-accent">Revenue attribution</p>
            <h2 className="mt-1 text-body-sm font-semibold text-text">
              {row?.source_label ?? sourceId}
            </h2>
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={dismiss}>
            <X size={16} />
          </button>
        </div>
        <label className="mt-4 block text-[10px] font-semibold uppercase text-text-3">
          Paid customers (measured)
          <input
            type="number"
            min={0}
            value={paidCustomers}
            className="mt-1.5 w-full rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
            onChange={(event) => setPaidCustomers(event.target.value)}
          />
        </label>
        <label className="mt-3 block text-[10px] font-semibold uppercase text-text-3">
          Note
          <input
            type="text"
            value={note}
            className="mt-1.5 w-full rounded border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error && <p className="mt-2 text-mini text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={dismiss}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save attribution
          </Button>
        </div>
      </div>
    </div>
  );
}
