import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@renderer/state/store";
import { MissingInfoCard, useNextProfileGap } from "./MissingInfoCard";
import { InlineQuestionCard } from "./InlineQuestionCard";

/**
 * Unified missing-info queue: brain inline questions take priority over
 * profile gaps. Renders nothing (no empty shell) when there is no question.
 */
export function ContextQueue() {
  const thread = useApp((s) => s.thread);
  const dismissedBrainQuestionIds = useApp((s) => s.dismissedBrainQuestionIds);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const nextGap = useNextProfileGap();
  const cardRef = useRef<HTMLDivElement>(null);
  const prevQuestionIdRef = useRef<string | null>(null);

  const brainQuestion = useMemo(() => {
    for (let i = thread.length - 1; i >= 0; i--) {
      const e = thread[i];
      if (
        e.kind === "missing_info" &&
        e.missingQuestions?.length &&
        e.missingInfoState !== "answered" &&
        e.missingInfoState !== "dismissed" &&
        !dismissedBrainQuestionIds.includes(e.id)
      ) {
        return e;
      }
    }
    return null;
  }, [thread, dismissedBrainQuestionIds]);

  useEffect(() => {
    if (!brainQuestion || brainQuestion.id === prevQuestionIdRef.current) return;
    prevQuestionIdRef.current = brainQuestion.id;
    const el = cardRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [brainQuestion?.id, reducedMotion]);

  if (brainQuestion?.missingQuestions?.length) {
    return (
      <div ref={cardRef} className="context-queue-card mb-3">
        <InlineQuestionCard
          questions={brainQuestion.missingQuestions}
          eventId={brainQuestion.id}
        />
      </div>
    );
  }

  if (!nextGap) return null;

  return (
    <div className="context-queue-card mb-3">
      <MissingInfoCard />
    </div>
  );
}
