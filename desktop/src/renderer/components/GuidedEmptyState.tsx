import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Button } from "./ui/Button";

interface Action {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export interface GuidedEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  steps?: string[];
  /** When set, marks completed steps and shows Step X of Y. */
  stepDone?: boolean[];
  primaryAction?: Action;
  secondaryAction?: Action;
}

/** Empty state with numbered unlock steps — Cursor-style clarity. */
export function GuidedEmptyState({
  icon,
  title,
  description,
  steps,
  stepDone,
  primaryAction,
  secondaryAction,
}: GuidedEmptyStateProps) {
  const completed = stepDone?.filter(Boolean).length ?? 0;
  const total = steps?.length ?? 0;
  const progressLabel =
    stepDone && total > 0 ? `Step ${Math.min(completed + 1, total)} of ${total}` : undefined;

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={
        progressLabel && description
          ? `${progressLabel} · ${description}`
          : progressLabel ?? description
      }
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
    >
      {steps && steps.length > 0 && (
        <ol className="w-full max-w-md space-y-2 text-left">
          {steps.map((step, i) => {
            const done = stepDone?.[i] === true;
            return (
            <li
              key={step}
              className={`flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2 ${
                done ? "border-ok/30 bg-ok/5" : "border-line/80 bg-surface-2/60"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  done ? "bg-ok/15 text-ok" : "bg-accent-soft text-accent"
                }`}
              >
                {done ? <Check size={11} /> : i + 1}
              </span>
              <span className={`text-body-sm ${done ? "text-text-3 line-through" : "text-text-2"}`}>
                {step}
              </span>
            </li>
            );
          })}
        </ol>
      )}
    </EmptyState>
  );
}

/** Compact unlock panel for locked work-surface tabs. */
export function SurfaceUnlockPanel({
  guide,
  onPrimary,
  onSecondary,
  onDismiss,
  stepDone,
}: {
  guide: import("@shared/surfaceUnlock").SurfaceUnlockGuide;
  onPrimary: () => void;
  onSecondary?: () => void;
  onDismiss?: () => void;
  stepDone?: boolean[];
}) {
  const completed = stepDone?.filter(Boolean).length ?? 0;
  const total = guide.steps.length;
  return (
    <div className="border-b border-accent/20 bg-accent-soft/10 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              Unlock · {guide.shortLabel}
            </div>
            {total > 0 && (
              <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] text-text-3">
                Step {Math.min(completed + 1, total)} of {total}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-body-sm font-medium text-text">{guide.unlockTitle}</p>
          <p className="mt-0.5 text-mini text-text-2">{guide.unlockReason}</p>
          <ol className="mt-2 space-y-1">
            {guide.steps.map((step, i) => {
              const done = stepDone?.[i] === true;
              return (
              <li key={step} className="flex items-start gap-2 text-mini text-text-2">
                {done ? (
                  <Check size={12} className="mt-0.5 shrink-0 text-ok" />
                ) : (
                  <span className="mt-0.5 w-3 shrink-0 text-center text-[10px] font-medium text-text-3">
                    {i + 1}
                  </span>
                )}
                <span className={done ? "text-text-3 line-through" : undefined}>
                  {step}
                </span>
              </li>
              );
            })}
          </ol>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button variant="primary" size="sm" iconRight={<ArrowRight size={13} />} onClick={onPrimary}>
            {guide.primaryLabel}
          </Button>
          {guide.secondaryLabel && onSecondary && (
            <Button variant="ghost" size="sm" onClick={onSecondary}>
              {guide.secondaryLabel}
            </Button>
          )}
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="text-[10px] text-text-3 hover:text-text-2">
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
