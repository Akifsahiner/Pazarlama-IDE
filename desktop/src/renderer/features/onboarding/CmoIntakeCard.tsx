import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import type { ChannelThesis, CmoWeek1Priority } from "@shared/cmoIntake";
import { getMechanismRecord } from "@shared/cmoGrowthMechanismKnowledge";
import type { GrowthMechanismId } from "@shared/cmoGrowthMechanismKnowledge";
import type { GrowthNarrative, StrategicDecision } from "@shared/types";
import { BOTTLENECK_LABELS } from "@shared/bottleneck";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";

const VERDICT_TONE: Record<
  ChannelThesis["verdict"],
  { icon: typeof CheckCircle2; tone: string; label: string }
> = {
  marketable: { icon: CheckCircle2, tone: "text-ok", label: "Marketable" },
  needs_work: { icon: AlertTriangle, tone: "text-warn", label: "Needs work" },
  not_ready: { icon: XCircle, tone: "text-danger", label: "Not ready" },
};

const OWNER_LABEL = {
  system: "IDE ships",
  user: "You execute",
  delegate: "Delegate",
} as const;

function Week1Row({ p, index }: { p: CmoWeek1Priority; index: number }) {
  return (
    <li className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold tabular-nums text-text-3">#{index + 1}</span>
        <Badge tone={p.owner === "system" ? "accent" : p.owner === "user" ? "marketing" : "warn"}>
          {OWNER_LABEL[p.owner]}
        </Badge>
      </div>
      <p className="mt-1 text-body-sm font-medium text-text">{p.what}</p>
      <p className="mt-0.5 text-mini text-text-2">{p.why}</p>
      <p className="mt-1.5 text-[10px] text-text-3">
        <span className="font-semibold uppercase tracking-wide">Done when</span> · {p.done_when}
      </p>
    </li>
  );
}

export function CmoIntakeCard({
  thesis,
  onStartWeek1,
  onFullPlan,
  compact = false,
  narrative,
  strategicDecision,
  week1BlockedReason,
}: {
  thesis: ChannelThesis;
  onStartWeek1?: () => void;
  onFullPlan?: () => void;
  compact?: boolean;
  narrative?: GrowthNarrative;
  strategicDecision?: StrategicDecision;
  week1BlockedReason?: string;
}) {
  const v = VERDICT_TONE[thesis.verdict];
  const VerdictIcon = v.icon;
  const mechanismId = thesis.signals?.primary_mechanism_id as GrowthMechanismId | undefined;
  const mechanism = mechanismId ? getMechanismRecord(mechanismId) : undefined;
  const sealedOption = strategicDecision?.selected_id
    ? strategicDecision.options.find((option) => option.id === strategicDecision.selected_id)
    : undefined;

  return (
    <Card
      className="border-accent/25 bg-accent-soft/10"
      data-testid="cmo-intake-card"
      role="region"
      aria-label="CMO channel thesis"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={14} className="text-accent" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
          CMO intake
        </span>
        <Badge>{thesis.title}</Badge>
        {(sealedOption?.mechanism_label ?? mechanism?.label) && (
          <Badge tone="accent">{sealedOption?.mechanism_label ?? mechanism?.label}</Badge>
        )}
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${v.tone}`}>
          <VerdictIcon size={11} />
          {v.label}
        </span>
      </div>

      <h2 className={`mt-2 font-semibold text-text ${compact ? "text-body" : "text-h3"}`}>
        {thesis.headline}
      </h2>
      <p className="mt-1 text-mini text-text-2">{thesis.verdict_reason}</p>
      {narrative && strategicDecision?.sealed_at && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-accent/20 bg-surface px-3 py-2">
          <p className="text-mini font-semibold text-text">{narrative.one_liner}</p>
          {(sealedOption?.mechanism_anti_pattern ?? mechanism?.superficial_wrong_lesson) && (
            <p className="mt-1 text-[10px] text-text-3">
              Will not: {sealedOption?.mechanism_anti_pattern ?? mechanism?.superficial_wrong_lesson}
            </p>
          )}
          <p className="mt-1 text-[10px] text-text-3">
            Option {strategicDecision.selected_id} sealed · operations own the next action
          </p>
        </div>
      )}

      {!compact && (
        <>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-text-3">
            Bottleneck · {BOTTLENECK_LABELS[thesis.primary_bottleneck]}
          </p>
          <ul className="mt-2 space-y-1.5">
            {thesis.rationale.map((r) => (
              <li key={r} className="flex gap-2 text-body-sm text-text-2">
                <span className="text-accent">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-line px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ok">
                IDE ships (Lane A)
              </div>
              <ul className="mt-1 space-y-0.5 text-mini text-text-2">
                {thesis.lane_a.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                You execute (Lane B)
              </div>
              <ul className="mt-1 space-y-0.5 text-mini text-text-2">
                {thesis.lane_b.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </div>
          </div>

          {thesis.deprioritize.length > 0 && (
            <p className="mt-3 text-[10px] text-text-3">
              <span className="font-semibold">Not now:</span> {thesis.deprioritize.join(" · ")}
            </p>
          )}
        </>
      )}

      <div className="mt-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-3">
          Week 1 — do these in order
        </div>
        <ol className="space-y-2">
          {thesis.week1_priorities.map((p, i) => (
            <Week1Row key={p.id ?? `${p.what}-${i}`} p={p} index={i} />
          ))}
        </ol>
      </div>

      {(onStartWeek1 || onFullPlan || week1BlockedReason) && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {onStartWeek1 && (
              <Button
                variant="primary"
                iconRight={<ArrowRight size={15} />}
                onClick={onStartWeek1}
                data-testid="cmo-start-week1"
              >
                Start Week 1
              </Button>
            )}
            {onFullPlan && (
              <Button variant="secondary" onClick={onFullPlan}>
                Full launch plan
              </Button>
            )}
          </div>
          {week1BlockedReason && (
            <p className="text-mini text-warn">{week1BlockedReason}</p>
          )}
        </div>
      )}
    </Card>
  );
}
