import { SectionContainer } from "@/components/layout/SectionContainer";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { TonalBadge } from "@/components/ui/TonalBadge";
import { outcomeStrip } from "@/lib/tokens";

const pipeline = ["PROJECT", "PRODUCT MODEL", "LAUNCH SYSTEM", "APPROVED ACTIONS", "LIVE RESULTS"] as const;

export function OutcomeStrip() {
  const [lead, emphasis] = outcomeStrip.line.split("\u2014");

  return (
    <SectionContainer className="relative z-10 pt-14 pb-16 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24">
      <ScrollReveal>
        <div className="atelier-pipeline mb-10" aria-label="Launch pipeline">
          {pipeline.map((stage, index) => (
            <span key={stage} className="atelier-pipeline__stage">
              <span className="atelier-pipeline__label font-mono">{stage}</span>
              {index < pipeline.length - 1 && (
                <span className="atelier-pipeline__connector" aria-hidden="true" />
              )}
            </span>
          ))}
        </div>

        <div className="outcome-panel canvas-glass-panel mx-auto max-w-4xl px-7 py-9 md:px-11 md:py-11">
          <p className="mx-auto max-w-3xl text-center font-serif text-[26px] leading-[1.35] font-medium tracking-[-0.02em] text-ink md:text-[32px] lg:text-[34px]">
            {lead}
            {emphasis && (
              <>
                <span className="text-ink-3">{"\u2014"}</span>
                <span className="text-ink-2">{emphasis}</span>
              </>
            )}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {outcomeStrip.badges.map((badge) => (
              <TonalBadge key={badge.label} accent={badge.accent}>
                {badge.label}
              </TonalBadge>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </SectionContainer>
  );
}
