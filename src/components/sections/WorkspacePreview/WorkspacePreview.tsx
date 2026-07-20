"use client";

import { IDEWindow } from "@/components/ide-ui/IDEWindow";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { sections } from "@/lib/tokens";

function SnapshotCard() {
  const { snapshot } = sections.workspace;
  const rows = [
    ["Product type", snapshot.productType],
    ["Framework", snapshot.framework],
    ["Core action", snapshot.coreAction],
    ["Audience", snapshot.audience],
  ];

  return (
    <div className="card-blue card-hover flex flex-col gap-3 p-5">
      <h4 className="text-sm font-semibold text-ink">{snapshot.label}</h4>
      <dl className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="text-xs font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function readinessColor(score: number) {
  if (score >= 70) return "var(--green)";
  if (score >= 45) return "var(--orange)";
  return "var(--ink-3)";
}

function ReadinessCard() {
  const { readiness } = sections.workspace;

  return (
    <div className="card-green card-hover flex flex-col gap-3 p-5">
      <h4 className="text-sm font-semibold text-ink">Launch readiness</h4>
      <div className="flex flex-col gap-2.5">
        {readiness.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-2">{item.label}</span>
              <span className="font-mono text-[10px]" style={{ color: readinessColor(item.score) }}>
                {item.score}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,252,245,0.65)]">
              <div
                className="canvas-brush-bar h-full rounded-full"
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkspacePreview() {
  const { eyebrow, title, subtitle } = sections.workspace;

  return (
    <SectionContainer id="workspace" className="section-tint section-tint--blue">
      <ScrollReveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          accent="blue"
          align="center"
          className="mb-12 lg:mb-14"
        />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="product-frame">
          <div className="product-frame__glow" aria-hidden="true" />
          <div className="product-frame__inner">
            <IDEWindow showThemePicker={false} />
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15} className="mt-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SnapshotCard />
          <ReadinessCard />
        </div>
      </ScrollReveal>
    </SectionContainer>
  );
}
