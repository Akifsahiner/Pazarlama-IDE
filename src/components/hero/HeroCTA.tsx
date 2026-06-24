"use client";

import { ShimmerButton } from "@/components/ui/ShimmerButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { heroCopy } from "@/lib/tokens";

export function HeroCTA() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <ShimmerButton label={heroCopy.cta} id="download-button" />
        <GhostButton label={heroCopy.secondaryCta} />
      </div>
      <TrustStrip />
    </div>
  );
}
