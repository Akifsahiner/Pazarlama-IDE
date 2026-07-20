import { OtherDownloads } from "@/components/download/OtherDownloads";
import { PlatformDownloadButton } from "@/components/download/PlatformDownloadButton";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { sections } from "@/lib/tokens";

export function FooterCTA() {
  const { title, subtitle } = sections.footerCta;

  return (
    <div
      className="canvas-footer-cta relative overflow-hidden border-t"
    >
      <SectionContainer>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-7 text-center">
          <ScrollReveal>
            <h2 className="font-serif text-4xl leading-[1.1] font-medium tracking-[-0.03em] text-ink lg:text-5xl">
              {title}
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <p className="max-w-lg text-base text-ink-2 md:text-lg">{subtitle}</p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="flex flex-col items-center gap-4">
              <PlatformDownloadButton animated={false} className="shimmer-button--hero" />
              <OtherDownloads tone="light" />
            </div>
          </ScrollReveal>
        </div>
      </SectionContainer>
    </div>
  );
}
