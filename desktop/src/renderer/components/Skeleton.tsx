interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: number;
}

/** A single shimmering placeholder block (uses the `.skeleton` design utility). */
export function Skeleton({ className = "", width, height = 12, rounded = 8 }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: rounded }}
      aria-hidden
    />
  );
}

/** A stack of skeleton lines, the last one shortened. */
export function SkeletonLines({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "60%" : "100%"} height={11} />
      ))}
    </div>
  );
}
