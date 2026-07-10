"use client";

import { motion, useReducedMotion } from "framer-motion";
import { diffLineReveal, staggerContainer } from "@/lib/animations";
import { sections } from "@/lib/tokens";

export function DiffViewer() {
  const reducedMotion = useReducedMotion() ?? false;
  const { diff } = sections.execute;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/30">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-[10px] text-white/55">{diff.file}</span>
      </div>

      <motion.div
        className="flex flex-col gap-1.5 p-3 font-mono text-[11px] leading-relaxed"
        variants={staggerContainer}
        initial={reducedMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-20px" }}
      >
        <motion.div
          variants={diffLineReveal}
          className="diff-removed rounded px-2 py-1 text-[#ffb4bb]"
        >
          <span className="mr-2 text-[#ff5f57]">-</span>
          {diff.removed}
        </motion.div>
        <motion.div
          variants={diffLineReveal}
          className="diff-added rounded px-2 py-1 text-[#a7f3c4]"
        >
          <span className="mr-2 text-[#28c840]">+</span>
          {diff.added}
        </motion.div>
      </motion.div>

      <div className="flex items-center gap-1.5 border-t border-white/8 p-3">
        <button
          type="button"
          className="rounded-lg bg-accent px-3 py-1.5 text-[11px] font-medium text-white"
        >
          Accept
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/70"
        >
          Edit
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/70"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
