"use client";

import { OtherDownloads } from "@/components/download/OtherDownloads";
import { PlatformDownloadButton } from "@/components/download/PlatformDownloadButton";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { heroCopy } from "@/lib/tokens";

export function HeroCTA() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <PlatformDownloadButton id="download-button" animated={false} className="shimmer-button--hero" />
        <a
          href="#first-run"
          className="hero-secondary-cta rounded-full border px-5 py-2.5 text-[14px] font-medium backdrop-blur-xl transition-colors"
        >
          {heroCopy.secondaryCta}
        </a>
      </div>
      <OtherDownloads tone="hero" />
      <TrustStrip tone="hero" />
    </div>
  );
}
