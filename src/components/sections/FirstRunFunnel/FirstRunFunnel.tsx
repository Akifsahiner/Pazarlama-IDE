"use client";

import { useReducedMotion } from "framer-motion";
import { IDEWindow } from "@/components/ide-ui/IDEWindow";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { launchTimeline } from "@/lib/tokens";
import { useScrollSection } from "@/lib/useScrollSection";
import { presetByTimelineIndex } from "@/lib/timeline-ide-presets";

const accentClass = {
  sky: "atelier-timeline-step--sky",
  moss: "atelier-timeline-step--moss",
  gold: "atelier-timeline-step--gold",
  action: "atelier-timeline-step--action",
  copper: "atelier-timeline-step--copper",
} as const;

export function FirstRunFunnel() {
  const reducedMotion = useReducedMotion() ?? false;
  const { eyebrow, title, subtitle, steps } = launchTimeline;
  const { activeIndex, setRef, activate } = useScrollSection({
    count: steps.length,
    reducedMotion,
  });
  const preset = presetByTimelineIndex(activeIndex);
  const spineProgress = ((activeIndex + 1) / steps.length) * 100;

  return (
    <SectionContainer
      id="first-run"
      className="atelier-section atelier-section--timeline section-tint section-tint--dual pb-16 pt-6 lg:pb-24 lg:pt-10"
    >
      <div className="atelier-grid-lines" aria-hidden="true" />
      <div className="atelier-light atelier-light--sky" aria-hidden="true" />
      <div className="atelier-light atelier-light--gold" aria-hidden="true" />
      <div className="atelier-light atelier-light--moss" aria-hidden="true" />

      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          accent="blue"
          align="left"
          className="mb-12 max-w-2xl lg:mb-14"
        />
      </ScrollReveal>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
        <ol className="atelier-timeline relative">
          <div className="atelier-timeline__spine" aria-hidden="true" />
          <div
            className="atelier-timeline__spine-progress"
            style={{ height: `${spineProgress}%` }}
            aria-hidden="true"
          />
          {steps.map((step, index) => (
            <li
              key={step.time}
              ref={setRef(index)}
              className={`atelier-timeline-step ${accentClass[step.accent]} ${
                activeIndex === index ? "is-scroll-active" : ""
              }`}
              onClick={() => activate(index)}
              onKeyDown={(e) => e.key === "Enter" && activate(index)}
              tabIndex={0}
              role="button"
            >
              <span className="atelier-timeline-step__node" aria-hidden="true" />
              <span className="atelier-timeline-step__time font-mono">{step.time}</span>
              <h3 className="atelier-timeline-step__title font-serif">{step.title}</h3>
              <p className="atelier-timeline-step__desc">{step.description}</p>
              <ul className="atelier-proof-row">
                {step.proof.map((item) => (
                  <li key={item} className="atelier-glass-capsule">
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="atelier-sticky-demo lg:sticky lg:top-24">
          <div className="atelier-demo-glow" aria-hidden="true" />
          <div className="product-frame">
            <div className="product-frame__glow" aria-hidden="true" />
            <div className="product-frame__inner">
              <IDEWindow showThemePicker={false} preset={preset} />
            </div>
          </div>
          <div className="atelier-status-bar">
            <span className="atelier-glass-capsule atelier-glass-capsule--live">
              <span className="atelier-status-dot" aria-hidden="true" />
              {preset.activityLines[0]}
            </span>
            <span className="atelier-glass-capsule font-mono">{steps[activeIndex]?.time}</span>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
