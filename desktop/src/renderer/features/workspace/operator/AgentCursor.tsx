import { motion } from "framer-motion";
import { dur, ease } from "@renderer/design/tokens";
import type { ActionVerb, NormRect } from "@shared/types";

interface AgentCursorProps {
  cursor?: { x: number; y: number };
  bbox?: NormRect;
  verb?: ActionVerb;
  reducedMotion: boolean;
}

const VERB_LABEL: Partial<Record<ActionVerb, string>> = {
  click: "Click",
  type: "Type",
  scroll: "Scroll",
  key: "Key",
  wait: "Wait",
  drag: "Drag",
  navigate: "Navigate",
  screenshot: "Capture",
};

/**
 * Animated agent cursor + target highlight over the live stage.
 * Sized and labeled so Computer Use reads clearly from across the room.
 */
export function AgentCursor({ cursor, bbox, verb, reducedMotion }: AgentCursorProps) {
  const move = reducedMotion ? { duration: 0 } : { duration: dur.slow, ease: ease.decelerate };
  const isClick = verb === "click";
  const label = verb ? VERB_LABEL[verb] ?? verb : undefined;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {bbox && (
        <motion.div
          className="absolute rounded-[6px] border-2 border-accent bg-accent/15 ring-2 ring-accent/20"
          initial={reducedMotion ? false : { opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: dur.fast, ease: ease.decelerate }}
          style={{
            left: `${bbox.x * 100}%`,
            top: `${bbox.y * 100}%`,
            width: `${bbox.w * 100}%`,
            height: `${bbox.h * 100}%`,
          }}
        />
      )}

      {cursor && (
        <motion.div
          className="absolute"
          animate={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
          transition={move}
          style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
        >
          <div className="-ml-3 -mt-3 h-6 w-6 rounded-full border-[2.5px] border-accent bg-accent/35 shadow-[0_0_0_4px_rgba(124,92,255,0.15)]">
            {isClick && !reducedMotion && (
              <motion.span
                key={`${cursor.x}-${cursor.y}-ripple`}
                className="absolute inset-0 rounded-full bg-accent/50"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 3.2, opacity: 0 }}
                transition={{ duration: dur.slower, ease: ease.decelerate }}
              />
            )}
            {verb === "type" && (
              <span className="absolute left-7 top-1 h-4 w-[2px] animate-pulse bg-accent" />
            )}
          </div>
          {label && (
            <span className="absolute left-7 top-0 whitespace-nowrap rounded-full border border-accent/40 bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
              {label}
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}
