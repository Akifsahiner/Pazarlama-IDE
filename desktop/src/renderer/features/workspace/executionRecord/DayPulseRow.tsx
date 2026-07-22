import type { DayPulseView } from "@shared/measurementPulse";
import type { KpiTrendPoint } from "@shared/kpiTrendSeries";
import { hasTrendData } from "@shared/kpiTrendSeries";
import { Badge } from "@renderer/components/ui/Badge";
import { KpiTrendSparkline } from "./KpiTrendSparkline";
import { Ga4SyncChip } from "./Ga4SyncChip";

const VERDICT_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  promising: "ok",
  flat: "warn",
  insufficient_data: "neutral",
};

export function DayPulseRow({
  pulse,
  kpiTrend,
}: {
  pulse: DayPulseView;
  kpiTrend?: KpiTrendPoint[];
}) {
  if (!pulse.visible) return null;

  const pctOk = pulse.primaryKpi.pct != null && pulse.primaryKpi.pct >= 50;

  return (
    <div
      className="mt-4 rounded-[var(--radius-lg)] border border-line/80 bg-surface-2/30 px-4 py-3"
      data-testid="day-pulse-row"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-mini font-semibold uppercase tracking-wide text-text-3">
            {pulse.title}
          </span>
          <Badge tone={VERDICT_TONE[pulse.verdict] ?? "neutral"}>{pulse.verdict.replace("_", " ")}</Badge>
        </div>
        <Ga4SyncChip compact />
      </div>

      <div className="space-y-2 text-body-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-text">Primary:</span>
          <span
            className={
              pulse.primaryKpi.tone === "ok"
                ? "font-semibold text-ok"
                : pulse.primaryKpi.tone === "warn"
                  ? "text-warn"
                  : "text-text-3"
            }
            data-testid="day-pulse-primary-kpi"
          >
            {pulse.primaryKpi.display}
            {pctOk ? " ✅" : ""}
          </span>
          {kpiTrend && hasTrendData(kpiTrend) && <KpiTrendSparkline points={kpiTrend} />}
        </div>

        {pulse.leadingIndicator && (
          <p className="text-text-2" data-testid="day-pulse-leading">
            <span className="font-medium text-text">{pulse.leadingIndicator.label}:</span>{" "}
            {pulse.leadingIndicator.value}
          </p>
        )}

        {pulse.waitMessage && pulse.primaryKpi.tone === "missing" && (
          <p className="text-mini text-text-3">{pulse.waitMessage}</p>
        )}

        <p className="text-mini text-accent" data-testid="day-pulse-action">
          <span className="font-semibold text-text">Action:</span> {pulse.actionSuggestion}
        </p>

        {pulse.sourceUsed && (
          <p className="text-[10px] uppercase tracking-wide text-text-3">
            Source: {pulse.sourceUsed}
          </p>
        )}
      </div>
    </div>
  );
}
