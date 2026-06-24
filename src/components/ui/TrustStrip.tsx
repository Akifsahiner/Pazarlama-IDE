"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { trustItems } from "@/lib/tokens";

const checkColors = ["#ffb87a", "#81b6ff", "#6BCB77"];

export function TrustStrip() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { delay: 1.7, duration: 0.5 }}
    >
      {trustItems.map((item, i) => (
        <span
          key={item}
          className="flex items-center gap-1.5 text-[13px] font-medium text-white/80"
        >
          <Check className="size-3.5" style={{ color: checkColors[i] }} />
          {item}
        </span>
      ))}
    </motion.div>
  );
}
