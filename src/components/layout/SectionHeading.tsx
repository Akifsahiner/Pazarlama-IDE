import type { ReactNode } from "react";
import { TonalBadge, type TonalAccent } from "@/components/ui/TonalBadge";

type Accent = TonalAccent;

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  accent?: Accent;
  children?: ReactNode;
  className?: string;
  align?: "left" | "center";
};

export function SectionHeading({
  title,
  subtitle,
  eyebrow,
  accent = "orange",
  children,
  className = "",
  align = "left",
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "items-center text-center" : "";

  return (
    <div className={`flex flex-col gap-3 ${alignClass} ${className}`}>
      {eyebrow && <TonalBadge accent={accent}>{eyebrow}</TonalBadge>}
      <h2 className="section-headline text-4xl leading-[1.15] font-medium text-[#1A202C] lg:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p
          className={`max-w-2xl text-base leading-relaxed text-ink-secondary md:text-lg ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
