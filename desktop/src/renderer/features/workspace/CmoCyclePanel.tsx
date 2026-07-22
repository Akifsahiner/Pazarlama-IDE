import { ArrowRight, History, RefreshCw, TrendingUp } from "lucide-react";
import type { CmoContinuousState } from "@shared/cmoContinuous";
import {
  cycleHistorySummary,
  isContinuousReplanReady,
  weekLabel,
} from "@shared/cmoContinuous";
import type { CmoOpsCadence } from "@shared/cmoOpsCadence";
import type { ChannelThesis } from "@shared/cmoIntake";
import { channelThesisTitle } from "@shared/cmoIntake";
import type { CampaignSession } from "@shared/types";
import type { GrowthMemoryState } from "@shared/cmoGrowthMemory";
import { isWeekCloseReady } from "@shared/cmoProofLoop";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { useApp } from "@renderer/state/store";
import { ReplanPreviewCard } from "./ReplanPreviewCard";

export function CmoIntakeDeltaCard({
  delta,
}: {
  delta: NonNullable<CmoContinuousState["pending_delta"]>;
}) {
  return (
    <div
      className="mt-3 rounded-[var(--radius-md)] border border-line bg-surface-2/60 p-3"
      data-testid="cmo-intake-delta-card"
    >
      <p className="text-mini font-semibold text-text">{delta.headline}</p>
      <ul className="mt-2 space-y-1">
        {delta.rationale.map((r) => (
          <li key={r} className="text-[10px] text-text-2">
            · {r}
          </li>
        ))}
      </ul>
      {delta.memory_rationale && delta.memory_rationale.length > 0 && (
        <div className="mt-2 rounded-[var(--radius-sm)] border border-accent/20 px-2 py-1.5">
          {delta.memory_rationale.slice(0, 3).map((item) => (
            <p key={item} className="text-[10px] text-accent">
              Memory · {item}
            </p>
          ))}
        </div>
      )}
      {delta.signal_changes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {delta.signal_changes.slice(0, 4).map((s) => (
            <Badge key={s.key} tone="neutral">
              {s.key}: {s.before} → {s.after}
            </Badge>
          ))}
        </div>
      )}
      {delta.kpi_movement && (
        <p className="mt-2 text-[10px] text-text-3">
          KPI {delta.kpi_movement.kpi_id}: {delta.kpi_movement.before ?? "—"}
          {delta.kpi_movement.pct_of_target != null
            ? ` (${delta.kpi_movement.pct_of_target}% of target)`
            : ""}
        </p>
      )}
    </div>
  );
}

export function CmoCyclePanel({
  continuous,
  cadence,
  thesis,
  session,
  growthMemory,
  compact,
}: {
  continuous: CmoContinuousState;
  cadence?: CmoOpsCadence | null;
  thesis?: ChannelThesis | null;
  session?: CampaignSession | null;
  growthMemory?: GrowthMemoryState | null;
  compact?: boolean;
}) {
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const navigate = useApp((s) => s.navigate);

  const weekCloseReady = cadence ? isWeekCloseReady(cadence) : false;
  const replanReady = isContinuousReplanReady(
    continuous,
    cadence ?? null,
    session?.phase,
    weekCloseReady,
  );
  const pivot = cadence?.pivot_suggestion;
  const suggestedThesis = pivot?.suggested_thesis_ids[0];
  const weekIndex = cadence?.week_index ?? continuous.current_cycle_index;

  const phaseTone =
    continuous.phase === "pivot_ready"
      ? "warn"
      : continuous.phase === "measuring"
        ? "ok"
        : "accent";

  return (
    <Card
      className={compact ? "border-line/80" : "mt-4 border-accent/20 bg-accent-soft/5"}
      data-testid="cmo-cycle-panel"
      role="region"
      aria-label="CMO continuous cycle"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <History size={14} className="text-accent" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            Continuous CMO
          </span>
          <Badge tone={phaseTone}>
            {continuous.phase === "executing"
              ? weekLabel(continuous.current_cycle_index)
                : continuous.phase === "pivot_ready"
                ? "Pivot ready"
                : "Ready to plan next week"}
          </Badge>
        </div>
        {thesis && (
          <span className="text-[10px] text-text-3">{thesis.title}</span>
        )}
      </div>

      <p className="mt-2 text-mini text-text-2">{cycleHistorySummary(continuous)}</p>

      {continuous.cycles.length > 0 && (
        <ul className="mt-2 space-y-1">
          {continuous.cycles.slice(-3).map((c) => (
            <li key={c.cycle_index} className="text-[10px] text-text-3">
              {weekLabel(c.cycle_index)} · {c.thesis_title}
              {c.primary_kpi?.value != null
                ? ` · ${c.primary_kpi.kpi_id}: ${c.primary_kpi.value}`
                : ""}
              {c.pivot_verdict === "flat" ? " · flat" : ""}
            </li>
          ))}
        </ul>
      )}

      {continuous.pending_delta && continuous.phase === "executing" && (
        <CmoIntakeDeltaCard delta={continuous.pending_delta} />
      )}

      {replanReady && growthMemory?.pending_replan && (
        <ReplanPreviewCard preview={growthMemory.pending_replan} />
      )}

      {replanReady && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedThesis && pivot && !pivot.dismissed_at && (
            <Button
              variant="primary"
              size="sm"
              iconLeft={<TrendingUp size={12} />}
              data-testid="cmo-cycle-pivot-start"
              onClick={() => {
                startNextCmoCycle({ thesisId: suggestedThesis, mode: "pivot" });
                navigate("workspace");
              }}
            >
              Start {weekLabel(weekIndex + 1)} — {channelThesisTitle(suggestedThesis)}
            </Button>
          )}
          <Button
            variant={suggestedThesis && pivot && !pivot.dismissed_at ? "secondary" : "primary"}
            size="sm"
            iconLeft={<RefreshCw size={12} />}
            data-testid="cmo-cycle-double-down"
            onClick={() => {
              startNextCmoCycle({ mode: "double_down" });
              navigate("workspace");
            }}
          >
            Double down — same channel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconRight={<ArrowRight size={12} />}
            onClick={() => navigate("workspace")}
          >
            Open ops board
          </Button>
        </div>
      )}
    </Card>
  );
}
