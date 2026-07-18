import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  FOUNDER_FIT_QUESTIONS,
  validateFounderFit,
  type FounderFitQuestionId,
} from "@shared/cmoFounderFit";
import type { FounderFitProfile } from "@shared/types";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";

export function FounderFitWizard({
  initial,
  onComplete,
}: {
  initial?: FounderFitProfile;
  onComplete: (profile: FounderFitProfile) => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    initial ? { ...initial } : {},
  );
  const question = FOUNDER_FIT_QUESTIONS[step]!;
  const value = answers[question.id] ?? "";
  const canContinue =
    question.id === "magic_moment" ? value.trim().length >= 12 : value.trim().length > 0;
  const progress = useMemo(
    () => Math.round(((step + 1) / FOUNDER_FIT_QUESTIONS.length) * 100),
    [step],
  );

  const setAnswer = (id: FounderFitQuestionId, next: string) =>
    setAnswers((current) => ({ ...current, [id]: next }));

  const continueFlow = () => {
    if (!canContinue) return;
    if (step < FOUNDER_FIT_QUESTIONS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    const profile = {
      ...answers,
      [question.id]: value,
      completed_at: new Date().toISOString(),
    } as unknown as FounderFitProfile;
    if (!validateFounderFit(profile)) onComplete(profile);
  };

  return (
    <Card
      className="border-accent/30 bg-accent-soft/10"
      role="region"
      aria-label="Founder-fit intake"
      data-testid="founder-fit-wizard"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            Founder fit · question {step + 1} of {FOUNDER_FIT_QUESTIONS.length}
          </div>
          <div className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Badge tone="neutral">~2 minutes</Badge>
      </div>

      <h2 className="mt-5 text-h3 text-text">{question.prompt}</h2>
      <p className="mt-1 text-body-sm text-text-2">{question.helper}</p>

      <div className="mt-4" data-testid={`founder-fit-step-${question.id}`}>
        {question.kind === "text" ? (
          <textarea
            value={value}
            onChange={(event) => setAnswer(question.id, event.target.value)}
            rows={4}
            autoFocus
            placeholder="Example: creates the first campaign brief and sees a measurable next action"
            className="w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-text outline-none focus:border-accent"
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {question.options?.map((option) => {
              const selected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAnswer(question.id, option.value)}
                  className={`rounded-[var(--radius-md)] border px-3 py-3 text-left text-body-sm transition-colors ${
                    selected
                      ? "border-accent bg-accent-soft text-text"
                      : "border-line bg-surface text-text-2 hover:border-accent/50"
                  }`}
                  aria-pressed={selected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="subtle"
          size="sm"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
        >
          <ArrowLeft size={14} className="mr-1" />
          Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={continueFlow}
          disabled={!canContinue}
          data-testid="founder-fit-continue"
        >
          {step === FOUNDER_FIT_QUESTIONS.length - 1 ? "Build strategic options" : "Continue"}
          <ArrowRight size={14} className="ml-1" />
        </Button>
      </div>
    </Card>
  );
}
