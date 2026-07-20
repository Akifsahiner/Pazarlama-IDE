import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import type {
  GrowthNarrative,
  StrategicDecision,
  StrategicOption,
  StrategicOptionId,
} from "@shared/types";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";
import { WhyPanel } from "@renderer/components/WhyPanel";

const POSTURE_LABEL: Record<StrategicOption["posture"], string> = {
  safe: "Safe foundation",
  balanced: "Balanced bet",
  category_attack: "Category attack",
};

function OptionCard({
  option,
  recommended,
  selected,
  onSelect,
}: {
  option: StrategicOption;
  recommended: boolean;
  selected: boolean;
  onSelect: (id: StrategicOptionId) => void;
}) {
  const target = option.thirty_day_target;
  return (
    <button
      type="button"
      onClick={() => option.eligible && onSelect(option.id)}
      disabled={!option.eligible}
      aria-pressed={selected}
      className={`rounded-[var(--radius-lg)] border p-4 text-left transition-colors ${
        selected
          ? "border-accent bg-accent-soft/60"
          : option.eligible
            ? "border-line bg-surface hover:border-accent/50"
            : "cursor-not-allowed border-line bg-surface-2 opacity-55"
      }`}
      data-testid={`strategic-option-${option.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-mini font-semibold text-text">
          {option.id}
        </span>
        <Badge tone="neutral">{POSTURE_LABEL[option.posture]}</Badge>
        {recommended && <Badge tone="accent">CMO recommends</Badge>}
      </div>
      <h3 className="mt-3 text-body font-semibold text-text">{option.title}</h3>
      {option.mechanism_label && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{option.mechanism_label}</Badge>
          {option.mechanism_summary && (
            <span className="text-[10px] text-text-3">{option.mechanism_summary}</span>
          )}
        </div>
      )}
      <p className="mt-1 text-mini text-text-2">{option.summary}</p>
      {option.mechanism_anti_pattern && (
        <p className="mt-2 rounded border border-warn/20 bg-warn-soft/10 px-2 py-1 text-[10px] text-text-2">
          Will not: {option.mechanism_anti_pattern}
        </p>
      )}
      <div className="mt-3 rounded-[var(--radius-md)] border border-line px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
            30-day target
          </span>
          <Badge tone={target.confidence === "measured" ? "ok" : target.confidence === "stretch" ? "warn" : "neutral"}>
            {target.confidence}
          </Badge>
        </div>
        <p className="mt-1 text-body-sm font-medium text-text">
          {target.target != null
            ? `${target.target} ${target.unit ?? target.metric_label}`
            : target.metric_label}
        </p>
        <p className="mt-1 text-[10px] text-text-3">{target.calibration_note}</p>
      </div>
      <div className="mt-3 space-y-1 text-mini">
        {option.tradeoffs.map((tradeoff, index) => (
          <div key={`${tradeoff.pro}-${index}`}>
            <p className="text-ok">+ {tradeoff.pro}</p>
            <p className="text-text-3">− {tradeoff.con}</p>
          </div>
        ))}
      </div>
      {!option.eligible && (
        <p className="mt-3 text-mini font-medium text-danger">{option.ineligible_reason}</p>
      )}
    </button>
  );
}

export function StrategicDecisionCard({
  narrative,
  decision,
  onSelect,
  onConfirm,
}: {
  narrative: GrowthNarrative;
  decision: StrategicDecision;
  onSelect: (id: StrategicOptionId) => void;
  onConfirm: (id: StrategicOptionId) => void;
}) {
  const selectedId = decision.selected_id ?? decision.recommended_id;
  const selected = decision.options.find((option) => option.id === selectedId)!;

  return (
    <Card
      className="border-accent/30 bg-accent-soft/10"
      role="region"
      aria-label="Strategic options"
      data-testid="strategic-decision-card"
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
        <LockKeyhole size={13} />
        Strategic decision
      </div>
      <p className="mt-3 text-mini font-semibold uppercase tracking-wide text-text-3">
        Cultural tension
      </p>
      <p className="mt-1 text-body-sm text-text-2">{narrative.cultural_tension}</p>
      <blockquote className="mt-3 border-l-2 border-accent pl-3 text-h3 font-semibold text-text">
        {narrative.one_liner}
      </blockquote>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {decision.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            recommended={option.id === decision.recommended_id}
            selected={option.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="mt-5 rounded-[var(--radius-lg)] border border-accent/25 bg-surface p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={15} className="text-accent" />
          <h3 className="text-body font-semibold text-text">
            Why Option {decision.recommended_id}
          </h3>
        </div>
        <ul className="mt-2 space-y-1 text-body-sm text-text-2">
          {decision.recommendation_rationale.map((reason) => (
            <li key={reason}>· {reason}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-line p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">From me</p>
          <ul className="mt-2 space-y-1 text-mini text-text-2">
            {selected.cmo_commits.map((commit) => (
              <li key={commit}>· {commit}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[var(--radius-md)] border border-line p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ok">From you</p>
          <ul className="mt-2 space-y-1 text-mini text-text-2">
            {selected.founder_commits.map((commit) => (
              <li key={commit}>· {commit}</li>
            ))}
          </ul>
        </div>
      </div>

      <WhyPanel
        dimensions={["business_model", "target_user", "activation_event", "founder_constraints"]}
        title="Evidence before you seal"
        defaultOpen
      />

      <div className="mt-5 flex justify-end">
        <Button
          variant="primary"
          onClick={() => onConfirm(selectedId)}
          iconRight={<ArrowRight size={15} />}
          data-testid="seal-strategic-decision"
        >
          Yes — {decision.decision_question}
        </Button>
      </div>
    </Card>
  );
}
