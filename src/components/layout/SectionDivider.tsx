"use client";

import { motion, useReducedMotion } from "framer-motion";
import { dividerSpring } from "@/lib/animations";

export function SectionDivider() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className="flex w-full justify-center px-5">
      <motion.hr
        className="section-divider h-px w-full max-w-2xl border-0 opacity-80"
        initial={reducedMotion ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={reducedMotion ? { duration: 0 } : dividerSpring}
        style={{ transformOrigin: "center" }}
      />
    </div>
  );
}
