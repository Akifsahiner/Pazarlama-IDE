"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FolderOpen, GitBranch, ScanSearch, Server, type LucideIcon } from "lucide-react";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { firstRunFunnel } from "@/lib/tokens";
import { cardReveal, staggerContainer } from "@/lib/animations";

const iconMap: Record<string, LucideIcon> = {
  Server,
  FolderOpen,
  ScanSearch,
  GitBranch,
};

const cardByAccent = {
  blue: "card-blue",
  orange: "card-orange",
  green: "card-green",
} as const;

const iconByAccent = {
  blue: "step-icon step-icon--blue",
  orange: "step-icon step-icon--orange",
  green: "step-icon step-icon--green",
} as const;

/** Mirrors the desktop app's real onboarding funnel — sets expectations before download. */
export function FirstRunFunnel() {
  const reducedMotion = useReducedMotion() ?? false;
  const { eyebrow, title, subtitle, steps } = firstRunFunnel;

  return (
    <SectionContainer id="first-run" className="section-tint section-tint--dual pb-16 pt-10 lg:pb-20 lg:pt-14">
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          accent="orange"
          align="center"
          className="mb-10 lg:mb-12"
        />
      </ScrollReveal>

      <motion.ol
        className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        {steps.map((step, index) => {
          const Icon = iconMap[step.icon];
          return (
            <motion.li
              key={step.title}
              variants={reducedMotion ? undefined : cardReveal}
              className={`${cardByAccent[step.accent]} card-hover flex items-start gap-4 p-5`}
            >
              <span className={iconByAccent[step.accent]}>
                {Icon ? <Icon className="size-5" aria-hidden="true" /> : null}
              </span>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  Minute {index === 0 ? "1–2" : index === 1 ? "3–4" : index === 2 ? "5–7" : "8–10"}
                </p>
                <h3 className="mt-0.5 text-[16px] font-semibold tracking-[-0.02em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{step.description}</p>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </SectionContainer>
  );
}
