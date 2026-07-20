"use client";

import { motion, useReducedMotion } from "framer-motion";
import { heroCopy } from "@/lib/tokens";

export function HeroHeadline() {
  const reducedMotion = useReducedMotion() ?? false;
  const ease = [0.22, 1, 0.36, 1] as const;
  const motionProps = reducedMotion
    ? { initial: false as const }
    : { initial: false as const, animate: { opacity: 1, y: 0 } };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <motion.div
        className="relative flex items-center justify-center"
        {...motionProps}
        transition={{ duration: 0.5, ease }}
      >
        <span className="eyebrow-glow eyebrow-glow--hero" aria-hidden="true" />
        <span className="hero-eyebrow relative inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] tracking-[0.14em] uppercase backdrop-blur-xl">
          <span className="size-1.5 shrink-0 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.6)]" aria-hidden="true" />
          {heroCopy.eyebrow}
        </span>
      </motion.div>

      <motion.h1
        className="hero-headline max-w-[18ch] font-serif text-[44px] leading-[1.05] font-medium tracking-[-0.02em] text-white sm:text-[60px] lg:text-[72px]"
        {...motionProps}
        transition={{ duration: 0.6, delay: 0.08, ease }}
      >
        {heroCopy.headlineLine1}
        <br />
        {heroCopy.headlineLine2Before}{" "}
        <span className="hero-headline-accent font-medium">{heroCopy.accentWord}</span>
      </motion.h1>

      <motion.p
        className="hero-subheadline max-w-[46ch] text-[17px] leading-[1.55] sm:text-[18px]"
        {...motionProps}
        transition={{ duration: 0.6, delay: 0.16, ease }}
      >
        {heroCopy.subheadline}
      </motion.p>
    </div>
  );
}
