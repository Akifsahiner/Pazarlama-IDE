import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import type { SessionEvent } from "@renderer/state/session";
import { humanizeSkills } from "@shared/brainLabels";
import { thinkingCrossfade } from "@renderer/design/animations";
import { useApp } from "@renderer/state/store";

/** Claude-style single thinking row — updated in place during brain phases. */
export function ThinkingStrip({ event }: { event: SessionEvent }) {
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const skills = event.thinkingSkills?.length
    ? humanizeSkills(event.thinkingSkills, 2)
    : null;
  const thinkingText = event.thinkingText ?? "Working on your request…";

  return (
    <div
      className="flex items-start gap-2 rounded-[var(--radius-md)] border border-line/80 bg-surface-2/80 px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin text-accent" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-micro font-medium text-text-2">
          <Sparkles size={11} className="text-accent" />
          {event.thinkingPhase ?? "Thinking"}
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={thinkingText}
            initial={reducedMotion ? false : thinkingCrossfade.initial}
            animate={reducedMotion ? undefined : thinkingCrossfade.animate}
            exit={reducedMotion ? undefined : thinkingCrossfade.exit}
            className="mt-0.5 text-body-sm leading-snug text-text-3"
          >
            {thinkingText}
            {skills ? <span className="text-text-3"> · {skills}</span> : null}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
