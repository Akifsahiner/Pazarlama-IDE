"use client";

import { useEffect, useState } from "react";
import {
  DOWNLOAD_OPTIONS,
  detectDownloadPlatform,
  resolveDownloadTarget,
  type DownloadPlatform,
} from "@/lib/download";
import { PlatformDownloadButton } from "./PlatformDownloadButton";
import { platformIcon } from "./PlatformIcons";

const REQUIREMENTS: Record<DownloadPlatform, string[]> = {
  windows: ["Windows 10/11", "x64 (64-bit)", "8 GB RAM recommended", "500 MB disk space"],
  macos: ["macOS 12 Monterey or later", "Apple Silicon or Intel (universal)", "8 GB RAM recommended"],
  linux: ["Ubuntu 22.04+ or equivalent", "x64", "AppImage — chmod +x then run"],
  unknown: [],
};

export function DownloadPageClient() {
  const [platform, setPlatform] = useState<DownloadPlatform>("unknown");

  useEffect(() => {
    setPlatform(detectDownloadPlatform(navigator.userAgent, navigator.platform));
  }, []);

  const primary = resolveDownloadTarget(platform);

  return (
    <div className="mt-10 space-y-8">
      <div className="flex justify-center">
        <PlatformDownloadButton animated={false} className="shimmer-button--hero" />
      </div>

      <ul className="mx-auto max-w-md space-y-3 text-left">
        {DOWNLOAD_OPTIONS.map((opt) => {
          const active = opt.platform === primary.platform;
          return (
            <li
              key={opt.platform}
              className={`rounded-2xl border p-4 transition-colors ${
                active ? "border-accent/40 bg-accent-soft/30" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-ink">{platformIcon(opt.platform)}</span>
                  <span className="font-medium text-ink">{opt.shortLabel}</span>
                  {active && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                      Your device
                    </span>
                  )}
                </div>
                <a
                  href={opt.href}
                  className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90"
                >
                  Download
                </a>
              </div>
              <ul className="mt-2 space-y-0.5 pl-6 text-[13px] text-ink-2">
                {(REQUIREMENTS[opt.platform] ?? []).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
