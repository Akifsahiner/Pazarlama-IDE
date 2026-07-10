"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { trustItems } from "@/lib/tokens";

type TrustStripProps = {
  tone?: "default" | "hero";
};

export function TrustStrip({ tone = "default" }: TrustStripProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const onHero = tone === "hero";

  return (
    <motion.div
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] ${
        onHero ? "hero-trust" : "text-ink-3"
      }`}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { delay: 0.5, duration: 0.6 }}
    >
      {trustItems.map((item) => (
        <span key={item} className="flex items-center gap-1.5">
          <Check
            className={`size-3.5 ${onHero ? "hero-trust__check" : "text-green"}`}
            aria-hidden="true"
          />
          {item}
        </span>
      ))}
    </motion.div>
  );
}
