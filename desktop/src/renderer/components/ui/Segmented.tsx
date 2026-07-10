import { useRef } from "react";
import { cx } from "./cx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

/**
 * Segmented control / tab strip with roving tabindex and arrow-key navigation.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const enabled = options.filter((o) => !o.disabled);
    if (enabled.length === 0) return;
    const idx = enabled.findIndex((o) => o.value === value);
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const next = enabled[(idx + delta + enabled.length) % enabled.length];
    onChange(next.value);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
      ?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cx("inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-surface-2 p-0.5", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          data-value={o.value}
          aria-selected={value === o.value}
          disabled={o.disabled}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-[var(--radius-sm)] px-3 py-1 text-label transition-colors duration-[var(--dur-fast)]",
            value === o.value ? "bg-elevated text-text shadow-[var(--shadow-1)]" : "text-text-2 hover:text-text",
            o.disabled && "pointer-events-none opacity-40",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
