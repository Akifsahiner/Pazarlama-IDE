"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";

type GhostButtonProps = {
  label: string;
  href?: string;
  onLight?: boolean;
};

export function GhostButton({ label, href = "#", onLight = false }: GhostButtonProps) {
  const reducedMotion = useReducedMotion() ?? false;

  const className = `inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-[15px] font-medium tracking-[-0.01em] transition-colors duration-200 ${
    onLight
      ? "border-line text-ink hover:bg-surface-2"
      : "border-white/30 text-white hover:bg-white/10"
  }`;

  return (
    <motion.a
      href={href}
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { delay: 1.5, duration: 0.5 }}
    >
      <Play className="size-3.5 fill-current" />
      {label}
    </motion.a>
  );
}
