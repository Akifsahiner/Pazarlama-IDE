import { SectionContainer } from "@/components/layout/SectionContainer";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { TonalBadge } from "@/components/ui/TonalBadge";
import { outcomeStrip } from "@/lib/tokens";

export function OutcomeStrip() {
  const [lead, emphasis] = outcomeStrip.line.split("\u2014");

  return (
    <SectionContainer className="relative z-10 pt-14 pb-16 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24">
      <ScrollReveal>
        <div className="outcome-panel mx-auto max-w-4xl rounded-[28px] border border-white/80 bg-white/76 px-7 py-9 shadow-[0_28px_90px_rgba(54,99,150,0.1),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl md:px-11 md:py-11">
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
