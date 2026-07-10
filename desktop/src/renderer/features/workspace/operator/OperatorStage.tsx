import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ActionVerb, NormRect, OperatorPhase } from "@shared/types";
import { AgentCursor } from "./AgentCursor";

interface OperatorStageProps {
  frame?: string;
  prevFrame?: string;
  phase?: OperatorPhase;
  cursor?: { x: number; y: number };
  bbox?: NormRect;
  verb?: ActionVerb;
  running: boolean;
  reducedMotion: boolean;
}

/**
 * The browser viewport stage: crossfades between frames, overlays the agent
 * cursor + element highlight, and shows a "thinking" shimmer when the model is
 * deliberating between actions.
 */
export function OperatorStage({
  frame,
  prevFrame,
  phase,
  cursor,
  bbox,
  verb,
  running,
  reducedMotion,
}: OperatorStageProps) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-bg">
      {frame ? (
        <>
          {prevFrame && !reducedMotion && (
            <img
              src={`data:image/png;base64,${prevFrame}`}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
          <AnimatePresence initial={false}>
            <motion.img
              key={frame.slice(0, 32)}
              src={`data:image/png;base64,${frame}`}
              alt="Live browser frame"
              className="absolute inset-0 h-full w-full object-contain"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
            />
          </AnimatePresence>
          <AgentCursor cursor={cursor} bbox={bbox} verb={verb} reducedMotion={reducedMotion} />
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-body-sm text-text-3">
          {running ? (
            <span className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin" /> Launching secure browser…
            </span>
          ) : (
            "Run a browser task to see the live session here."
          )}
        </div>
      )}

      {running && phase === "thinking" && frame && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] bg-accent/70" />
        </div>
      )}
    </div>
  );
}
