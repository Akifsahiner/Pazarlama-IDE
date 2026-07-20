"use client";

import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { IDEWindow } from "@/components/ide-ui/IDEWindow";
import { sections } from "@/lib/tokens";

const workbenchLines = [
  "It opens the project.",
  "Finds the bottleneck.",
  "Prepares the work.",
  "Shows the diff.",
  "Waits for approval.",
  "Ships the change.",
  "Measures what happened.",
] as const;

export function WorkspacePreview() {
  const { eyebrow, title, subtitle } = sections.workspace;

  return (
    <SectionContainer id="workspace" className="atelier-section atelier-section--workbench section-tint section-tint--blue">
      <div className="atelier-light atelier-light--sky" aria-hidden="true" />
      <div className="atelier-light atelier-light--gold" aria-hidden="true" />

      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <ScrollReveal>
            <SectionHeading
              eyebrow={eyebrow}
              title={title}
              subtitle={subtitle}
              accent="blue"
              align="left"
              className="mb-8 lg:mb-10"
            />
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <p className="max-w-md text-[15px] leading-relaxed text-ink-2">
              Marketing IDE does not give you another strategy document.
            </p>
          </ScrollReveal>

          <ol className="atelier-workbench-list mt-8">
            {workbenchLines.map((line, index) => (
              <ScrollReveal key={line} delay={0.04 * index}>
                <li className="atelier-workbench-line">
                  <span className="atelier-workbench-line__index font-mono">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-[18px] tracking-[-0.02em] text-ink md:text-[20px]">
                    {line}
                  </span>
                </li>
              </ScrollReveal>
            ))}
          </ol>

          <ScrollReveal delay={0.2} className="mt-8 flex flex-wrap gap-2">
            <span className="atelier-glass-capsule">✓ 847 files scanned</span>
            <span className="atelier-glass-capsule">✓ 8 competitors compared</span>
            <span className="atelier-glass-capsule">● Waiting for approval</span>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.1} className="lg:sticky lg:top-24">
          <div className="product-frame">
            <div className="product-frame__glow" aria-hidden="true" />
            <div className="product-frame__inner">
              <IDEWindow showThemePicker={false} />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </SectionContainer>
  );
}
