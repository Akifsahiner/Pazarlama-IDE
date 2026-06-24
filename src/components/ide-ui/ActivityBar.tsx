import { Check } from "lucide-react";
import { activityLog } from "@/lib/tokens";
import type { IDETheme } from "@/lib/ide-themes";

type ActivityBarProps = {
  theme: IDETheme;
};

export function ActivityBar({ theme }: ActivityBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/8 px-3 py-2 font-mono"
      style={{ background: theme.titleBarBg }}
    >
      {activityLog.slice(0, 2).map((line) => (
        <span key={line} className="flex items-center gap-1.5 text-[9px] text-white/60">
          <Check className="size-2.5 text-[#6BCB77]" />
          {line}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-[9px] text-[#febc2e]/85">
        <span className="size-1.5 animate-pulse rounded-full bg-[#febc2e]" />
        Waiting for approval
      </span>
    </div>
  );
}
