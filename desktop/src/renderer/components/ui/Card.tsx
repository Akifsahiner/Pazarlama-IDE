import { forwardRef } from "react";
import { cx } from "./cx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padded = true, interactive, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        "rounded-[var(--radius-xl)] border border-line bg-surface",
        padded && "p-5",
        interactive &&
          "cursor-pointer transition-[border-color,box-shadow,transform,background-color] duration-[var(--dur)] ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-accent/25 hover:bg-elevated/40 hover:shadow-[var(--shadow-2)] active:translate-y-0",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
