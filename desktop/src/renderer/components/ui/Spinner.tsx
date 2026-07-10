import { Loader2 } from "lucide-react";

export function Spinner({
  size = 14,
  className,
  label,
}: {
  size?: number;
  className?: string;
  /** Accessible label; omit when a parent already announces busy state. */
  label?: string;
}) {
  return (
    <Loader2
      size={size}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`animate-spin ${className ?? ""}`}
    />
  );
}
