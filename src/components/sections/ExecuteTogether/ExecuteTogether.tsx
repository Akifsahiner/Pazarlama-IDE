"use client";

import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { DiffViewer } from "@/components/ide-ui/DiffViewer";
import { sections } from "@/lib/tokens";
import { LivePreviewCard } from "./LivePreviewCard";

export function ExecuteTogether() {
  const { eyebrow, title, subtitle } = sections.execute;

  return (
    <SectionContainer>
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          accent="green"
          title={title}
          subtitle={subtitle}
          align="center"
          className="mb-12 lg:mb-14"
        />
      </ScrollReveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <ScrollReveal delay={0.05}>
          <div className="product-panel-dark flex h-full flex-col gap-5 rounded-2xl p-6 shadow-md lg:p-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-medium tracking-tight text-white lg:text-2xl">
                Marketing diffs, not mystery edits
              </h3>
              <p className="text-sm leading-relaxed text-white/65">
                Each proposed change arrives as a reviewable diff.
              </p>
            </div>
            <DiffViewer />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="surface-card flex h-full flex-col gap-5 p-6 lg:p-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-medium tracking-tight text-[#1A202C] lg:text-2xl">
                Preview before you ship
              </h3>
              <p className="text-sm leading-relaxed text-ink-secondary">
                See exactly how your live product changes before anything goes public.
              </p>
            </div>
            <LivePreviewCard />
          </div>
        </ScrollReveal>
      </div>
    </SectionContainer>
  );
}
