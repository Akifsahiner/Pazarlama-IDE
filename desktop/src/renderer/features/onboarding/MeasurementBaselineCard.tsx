import { useState } from "react";
import { BarChart3, CheckCircle2, Settings } from "lucide-react";
import { assessMeasurementBaseline } from "@shared/measurementBaseline";
import { KPI_PRESETS } from "@shared/kpiPresets";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { useApp } from "@renderer/state/store";

export function MeasurementBaselineCard({
  onDismiss,
  compact,
}: {
  onDismiss?: () => void;
  compact?: boolean;
}) {
  const profile = useApp((s) => s.marketingProfile);
  const project = useApp((s) => s.project);
  const channelThesis = useApp((s) => s.channelThesis ?? profile?.channel_thesis);
  const assessment = assessMeasurementBaseline(profile, project);
  const upsertManualKpi = useApp((s) => s.upsertManualKpi);
  const navigate = useApp((s) => s.navigate);
  const acknowledgeMeasurementBaseline = useApp((s) => s.acknowledgeMeasurementBaseline);
  const [manualValue, setManualValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (assessment.ready) return null;

  const preset =
    KPI_PRESETS.find((p) => p.id === "targeted_visitors") ?? KPI_PRESETS[0];

  const handleManualBaseline = () => {
    const value = Number(manualValue);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a zero or positive number for your baseline.");
      return;
    }
    if (!preset) return;
    upsertManualKpi({
      id: preset.id,
      name: preset.name,
      value,
      target: preset.defaultTarget,
      unit: preset.unit,
      updated_at: new Date().toISOString(),
      source: "manual",
    });
    setError(null);
    onDismiss?.();
  };

  return (
    <Card
      className={compact ? "border-accent/25 p-4" : "mt-4 border-accent/25 p-5"}
      data-testid="measurement-baseline-card"
      role="region"
      aria-label="Measurement baseline setup"
    >
      <div className="flex items-start gap-2">
        <BarChart3 size={16} className="mt-0.5 text-accent" />
        <div>
          <h3 className="text-body-sm font-semibold text-text">Measure before Week 1</h3>
          <p className="mt-1 text-mini text-text-2">
            {channelThesis?.title ?? "Your thesis"} needs a baseline — GA4 preferred, manual KPI
            always accepted.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {assessment.missing.map((m) => (
          <li key={m} className="text-[10px] text-text-3">
            · {m}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Settings size={12} />}
          data-testid="measurement-baseline-ga4"
          onClick={() => navigate("settings")}
        >
          Connect GA4
        </Button>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[10px] font-medium text-text-3">
            Manual baseline — {preset?.label ?? "Primary KPI"}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              className="flex-1 rounded-[var(--radius-md)] border border-line bg-surface-2 px-2 py-1.5 text-body-sm"
              placeholder={preset?.defaultTarget != null ? String(preset.defaultTarget) : "42"}
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              data-testid="measurement-baseline-manual-input"
            />
            <Button
              variant="primary"
              size="sm"
              data-testid="measurement-baseline-manual-save"
              onClick={handleManualBaseline}
            >
              Log baseline
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<CheckCircle2 size={12} />}
          data-testid="measurement-baseline-ack"
          onClick={() => {
            acknowledgeMeasurementBaseline("I'll log KPIs manually this week");
            onDismiss?.();
          }}
        >
          I&apos;ll log manually this week
        </Button>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-mini text-warn" data-testid="measurement-baseline-error">
          {error}
        </p>
      )}
    </Card>
  );
}
