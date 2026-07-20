"use client";

import { SectionContainer } from "@/components/layout/SectionContainer";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { DiffViewer } from "@/components/ide-ui/DiffViewer";
import { sections } from "@/lib/tokens";
import { LivePreviewCard } from "./LivePreviewCard";

export function ExecuteTogether() {
  const { diff } = sections.execute;

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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(0,0.75fr)_1fr] lg:gap-5">
          <ScrollReveal delay={0.05}>
            <div className="atelier-dark-panel flex h-full min-h-[280px] flex-col p-5 lg:p-6">
              <p className="mb-3 font-mono text-[10px] tracking-wider text-white/40 uppercase">Diff</p>
              <DiffViewer />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <div className="atelier-dark-panel flex h-full flex-col justify-center p-5 lg:p-6">
              <p className="font-mono text-[10px] tracking-wider text-white/40 uppercase">Change</p>
              <p className="mt-2 font-mono text-xs text-white/50">{diff.file}</p>
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                <span className="block text-red-300/80 line-through">{diff.removed}</span>
                <span className="mt-2 block text-green-300/90">{diff.added}</span>
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className="shimmer-button shimmer-button--compact rounded-lg px-4 py-2 text-xs font-semibold text-white">
                  Accept
                </button>
                <button type="button" className="atelier-glass-capsule atelier-glass-capsule--dark px-4 py-2">
                  Edit
                </button>
                <button type="button" className="atelier-glass-capsule atelier-glass-capsule--dark px-4 py-2 text-white/60">
                  Reject
                </button>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="atelier-dark-panel atelier-dark-panel--glass flex h-full flex-col p-5 lg:p-6">
              <LivePreviewCard dark />
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
