"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { sections } from "@/lib/tokens";

export function FAQ() {
  return (
    <SectionContainer id="faq">
      <ScrollReveal>
        <SectionHeading
          eyebrow={sections.faq.eyebrow}
          accent="blue"
          title={sections.faq.title}
          align="center"
          className="mb-12 lg:mb-14"
        />
      </ScrollReveal>
      <ScrollReveal>
        <div className="surface-card mx-auto max-w-3xl px-6 md:px-10">
          <Accordion.Root type="single" collapsible className="flex flex-col">
            {sections.faq.items.map((item, index) => (
              <Accordion.Item
                key={item.question}
                value={`item-${index}`}
                className="border-b border-black/6 last:border-b-0"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-6 text-left">
                    <span className="text-xl font-medium tracking-tight text-[#1A202C] lg:text-2xl">
                      {item.question}
                    </span>
                    <ChevronDown className="size-5 shrink-0 text-ink-muted transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-[var(--accent-blue)]" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <p className="max-w-[616px] pb-6 text-base leading-relaxed text-ink-secondary md:text-lg">
                    {item.answer}
                  </p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </ScrollReveal>
    </SectionContainer>
  );
}
