import { useEffect, useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";
import type { ExperimentRun } from "@shared/types";
import { runChangedFiles } from "@shared/runs";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { useApp } from "@renderer/state/store";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { Field, Input } from "@renderer/components/ui/Field";

const OUTCOME_TONE = {
  success: "ok",
  failure: "danger",
  inconclusive: "warn",
  pending: "neutral",
} as const;

function buildExperimentPrefill(
  experiment: ExperimentRun,
  opts: {
    changedFiles: string[];
    ga4Conversions?: number;
  },
): { metricName: string; metricValue: string; learning: string } {
  const metricName =
    experiment.metric?.name ??
    (opts.ga4Conversions != null ? "conversions" : "");
  const metricValue =
    experiment.metric?.value != null
      ? String(experiment.metric.value)
      : opts.ga4Conversions != null
        ? String(opts.ga4Conversions)
        : "";
  const evidence =
    experiment.evidence_urls?.length
      ? experiment.evidence_urls
      : opts.changedFiles;
  const learning =
    experiment.learning ??
    (evidence.length > 0 ? `Evidence from last run: ${evidence.join(", ")}` : "");
  return { metricName, metricValue, learning };
}

function OutcomeForm({
  experiment,
  onSaved,
}: {
  experiment: ExperimentRun;
  onSaved: () => void;
}) {
  const markExperimentOutcome = useApp((s) => s.markExperimentOutcome);
  const run = useApp((s) => s.run);
  const profile = useApp((s) => s.marketingProfile);

  const changedFiles = useMemo(
    () => (run ? runChangedFiles(run.events) : []),
    [run],
  );
  const ga4Conversions = profile?.connector_snapshots?.ga4?.metrics?.find(
    (m) => m.name === "conversions",
  )?.value;

  const prefill = useMemo(
    () => buildExperimentPrefill(experiment, { changedFiles, ga4Conversions }),
    [experiment, changedFiles, ga4Conversions],
  );

  const [outcome, setOutcome] = useState<ExperimentRun["outcome"]>(experiment.outcome);
  const [metricName, setMetricName] = useState(prefill.metricName);
  const [metricValue, setMetricValue] = useState(prefill.metricValue);
  const [learning, setLearning] = useState(prefill.learning);
  const [editing, setEditing] = useState(experiment.outcome === "pending");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (experiment.outcome !== "pending") return;
    setMetricName(prefill.metricName);
    setMetricValue(prefill.metricValue);
    if (!experiment.learning && prefill.learning) setLearning(prefill.learning);
  }, [experiment.outcome, experiment.learning, prefill]);

  const evidence =
    experiment.evidence_urls?.length ? experiment.evidence_urls : changedFiles;

  const save = async () => {
    setBusy(true);
    try {
      await markExperimentOutcome(experiment.id, {
        outcome,
        metric:
          metricName.trim() && metricValue.trim()
            ? { name: metricName.trim(), value: Number(metricValue) }
            : undefined,
        learning: learning.trim() || undefined,
        evidence_urls: evidence,
      });
      setEditing(false);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  if (!editing && experiment.outcome !== "pending") {
    return (
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        Edit outcome
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3">
      <div className="text-micro font-semibold uppercase tracking-wider text-text-3">
        Record outcome
      </div>
      {evidence.length > 0 && (
        <div className="rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
            Evidence (last run)
          </div>
          <ul className="mt-1 list-inside list-disc text-mini text-text-2">
            {evidence.map((f) => (
              <li key={f} className="font-mono text-[11px]">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Field label="Outcome">
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as ExperimentRun["outcome"])}
          className="w-full rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2 py-1.5 text-body-sm"
        >
          <option value="pending">Pending</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="inconclusive">Inconclusive</option>
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Metric name">
          <Input value={metricName} onChange={(e) => setMetricName(e.target.value)} placeholder="Waitlist signups" />
        </Field>
        <Field label="Metric value">
          <Input type="number" value={metricValue} onChange={(e) => setMetricValue(e.target.value)} placeholder="42" />
        </Field>
      </div>
      <Field label="Learning (optional)">
        <Input value={learning} onChange={(e) => setLearning(e.target.value)} placeholder="What did you learn?" />
      </Field>
      <Button variant="primary" size="sm" loading={busy} onClick={() => void save()}>
        Save outcome
      </Button>
    </div>
  );
}

export function ExperimentResultCanvas() {
  const profile = useApp((s) => s.marketingProfile);
  const experimentId = useApp((s) => s.canvas.experimentId);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const [, bump] = useState(0);

  const experiments = profile?.previous_experiments ?? [];

  const selected = useMemo(() => {
    if (experimentId) return experiments.find((e) => e.id === experimentId) ?? experiments[0];
    return experiments[0] ?? null;
  }, [experiments, experimentId]);

  if (!selected) {
    const guide = SURFACE_UNLOCK.experiment;
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-8">
        <GuidedEmptyState
          icon={FlaskConical}
          title={guide.unlockTitle}
          description={guide.unlockReason}
          steps={guide.steps}
          primaryAction={{
            label: guide.primaryLabel,
            onClick: () => runSurfaceUnlockAction(guide.primaryAction),
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      {experiments.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {experiments.map((e) => (
            <button
              key={e.id}
              onClick={() => setWorkSurface("experiment", { experimentId: e.id })}
              className={`rounded-[var(--radius-sm)] border px-2.5 py-1 text-[10.5px] ${
                e.id === selected.id
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line text-text-2"
              }`}
            >
              {e.date} · {e.outcome}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={OUTCOME_TONE[selected.outcome]}>{selected.outcome}</Badge>
          <span className="text-micro text-text-3">{selected.discipline}</span>
          <span className="text-micro text-text-3">{selected.date}</span>
        </div>
        <h2 className="mt-3 text-[16px] font-medium leading-snug text-text">{selected.hypothesis}</h2>
        {selected.evidence_urls && selected.evidence_urls.length > 0 && (
          <div className="mt-3 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
              Evidence
            </div>
            <ul className="mt-1 list-inside list-disc text-mini text-text-2">
              {selected.evidence_urls.map((url) => (
                <li key={url} className="font-mono text-[11px]">
                  {url}
                </li>
              ))}
            </ul>
          </div>
        )}
        {selected.metric && selected.outcome !== "pending" && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-text-3">Primary metric</div>
            <div className="mt-1 text-[20px] font-semibold text-accent">
              {selected.metric.name}: {selected.metric.value}
            </div>
          </div>
        )}
        {selected.learning && selected.outcome !== "pending" && (
          <div className="mt-4">
            <div className="text-micro font-semibold uppercase tracking-wider text-text-3">Learning</div>
            <p className="mt-2 text-body-sm leading-relaxed text-text-2">{selected.learning}</p>
          </div>
        )}
        <OutcomeForm experiment={selected} onSaved={() => bump((n) => n + 1)} />
      </div>
    </div>
  );
}
