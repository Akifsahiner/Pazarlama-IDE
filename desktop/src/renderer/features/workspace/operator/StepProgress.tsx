interface StepProgressProps {
  step?: number;
  stepMax?: number;
  elapsedMs: number;
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Compact step counter + elapsed time for the operator HUD. */
export function StepProgress({ step, stepMax, elapsedMs }: StepProgressProps) {
  return (
    <span className="flex items-center gap-2 text-micro tabular-nums text-text-3">
      {typeof step === "number" && typeof stepMax === "number" && (
        <span>
          Step {step}/{stepMax}
        </span>
      )}
      <span>·</span>
      <span>{fmt(elapsedMs)}</span>
    </span>
  );
}
