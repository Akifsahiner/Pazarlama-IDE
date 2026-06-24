"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { IDEWindow } from "@/components/ide-ui/IDEWindow";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { diffLineReveal, staggerContainer } from "@/lib/animations";
import { activityLog, sections } from "@/lib/tokens";

function SnapshotCard() {
  const { snapshot } = sections.workspace;
  const rows = [
    ["Product type", snapshot.productType],
    ["Framework", snapshot.framework],
    ["Core action", snapshot.coreAction],
    ["Audience", snapshot.audience],
  ];

  return (
    <div className="surface-card flex flex-col gap-3 p-5">
      <h4 className="text-sm font-semibold text-[#1A202C]">{snapshot.label}</h4>
      <dl className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-xs text-ink-muted">{label}</dt>
            <dd className="text-xs font-medium text-[#1A202C]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReadinessCard() {
  const { readiness } = sections.workspace;

  return (
    <div className="surface-card flex flex-col gap-3 p-5">
      <h4 className="text-sm font-semibold text-[#1A202C]">Launch readiness</h4>
      <div className="flex flex-col gap-2.5">
        {readiness.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-secondary">{item.label}</span>
              <span className="font-mono text-[10px] text-ink-muted">{item.score}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/6">
              <div
                className={`h-full rounded-full ${
                  item.score < 50
                    ? "bg-[var(--accent-orange-border)]"
                    : "bg-[var(--accent-blue-border)]"
                }`}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityCard() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-[#1a1d24] p-5 font-mono shadow-md">
      <h4 className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">
        Activity
      </h4>
      <motion.div
        className="flex flex-col gap-2.5"
        variants={staggerContainer}
        initial={reducedMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-30px" }}
      >
        {activityLog.map((line) => (
          <motion.span
            key={line}
            variants={diffLineReveal}
            className="flex items-center gap-2 text-[11px] text-white/65"
          >
            <Check className="size-3 text-[var(--accent-green-border)]" />
            {line}
          </motion.span>
        ))}
        <motion.span
          variants={diffLineReveal}
          className="flex items-center gap-2 text-[11px] text-[#febc2e]/90"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-[#febc2e]" />
          Waiting for approval: landing page patch
        </motion.span>
      </motion.div>
    </div>
  );
}

export function WorkspacePreview() {
  const { eyebrow, title, subtitle } = sections.workspace;

  return (
    <SectionContainer id="workspace">
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          accent="blue"
          title={title}
          subtitle={subtitle}
          align="center"
          className="mb-12 lg:mb-14"
        />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <IDEWindow showThemePicker />
      </ScrollReveal>

      <ScrollReveal delay={0.15} className="mt-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <SnapshotCard />
            <ReadinessCard />
          </div>
          <div className="surface-card p-5 lg:col-span-2">
            <ActivityCard />
          </div>
        </div>
      </ScrollReveal>
    </SectionContainer>
  );
}
