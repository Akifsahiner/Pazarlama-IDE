import { cx } from "./cx";

/** Determinate (value 0..1) or indeterminate progress bar. */
export function ProgressBar({
  value,
  indeterminate,
  className,
}: {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round((value ?? 0) * 100)}
      className={cx("h-1.5 w-full overflow-hidden rounded-[var(--radius-full)] bg-surface-2", className)}
    >
      {indeterminate ? (
        <div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] rounded-[var(--radius-full)] bg-accent" />
      ) : (
        <div
          className="h-full rounded-[var(--radius-full)] bg-accent transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-standard)]"
          style={{ width: `${Math.round((value ?? 0) * 100)}%` }}
        />
      )}
    </div>
  );
}
