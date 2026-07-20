"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { sections } from "@/lib/tokens";

export function FAQ() {
  return (
    <SectionContainer id="faq" className="section-tint section-tint--tri">
      <ScrollReveal>
        <SectionHeading
          eyebrow={sections.faq.eyebrow}
          title={sections.faq.title}
          accent="orange"
          align="center"
          className="mb-12 lg:mb-14"
        />
      </ScrollReveal>
      <ScrollReveal>
        <div className="mx-auto max-w-3xl">
          <Accordion.Root type="single" collapsible className="flex flex-col">
            {sections.faq.items.map((item, index) => (
              <Accordion.Item
                key={item.question}
                value={`item-${index}`}
                className="faq-item border-t last:border-b"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="faq-trigger group flex w-full items-center justify-between gap-4 py-5 text-left">
                    <span className="text-base font-medium tracking-tight text-ink">
                      {item.question}
                    </span>
                    <ChevronDown className="faq-chevron size-5 shrink-0 text-ink-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <p className="max-w-[616px] pb-5 text-sm leading-relaxed text-ink-2">
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
