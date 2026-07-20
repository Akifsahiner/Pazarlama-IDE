"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { sectionReveal } from "@/lib/animations";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
};

export function ScrollReveal({
  children,
  className = "",
  variants = sectionReveal,
  delay = 0,
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion() ?? false;

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial={false}
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
