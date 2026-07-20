"use client";

import type { MouseEvent, PointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { IDEWindow } from "@/components/ide-ui/IDEWindow";
import { HeroDemoProvider } from "@/components/ide-ui/HeroDemoContext";
import { useHeroIDEDemo } from "@/components/ide-ui/useHeroIDEDemo";

export function HeroMockup() {
  const reducedMotion = useReducedMotion() ?? false;
  const demo = useHeroIDEDemo(true);

  const handleApproveClick = (e: MouseEvent | PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target?.closest("[data-hero-approve]")) return;
    e.preventDefault();
    e.stopPropagation();
    demo.approve();
  };

  return (
    <HeroDemoProvider demo={demo}>
      <div
        className="hero-mockup-zone w-full"
        onPointerDownCapture={handleApproveClick}
        onClickCapture={handleApproveClick}
      >
        <motion.div
          className="product-frame relative -mt-2 w-full md:-mt-4"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="product-frame__glow" aria-hidden="true" />
          <motion.div
            className="product-frame__inner"
            style={{ pointerEvents: "auto" }}
            animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
            transition={
              reducedMotion
                ? undefined
                : { duration: 7, ease: "easeInOut", repeat: Infinity, delay: 1.1 }
            }
          >
            <IDEWindow showThemePicker={false} demo={demo} />
          </motion.div>
        </motion.div>

        <p className="hero-mockup-hint mt-4 text-center font-mono text-[11px] tracking-[0.08em] text-white/55 uppercase">
          Click <span className="text-white/85">Approve plan</span> to run the demo
        </p>
      </div>
    </HeroDemoProvider>
  );
}
