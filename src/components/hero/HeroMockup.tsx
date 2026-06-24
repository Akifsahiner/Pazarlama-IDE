"use client";

import { motion, useReducedMotion } from "framer-motion";
import { mockupSpring } from "@/lib/animations";
import { IDEWindow } from "@/components/ide-ui/IDEWindow";

export function HeroMockup() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className="relative mx-auto w-full max-w-5xl"
      initial={reducedMotion ? false : { opacity: 0, y: 120 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : mockupSpring}
      style={{ willChange: reducedMotion ? "auto" : "transform" }}
    >
      <div
        className="absolute -inset-10 -z-10 rounded-[40px] opacity-90 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 25% 50%, rgba(107,203,119,0.2) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 75% 40%, rgba(255,184,122,0.22) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 50% 80%, rgba(116,156,255,0.15) 0%, transparent 55%)",
        }}
        aria-hidden="true"
      />
      <IDEWindow />
    </motion.div>
  );
}
