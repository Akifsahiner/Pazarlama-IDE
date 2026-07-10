import { ChevronDown, FileText, Folder } from "lucide-react";
import { projectTree } from "@/lib/tokens";
import type { IDETheme } from "@/lib/ide-themes";

const ACTIVE_ITEM = "Launch plan";

type ProjectExplorerProps = {
  theme: IDETheme;
};

export function ProjectExplorer({ theme }: ProjectExplorerProps) {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <span className="text-[10px] font-semibold tracking-widest text-white/50 uppercase">
        Explorer
      </span>
      <div className="flex flex-col gap-2.5">
        {projectTree.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
              <ChevronDown className="size-3 text-white/50" />
              <Folder className="size-3 text-accent" />
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5 pl-5">
              {group.children.map((child) => {
                const isActive = child === ACTIVE_ITEM;
                return (
                  <span
                    key={child}
                    className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] ${
                      isActive ? "font-medium" : "text-white/55"
                    }`}
                    style={
                      isActive
                        ? {
                            background: theme.activeItemBg,
                            color: theme.activeItemText,
                          }
                        : undefined
                    }
                  >
                    <FileText className="size-2.5 shrink-0 opacity-60" />
                    {child}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
