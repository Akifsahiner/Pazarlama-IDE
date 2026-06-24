"use client";

import type { IDEThemeId } from "@/lib/ide-themes";
import { ideThemes } from "@/lib/ide-themes";

type IDEThemePickerProps = {
  active: IDEThemeId;
  onChange: (id: IDEThemeId) => void;
};

export function IDEThemePicker({ active, onChange }: IDEThemePickerProps) {
  return (
    <div className="absolute top-2 right-3 z-20 flex items-center gap-1">
      {(Object.keys(ideThemes) as IDEThemeId[]).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`ide-theme-pill rounded-full px-2 py-0.5 text-[9px] font-medium text-white/75 ${
            active === id ? "ide-theme-pill--active text-white" : ""
          }`}
          aria-pressed={active === id}
        >
          {ideThemes[id].label}
        </button>
      ))}
    </div>
  );
}
