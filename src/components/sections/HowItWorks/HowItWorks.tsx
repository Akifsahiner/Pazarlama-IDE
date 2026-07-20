"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  FolderOpen,
  GitBranch,
  Play,
  ScanSearch,
  Server,
  type LucideIcon,
} from "lucide-react";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { sections } from "@/lib/tokens";
import { cardReveal, staggerContainer } from "@/lib/animations";

const iconMap: Record<string, LucideIcon> = {
  Server,
  FolderOpen,
  ScanSearch,
  GitBranch,
  Play,
  BarChart3,
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

const stepLabelByAccent = {
  blue: "text-blue-ink",
  orange: "text-orange-ink",
  green: "text-green-ink",
} as const;

export function HowItWorks() {
  const reducedMotion = useReducedMotion() ?? false;
  const { eyebrow, title, subtitle, steps } = sections.howItWorks;

  return (
    <SectionContainer id="how-it-works" className="section-tint section-tint--tri pt-20 lg:pt-28">
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          accent="blue"
          align="center"
          className="mb-14 lg:mb-16"
        />
      </ScrollReveal>

      <div className="relative mx-auto max-w-3xl pl-8">
        <div className="canvas-path-line" aria-hidden="true" />

        <motion.ol
          className="flex flex-col gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {steps.map((step, index) => {
            const Icon = iconMap[step.icon];
            return (
              <motion.li
                key={step.title}
                variants={reducedMotion ? undefined : cardReveal}
                className="relative"
              >
                <span className="canvas-path-marker" aria-hidden="true" />
                <div className={`${cardByAccent[step.accent]} card-hover flex items-start gap-4 p-5 md:p-6`}>
                  <span className={iconByAccent[step.accent]}>
                    {Icon ? <Icon className="size-5" aria-hidden="true" /> : null}
                  </span>
                  <div>
                    <p
                      className={`text-[13px] font-semibold tracking-[0.08em] uppercase ${stepLabelByAccent[step.accent]}`}
                    >
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-ink md:text-[18px]">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{step.description}</p>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </SectionContainer>
  );
}
