import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Link2, Plus, RefreshCw, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import {
  hasGa4Connected,
  readGa4MetricValue,
  resolveOpsKpiGate,
  validateFullOpsProof,
} from "@shared/cmoProofLoop";

export function OpsTaskProofModal() {
  const taskId = useApp((s) => s.pendingOpsProofTaskId);
  const cadence = useApp((s) => s.opsCadence);
  const profile = useApp((s) => s.marketingProfile);
  const dismiss = useApp((s) => s.dismissOpsProofModal);
  const complete = useApp((s) => s.completeOpsTask);
  const syncGa4 = useApp((s) => s.syncGa4Metrics);
  const connectGa4 = useApp((s) => s.connectGa4);
  const [urls, setUrls] = useState<string[]>([""]);
  const [note, setNote] = useState("");
  const [metric, setMetric] = useState("");
  const [kpiValue, setKpiValue] = useState("");
  const [kpiSource, setKpiSource] = useState<"manual" | "ga4">("manual");
  const [syncing, setSyncing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const task = useMemo(
    () => (taskId && cadence ? cadence.tasks.find((t) => t.id === taskId) : undefined),
    [taskId, cadence],
  );

  const gate = useMemo(
    () => (task ? resolveOpsKpiGate(task, cadence?.thesis_id) : null),
    [task, cadence?.thesis_id],
  );

  if (!taskId || !task) return null;

  const needsLiveUrl =
    task.expected_proof_kind === "live_url" ||
    /\b(url|live post|link|published|posted)\b/i.test(task.done_when);

  const proofInput = {
    urls: urls.filter((u) => u.trim()),
    note,
    metric_snapshot: metric,
    kpi_value: kpiValue.trim() ? Number(kpiValue) : undefined,
    kpi_source: kpiSource,
  };

  const validation = validateFullOpsProof(task, proofInput, profile);

  const pullFromGa4 = async () => {
    if (!gate?.ga4MetricName) return;
    setSyncing(true);
    try {
      if (!hasGa4Connected(profile)) {
        await connectGa4();
        return;
      }
      await syncGa4();
      const fresh = useApp.getState().marketingProfile;
      const val = readGa4MetricValue(fresh, gate.ga4MetricName);
      if (val != null) {
        setKpiValue(String(val));
        setKpiSource("ga4");
      } else {
        setSubmitError(`GA4 has no ${gate.ga4MetricName} yet — log manually.`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const addUrl = () => setUrls((prev) => [...prev, ""]);
  const removeUrl = (index: number) =>
    setUrls((prev) => (prev.length <= 1 ? [""] : prev.filter((_, i) => i !== index)));

  const handleSubmit = () => {
    const v = validateFullOpsProof(task, proofInput, profile);
    if (!v.ok) {
      setSubmitError(v.errors.join(" "));
      return;
    }
    const err = complete(task.id, proofInput);
    if (err) {
      setSubmitError(err);
      return;
    }
    setUrls([""]);
    setNote("");
    setMetric("");
    setKpiValue("");
    setSubmitError(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ops-proof-title"
      data-testid="ops-proof-modal"
    >
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="ops-proof-title" className="text-body-sm font-semibold text-text">
              Mark done — KPI proof required
            </h2>
            <p className="mt-1 text-mini text-text-2">{task.what}</p>
            <p className="mt-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-2 text-[10px] text-text-3">
              <span className="font-semibold uppercase tracking-wide">Done when</span> ·{" "}
              {task.done_when}
            </p>
          </div>
          <button
            type="button"
            className="text-text-3 hover:text-text"
            onClick={dismiss}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {gate && (
            <div className="rounded-[var(--radius-md)] border border-accent/25 bg-accent-soft/10 px-3 py-2.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-accent">
                <BarChart3 size={12} />
                KPI gate · {gate.label}
              </div>
              <p className="mt-1 text-mini text-text-2">
                Log the measured outcome — syncs to manual KPIs
                {gate.defaultTarget != null ? ` (target: ${gate.defaultTarget})` : ""}.
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="min-w-[120px] flex-1">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={kpiValue}
                    placeholder={`${gate.label} value`}
                    data-testid="ops-proof-kpi-value"
                    className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
                    onChange={(e) => {
                      setKpiValue(e.target.value);
                      setKpiSource("manual");
                    }}
                  />
                </div>
                {gate.ga4MetricName && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={syncing}
                    iconLeft={<RefreshCw size={12} />}
                    onClick={() => void pullFromGa4()}
                  >
                    Pull GA4
                  </Button>
                )}
              </div>
              {kpiSource === "ga4" && (
                <p className="mt-1 text-[10px] text-ok">Value from GA4 ({gate.ga4MetricName})</p>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              {needsLiveUrl ? "Link to live asset (required)" : "Proof URLs"}
            </label>
            {needsLiveUrl && (
              <p className="mt-1 text-[10px] text-text-3">
                Paste the primary published URL — it becomes the proof chip on the ops board.
              </p>
            )}
            <div className="mt-1.5 space-y-1.5">
              {urls.map((url, i) => (
                <div key={i} className="flex gap-1.5">
                  <div className="relative min-w-0 flex-1">
                    <Link2
                      size={12}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3"
                    />
                    <input
                      type="url"
                      value={url}
                      placeholder="https://…"
                      data-testid={i === 0 ? "ops-proof-url-0" : undefined}
                      className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 py-1.5 pl-8 pr-2 text-body-sm text-text"
                      onChange={(e) =>
                        setUrls((prev) => prev.map((u, j) => (j === i ? e.target.value : u)))
                      }
                    />
                  </div>
                  {urls.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeUrl(i)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-1" iconLeft={<Plus size={12} />} onClick={addUrl}>
              Add URL
            </Button>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Context snapshot
            </label>
            <input
              type="text"
              value={metric}
              placeholder="e.g. 3 posts · peak hour engagement · audience notes"
              className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
              onChange={(e) => setMetric(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Notes
            </label>
            <textarea
              value={note}
              rows={3}
              placeholder="What you did, audience reaction, blockers…"
              data-testid="ops-proof-note"
              className="mt-1.5 w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm text-text"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {(submitError || !validation.ok) && (
          <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-warn/30 bg-warn-soft/15 px-2.5 py-2 text-mini text-warn">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{submitError ?? validation.errors.join(" ")}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" data-testid="ops-proof-confirm" onClick={handleSubmit}>
            Confirm done
          </Button>
        </div>
      </div>
    </div>
  );
}
