import { forwardRef } from "react";
import { cx } from "./cx";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required; icon-only buttons are invisible to AT without it. */
  label: string;
  size?: "sm" | "md";
  active?: boolean;
}

/** Icon-only button with a required accessible label and consistent hit area. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", active, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex items-center justify-center rounded-[var(--radius-sm)] text-text-2 transition-colors duration-[var(--dur-fast)] hover:bg-elevated hover:text-text disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-6 w-6" : "h-7 w-7",
        active && "bg-elevated text-text",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
