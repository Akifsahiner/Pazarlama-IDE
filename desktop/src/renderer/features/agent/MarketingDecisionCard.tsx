import { useMemo, useState } from "react";
import {
  ChevronDown,
  ListChecks,
  Sparkles,
  Target,
  TimerReset,
} from "lucide-react";
import type { MarketingCritique, MarketingDecision } from "@shared/types";
import { playbookTitle } from "@shared/gtmCatalog";
import { estimateDecisionEffort } from "@shared/effortEstimate";
import { nextActionableTask } from "@shared/planProgress";
import { normalizePlan } from "@shared/planPlaybooks";
import { useApp } from "@renderer/state/store";
import { DecisionActions } from "./DecisionActions";
import { CritiquePanel } from "./CritiquePanel";
import { DecisionQualityBadge } from "@renderer/components/DecisionQualityBadge";
import { EffortBadge } from "@renderer/components/EffortBadge";
import { PeakDayWarning } from "@renderer/components/PeakDayWarning";
import { FeedbackThumbs } from "@renderer/components/FeedbackThumbs";
import { GtmTacticTeachCard } from "./GtmTacticTeachCard";
import { DraftAssetPreview } from "./DraftAssetPreview";
import { WhyPanel } from "@renderer/components/WhyPanel";

interface MarketingDecisionCardProps {
  decision: MarketingDecision;
  critique?: MarketingCritique;
  summary?: string;
  eventId?: string;
  projectId?: string;
  skillId?: string;
  discipline?: string;
}

