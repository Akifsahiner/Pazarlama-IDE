import { cx } from "./cx";

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/** Accessible toggle switch (role=switch + aria-checked). */
export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] focus-visible:outline-2",
        checked ? "bg-accent" : "bg-surface-3",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <span
        className={cx(
          "absolute h-3.5 w-3.5 rounded-full bg-white shadow-[var(--shadow-1)] transition-transform duration-[var(--dur-fast)] ease-[var(--ease-standard)]",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
