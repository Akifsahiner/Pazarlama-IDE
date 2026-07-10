import { Check } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@renderer/state/store";
import {
  CAMPAIGN_PHASE_LABELS,
  CAMPAIGN_TIMELINE_STEPS,
  campaignTimelineStepIndex,
  isCampaignTimelineStepActive,
  isCampaignTimelineStepComplete,
} from "@shared/campaignSession";

/**
 * Thread header — campaign lifecycle intake → plan → execute → measure.
 * Milestones from the persisted session appear as a compact trail below.
 */
export function CampaignTimeline() {
  const session = useApp((s) => s.marketingProfile?.campaign_session ?? null);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);

  const milestones = useMemo(() => {
    if (!session) return [];
    return session.milestones.slice(-6);
  }, [session]);

  if (!session) return null;

  const currentStep = campaignTimelineStepIndex(session.phase);

  return (
    <div
      className="border-b border-line bg-surface-2/60 px-4 py-3"
      data-testid="campaign-timeline"
      role="region"
      aria-label="Campaign timeline"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-micro font-medium text-text">{session.goal}</span>
        <span className="shrink-0 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          {CAMPAIGN_PHASE_LABELS[session.phase]}
        </span>
      </div>

      <ol className="flex items-center gap-1" aria-label="Campaign phases">
        {CAMPAIGN_TIMELINE_STEPS.map((step, idx) => {
          const complete = isCampaignTimelineStepComplete(idx, session.phase);
          const active = isCampaignTimelineStepActive(idx, session.phase);
          const past = idx < currentStep;
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold transition-colors ${
                    complete || past
                      ? "border-accent bg-accent text-surface"
                      : active
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line-2 bg-surface text-text-3"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {complete || past ? <Check size={10} strokeWidth={3} /> : idx + 1}
                </span>
                <span
                  className={`truncate text-[9px] font-medium uppercase tracking-wide ${
                    active ? "text-text" : complete || past ? "text-text-2" : "text-text-3"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < CAMPAIGN_TIMELINE_STEPS.length - 1 && (
                <div
                  className={`mb-3 h-px w-full min-w-[8px] flex-1 ${
                    idx < currentStep ? "bg-accent/50" : "bg-line"
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {milestones.length >= 2 && (
        <ul
          className="mt-2.5 flex flex-wrap gap-1.5"
          aria-label="Recent campaign milestones"
        >
          {milestones.map((m, i) => (
            <li
              key={`${m.at}-${m.label}-${i}`}
              className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] text-text-3"
              title={new Date(m.at).toLocaleString()}
            >
              {m.label}
            </li>
          ))}
        </ul>
      )}

      {!reducedMotion &&
        (session.phase === "executing" || session.phase === "reviewing") && (
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent/60" />
        </div>
      )}
    </div>
  );
}
