"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  FolderOpen,
  GitBranch,
  Play,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { sections } from "@/lib/tokens";
import { cardReveal, staggerContainer } from "@/lib/animations";

const iconMap: Record<string, LucideIcon> = {
  FolderOpen,
  ScanSearch,
  GitBranch,
  Play,
  BarChart3,
};

const iconBg = [
  "bg-[var(--accent-orange-bg)] text-[var(--accent-orange)]",
  "bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]",
  "bg-[var(--accent-orange-bg)] text-[var(--accent-orange)]",
  "bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]",
  "bg-[var(--accent-green-bg)] text-[var(--accent-green)]",
];

export function HowItWorks() {
  const reducedMotion = useReducedMotion() ?? false;
  const { eyebrow, title, subtitle, steps } = sections.howItWorks;

  return (
    <SectionContainer id="how-it-works">
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          accent="orange"
          title={title}
          subtitle={subtitle}
          align="center"
          className="mb-14 lg:mb-16"
        />
      </ScrollReveal>

      <motion.ol
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        variants={staggerContainer}
        initial={reducedMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {steps.map((step, index) => {
          const Icon = iconMap[step.icon] ?? FolderOpen;
          return (
            <motion.li
              key={step.title}
              variants={cardReveal}
              className="surface-card flex flex-col gap-4 p-6"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${iconBg[index]}`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="font-mono text-xs text-ink-muted">
                  0{index + 1}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-medium tracking-tight text-[#1A202C]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink-secondary">
                  {step.description}
                </p>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </SectionContainer>
  );
}
