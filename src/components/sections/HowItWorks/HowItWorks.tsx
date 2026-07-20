"use client";

import { useReducedMotion } from "framer-motion";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { sections } from "@/lib/tokens";
import { useScrollSection } from "@/lib/useScrollSection";

const accentDot = {
  blue: "atelier-path-step--sky",
  orange: "atelier-path-step--gold",
  green: "atelier-path-step--moss",
} as const;

const pathIcons = ["{ }", "URL", "▣", "▤", "▥", "◎"] as const;

/** Execution Path — morphing pipeline, glass strips, zero pastel cards. */
export function HowItWorks() {
  const reducedMotion = useReducedMotion() ?? false;
  const { eyebrow, title, subtitle, steps } = sections.howItWorks;
  const { activeIndex, setRef } = useScrollSection({
    count: steps.length,
    reducedMotion,
  });

  return (
    <SectionContainer id="how-it-works" className="atelier-section atelier-section--path section-tint section-tint--tri pt-20 lg:pt-28">
      <div className="atelier-grid-lines" aria-hidden="true" />
      <div className="atelier-light atelier-light--sky" aria-hidden="true" />
      <div className="atelier-light atelier-light--ember" aria-hidden="true" />

      <ScrollReveal>
        <div className="mb-12 max-w-3xl lg:mb-14">
          <span className="tonal-badge tonal-badge-blue mb-4 inline-flex">{eyebrow}</span>
          <h2 className="font-serif text-4xl leading-[1.1] font-medium tracking-[-0.03em] text-ink lg:text-5xl">
            {title.split(" to ")[0]} to
          </h2>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink-2 lg:text-3xl">
            {title.split(" to ")[1] ?? "launch-ready"}
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2 md:text-lg">{subtitle}</p>
        </div>
      </ScrollReveal>

      <div className="atelier-execution-path mb-10" aria-hidden="true">
        <div className="atelier-execution-path__icons">
          {pathIcons.slice(0, steps.length).map((icon, i) => (
            <span
              key={icon}
              className={`atelier-execution-path__icon ${activeIndex >= i ? "is-lit" : ""}`}
            >
              {icon}
            </span>
          ))}
        </div>
      </div>

      <ol className="relative mx-auto flex max-w-3xl flex-col gap-3 pl-2">
        <div className="atelier-path-spine" aria-hidden="true" />
        {steps.map((step, index) => (
          <li
            key={step.title}
            ref={setRef(index)}
            className={`atelier-path-step ${accentDot[step.accent]} ${
              activeIndex === index ? "is-scroll-active" : ""
            }`}
          >
            <span className="atelier-path-step__node" aria-hidden="true" />
            <span className="atelier-path-step__index font-mono">STEP {index + 1}</span>
            <h3 className="atelier-path-step__title font-serif">{step.title}</h3>
            <p className="atelier-path-step__desc">{step.description}</p>
          </li>
        ))}
      </ol>
    </SectionContainer>
  );
}
