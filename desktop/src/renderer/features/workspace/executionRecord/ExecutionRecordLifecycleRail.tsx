import { Check } from "lucide-react";
import {
  executionLifecycleLabel,
  executionLifecycleRail,
  type ExecutionRecordLifecycle,
} from "@shared/executionRecord";

const RAIL = executionLifecycleRail();

function stepIndex(lifecycle: ExecutionRecordLifecycle): number {
  const idx = RAIL.indexOf(lifecycle);
  if (idx >= 0) return idx;
  if (lifecycle === "intake" || lifecycle === "closed") return -1;
  return 0;
}

export function ExecutionRecordLifecycleRail({
  lifecycle,
}: {
  lifecycle: ExecutionRecordLifecycle;
}) {
  const activeIdx = stepIndex(lifecycle);
  if (lifecycle === "intake") return null;

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      data-testid="execution-record-lifecycle-rail"
      role="status"
      aria-label="Execution lifecycle"
    >
      {RAIL.map((step, i) => {
        const done = activeIdx > i;
        const active = activeIdx === i;
        return (
          <span key={step} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-text-3">→</span>}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                done
                  ? "bg-ok/15 text-ok"
                  : active
                    ? "bg-accent/20 text-accent animate-pulse"
                    : "bg-surface-2 text-text-3"
              }`}
            >
              {done && <Check size={9} aria-hidden />}
              {executionLifecycleLabel(step)}
            </span>
          </span>
        );
      })}
    </div>
  );
}
