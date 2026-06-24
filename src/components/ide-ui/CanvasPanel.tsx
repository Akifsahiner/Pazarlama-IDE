import { sections } from "@/lib/tokens";
import type { IDETheme } from "@/lib/ide-themes";

const weeks = [
  { label: "Week 1 — Foundation", progress: 100 },
  { label: "Week 2 — Assets", progress: 70 },
  { label: "Week 3 — Distribution", progress: 35 },
  { label: "Week 4 — Launch", progress: 10 },
];

type CanvasPanelProps = {
  theme: IDETheme;
};

export function CanvasPanel({ theme }: CanvasPanelProps) {
  const { taskGraph } = sections.workspace;
  const isGlass = theme.blur !== "0px";

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white/90">Launch plan</span>
        <span className="rounded-full bg-[#6BCB77]/20 px-2 py-0.5 text-[9px] font-medium text-[#8ee09a]">
          30-day
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {weeks.map((week) => (
          <div key={week.label} className="flex flex-col gap-1">
            <span className="text-[10px] text-white/65">{week.label}</span>
            <div
              className={`h-1.5 overflow-hidden rounded-full ${isGlass ? "bg-black/25" : "bg-white/10"}`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#497ee9] to-[#749cff]"
                style={{ width: `${week.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
        {taskGraph.map((task, i) => (
          <div key={task} className="flex items-center gap-1.5">
            <span
              className={`rounded-md px-2 py-1 text-[9px] font-medium text-white/80 ${
                isGlass ? "bg-black/30" : "bg-white/8"
              }`}
            >
              {task}
            </span>
            {i < taskGraph.length - 1 && (
              <span className="text-[9px] text-white/35">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
