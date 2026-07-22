import type { DayPulseView, PulseCheckpointDay } from "@shared/measurementPulse";
import type { KpiTrendPoint } from "@shared/kpiTrendSeries";
import { hasTrendData } from "@shared/kpiTrendSeries";
import type { CommandSurfaceAction } from "@shared/cmoCommandSurface";
import { Badge } from "@renderer/components/ui/Badge";
import { KpiTrendSparkline } from "./KpiTrendSparkline";
import { Ga4SyncChip } from "./Ga4SyncChip";

const VERDICT_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  promising: "ok",
  flat: "warn",
  insufficient_data: "neutral",
};

const CHECKPOINTS: PulseCheckpointDay[] = [3, 5, 7];

export function DayPulseRow({
  pulse,
  kpiTrend,
  compact = false,
  pulseAction,
  onPulseAction,
}: {
  pulse: DayPulseView;
  kpiTrend?: KpiTrendPoint[];
  compact?: boolean;
  pulseAction?: CommandSurfaceAction | null;
  onPulseAction?: () => void;
}) {
  if (!pulse.visible) return null;

  const pctOk = pulse.primaryKpi.pct != null && pulse.primaryKpi.pct >= 50;

  if (compact) {
    return (
      <div
        className="mt-2 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-line/60 bg-surface-2/30 px-3 py-2"
        data-testid="day-pulse-row"
        data-compact="true"
      >
        <span className="text-micro font-semibold uppercase tracking-wide text-text-3">
          {pulse.title}
        </span>
        <span
          className={`text-mini font-semibold tabular-nums ${pctOk ? "text-ok" : "text-text-2"}`}
          data-testid="day-pulse-primary-kpi"
        >
          {pulse.primaryKpi.display}
        </span>
        <Badge tone={VERDICT_TONE[pulse.verdict] ?? "neutral"}>{pulse.verdict.replace("_", " ")}</Badge>
        <Ga4SyncChip compact />
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded-[var(--radius-lg)] border border-line/80 bg-surface-2/30 px-4 py-3"
      data-testid="day-pulse-row"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1" data-testid="day-pulse-checkpoint">
            {CHECKPOINTS.map((cp) => (
              <span
                key={cp}
                className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  cp === pulse.checkpoint
                    ? "bg-accent/15 text-accent"
                    : cp < pulse.checkpoint
                      ? "text-text-3"
                      : "text-text-3/50"
                }`}
              >
                Day {cp}
              </span>
            ))}
          </div>
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
          <p className="text-mini text-text-3" data-testid="day-pulse-wait">
            {pulse.waitMessage}
          </p>
        )}

        <p className="text-mini text-accent" data-testid="day-pulse-action">
          <span className="font-semibold text-text">Action:</span> {pulse.actionSuggestion}
          {pulseAction && pulseAction.kind !== "none" && onPulseAction && (
            <button
              type="button"
              onClick={onPulseAction}
              className="ml-2 rounded-[var(--radius-sm)] border border-accent/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent hover:bg-accent/10"
              data-testid="day-pulse-action-cta"
            >
              Go
            </button>
          )}
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
