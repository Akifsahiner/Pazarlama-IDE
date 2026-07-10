import { motion } from "framer-motion";
import type { MarketingPlanSuite } from "@shared/planPlaybooks";
import { getPlaybook } from "@shared/planPlaybooks";
import { BOTTLENECK_LABELS } from "@shared/bottleneck";
import { playbookTitle } from "@shared/gtmCatalog";
import { useApp } from "@renderer/state/store";
import { dur, ease } from "@renderer/design/tokens";

import { planStudioHeading } from "@shared/planLabels";

export function PlanStudioHero({
  plan,
  crystallizeBeat,
  previewMode = false,
}: {
  plan: MarketingPlanSuite;
  crystallizeBeat?: boolean;
  previewMode?: boolean;
}) {
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const thesis = plan.thesis ?? plan.positioning;
  const narrative = plan.narrativeHook ?? plan.strategyNote;
  const primaryPb = plan.primaryPlaybookId
    ? getPlaybook(plan, plan.primaryPlaybookId)
    : plan.playbooks[0];
  const primaryMetric = primaryPb?.primaryMetric;

  const lines = [thesis, narrative].filter(Boolean);
  const stagger = reducedMotion ? 0 : 0.04;

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-accent/20 bg-gradient-to-br from-accent-soft/30 via-surface to-surface p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-accent">
            {planStudioHeading(previewMode)}
          </div>
          {plan.primaryBottleneck && (
            <span className="rounded-full border border-accent/30 bg-accent-soft/30 px-2 py-0.5 text-[10px] text-accent">
              {BOTTLENECK_LABELS[plan.primaryBottleneck]?.split(" — ")[0] ?? plan.primaryBottleneck}
              {plan.primaryPlaybookId ? ` · ${playbookTitle(plan.primaryPlaybookId)}` : ""}
            </span>
          )}
        </div>
        {lines.map((line, i) => (
          <motion.p
            key={i}
            layoutId={i === 0 ? "plan-thesis" : undefined}
            initial={crystallizeBeat || reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * stagger, duration: dur.slow, ease: ease.standard }}
            className={
              i === 0
                ? "text-h3 font-semibold leading-snug text-text"
                : "max-w-2xl text-body-sm leading-relaxed text-text-2"
            }
          >
            {line}
          </motion.p>
        ))}
        {plan.bottleneckWhy && (
          <p className="text-mini text-text-2">{plan.bottleneckWhy}</p>
        )}
        {primaryMetric && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: lines.length * stagger, duration: dur.base }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft/40 px-3 py-1 text-micro text-text"
          >
            <span className="text-text-3">
              {primaryPb?.title ?? "Primary"} · {primaryMetric.name}
            </span>
            <span className="font-medium text-accent">{primaryMetric.target}</span>
          </motion.div>
        )}
      </div>
    </section>
  );
}
