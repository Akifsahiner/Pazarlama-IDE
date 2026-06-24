import { SectionContainer } from "@/components/layout/SectionContainer";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { founderQuote } from "@/lib/tokens";

export function OutcomeQuote() {
  return (
    <SectionContainer>
      <ScrollReveal>
        <figure className="mx-auto max-w-3xl text-center">
          <blockquote className="font-serif text-2xl leading-[1.35] font-medium tracking-[-0.02em] text-[#1A202C] md:text-3xl">
            &ldquo;{founderQuote.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-8 text-sm text-ink-muted">
            {founderQuote.author}
          </figcaption>
        </figure>
      </ScrollReveal>
    </SectionContainer>
  );
}
