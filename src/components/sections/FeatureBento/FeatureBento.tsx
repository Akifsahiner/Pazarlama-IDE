"use client";

import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { featureBento } from "@/lib/tokens";

export function FeatureBento() {
  const { eyebrow, title, subtitle, items } = featureBento;

  return (
    <SectionContainer id="features">
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          align="center"
          className="mb-12 lg:mb-14"
        />
      </ScrollReveal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <ScrollReveal key={item.title} delay={index * 0.06}>
            <article className="feature-card card-hover h-full p-6">
              <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{item.description}</p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </SectionContainer>
  );
}
