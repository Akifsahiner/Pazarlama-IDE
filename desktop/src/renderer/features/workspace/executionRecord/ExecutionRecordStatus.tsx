import { executionLifecycleRail, type ExecutionRecordLifecycle } from "@shared/executionRecord";
import { lifecycleStatusLabel, lifecycleStatusTone } from "./executionRecordUi";

const RAIL = executionLifecycleRail();

const TONE_CLASS: Record<string, string> = {
  accent: "border-accent/40 bg-accent/15 text-accent",
  warn: "border-warn/40 bg-warn/15 text-warn",
  ok: "border-ok/40 bg-ok/15 text-ok",
  neutral: "border-line bg-surface-2 text-text-2",
};

function stepIndex(lifecycle: ExecutionRecordLifecycle): number {
  const idx = RAIL.indexOf(lifecycle);
  return idx >= 0 ? idx : -1;
}

/** Single clear status — not a noisy step chain (Claude-style). */
export function ExecutionRecordStatusPill({
  lifecycle,
  labelOverride,
}: {
  lifecycle: ExecutionRecordLifecycle;
  labelOverride?: string;
}) {
  if (lifecycle === "intake") return null;
  const tone = lifecycleStatusTone(lifecycle);
  const active = lifecycle === "running" || lifecycle === "verifying";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${TONE_CLASS[tone]}`}
      data-testid="execution-record-status-pill"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${active ? "animate-pulse" : ""}`}
        aria-hidden
      />
      {labelOverride ?? lifecycleStatusLabel(lifecycle)}
    </span>
  );
}

/** Compact progress — dots only, no label spam. */
export function ExecutionRecordProgress({ lifecycle }: { lifecycle: ExecutionRecordLifecycle }) {
  const activeIdx = stepIndex(lifecycle);
  if (activeIdx < 0 || lifecycle === "intake") return null;

  return (
    <div
      className="flex items-center gap-1"
      data-testid="execution-record-lifecycle-rail"
      aria-label={lifecycleStatusLabel(lifecycle)}
    >
      {RAIL.map((step, i) => (
        <span
          key={step}
          className={`h-1 rounded-full transition-all ${
            i <= activeIdx ? "w-4 bg-accent" : "w-1.5 bg-line"
          } ${i === activeIdx && (lifecycle === "running" || lifecycle === "verifying") ? "animate-pulse" : ""}`}
          title={lifecycleStatusLabel(step)}
        />
      ))}
    </div>
  );
}
