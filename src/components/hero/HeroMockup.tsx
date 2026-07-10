"use client";

import { motion, useReducedMotion } from "framer-motion";
import { IDEWindow } from "@/components/ide-ui/IDEWindow";

export function HeroMockup() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className="product-frame relative -mt-2 w-full md:-mt-4"
      initial={reducedMotion ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="product-frame__glow" aria-hidden="true" />
      <motion.div
        className="product-frame__inner"
        animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: 7, ease: "easeInOut", repeat: Infinity, delay: 1.1 }
        }
      >
        <IDEWindow showThemePicker={false} interactive />
      </motion.div>
    </motion.div>
  );
}
