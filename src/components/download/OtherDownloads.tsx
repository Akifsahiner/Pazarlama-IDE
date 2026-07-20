"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  detectDownloadPlatform,
  otherDownloadOptions,
  RELEASE_LATEST,
  type DownloadPlatform,
} from "@/lib/download";
import { platformIcon } from "./PlatformIcons";

type Tone = "hero" | "light";

export function OtherDownloads({ tone = "hero" }: { tone?: Tone }) {
  const [platform, setPlatform] = useState<DownloadPlatform>("unknown");

  useEffect(() => {
    setPlatform(detectDownloadPlatform(navigator.userAgent, navigator.platform));
  }, []);

  const others = otherDownloadOptions(platform);
  if (others.length === 0) return null;

  const linkClass =
    tone === "hero"
      ? "hero-other-downloads__pill"
      : "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

  return (
    <div className="flex flex-col items-center gap-2">
      <p className={`text-[12px] ${tone === "hero" ? "text-white/70" : "text-ink-3"}`}>
        Also available for
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {others.map((opt) => (
          <a key={opt.platform} href={opt.href} className={linkClass}>
            {platformIcon(opt.platform)}
            {opt.shortLabel}
          </a>
        ))}
        <Link
          href="/download"
          className={tone === "hero" ? "text-[12px] text-white/60 underline-offset-2 hover:text-white hover:underline" : "text-[12px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"}
        >
          All builds
        </Link>
      </div>
      {platform === "unknown" && (
        <a
          href={RELEASE_LATEST}
          className={`text-[11px] ${tone === "hero" ? "text-white/50 hover:text-white/80" : "text-ink-3 hover:text-ink"}`}
        >
          View all releases on GitHub
        </a>
      )}
    </div>
  );
}
