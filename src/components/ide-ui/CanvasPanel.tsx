"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { sections } from "@/lib/tokens";
import { HERO_DEMO_WEEKS_INITIAL } from "@/lib/hero-ide-demo";
import type { HeroIDEDemoState } from "@/components/ide-ui/useHeroIDEDemo";
import type { TimelinePreset } from "@/lib/timeline-ide-presets";
import { readiness, snapshotRows } from "@/lib/timeline-ide-presets";
import type { IDETheme } from "@/lib/ide-themes";

const weekLabels = [
  "Week 1 — Foundation",
  "Week 2 — Assets",
  "Week 3 — Distribution",
  "Week 4 — Launch",
] as const;

type CanvasPanelProps = {
  theme: IDETheme;
  demo?: HeroIDEDemoState | null;
  preset?: TimelinePreset | null;
};

function readinessColor(score: number) {
  if (score >= 70) return "#6BCB77";
  if (score >= 45) return "#E5B566";
  return "rgba(255,255,255,0.45)";
}

export function CanvasPanel({ theme, demo, preset }: CanvasPanelProps) {
  const { taskGraph } = sections.workspace;
  const isGlass = theme.blur !== "0px";
  const weekProgress = preset?.weekProgress ?? demo?.weekProgress ?? [...HERO_DEMO_WEEKS_INITIAL];
  const activeTaskIndex = preset?.activeTaskIndex ?? demo?.activeTaskIndex ?? -1;
  const approved = demo?.phase === "approved" || preset?.statusTone === "success";
  const view = preset?.view ?? "plan";

  if (view === "snapshot") {
    const rows = snapshotRows();
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <span className="text-[11px] font-semibold text-white/90">Product snapshot</span>
        <dl className="flex flex-col gap-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2 border-b border-white/8 pb-1.5">
              <dt className="text-[9px] text-white/50">{label}</dt>
              <dd className="text-[10px] font-medium text-white/90">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  if (view === "readiness") {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <span className="text-[11px] font-semibold text-white/90">Launch readiness</span>
        <div className="flex flex-col gap-2">
          {readiness.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-white/65">{item.label}</span>
                <span style={{ color: readinessColor(item.score) }}>{item.score}</span>
              </div>
              <div className={`h-1 overflow-hidden rounded-full ${isGlass ? "bg-black/25" : "bg-white/10"}`}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.score}%`, backgroundColor: readinessColor(item.score) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white/90">Launch plan</span>
        <motion.span
          animate={
            approved
              ? { scale: [1, 1.06, 1], backgroundColor: "rgba(107, 203, 119, 0.28)" }
              : { scale: 1 }
          }
          transition={{ duration: 0.5 }}
          className="rounded-full bg-[#6BCB77]/20 px-2 py-0.5 text-[9px] font-medium text-[#8ee09a]"
        >
          {approved ? "In progress" : "30-day"}
        </motion.span>
      </div>

      <div className="flex flex-col gap-2.5">
        {weekLabels.map((label, index) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[10px] text-white/65">{label}</span>
            <div className={`h-1.5 overflow-hidden rounded-full ${isGlass ? "bg-black/25" : "bg-white/10"}`}>
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#1d4ed8] to-[#3c83f6]"
                initial={false}
                animate={{ width: `${weekProgress[index]}%` }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
        {taskGraph.map((task, i) => {
          const active = i === activeTaskIndex;
          return (
            <div key={task} className="flex items-center gap-1.5">
              <motion.span
                animate={active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-medium ${
                  active
                    ? "border border-[#6BCB77]/40 bg-[#6BCB77]/20 text-[#b8f5c8]"
                    : `text-white/80 ${isGlass ? "bg-black/30" : "bg-white/8"}`
                }`}
              >
                {active ? <Check className="size-2.5" aria-hidden="true" /> : null}
                {task}
              </motion.span>
              {i < taskGraph.length - 1 && <span className="text-[9px] text-white/35">→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
