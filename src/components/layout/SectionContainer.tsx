import type { ReactNode } from "react";

type SectionContainerProps = {
  children: ReactNode;
  /** Applied to the outer `<section>` when fullBleed, else merged with inner layout classes */
  className?: string;
  /** Inner content wrapper classes (fullBleed mode only) */
  innerClassName?: string;
  id?: string;
  /** Full-viewport section backgrounds (atelier lights, grid) */
  fullBleed?: boolean;
};

const layoutClass =
  "mx-auto w-full max-w-7xl px-5 py-24 md:px-8 lg:py-32";

export function SectionContainer({
  children,
  className = "",
  innerClassName = "",
  id,
  fullBleed = false,
}: SectionContainerProps) {
  if (fullBleed) {
    return (
      <section id={id} className={`relative ${className}`}>
        <div className={`${layoutClass} ${innerClassName}`}>{children}</div>
      </section>
    );
  }

  return (
    <section id={id} className={`${layoutClass} ${className}`}>
      {children}
    </section>
  );
}
