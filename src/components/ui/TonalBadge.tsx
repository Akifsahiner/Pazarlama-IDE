import type { ReactNode } from "react";

export type TonalAccent = "orange" | "blue" | "green";

const tonalClass: Record<TonalAccent, string> = {
  orange: "tonal-badge-orange",
  blue: "tonal-badge-blue",
  green: "tonal-badge-green",
};

type TonalBadgeProps = {
  children: ReactNode;
  accent: TonalAccent;
  className?: string;
};

export function TonalBadge({ children, accent, className = "" }: TonalBadgeProps) {
  return (
    <span className={`tonal-badge ${tonalClass[accent]} ${className}`}>
      {children}
    </span>
  );
}
