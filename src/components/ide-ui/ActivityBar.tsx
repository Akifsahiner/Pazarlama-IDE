"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { activityLog } from "@/lib/tokens";
import { heroDemoActivity } from "@/lib/hero-ide-demo";
import type { HeroIDEDemoState } from "@/components/ide-ui/useHeroIDEDemo";
import type { TimelinePreset } from "@/lib/timeline-ide-presets";
import type { IDETheme } from "@/lib/ide-themes";

type ActivityBarProps = {
  theme: IDETheme;
  demo?: HeroIDEDemoState | null;
  preset?: TimelinePreset | null;
};

export function ActivityBar({ theme, demo, preset }: ActivityBarProps) {
  const approved = demo?.phase === "approved" || preset?.statusTone === "success";
  const approving = demo?.phase === "approving" || preset?.statusTone === "working";

  const lines = preset?.activityLines ?? (demo
    ? approved
      ? heroDemoActivity.approved.slice(0, 2)
      : heroDemoActivity.idle
    : activityLog.slice(0, 2));

  const statusText = preset?.statusText ?? demo?.statusText ?? "Waiting for approval";

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/8 px-3 py-2 font-mono"
      style={{ background: theme.titleBarBg }}
    >
      {lines.map((line) => (
        <span key={line} className="flex items-center gap-1.5 text-[9px] text-white/60">
          <Check className="size-2.5 text-[#6BCB77]" />
          {line}
        </span>
      ))}

      <span
        className={`flex items-center gap-1.5 text-[9px] ${
          approved ? "text-[#8ee09a]" : approving ? "text-[#7eb8ff]" : "text-[#febc2e]/85"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${
            approved ? "bg-[#6BCB77]" : approving ? "animate-pulse bg-[#7eb8ff]" : "animate-pulse bg-[#febc2e]"
          }`}
        />
        {statusText}
      </span>
    </div>
  );
}
