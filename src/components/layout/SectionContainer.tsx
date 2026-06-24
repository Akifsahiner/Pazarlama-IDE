import type { ReactNode } from "react";

type SectionContainerProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export function SectionContainer({
  children,
  className = "",
  id,
}: SectionContainerProps) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-7xl px-5 py-24 md:px-8 lg:py-32 ${className}`}
    >
      {children}
    </section>
  );
}
