"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { IDEWindow } from "@/components/ide-ui/IDEWindow";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { launchTimeline } from "@/lib/tokens";

const accentClass = {
  sky: "atelier-timeline-step--sky",
  moss: "atelier-timeline-step--moss",
  gold: "atelier-timeline-step--gold",
  action: "atelier-timeline-step--action",
  copper: "atelier-timeline-step--copper",
} as const;

/** Launch Timeline — vertical clock + sticky product window (Launch Atelier). */
export function FirstRunFunnel() {
  const reducedMotion = useReducedMotion() ?? false;
  const [active, setActive] = useState(0);
  const { eyebrow, title, subtitle, steps } = launchTimeline;

  return (
    <SectionContainer
      id="first-run"
      className="atelier-section atelier-section--timeline section-tint section-tint--dual pb-16 pt-6 lg:pb-24 lg:pt-10"
    >
      <div className="atelier-grid-lines" aria-hidden="true" />

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

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <ol className="atelier-timeline relative">
          <div className="atelier-timeline__spine" aria-hidden="true" />
          {steps.map((step, index) => (
            <motion.li
              key={step.time}
              className={`atelier-timeline-step ${accentClass[step.accent]} ${active === index ? "is-active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              tabIndex={0}
              initial={false}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
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
            </motion.li>
          ))}
        </ol>

        <div className="atelier-sticky-demo lg:sticky lg:top-24">
          <div className="atelier-demo-glow" aria-hidden="true" />
          <div className="product-frame">
            <div className="product-frame__glow" aria-hidden="true" />
            <div className="product-frame__inner">
              <IDEWindow showThemePicker={false} interactive={!reducedMotion} />
            </div>
          </div>
          <div className="atelier-status-bar">
            <span className="atelier-glass-capsule atelier-glass-capsule--live">
              <span className="atelier-status-dot" aria-hidden="true" />
              {steps[active]?.proof[0] ?? "Live workspace"}
            </span>
            <span className="atelier-glass-capsule font-mono">{steps[active]?.time}</span>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
