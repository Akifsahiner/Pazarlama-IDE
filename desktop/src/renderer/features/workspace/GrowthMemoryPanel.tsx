import { BrainCircuit, FlaskConical, TrendingDown, TrendingUp } from "lucide-react";
import type { GrowthMemoryState } from "@shared/cmoGrowthMemory";
import { growthMemorySummary } from "@shared/cmoGrowthMemory";
import { Card } from "@renderer/components/ui/Card";
import { Badge } from "@renderer/components/ui/Badge";
import { GrowthMessageChip } from "./GrowthMessageChip";

export function GrowthMemoryPanel({
  memory,
  compact = false,
}: {
  memory: GrowthMemoryState;
  compact?: boolean;
}) {
  const currentCycle = memory.last_harvest_cycle_index;
  const messages = memory.messages.filter(
    (message) => currentCycle == null || message.cycle_index === currentCycle,
  );
  const experiments = memory.experiments
    .filter((experiment) => currentCycle == null || experiment.cycle_index === currentCycle)
    .slice(-8)
    .reverse();
  const winners = messages.filter((message) => message.verdict === "winner");
  const losers = messages.filter((message) => message.verdict === "loser");

  return (
    <Card
      className={compact ? "border-line/80" : "border-accent/20"}
      data-testid="growth-memory-panel"
      role="region"
      aria-label="Growth memory"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BrainCircuit size={14} className="text-accent" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            Growth Memory
          </span>
          {currentCycle != null && <Badge tone="neutral">Week {currentCycle}</Badge>}
        </div>
        <span className="text-[10px] text-text-3">{growthMemorySummary(memory)}</span>
      </div>

      {(winners.length > 0 || losers.length > 0) && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-[var(--radius-md)] border border-ok/25 bg-ok-soft/10 p-3">
            <div className="flex items-center gap-1.5 text-mini font-semibold text-ok">
              <TrendingUp size={12} /> Winners
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {winners.length ? (
                winners.map((message) => <GrowthMessageChip key={message.id} message={message} />)
              ) : (
                <span className="text-[10px] text-text-3">No proven winner yet.</span>
              )}
            </div>
          </div>
          <div className="rounded-[var(--radius-md)] border border-danger/25 bg-danger-soft/10 p-3">
            <div className="flex items-center gap-1.5 text-mini font-semibold text-danger">
              <TrendingDown size={12} /> Retire
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {losers.length ? (
                losers.map((message) => <GrowthMessageChip key={message.id} message={message} />)
              ) : (
                <span className="text-[10px] text-text-3">No kill signal yet.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {!compact && experiments.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-line">
          <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-3">
            <FlaskConical size={11} /> Experiment ledger
          </div>
          <ul className="divide-y divide-line">
            {experiments.map((experiment) => (
              <li key={experiment.id} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-mini font-medium text-text">{experiment.hypothesis}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-text-3">
                    {experiment.learning}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {experiment.source === "product_fix" && (
                    <Badge tone="warn">Product fix</Badge>
                  )}
                  {experiment.spend_usd != null && (
                    <Badge tone="neutral">
                      ${experiment.spend_usd} · {experiment.cpa_confidence === "measured" ? `CPA $${experiment.cpa_usd}` : "CPA —"}
                    </Badge>
                  )}
                  <Badge
                    tone={
                      experiment.outcome === "won"
                        ? "ok"
                        : experiment.outcome === "lost"
                          ? "danger"
                          : experiment.outcome === "running"
                            ? "warn"
                            : "neutral"
                    }
                  >
                    {experiment.outcome}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
