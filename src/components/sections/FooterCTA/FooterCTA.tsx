import { OtherDownloads } from "@/components/download/OtherDownloads";
import { PlatformDownloadButton } from "@/components/download/PlatformDownloadButton";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { sections } from "@/lib/tokens";

export function FooterCTA() {
  const { title, subtitle } = sections.footerCta;

  return (
    <div
      className="relative overflow-hidden border-t border-line bg-surface-2"
      style={{
        backgroundImage: [
          "radial-gradient(60% 90% at 50% -10%, rgba(45,111,240,0.16) 0%, transparent 60%)",
          "radial-gradient(40% 80% at 12% 110%, rgba(232,132,58,0.10) 0%, transparent 60%)",
          "radial-gradient(40% 80% at 90% 110%, rgba(31,157,87,0.10) 0%, transparent 60%)",
        ].join(", "),
      }}
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
