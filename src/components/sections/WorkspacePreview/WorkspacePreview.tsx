"use client";

import { useReducedMotion } from "framer-motion";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { IDEWindow } from "@/components/ide-ui/IDEWindow";
import { sections } from "@/lib/tokens";
import { useScrollSection } from "@/lib/useScrollSection";
import { timelinePresets, workbenchPresetIds, type TimelinePresetId } from "@/lib/timeline-ide-presets";

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
  const reducedMotion = useReducedMotion() ?? false;
  const { eyebrow, title, subtitle, strategy } = sections.workspace;
  const { activeIndex, setRef } = useScrollSection({
    count: workbenchLines.length,
    reducedMotion,
  });
  const presetId = workbenchPresetIds[activeIndex] ?? "shipped";
  const preset = timelinePresets[presetId as TimelinePresetId];

  return (
    <SectionContainer
      id="workspace"
      fullBleed
      className="atelier-section atelier-section--workbench section-tint section-tint--blue"
    >
      <div className="atelier-grid-lines" aria-hidden="true" />
      <div className="atelier-light atelier-light--sky" aria-hidden="true" />
      <div className="atelier-light atelier-light--gold" aria-hidden="true" />
      <div className="atelier-light atelier-light--moss" aria-hidden="true" />

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
              <li
                key={line}
                ref={setRef(index)}
                className={`atelier-workbench-line ${activeIndex === index ? "is-active" : ""}`}
              >
                <span className="atelier-workbench-line__index font-mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-serif text-[18px] tracking-[-0.02em] text-ink md:text-[20px]">
                  {line}
                </span>
              </li>
            ))}
          </ol>

          <ScrollReveal delay={0.15} className="mt-6 rounded-xl border border-[var(--canvas-warm-line)] bg-[rgba(255,252,245,0.55)] p-4 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-ink-2 italic">{strategy}</p>
          </ScrollReveal>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="atelier-glass-capsule">✓ 847 files scanned</span>
            <span className="atelier-glass-capsule">✓ 8 competitors compared</span>
            <span className="atelier-glass-capsule atelier-glass-capsule--live">
              <span className="atelier-status-dot" aria-hidden="true" />● Waiting for approval
            </span>
          </div>
        </div>

        <div className="atelier-sticky-demo lg:sticky lg:top-24">
          <div className="product-frame">
            <div className="product-frame__glow" aria-hidden="true" />
            <div className="product-frame__inner">
              <IDEWindow showThemePicker={false} preset={preset} />
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
