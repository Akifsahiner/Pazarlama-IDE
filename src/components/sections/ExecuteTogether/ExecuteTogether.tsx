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
    <SectionContainer className="section-tint section-tint--orange">
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          accent="orange"
          align="center"
          className="mb-12 lg:mb-14"
        />
      </ScrollReveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <ScrollReveal delay={0.05}>
          <div className="product-panel-dark flex h-full flex-col rounded-[20px] p-6 lg:p-8">
            <DiffViewer />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="card-orange card-hover flex h-full flex-col p-6 lg:p-8">
            <LivePreviewCard />
          </div>
        </ScrollReveal>
      </div>
    </SectionContainer>
  );
}
