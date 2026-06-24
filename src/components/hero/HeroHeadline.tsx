"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  dividerSpring,
  getWordDelay,
  subheadFade,
  wordRevealSpring,
} from "@/lib/animations";
import { heroCopy } from "@/lib/tokens";

const words = heroCopy.headline.split(" ");

export function HeroHeadline() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <motion.span
        className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-white/90 uppercase backdrop-blur-sm"
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.5 }}
      >
        {heroCopy.eyebrow}
      </motion.span>

      <h1 className="max-w-[640px] font-serif text-[52px] leading-[1.0] font-medium tracking-[-1px] text-white sm:text-[64px] lg:text-[76px]">
        {words.map((word, index) => {
          const isAccent = word === heroCopy.accentWord;
          return (
            <span
              key={`${word}-${index}`}
              className="-mb-[0.22em] inline-block overflow-hidden pb-[0.22em] align-bottom"
            >
              <motion.span
                className={`inline-block ${isAccent ? "text-[#ffb87a]" : ""}`}
                initial={reducedMotion ? false : { y: "1.25em" }}
                animate={{ y: 0 }}
                transition={{
                  ...wordRevealSpring,
                  delay: getWordDelay(index, reducedMotion),
                }}
              >
                {word}
                {index < words.length - 1 ? "\u00A0" : ""}
              </motion.span>
            </span>
          );
        })}
      </h1>

      <motion.hr
        className="hero-divider h-px w-80 max-w-full border-0 opacity-90"
        initial={reducedMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={reducedMotion ? { duration: 0 } : dividerSpring}
        style={{ transformOrigin: "center" }}
      />

      <motion.p
        className="hero-subhead-shadow max-w-[540px] text-[17px] leading-[1.5] font-medium tracking-[-0.02em] text-white sm:text-[19px]"
        variants={subheadFade}
        initial="hidden"
        animate="visible"
      >
        {heroCopy.subheadline}
      </motion.p>
    </div>
  );
}
