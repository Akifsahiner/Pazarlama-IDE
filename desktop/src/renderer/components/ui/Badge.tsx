import { cx } from "./cx";

export type BadgeTone = "neutral" | "accent" | "sales" | "marketing" | "ok" | "warn" | "danger";

const TONE: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-2 text-text-2",
  accent: "border-[var(--accent-border)] bg-accent-soft text-accent",
  sales: "border-[var(--sales-border)] bg-sales-soft text-sales",
  marketing: "border-[var(--marketing)]/30 bg-marketing-soft text-marketing",
  ok: "border-[var(--ok-border)] bg-ok-soft text-ok",
  warn: "border-[var(--warn-border)] bg-warn-soft text-warn",
  danger: "border-[var(--danger-border)] bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-2 py-0.5 text-caption",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
