import { motion } from "framer-motion";
import { dur, ease } from "@renderer/design/tokens";
import type { ActionVerb, NormRect } from "@shared/types";

interface AgentCursorProps {
  cursor?: { x: number; y: number };
  bbox?: NormRect;
  verb?: ActionVerb;
  reducedMotion: boolean;
}

/**
 * The animated agent cursor + target-element highlight overlaid on the stage.
 * The cursor eases to the target; clicks ripple; the bbox outline animates in.
 * All motion collapses to instant under reduced-motion.
 */
export function AgentCursor({ cursor, bbox, verb, reducedMotion }: AgentCursorProps) {
  const move = reducedMotion ? { duration: 0 } : { duration: dur.slow, ease: ease.decelerate };
  const isClick = verb === "click";

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {bbox && (
        <motion.div
          className="absolute rounded-[4px] border-2 border-accent/80 bg-accent/10"
          initial={reducedMotion ? false : { opacity: 0, scale: 1.04 }}
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
          <div className="-ml-2 -mt-2 h-4 w-4 rounded-full border-2 border-accent bg-accent/30">
            {isClick && !reducedMotion && (
              <motion.span
                key={`${cursor.x}-${cursor.y}`}
                className="absolute inset-0 rounded-full bg-accent/40"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: dur.slower, ease: ease.decelerate }}
              />
            )}
            {verb === "type" && (
              <span className="absolute left-5 top-0 h-4 w-[2px] animate-pulse bg-accent" />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
