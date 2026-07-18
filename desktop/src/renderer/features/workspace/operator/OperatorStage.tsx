import { AnimatePresence, motion } from "framer-motion";
import { Globe, Loader2, MousePointer2, Search } from "lucide-react";
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
  lastStatus?: string;
  actionLabel?: string;
}

const LAUNCH_BEATS = [
  { icon: Globe, label: "Provisioning sandbox browser" },
  { icon: Search, label: "Connecting Computer Use model" },
  { icon: MousePointer2, label: "Waiting for first screenshot" },
];

/**
 * The browser viewport stage: crossfades between frames, overlays the agent
 * cursor + element highlight, and shows a cinematic launch theater before the
 * first frame arrives.
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
  lastStatus,
  actionLabel,
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
          {(actionLabel || verb) && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-line bg-surface/95 px-3 py-1 text-micro text-text shadow-sm backdrop-blur-sm">
              {actionLabel ?? verb}
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
          {running ? (
            <>
              <div className="relative flex h-16 w-16 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-accent/30" />
                <span className="absolute inset-1 animate-ping rounded-full bg-accent/10" />
                <Loader2 size={22} className="relative animate-spin text-accent" />
              </div>
              <div className="space-y-1">
                <p className="text-body-sm font-medium text-text">Launching Computer Use</p>
                <p className="max-w-sm text-mini text-text-3">
                  {lastStatus || "Secure sandbox is starting — the live page will appear here."}
                </p>
              </div>
              <ul className="w-full max-w-xs space-y-2 text-left">
                {LAUNCH_BEATS.map((beat, i) => {
                  const Icon = beat.icon;
                  return (
                    <li
                      key={beat.label}
                      className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface/60 px-3 py-2 text-mini text-text-2"
                      style={{ opacity: 1 - i * 0.12 }}
                    >
                      <Icon size={13} className="shrink-0 text-accent" />
                      {beat.label}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-body-sm text-text-3">
              Run a browser task to see the live session here.
            </p>
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
