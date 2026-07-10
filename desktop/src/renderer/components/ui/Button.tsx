import { forwardRef } from "react";
import { Spinner } from "./Spinner";
import { cx } from "./cx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "subtle" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  full?: boolean;
}

const VARIANT: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-on-accent shadow-[var(--shadow-1)] hover:bg-[var(--accent-hover)] active:translate-y-[0.5px]",
  secondary:
    "bg-surface-2 border border-line-2 text-text hover:bg-surface-3 active:translate-y-[0.5px]",
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
  subtle: "bg-accent-soft text-accent hover:brightness-110",
  danger: "bg-danger text-white hover:brightness-110 active:translate-y-[0.5px]",
};

const SIZE: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-7 px-3 text-label gap-1.5",
  md: "h-[34px] px-4 text-body gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, iconLeft, iconRight, full, disabled, className, children, ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-[background,transform,filter] duration-[var(--dur-fast)] ease-[var(--ease-standard)]",
        VARIANT[variant],
        SIZE[size],
        full && "w-full",
        isDisabled && "pointer-events-none opacity-50",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 13 : 15} /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});
