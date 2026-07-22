import { useMemo, useState } from "react";
import { Target, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { evaluateDayPulse, resolvePulseKpiPresetId } from "@shared/measurementPulse";
import { evaluateWeek1MetricsWithGa4Priority } from "@shared/cmoProofLoop";
import { KPI_PRESETS } from "@shared/kpiPresets";
import { Button } from "@renderer/components/ui/Button";

/** Mandatory Day 3/5/7 ritual — one answer, one metric, blocks ops until complete. */
export function DayPulseRitualModal() {
  const open = useApp((s) => s.pulseRitualOpen);
  const checkpoint = useApp((s) => s.pulseRitualCheckpoint ?? 3);
  const closePulseRitual = useApp((s) => s.closePulseRitual);
  const completePulseCheckpoint = useApp((s) => s.completePulseCheckpoint);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const channelThesis = useApp((s) => s.channelThesis ?? marketingProfile?.channel_thesis);
  const distributionOperator = useApp(
    (s) => s.distributionOperator ?? marketingProfile?.distribution_operator,
  );

  const [answer, setAnswer] = useState<"yes" | "no" | "">("");
  const [metricValue, setMetricValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pulse = useMemo(() => {
    if (!opsCadence) return null;
    return evaluateDayPulse({
      cadence: opsCadence,
      profile: marketingProfile,
      thesis: channelThesis,
      distributionOperator,
    });
  }, [channelThesis, distributionOperator, marketingProfile, opsCadence]);

  const presetId = useMemo(() => {
    if (!opsCadence) return "targeted_visitors";
    const assessment = evaluateWeek1MetricsWithGa4Priority(
      opsCadence,
      marketingProfile,
      channelThesis,
      distributionOperator,
    );
    return resolvePulseKpiPresetId(opsCadence, assessment);
  }, [channelThesis, distributionOperator, marketingProfile, opsCadence]);

  const preset = KPI_PRESETS.find((p) => p.id === presetId);

  if (!open || !opsCadence) return null;

  const submit = () => {
    if (answer !== "yes" && answer !== "no") {
      setError("Pick yes or no — did the metric move?");
      return;
    }
    const num = metricValue.trim() ? Number(metricValue) : undefined;
    if (answer === "yes" && (num == null || Number.isNaN(num))) {
      setError("Enter one number when the answer is yes.");
      return;
    }
    const err = completePulseCheckpoint({
      checkpoint,
      answer,
      metric_value: Number.isFinite(num) ? num : undefined,
      metric_preset_id: presetId,
    });
    if (err) {
      setError(err);
      return;
    }
    setAnswer("");
    setMetricValue("");
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/85 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="day-pulse-ritual-modal"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-accent/40 bg-surface p-5 shadow-[var(--shadow-3)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-accent" />
            <h2 className="text-body font-semibold text-text">
              Day {checkpoint} pulse — required
            </h2>
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={closePulseRitual} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-body-sm text-text" data-testid="day-pulse-ritual-question">
          {pulse?.ritualQuestion ?? `Did ${preset?.name ?? "your primary KPI"} move toward target?`}
        </p>
        <p className="mt-1 text-mini text-text-3">One metric only — no dashboard essay.</p>

        <div className="mt-4 flex gap-2">
          <Button
            variant={answer === "yes" ? "primary" : "secondary"}
            size="sm"
            data-testid="day-pulse-answer-yes"
            onClick={() => setAnswer("yes")}
          >
            Yes
          </Button>
          <Button
            variant={answer === "no" ? "primary" : "secondary"}
            size="sm"
            data-testid="day-pulse-answer-no"
            onClick={() => setAnswer("no")}
          >
            No
          </Button>
        </div>

        {answer === "yes" && (
          <div className="mt-4">
            <label className="text-mini font-semibold text-text-3">
              {preset?.name ?? "Primary metric"}
            </label>
            <input
              type="number"
              value={metricValue}
              onChange={(e) => setMetricValue(e.target.value)}
              placeholder={preset?.defaultTarget != null ? `e.g. ${preset.defaultTarget}` : "One number"}
              className="mt-1 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body-sm"
              data-testid="day-pulse-metric-input"
            />
          </div>
        )}

        {error && <p className="mt-3 text-mini text-warn">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="subtle" size="sm" onClick={closePulseRitual}>
            Later today
          </Button>
          <Button variant="primary" size="sm" data-testid="day-pulse-ritual-submit" onClick={submit}>
            Record pulse
          </Button>
        </div>
      </div>
    </div>
  );
}
