import { ShimmerButton } from "@/components/ui/ShimmerButton";
import { TonalBadge } from "@/components/ui/TonalBadge";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { heroCopy, sections } from "@/lib/tokens";

export function FooterCTA() {
  const { title, subtitle } = sections.footerCta;

  return (
    <SectionContainer className="footer-cta-section py-28 lg:py-36">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
        <ScrollReveal>
          <TonalBadge accent="green">Ready to launch</TonalBadge>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h2 className="font-serif text-4xl leading-[1.1] font-medium tracking-[-0.03em] text-[#1A202C] lg:text-5xl">
            {title}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="max-w-lg text-base text-ink-secondary md:text-lg">{subtitle}</p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <ShimmerButton label={heroCopy.cta} animated={false} />
        </ScrollReveal>
      </div>
    </SectionContainer>
  );
}
