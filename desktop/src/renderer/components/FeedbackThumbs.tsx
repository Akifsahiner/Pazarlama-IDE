import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { apiSubmitFeedback as apiSubmitFeedbackRaw } from "@renderer/lib/api";
import { useApp } from "@renderer/state/store";

export function FeedbackThumbs({
  targetKind,
  targetId,
  projectId,
  skillId,
  discipline,
  tacticApplied,
}: {
  targetKind: "decision" | "draft" | "run" | "plan_task";
  targetId: string;
  projectId?: string;
  skillId?: string;
  discipline?: string;
  /** Tactic IDs shown on the decision (Skill Excellence telemetry). */
  tacticApplied?: string[];
}) {
  const settings = useApp((s) => s.settings);
  const authEnabled = useApp((s) => s.auth.authEnabled);
  const [rating, setRating] = useState<-1 | 1 | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (value: -1 | 1) => {
    if (busy || rating !== null) return;
    setBusy(true);
    try {
      await apiSubmitFeedbackRaw(settings, authEnabled, {
        targetKind,
        targetId,
        projectId,
        rating: value,
        skillId,
        discipline,
        tacticApplied,
      });
      setRating(value);
    } catch {
      /* offline or persistence off */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-micro text-text-3">
      <span>Helpful?</span>
      <button
        type="button"
        disabled={busy || rating !== null}
        onClick={() => void submit(1)}
        className={`rounded p-1 transition-colors hover:bg-elevated ${rating === 1 ? "text-ok" : ""}`}
        aria-label="Thumbs up"
      >
        <ThumbsUp size={12} />
      </button>
      <button
        type="button"
        disabled={busy || rating !== null}
        onClick={() => void submit(-1)}
        className={`rounded p-1 transition-colors hover:bg-elevated ${rating === -1 ? "text-danger" : ""}`}
        aria-label="Thumbs down"
      >
        <ThumbsDown size={12} />
      </button>
      {rating !== null && <span className="text-text-2">Thanks</span>}
    </div>
  );
}
