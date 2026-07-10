import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { dur } from "@renderer/design/tokens";
import { cx } from "./cx";

export interface TooltipProps {
  content: React.ReactNode;
  side?: "top" | "bottom";
  /** Wraps a single focusable/hoverable child. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight tooltip: hover/focus reveal, aria-describedby wiring, no portal
 * (positions relative to the trigger wrapper). Replaces ad-hoc `title` attrs
 * where the hint matters.
 */
export function Tooltip({ content, side = "top", children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={cx("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast }}
            className={cx(
              "pointer-events-none absolute left-1/2 z-[var(--z-dropdown)] w-max max-w-[260px] -translate-x-1/2 rounded-[var(--radius-sm)] border border-line bg-elevated px-2 py-1 text-caption text-text shadow-[var(--shadow-2)]",
              side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
