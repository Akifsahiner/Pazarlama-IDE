"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeUpSpring } from "@/lib/animations";

type ShimmerButtonProps = {
  label: string;
  href?: string;
  id?: string;
  compact?: boolean;
  animated?: boolean;
  icon?: React.ReactNode;
};

function WindowsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.5 2.5L7.5 1.7V7.8H1.5V2.5Z" fill="currentColor" />
      <path d="M8.5 1.6L14.5 0.8V7.8H8.5V1.6Z" fill="currentColor" />
      <path d="M1.5 8.7H7.5V14.5L1.5 13.7V8.7Z" fill="currentColor" />
      <path d="M8.5 8.7H14.5V15.2L8.5 14.4V8.7Z" fill="currentColor" />
    </svg>
  );
}

export function ShimmerButton({
  label,
  href = "#",
  id,
  compact = false,
  animated = true,
  icon,
}: ShimmerButtonProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const sizeClass = compact ? "px-4 py-2 text-[13px]" : "px-6 py-3 text-[15px]";
  const className = `shimmer-button inline-flex items-center gap-2 rounded-xl font-medium tracking-[-0.01em] text-white hover:scale-[1.02] active:scale-[0.98] ${sizeClass}`;

  const content = (
    <>
      <span className="shimmer-button__sweep" aria-hidden="true" />
      <span className="relative flex items-center gap-2">
        {icon ?? <WindowsIcon />}
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
