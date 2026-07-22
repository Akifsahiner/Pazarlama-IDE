import { CheckCircle2 } from "lucide-react";
import { shipPipelineStepLabel, type ShipPipelineStage } from "@shared/shipPipeline";
import { useApp } from "@renderer/state/store";

const STAGES: ShipPipelineStage[] = [
  "run",
  "diff",
  "approval",
  "apply",
  "preview",
  "verify",
  "done",
];

export function ShipPipelineBar() {
  const stage = useApp((s) => s.shipPipeline?.stage ?? "idle");
  if (stage === "idle") return null;

  const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);

  return (
    <div
      className="border-b border-line bg-surface-2/80 px-4 py-2 backdrop-blur-sm"
      data-testid="ship-pipeline-bar"
      role="status"
      aria-label="Ship pipeline progress"
    >
      <div className="flex flex-wrap items-center gap-2">
        {STAGES.map((s, i) => {
          const done = idx > i || stage === "done";
          const active = s === stage || (stage === "failed" && s === "apply");
          return (
            <span key={s} className="flex items-center gap-1 text-[10px]">
              {i > 0 && <span className="text-text-3">→</span>}
              <span
                className={
                  done
                    ? "font-semibold text-ok"
                    : active
                      ? "font-semibold text-accent"
                      : "text-text-3"
                }
              >
                {done && <CheckCircle2 size={10} className="mr-0.5 inline" />}
                {shipPipelineStepLabel(s)}
              </span>
            </span>
          );
        })}
        {stage === "failed" && (
          <span className="text-[10px] font-semibold text-warn"> · Recovery available</span>
        )}
      </div>
    </div>
  );
}
