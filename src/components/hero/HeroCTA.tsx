"use client";

import { motion, useReducedMotion } from "framer-motion";
import { OtherDownloads } from "@/components/download/OtherDownloads";
import { PlatformDownloadButton } from "@/components/download/PlatformDownloadButton";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { heroCopy } from "@/lib/tokens";

export function HeroCTA() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className="flex flex-col items-center gap-5"
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <PlatformDownloadButton id="download-button" animated className="shimmer-button--hero" />
        <a
          href="#first-run"
          className="hero-secondary-cta rounded-full border border-white/34 bg-white/16 px-5 py-2.5 text-[14px] font-medium shadow-[0_4px_24px_rgba(8,48,96,0.14)] backdrop-blur-xl transition-colors hover:bg-white/24"
        >
          {heroCopy.secondaryCta}
        </a>
      </div>
      <OtherDownloads tone="hero" />
      <TrustStrip tone="hero" />
    </motion.div>
  );
}
