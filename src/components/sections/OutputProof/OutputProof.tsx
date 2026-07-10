"use client";

import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { outputProof } from "@/lib/tokens";

export function OutputProof() {
  const { eyebrow, title, pipeline } = outputProof;

  return (
    <SectionContainer>
      <ScrollReveal>
        <div className="glass-card mx-auto max-w-3xl px-8 py-10 text-center md:px-12 md:py-12">
          <p className="text-[13px] font-medium tracking-[0.12em] text-ink-3 uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">
            {title}
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[15px] font-medium text-ink-soft">
            {pipeline.map((step, index) => (
              <span key={step} className="inline-flex items-center gap-3">
                <span>{step}</span>
                {index < pipeline.length - 1 ? (
                  <span className="text-clue-blue" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </SectionContainer>
  );
}
