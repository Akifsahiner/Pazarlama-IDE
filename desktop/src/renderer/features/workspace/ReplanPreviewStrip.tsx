import { ArrowRight, RefreshCw } from "lucide-react";
import type { CmoIntakeDelta } from "@shared/cmoContinuous";
import type { GrowthMemoryState } from "@shared/cmoGrowthMemory";
import { Badge } from "@renderer/components/ui/Badge";

export function ReplanPreviewStrip({
  delta,
  preview,
}: {
  delta?: CmoIntakeDelta | null;
  preview?: GrowthMemoryState["pending_replan"];
}) {
  if (!delta && !preview) return null;

  const headline = preview?.headline ?? delta?.headline;
  const mode = preview?.mode ?? (delta?.thesis_changed ? "pivot" : "double_down");
  const kpi = delta?.kpi_movement;
  const kpiDelta =
    kpi && kpi.before != null && kpi.after != null && kpi.before !== kpi.after
      ? `${kpi.before} → ${kpi.after}`
      : kpi?.after != null
        ? String(kpi.after)
        : undefined;

  return (
    <div
      data-testid="replan-preview-strip"
      className="mt-3 rounded-[var(--radius-md)] border border-accent/25 bg-accent-soft/10 px-3 py-2"
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <RefreshCw size={13} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-mini font-medium text-text">{headline}</p>
            {(preview?.rationale[0] ?? delta?.rationale[0]) && (
              <p className="mt-0.5 text-micro text-text-2">
                {preview?.rationale[0] ?? delta?.rationale[0]}
              </p>
            )}
          </div>
        </div>
        <Badge tone={mode === "double_down" ? "ok" : "warn"}>
          {mode === "double_down" ? "Double down" : "Pivot"}
        </Badge>
      </div>

      {kpiDelta && (
        <p className="mt-1.5 text-[10px] text-text-2">
          KPI WoW: {kpiDelta}
          {kpi?.pct_of_target != null ? ` · ${kpi.pct_of_target}% of target` : ""}
        </p>
      )}

      {preview?.ops_mutations?.[0] && (
        <p className="mt-1.5 flex items-start gap-1 text-[10px] text-text-2">
          <ArrowRight size={10} className="mt-0.5 shrink-0 text-accent" />
          <span>
            Next ops: {preview.ops_mutations[0].what}
          </span>
        </p>
      )}
    </div>
  );
}
