"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeUpSpring } from "@/lib/animations";

type ShimmerButtonProps = {
  label: string;
  href?: string;
  id?: string;
  compact?: boolean;
  animated?: boolean;
  /** When false, hides the periodic light sweep (hero CTA). */
  sweep?: boolean;
  icon?: React.ReactNode;
  className?: string;
};

export function ShimmerButton({
  label,
  href = "#",
  id,
  compact = false,
  animated = true,
  sweep = true,
  icon,
  className: extraClassName,
}: ShimmerButtonProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const sizeClass = compact ? "px-4 py-2 text-[13px]" : "px-6 py-3 text-[15px]";
  const className = `shimmer-button inline-flex items-center gap-2 rounded-xl font-semibold tracking-[-0.01em] text-white ${!sweep ? "shimmer-button--no-sweep" : ""} ${sizeClass}${extraClassName ? ` ${extraClassName}` : ""}`;

  const content = (
    <>
      <span className="shimmer-button__sheen" aria-hidden="true" />
      {sweep && <span className="shimmer-button__sweep" aria-hidden="true" />}
      <span className="relative z-[2] flex items-center gap-2">
        {icon}
        {label}
      </span>
    </>
  );

  if (!animated || reducedMotion) {
    return (
      <a id={id} href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <motion.a
      id={id}
      href={href}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fadeUpSpring}
    >
      {content}
    </motion.a>
  );
}
