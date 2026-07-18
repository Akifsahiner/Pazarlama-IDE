import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
export function DelegateRubricModal() {
  const rubricId = useApp((s) => s.pendingDelegateRubricId);
  const workspace = useApp((s) => s.delegateOperator ?? s.delegateWorkspace);
  const dismiss = useApp((s) => s.dismissDelegateRubricModal);
  const complete = useApp((s) => s.completeDelegateRubricDay);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [actualSpend, setActualSpend] = useState("");
  const [error, setError] = useState<string | null>(null);

  const rubric = useMemo(
    () =>
      rubricId && workspace
        ? workspace.daily_rubrics.find((r) => r.id === rubricId)
        : undefined,
    [rubricId, workspace],
  );

  if (!rubricId || !rubric || !workspace) return null;

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = () => {
    const checked_ids = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const err = complete(rubric.id, {
      checked_ids,
      proof_url: proofUrl.trim() || undefined,
      proof_note: proofNote.trim() || undefined,
      actual_spend_usd: actualSpend ? Number(actualSpend) : undefined,
    });
    if (err) {
      setError(err);
      return;
    }
    setChecked({});
    setProofNote("");
    setProofUrl("");
    setActualSpend("");
    setError(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="delegate-rubric-modal"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-body-sm font-semibold text-text">Daily rubric</h2>
            <p className="mt-1 text-mini text-text-2">
              D{rubric.day_index} · {rubric.title}
            </p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {rubric.checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={!!checked[item.id]}
                onChange={() => toggle(item.id)}
                className="mt-1"
              />
              <span className={item.required ? "text-text" : "text-text-2"}>
                {item.label}
                {item.required ? " *" : ""}
              </span>
            </li>
          ))}
        </ul>
        <input
          className="mt-3 w-full rounded border border-line bg-surface-2 px-2.5 py-2 text-body-sm"
          placeholder="Proof URL (optional)"
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
        />
        <textarea
          className="mt-2 w-full resize-none rounded border border-line bg-surface-2 px-2.5 py-2 text-body-sm"
          rows={3}
          placeholder="Delivery note — what the delegate shipped today"
          value={proofNote}
          onChange={(e) => setProofNote(e.target.value)}
        />
        <input
          type="number"
          min={0}
          step="0.01"
          className="mt-2 w-full rounded border border-line bg-surface-2 px-2.5 py-2 text-body-sm"
          placeholder="Actual delegate spend USD (optional)"
          value={actualSpend}
          onChange={(e) => setActualSpend(e.target.value)}
        />
        {error && <p className="mt-2 text-mini text-warn">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Log rubric day
          </Button>
        </div>
      </div>
    </div>
  );
}