/** Structured render of a Marketing Brain decision (diagnose → decide → deliver). */
export function MarketingDecisionCard({
  decision,
  critique,
  summary,
  eventId,
  projectId,
  skillId,
  discipline,
}: MarketingDecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const plan = useApp((s) => s.plan);
  const planProgress = useApp((s) => s.planProgress);
  const marketingProfile = useApp((s) => s.marketingProfile);

  const effort = useMemo(() => {
    const suite = plan ? normalizePlan(plan) : null;
    const next =
      suite && planProgress ? nextActionableTask(suite, planProgress.byTaskId) : null;
    return estimateDecisionEffort(decision, {
      plan,
      daysUntilLaunch: marketingProfile?.days_until_launch,
      nextTaskId: next?.id,
      byTaskId: planProgress
        ? Object.fromEntries(
            Object.entries(planProgress.byTaskId).map(([id, row]) => [id, { status: row.status }]),
          )
        : undefined,
    });
  }, [decision, plan, planProgress, marketingProfile?.days_until_launch]);

  return (
    <div className="max-w-[98%] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-micro uppercase tracking-wide text-accent">
            <Sparkles size={12} /> Decision
            <DecisionQualityBadge critique={critique} />
            {decision.recommended_aggression && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal ${
                  decision.recommended_aggression === "aggressive"
                    ? "bg-warn/15 text-warn"
                    : decision.recommended_aggression === "conservative"
                      ? "bg-elevated text-text-2"
                      : "bg-accent-soft/30 text-accent"
                }`}
              >
                {decision.recommended_aggression}
              </span>
            )}
            <EffortBadge
              label={effort.label}
              intensity={effort.intensity}
              compact
              title="Founder execution estimate from tactic stack or live plan"
            />
            {effort.peakDay && <PeakDayWarning peak={effort.peakDay} compact />}
          </div>
          <p className="mt-1 line-clamp-2 text-body-sm font-medium text-text">{decision.decision}</p>
          {summary && !expanded && (
            <p className="mt-0.5 line-clamp-1 text-mini text-text-2">{summary}</p>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`mt-1 shrink-0 text-text-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
          {summary && <p className="text-body-sm leading-relaxed text-text-2">{summary}</p>}
          {critique && <CritiquePanel critique={critique} />}

          {decision.honest_ceiling && (
            <div className="rounded-[var(--radius-md)] border border-warn/30 bg-warn/5 px-3 py-2 text-mini text-text-2">
              <span className="font-medium text-warn">Honest ceiling:</span> {decision.honest_ceiling}
            </div>
          )}

          {effort.peakDay && <PeakDayWarning peak={effort.peakDay} />}

          {decision.tactic_stack && decision.tactic_stack.length > 0 && (
            <details className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2" open>
              <summary className="cursor-pointer text-mini font-medium text-text">
                Tactic stack ({decision.tactic_stack.length})
              </summary>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                {decision.tactic_stack.map((t, i) => (
                  <li key={`${t.id}-${i}`} className="text-body-sm text-text-2">
                    {t.phase && (
                      <span className="mr-1.5 rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-3">
                        {t.phase}
                      </span>
                    )}
                    <span className="text-text">{t.action}</span>
                    {t.id && (
                      <span className="ml-1 font-mono text-[10px] text-text-3">{t.id}</span>
                    )}
                    {t.metric && (
                      <span className="mt-0.5 block text-micro text-text-3">Metric: {t.metric}</span>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          )}

      <div>
        <div className="text-micro uppercase tracking-wide text-text-3">Diagnosis</div>
        <p className="mt-1 text-body-sm text-text-2">{decision.diagnosis}</p>
      </div>

      <div>
        <div className="text-micro uppercase tracking-wide text-text-3">Bottleneck</div>
        <p className="mt-1 text-body-sm text-text">{decision.bottleneck}</p>
        {decision.gtm_bottleneck && (
          <div className="mt-2 space-y-1 rounded-[var(--radius-md)] border border-accent/20 bg-accent-soft/10 px-3 py-2">
            <p className="text-mini text-accent">
              GTM focus · {decision.gtm_bottleneck}
              {decision.primary_playbook_id
                ? ` → ${playbookTitle(decision.primary_playbook_id)}`
                : ""}
            </p>
            {decision.bottleneck_why && (
              <p className="text-micro text-text-2">{decision.bottleneck_why}</p>
            )}
            {decision.tactic_you_may_not_know && (
              <p className="text-micro text-text">
                <span className="font-medium text-warn">Tactic to learn:</span>{" "}
                {decision.tactic_you_may_not_know}
              </p>
            )}
            <GtmTacticTeachCard
              tacticLabel={decision.tactic_you_may_not_know}
              playbookId={decision.primary_playbook_id}
            />
            {decision.channel_priority && decision.channel_priority.length > 1 && (
              <p className="text-[10.5px] text-text-3">
                Channel order: {decision.channel_priority.map(playbookTitle).join(" → ")}
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="text-micro uppercase tracking-wide text-text-3">Decision</div>
        <p className="mt-1 text-[14px] font-medium text-text">{decision.decision}</p>
        <p className="mt-1 text-body-sm text-text-2">{decision.rationale}</p>
      </div>

      {(decision.claim_citations?.length ?? 0) > 0 && (
        <WhyPanel
          graph={{
            version: 1,
            project_id: projectId ?? "decision",
            computed_at: new Date().toISOString(),
            claims: decision.claim_citations!.map((c) => ({
              dimension: c.dimension as import("@shared/productUnderstandingInput").ProductUnderstandingDimension,
              value: c.field ?? c.dimension,
              confidence: c.confidence,
              evidence: c.evidence_refs.map((e) => ({
                ...e,
                kind: e.kind as import("@shared/productUnderstandingInput").EvidenceSourceKind,
              })),
              updated_at: new Date().toISOString(),
            })),
          }}
          title="Sources for this decision"
          defaultOpen
        />
      )}

      {decision.options_compared.length > 1 && (
        <details className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2">
          <summary className="cursor-pointer text-mini text-text-2">
            Options compared ({decision.options_compared.length})
          </summary>
          <div className="mt-2 space-y-2">
            {decision.options_compared.map((o, i) => (
              <div key={i} className="rounded-[var(--radius-sm)] border border-line px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-text">{o.name}</span>
                  <span className="text-micro text-text-3">fit {o.fit_score}/10</span>
                </div>
                {o.pros.length > 0 && (
                  <div className="mt-1 text-mini text-ok">+ {o.pros.join(" · ")}</div>
                )}
                {o.cons.length > 0 && (
                  <div className="text-mini text-danger">− {o.cons.join(" · ")}</div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {decision.ready_to_use_assets.length > 0 && (
        <div>
          <div className="mb-1.5 text-micro uppercase tracking-wide text-text-3">
            Ready to use
          </div>
          <div className="space-y-2">
            {decision.ready_to_use_assets.map((a, i) => (
              <DraftAssetPreview key={i} asset={a} maxHeight="max-h-72" />
            ))}
          </div>
        </div>
      )}

      {decision.next_steps.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-micro uppercase tracking-wide text-text-3">
            <ListChecks size={12} /> Next steps
          </div>
          <ul className="space-y-1.5">
            {decision.next_steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-text-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>
                  <span className="text-text">{s.step}</span>
                  {(s.owner || s.eta) && (
                    <span className="ml-2 text-text-3">
                      {s.owner ? `· ${s.owner}` : ""}{s.eta ? ` · ${s.eta}` : ""}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2">
        <Target size={13} className="text-accent" />
        <div className="min-w-0 flex-1">
          <div className="text-micro uppercase tracking-wide text-text-3">Success metric</div>
          <div className="text-body-sm text-text">
            <span className="font-medium">{decision.success_metric.name}</span>
            <span className="text-text-2"> · target {decision.success_metric.target}</span>
          </div>
        </div>
      </div>

      {decision.when_to_reconsider && (
        <div className="flex items-start gap-2 text-micro italic text-text-3">
          <TimerReset size={12} className="mt-0.5 shrink-0" />
          When to reconsider: {decision.when_to_reconsider}
        </div>
      )}

      {decision.missing_info.length > 0 && (
        <div className="rounded-[var(--radius-md)] border border-warn/40 bg-warn/[0.06] p-2.5">
          <div className="text-micro font-medium uppercase tracking-wide text-warn">
            Tell me to make this 10x better
          </div>
          <ul className="mt-1 space-y-0.5 text-body-sm text-text-2">
            {decision.missing_info.map((q, i) => (
              <li key={i}>• {q}</li>
            ))}
          </ul>
        </div>
      )}

      <DecisionActions decision={decision} />
      {eventId && (
        <FeedbackThumbs
          targetKind="decision"
          targetId={eventId}
          projectId={projectId}
          skillId={skillId}
          discipline={discipline}
          tacticApplied={decision.tactic_stack?.map((t) => t.id).filter(Boolean)}
        />
      )}
        </div>
      )}
    </div>
  );
}

/** Try to detect a Marketing Decision JSON payload inside an asset's `after` field. */
export function tryParseDecision(content: string | undefined): MarketingDecision | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (
      typeof obj === "object" &&
      obj !== null &&
      "decision" in obj &&
      "diagnosis" in obj &&
      "next_steps" in obj
    ) {
      return obj as MarketingDecision;
    }
  } catch {
    /* not JSON */
  }
  return null;
}
