"use client";

import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { sections } from "@/lib/tokens";
import { NumberCounter } from "@/components/ui/NumberCounter";
import { AnalyticsPanel } from "./AnalyticsPanel";

export function MeasureImprove() {
  const { eyebrow, title, subtitle, stats } = sections.measure;

  return (
    <SectionContainer>
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          accent="orange"
          title={title}
          subtitle={subtitle}
          align="center"
          className="mb-12 lg:mb-14"
        />
      </ScrollReveal>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:gap-16">
        <div className="flex flex-1 flex-col justify-center">
          <div className="surface-card flex flex-col divide-y divide-black/6 px-6 md:px-8">
            {stats.map((stat) => (
              <ScrollReveal key={stat.label} delay={0.05}>
                <div className="flex flex-col gap-1.5 py-6 first:pt-6 last:pb-6">
                  <div className="flex items-baseline gap-3">
                    <NumberCounter
                      value={stat.value}
                      className="font-serif text-5xl font-medium tracking-tight text-[#1A202C] lg:text-6xl"
                    />
                    <span className="text-lg font-normal text-ink-muted lg:text-xl">
                      {stat.label}
                    </span>
                  </div>
                  <p className="max-w-md text-sm leading-relaxed text-ink-secondary">
                    {stat.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <ScrollReveal className="flex-1" delay={0.1}>
          <AnalyticsPanel />
        </ScrollReveal>
      </div>
    </SectionContainer>
  );
}
