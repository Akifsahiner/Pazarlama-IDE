"use client";

import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { useCases } from "@/lib/tokens";

export function UseCases() {
  const { eyebrow, title, subtitle, scenarios } = useCases;

  return (
    <SectionContainer id="use-cases">
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          align="center"
          className="mb-12 lg:mb-14"
        />
      </ScrollReveal>

      <div className="grid gap-4 md:grid-cols-2">
        {scenarios.map((scenario, index) => (
          <ScrollReveal key={scenario.title} delay={index * 0.08}>
            <article className="feature-card h-full p-7">
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-ink">
                {scenario.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{scenario.description}</p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </SectionContainer>
  );
}
