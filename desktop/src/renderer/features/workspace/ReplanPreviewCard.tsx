import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import type { GrowthMemoryState } from "@shared/cmoGrowthMemory";
import { Badge } from "@renderer/components/ui/Badge";

export function ReplanPreviewCard({
  preview,
}: {
  preview: NonNullable<GrowthMemoryState["pending_replan"]>;
}) {
  return (
    <div
      className="mt-3 rounded-[var(--radius-md)] border border-accent/30 bg-accent-soft/10 p-3"
      data-testid="replan-preview-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {preview.mode === "double_down" ? (
            <Sparkles size={13} className="text-accent" />
          ) : (
            <RefreshCw size={13} className="text-warn" />
          )}
          <div>
            <p className="text-mini font-semibold text-text">{preview.headline}</p>
            <p className="mt-0.5 text-[10px] text-text-3">
              Evidence-backed preview — starting next week applies these changes.
            </p>
          </div>
        </div>
        <Badge tone={preview.mode === "double_down" ? "ok" : "warn"}>
          {preview.mode === "double_down" ? "Double down" : "Pivot"}
        </Badge>
      </div>

      <ul className="mt-2 space-y-1">
        {preview.ops_mutations.slice(0, 3).map((mutation) => (
          <li key={`${mutation.priority_index}.${mutation.what}`} className="flex gap-1.5 text-[10px] text-text-2">
            <ArrowRight size={10} className="mt-0.5 shrink-0 text-accent" />
            <span>
              <span className="font-medium text-text">P{mutation.priority_index + 1}</span>{" "}
              {mutation.what}
            </span>
          </li>
        ))}
      </ul>

      {!!preview.budget_mutations?.length && (
        <div className="mt-2 rounded border border-line bg-surface/60 p-2">
          <p className="text-[10px] font-semibold uppercase text-text-3">
            Budget reallocation · {preview.budget_hints?.confidence ?? "assumption"}
          </p>
          <ul className="mt-1 space-y-1">
            {preview.budget_mutations.map((mutation) => (
              <li key={mutation.bucket_id} className="text-[10px] text-text-2">
                {mutation.bucket_id.replace(/_/g, " ")}: {mutation.from_pct}% → {mutation.to_pct}% · {mutation.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.product_hints && (
        <div className="mt-2 rounded border border-warn/25 bg-warn-soft/10 p-2">
          <p className="text-[10px] font-semibold uppercase text-warn">
            Product loop · {preview.product_hints.confidence}
          </p>
          <p className="mt-1 text-[10px] text-text-2">{preview.product_hints.reason}</p>
        </div>
      )}

      {preview.revenue_hints && preview.revenue_hints.hints.length > 0 && (
        <div className="mt-2 rounded border border-accent/25 bg-accent-soft/10 p-2">
          <p className="text-[10px] font-semibold uppercase text-accent">
            Revenue plane · {preview.revenue_hints.confidence}
          </p>
          <ul className="mt-1 space-y-1">
            {preview.revenue_hints.hints.map((hint) => (
              <li key={hint.headline} className="text-[10px] text-text-2">
                {hint.headline}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.engine_hints && preview.engine_hints.length > 0 && (
        <div className="mt-2 rounded border border-warn/25 bg-warn-soft/10 p-2">
          <p className="text-[10px] font-semibold uppercase text-warn">Mechanism watch</p>
          <ul className="mt-1 space-y-1">
            {preview.engine_hints.map((hint) => (
              <li key={hint.rationale} className="text-[10px] text-text-2">
                {hint.rationale}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.rationale.length > 0 && (
        <p className="mt-2 text-[10px] text-text-3">{preview.rationale.join(" · ")}</p>
      )}
    </div>
  );
}
