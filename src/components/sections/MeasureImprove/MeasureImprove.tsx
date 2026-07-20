"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { sections } from "@/lib/tokens";
import { NumberCounter } from "@/components/ui/NumberCounter";
import { useScrollSection } from "@/lib/useScrollSection";

const campaignNodes = [
  { id: "landing", label: "Landing page", metric: "Variant B +18.4%", accent: "sky" },
  { id: "ph", label: "Product Hunt", metric: "1,842 visits", accent: "action" },
  { id: "founder", label: "Founder posts", metric: "417 visits", accent: "gold" },
  { id: "influencer", label: "Influencer outreach", metric: "96 signups", accent: "moss" },
  { id: "email", label: "Email capture", metric: "31% signup rate", accent: "copper" },
  { id: "activation", label: "Activation", metric: "Next best move", accent: "action" },
] as const;

const accentMap = {
  sky: "atelier-campaign-node--sky",
  action: "atelier-campaign-node--action",
  gold: "atelier-campaign-node--gold",
  moss: "atelier-campaign-node--moss",
  copper: "atelier-campaign-node--copper",
} as const;

const channelFilter: Record<string, string | null> = {
  landing: "Direct",
  ph: "Product Hunt",
  founder: "LinkedIn",
  influencer: null,
  email: null,
  activation: null,
};

export function MeasureImprove() {
  const { eyebrow, title, subtitle, stats, channels, insight } = sections.measure;
  const reducedMotion = useReducedMotion() ?? false;
  const { activeIndex, setRef, activate } = useScrollSection({
    count: campaignNodes.length,
    reducedMotion,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeNode = campaignNodes[activeIndex];
  const filterChannel = selectedId ? channelFilter[selectedId] : channelFilter[activeNode?.id ?? "ph"];
  const maxVisits = Math.max(...channels.map((c) => c.visits));

  return (
    <SectionContainer fullBleed className="atelier-section atelier-section--campaign section-tint section-tint--green">
      <div className="atelier-grid-lines" aria-hidden="true" />
      <div className="atelier-light atelier-light--moss" aria-hidden="true" />
      <div className="atelier-light atelier-light--ember" aria-hidden="true" />
      <div className="atelier-light atelier-light--sky" aria-hidden="true" />

      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          accent="green"
          align="left"
          className="mb-12 max-w-2xl lg:mb-14"
        />
      </ScrollReveal>

      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="atelier-campaign-map">
          <div className="atelier-campaign-map__spine" aria-hidden="true" />
          {campaignNodes.map((node, index) => (
            <div
              key={node.id}
              ref={setRef(index)}
              role="button"
              tabIndex={0}
              onClick={() => {
                activate(index);
                setSelectedId(node.id);
              }}
              onKeyDown={(e) => e.key === "Enter" && setSelectedId(node.id)}
              className={`atelier-campaign-node ${accentMap[node.accent]} ${
                activeIndex === index || selectedId === node.id ? "is-scroll-active" : ""
              }`}
            >
              <span className="atelier-campaign-node__dot" aria-hidden="true" />
              <div>
                <p className="font-serif text-[18px] tracking-[-0.02em] text-ink">{node.label}</p>
                <p className="mt-0.5 font-mono text-[12px] text-ink-2">{node.metric}</p>
              </div>
              {index < campaignNodes.length - 1 && (
                <span className="atelier-campaign-node__arrow" aria-hidden="true">
                  ↓
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col divide-y divide-[var(--canvas-warm-line)]">
            {stats.map((stat) => (
              <ScrollReveal key={stat.label} delay={0.05}>
                <div className="flex flex-col gap-1.5 py-6 first:pt-0 last:pb-0">
                  <div className="flex items-baseline gap-3">
                    <NumberCounter
                      value={stat.value}
                      className="font-serif text-5xl font-medium tracking-tight text-blue lg:text-6xl"
                    />
                    <span className="text-lg font-normal text-ink-3 lg:text-xl">{stat.label}</span>
                  </div>
                  <p className="max-w-md text-sm leading-relaxed text-ink-2">{stat.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.1}>
            <div className="canvas-glass-panel p-6 md:p-8">
              <div className="mb-5 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-ink">Channel attribution</h4>
                <span className="font-mono text-[10px] text-ink-3">last 7 days</span>
              </div>
              <div className="flex flex-col gap-3.5">
                {channels.map((channel) => {
                  const rate = ((channel.signups / channel.visits) * 100).toFixed(1);
                  const highlighted = filterChannel === channel.name;
                  return (
                    <div
                      key={channel.name}
                      className={`flex flex-col gap-1.5 rounded-lg p-2 transition-colors ${
                        highlighted ? "bg-blue-soft/50 ring-1 ring-blue/20" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-ink">{channel.name}</span>
                        <span className="text-ink-3">
                          {channel.visits} visits ·{" "}
                          <span className="font-medium text-green">{rate}%</span> signup
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,252,245,0.65)]">
                        <div
                          className="h-full rounded-full bg-blue"
                          style={{ width: `${(channel.visits / maxVisits) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 rounded-xl border border-blue/15 bg-blue-soft/40 p-3">
                <p className="text-xs leading-relaxed text-ink-2">{insight}</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </SectionContainer>
  );
}
