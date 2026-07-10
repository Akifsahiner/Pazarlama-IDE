"use client";

import { useState } from "react";
import {
  defaultIDETheme,
  ideThemes,
  type IDETheme,
  type IDEThemeId,
} from "@/lib/ide-themes";
import { IDETitleBar } from "./IDETitleBar";
import { ProjectExplorer } from "./ProjectExplorer";
import { CanvasPanel } from "./CanvasPanel";
import { AgentPanel } from "./AgentPanel";
import { ActivityBar } from "./ActivityBar";
import { IDEThemePicker } from "./IDEThemePicker";
import { useHeroIDEDemo } from "./useHeroIDEDemo";

type IDEWindowProps = {
  showThemePicker?: boolean;
  initialTheme?: IDEThemeId;
  /** Hero landing demo — Approve plan triggers scripted UI sequence */
  interactive?: boolean;
};

export function IDEWindow({
  showThemePicker = true,
  initialTheme = defaultIDETheme,
  interactive = false,
}: IDEWindowProps) {
  const [themeId, setThemeId] = useState<IDEThemeId>(initialTheme);
  const theme: IDETheme = ideThemes[themeId];
  const demo = useHeroIDEDemo(interactive);

  return (
    <div className="ide-shell flex w-full flex-col">
      <div className={`ide-wallpaper ${theme.wallpaperClass}`} aria-hidden="true" />

      <div className="relative flex min-h-[400px] flex-col">
        <IDETitleBar theme={theme} />

        {showThemePicker && (
          <IDEThemePicker active={themeId} onChange={setThemeId} />
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[minmax(180px,0.9fr)_1.6fr] lg:grid-cols-[minmax(190px,0.85fr)_1.6fr_minmax(200px,0.95fr)]">
          <div
            className="ide-glass-sidebar hidden min-h-[280px] sm:block"
            style={{
              background: theme.sidebarBg,
              backdropFilter:
                theme.blur !== "0px" ? `blur(${theme.blur})` : undefined,
            }}
          >
            <ProjectExplorer theme={theme} />
          </div>

          <div
            className="ide-glass-panel min-h-[220px]"
            style={{
              background: theme.editorBg,
              backdropFilter:
                theme.blur !== "0px" ? `blur(${theme.blur})` : undefined,
            }}
          >
            <CanvasPanel theme={theme} demo={demo} />
          </div>

          <div
            className="ide-glass-panel hidden min-h-[280px] border-l border-white/6 lg:block"
            style={{
              background: theme.agentBg,
              backdropFilter:
                theme.blur !== "0px" ? `blur(${theme.blur})` : undefined,
            }}
          >
            <AgentPanel theme={theme} demo={demo} />
          </div>
        </div>

        <ActivityBar theme={theme} demo={demo} />
      </div>
    </div>
  );
}
