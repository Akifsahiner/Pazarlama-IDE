import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import type { InfluencerPlatform, PipelineStage } from "@shared/cmoInfluencerOperator";
import {
  touchDisplayLabel,
  validateInfluencerProof,
} from "@shared/cmoInfluencerOperator";

function targetStageForTouch(stage: PipelineStage): PipelineStage {
  if (stage === "research") return "pitched";
  if (stage === "pitched") return "replied";
  if (stage === "live") return "reporting";
  return "replied";
}

export function InfluencerProofModal() {
  const touchId = useApp((s) => s.pendingInfluencerProofTouchId);
  const operator = useApp((s) => s.influencerOperator);
  const dismiss = useApp((s) => s.dismissInfluencerProofModal);
  const complete = useApp((s) => s.completeInfluencerTouch);
  const updateCreator = useApp((s) => s.updateInfluencerCreator);
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<InfluencerPlatform>("tiktok");
  const [icpFit, setIcpFit] = useState("");
  const [threadUrl, setThreadUrl] = useState("");
  const [note, setNote] = useState("");
  const [replyReceived, setReplyReceived] = useState(false);
  const [replyInterest, setReplyInterest] = useState<"cold" | "warm" | "hot" | "">("");
  const [replyNote, setReplyNote] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [signups, setSignups] = useState("");
  const [clicks, setClicks] = useState("");
  const [spend, setSpend] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const touch = useMemo(
    () => (touchId && operator ? operator.touches.find((t) => t.id === touchId) : undefined),
    [touchId, operator],
  );

  if (!touchId || !touch || !operator) return null;

  const targetStage = targetStageForTouch(touch.pipeline_stage);
  const proof = {
    thread_url: threadUrl.trim() || undefined,
    note: note.trim() || undefined,
    reply_received: replyReceived || undefined,
    reply_interest: replyInterest || undefined,
    reply_note: replyNote.trim() || undefined,
    live_post_url: liveUrl.trim() || undefined,
    signups: signups ? Number(signups) : undefined,
    clicks: clicks ? Number(clicks) : undefined,
    spend_usd: spend ? Number(spend) : undefined,
  };

  const workingTouch = {
    ...touch,
    target_handle: handle.trim() || touch.target_handle,
    platform,
    icp_fit: icpFit ? (Number(icpFit) as 1 | 2 | 3 | 4 | 5) : touch.icp_fit,
  };

  const validation = validateInfluencerProof(workingTouch, proof, targetStage);

  const handleSubmit = () => {
    if (handle.trim() && handle.trim() !== touch.target_handle) {
      updateCreator(touch.id, {
        target_handle: handle.trim(),
        platform,
        icp_fit: icpFit ? (Number(icpFit) as 1 | 2 | 3 | 4 | 5) : undefined,
      });
    }
    const err = complete(touch.id, targetStage, proof);
    if (err) {
      setSubmitError(err);
      return;
    }
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="influencer-proof-modal"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-body-sm font-semibold text-text">Influencer proof</h2>
            <p className="mt-1 text-mini text-text-2">{touchDisplayLabel(operator, touch)}</p>
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={dismiss}>
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {touch.pipeline_stage === "research" && (
            <>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Creator handle
                </label>
                <input
                  value={handle || touch.target_handle}
                  placeholder="@creator"
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Platform
                </label>
                <select
                  value={platform}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setPlatform(e.target.value as InfluencerPlatform)}
                >
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="x">X</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  ICP fit (1–5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={icpFit}
                  placeholder={touch.icp_fit ? String(touch.icp_fit) : "4"}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setIcpFit(e.target.value)}
                />
              </div>
            </>
          )}
          {(targetStage === "pitched" || touch.pipeline_stage === "research") && (
            <>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Thread URL (optional)
                </label>
                <input
                  type="url"
                  value={threadUrl}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setThreadUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  DM sent note
                </label>
                <textarea
                  rows={2}
                  value={note}
                  placeholder="DM sent to @creator — personalized opener…"
                  className="mt-1.5 w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </>
          )}
          {targetStage === "replied" && (
            <>
              <label className="flex items-center gap-2 text-mini text-text-2">
                <input
                  type="checkbox"
                  checked={replyReceived}
                  onChange={(e) => setReplyReceived(e.target.checked)}
                />
                Reply received
              </label>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Interest
                </label>
                <select
                  value={replyInterest}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setReplyInterest(e.target.value as "cold" | "warm" | "hot")}
                >
                  <option value="">Select…</option>
                  <option value="cold">Cold</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={replyNote}
                placeholder="What they said + next step…"
                className="w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                onChange={(e) => setReplyNote(e.target.value)}
              />
            </>
          )}
          {targetStage === "reporting" && (
            <>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Live post URL
                </label>
                <input
                  type="url"
                  value={liveUrl}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setLiveUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Signups
                </label>
                <input
                  type="number"
                  min={0}
                  value={signups}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setSignups(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Clicks
                </label>
                <input
                  type="number"
                  min={0}
                  value={clicks}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setClicks(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
                  Actual spend USD
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={spend}
                  placeholder={touch.deal?.base_comp_usd != null ? `Deal estimate: $${touch.deal.base_comp_usd}` : "$0"}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
                  onChange={(e) => setSpend(e.target.value)}
                />
              </div>
            </>
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
