import { SectionContainer } from "@/components/layout/SectionContainer";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { TonalBadge } from "@/components/ui/TonalBadge";
import { outcomeStrip } from "@/lib/tokens";

export function OutcomeStrip() {
  return (
    <SectionContainer className="py-20 lg:py-28">
      <ScrollReveal>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
          <p className="font-serif text-[28px] leading-[1.35] font-medium tracking-[-0.02em] text-[#1A202C] md:text-[32px]">
            {outcomeStrip.line}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
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
