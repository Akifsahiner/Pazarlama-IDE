import { brand } from "@/lib/tokens";
import type { IDETheme } from "@/lib/ide-themes";

type IDETitleBarProps = {
  theme: IDETheme;
};

export function IDETitleBar({ theme }: IDETitleBarProps) {
  return (
    <div
      className="flex items-center justify-between border-b border-white/8 px-3 py-2"
      style={{ background: theme.titleBarBg }}
    >
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </div>
      <span className="text-[11px] font-medium text-white/80">{brand.name}</span>
      <div className="w-12" />
    </div>
  );
}
