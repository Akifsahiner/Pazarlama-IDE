"use client";

import { SectionContainer } from "@/components/layout/SectionContainer";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { DiffViewer } from "@/components/ide-ui/DiffViewer";
import { LivePreviewCard } from "./LivePreviewCard";

/** Dark Launch Workbench — approval as control surface, blue CTA. */
export function ExecuteTogether() {
  return (
    <section className="atelier-workbench-dark">
      <div className="atelier-workbench-dark__glow atelier-workbench-dark__glow--blue" aria-hidden="true" />
      <div className="atelier-workbench-dark__glow atelier-workbench-dark__glow--ember" aria-hidden="true" />

      <SectionContainer className="relative z-[1] !py-20 lg:!py-28">
        <ScrollReveal>
          <div className="mb-12 max-w-3xl lg:mb-14">
            <p className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/45 uppercase">
              Full control
            </p>
            <h2 className="font-serif text-[36px] leading-[1.08] font-medium tracking-[-0.03em] text-white md:text-[48px]">
              Approval is the control surface
            </h2>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/68">
              Cursor-style diffs for your marketing — preview in a live browser, then approve, edit, or reject.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <ScrollReveal delay={0.05}>
            <div className="atelier-dark-panel flex h-full flex-col p-6 lg:p-8">
              <DiffViewer />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="atelier-dark-panel atelier-dark-panel--glass flex h-full flex-col p-6 lg:p-8">
              <LivePreviewCard />
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.15} className="mt-8 flex flex-wrap gap-2">
          <span className="atelier-glass-capsule atelier-glass-capsule--dark">✓ Diff reviewed</span>
          <span className="atelier-glass-capsule atelier-glass-capsule--dark">✓ Live preview open</span>
          <span className="atelier-glass-capsule atelier-glass-capsule--dark atelier-glass-capsule--pending">
            ● Waiting for approval
          </span>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
