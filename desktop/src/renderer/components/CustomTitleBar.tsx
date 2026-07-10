import { useEffect, useState } from "react";
import { Command, Copy, Minus, Square, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { ProjectSwitcher } from "@renderer/features/workspace/ProjectSwitcher";
import { Kbd } from "@renderer/components/ui/Kbd";
import logoUrl from "@renderer/assets/logo.png";

function ChromeButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`app-no-drag flex h-full w-11 items-center justify-center text-text-2 transition-colors hover:text-text ${
        danger ? "hover:bg-danger/90 hover:text-white" : "hover:bg-elevated"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Window chrome. Single-story rule: connection/provider status lives in the
 * StatusBar only — the title bar carries brand, project, palette, and window
 * controls.
 */
export function CustomTitleBar() {
  const togglePalette = useApp((s) => s.togglePalette);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.api.chrome.isMaximized().then(setMaximized);
    return window.api.chrome.onMaximizeChange(setMaximized);
  }, []);

  return (
    <header
      className="app-drag relative z-20 flex items-center justify-between border-b border-line bg-surface"
      style={{ height: "var(--titlebar-h)" }}
    >
      <div className="flex items-center gap-2 pl-3">
        <img src={logoUrl} alt="" className="h-[18px] w-[18px] rounded-[4px]" />
        <span className="text-mini font-medium tracking-tight text-text/90">Marketing IDE</span>
        <ProjectSwitcher />
      </div>

      <button
        onClick={() => togglePalette(true)}
        className="app-no-drag absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text md:flex"
      >
        <Command size={12} />
        <span>Command palette</span>
        <Kbd>Ctrl K</Kbd>
      </button>

      <div className="flex h-full items-center">
        <ChromeButton label="Minimize" onClick={() => window.api.chrome.minimize()}>
          <Minus size={15} />
        </ChromeButton>
        <ChromeButton label="Maximize" onClick={() => window.api.chrome.maximize()}>
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </ChromeButton>
        <ChromeButton label="Close" danger onClick={() => window.api.chrome.close()}>
          <X size={16} />
        </ChromeButton>
      </div>
    </header>
  );
}
