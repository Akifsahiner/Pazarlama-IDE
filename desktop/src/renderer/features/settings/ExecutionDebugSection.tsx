import { computeApplyRate, computeFstMs, computeRunSuccessRate } from "@shared/executionMetrics";
import { useApp } from "@renderer/state/store";
import { Card } from "@renderer/components/ui/Card";

/** DEV-only execution metrics rollup for Quick Start wedge dogfood. */
export function ExecutionDebugSection() {
  if (!import.meta.env.DEV) return null;

  const metrics = useApp((s) => s.executionMetrics);
  const firstShipAt = useApp((s) => s.firstShipAt);
  const shipPipeline = useApp((s) => s.shipPipeline);

  if (!metrics) return null;

  const fst = computeFstMs(metrics);
  const applyRate = computeApplyRate(metrics);
  const runSuccess = computeRunSuccessRate(metrics);
  const recent = metrics.rows.slice(-10).reverse();

  return (
    <Card className="p-4" data-testid="execution-debug-section">
      <h3 className="text-body-sm font-semibold text-text">Execution debug (dev)</h3>
      <dl className="mt-2 grid gap-1 text-mini text-text-2 sm:grid-cols-2">
        <div>
          <dt className="text-text-3">FST</dt>
          <dd>{fst != null ? `${Math.round(fst / 60000)} min` : "—"}</dd>
        </div>
        <div>
          <dt className="text-text-3">Apply rate</dt>
          <dd>{applyRate != null ? `${applyRate}%` : "—"}</dd>
        </div>
        <div>
          <dt className="text-text-3">Run success</dt>
          <dd>{runSuccess != null ? `${runSuccess}%` : "—"}</dd>
        </div>
        <div>
          <dt className="text-text-3">Pipeline</dt>
          <dd>{shipPipeline?.stage ?? "idle"}</dd>
        </div>
        <div>
          <dt className="text-text-3">firstShipAt</dt>
          <dd>{firstShipAt ? new Date(firstShipAt).toLocaleString() : "—"}</dd>
        </div>
      </dl>
      {recent.length > 0 && (
        <ul className="mt-3 max-h-32 overflow-y-auto text-[10px] text-text-3">
          {recent.map((r, i) => (
            <li key={`${r.event}-${r.at}-${i}`}>
              {r.event} · {new Date(r.at).toLocaleTimeString()}
              {r.patchCount != null ? ` · patches ${r.patchCount}` : ""}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
