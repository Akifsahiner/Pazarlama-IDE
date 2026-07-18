import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import {
  slotDisplayLabel,
  validateDistributionProof,
} from "@shared/cmoDistributionOperator";

export function DistributionProofModal() {
  const slotId = useApp((s) => s.pendingDistributionProofSlotId);
  const operator = useApp((s) => s.distributionOperator);
  const dismiss = useApp((s) => s.dismissDistributionProofModal);
  const complete = useApp((s) => s.completeDistributionSlot);
  const [postUrl, setPostUrl] = useState("");
  const [views24h, setViews24h] = useState("");
  const [retention3s, setRetention3s] = useState("");
  const [completion, setCompletion] = useState("");
  const [impressions, setImpressions] = useState("");
  const [replies, setReplies] = useState("");
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const slot = useMemo(
    () => (slotId && operator ? operator.slots.find((s) => s.id === slotId) : undefined),
    [slotId, operator],
  );

  if (!slotId || !slot || !operator) return null;

  const proof = {
    post_url: postUrl.trim() || undefined,
    views_24h: views24h ? Number(views24h) : undefined,
    retention_3s_pct: retention3s ? Number(retention3s) : undefined,
    completion_pct: completion ? Number(completion) : undefined,
    impressions: impressions ? Number(impressions) : undefined,
    replies: replies ? Number(replies) : undefined,
    note: note.trim() || undefined,
  };

  const validation = validateDistributionProof(slot, proof, operator.mode);
  const isMeasure = slot.slot_kind === "measure";
  const isEngage = slot.slot_kind === "engage";
  const isPost = slot.slot_kind === "post";

  const handleSubmit = () => {
    const err = complete(slot.id, proof);
    if (err) {
      setSubmitError(err);
      return;
    }
    setPostUrl("");
    setViews24h("");
    setRetention3s("");
    setCompletion("");
    setImpressions("");
    setReplies("");
    setNote("");
    setSubmitError(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="distribution-proof-modal"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-body-sm font-semibold text-text">Distribution proof</h2>
            <p className="mt-1 text-mini text-text-2">{slotDisplayLabel(operator, slot)}</p>
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={dismiss}>
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {(isPost || isMeasure) && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                Post URL
              </label>
              <input
                type="url"
                value={postUrl}
                placeholder="https://…"
                className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
                onChange={(e) => setPostUrl(e.target.value)}
              />
            </div>
          )}
          {(isMeasure && operator.mode === "short_form_volume") || isPost ? (
            <>
              {(isMeasure || retention3s) && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                    3s retention %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={retention3s}
                    placeholder="e.g. 68"
                    className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
                    onChange={(e) => setRetention3s(e.target.value)}
                  />
                </div>
              )}
              {(isMeasure || views24h) && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                    24h views
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={views24h}
                    placeholder="e.g. 1200"
                    className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
                    onChange={(e) => setViews24h(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Completion % (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={completion}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
                  onChange={(e) => setCompletion(e.target.value)}
                />
              </div>
            </>
          ) : null}
          {operator.mode === "founder_grid" && isMeasure && (
            <>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Impressions
                </label>
                <input
                  type="number"
                  min={0}
                  value={impressions}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
                  onChange={(e) => setImpressions(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Replies
                </label>
                <input
                  type="number"
                  min={0}
                  value={replies}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
                  onChange={(e) => setReplies(e.target.value)}
                />
              </div>
            </>
          )}
          {(isEngage || operator.mode === "founder_grid") && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                Notes
              </label>
              <textarea
                rows={3}
                value={note}
                placeholder="Engagement notes, replies, blockers…"
                className="mt-1.5 w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}
        </div>
        {(submitError || !validation.ok) && (
          <p className="mt-2 text-mini text-warn">{submitError ?? validation.errors.join(" ")}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Save proof
          </Button>
        </div>
      </div>
    </div>
  );
}
