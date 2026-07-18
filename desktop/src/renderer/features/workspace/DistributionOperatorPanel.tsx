import { CheckCircle2, Film } from "lucide-react";
import type { DistributionOperatorWorkspace } from "@shared/cmoDistributionOperator";
import {
  currentOperatorDayIndex,
  getNextDistributionSlot,
  resolveDailyVolumeTarget,
  slotDisplayLabel,
} from "@shared/cmoDistributionOperator";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { Card } from "@renderer/components/ui/Card";
import { GrowthMessageChip } from "./GrowthMessageChip";

export interface DistributionOperatorPanelProps {
  operator: DistributionOperatorWorkspace;
  compact?: boolean;
}

export function DistributionOperatorPanel({
  operator,
  compact,
}: DistributionOperatorPanelProps) {
  const openProof = useApp((s) => s.openDistributionProofModal);
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const growthMemory = useApp((s) => s.growthMemory ?? s.marketingProfile?.growth_memory);
  const day = currentOperatorDayIndex(operator);
  const volume = resolveDailyVolumeTarget(operator, day);
  const next = getNextDistributionSlot(operator);
  const postSlots = operator.slots.filter((s) => s.slot_kind === "post");
  const maxDay = Math.max(...operator.daily_targets.map((t) => t.day_index), 7);
  const days = Array.from({ length: Math.min(maxDay, operator.mode === "founder_grid" ? 14 : 7) }, (_, i) => i + 1);
  const hookLegend = operator.hooks.slice(0, operator.mode === "short_form_volume" ? 3 : 3);

  return (
    <Card
      data-testid="distribution-operator-panel"
      className={compact ? "p-3" : "p-4"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Film size={16} className="text-accent" />
            <h3 className="text-body-sm font-semibold text-text">
              Distribution Operator
            </h3>
            <Badge tone="accent">
              {operator.mode === "short_form_volume" ? "Short-form volume" : "Founder grid"}
            </Badge>
          </div>
          <p className="mt-1 text-mini text-text-2">
            Today: {volume.done}/{volume.max} posts
            {volume.remaining > 0 ? ` · ${volume.remaining} to minimum` : ""}
          </p>
          <p className="mt-0.5 text-[10px] text-text-3">
            Lane B calendar synced from operator — post + retention proof here.
          </p>
        </div>
        {next && (
          <Button variant="primary" size="sm" onClick={() => openProof(next.id)}>
            {next.slot_kind === "post" ? "Mark posted" : "Log proof"}
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {hookLegend.map((h) => {
          const memory = growthMemory?.messages.find(
            (message) =>
              message.kind === "hook" &&
              message.source_ref === h.id &&
              message.cycle_index === growthMemory.last_harvest_cycle_index,
          );
          return (
            <span key={h.id} className="flex items-center gap-1">
              <span className="rounded-[var(--radius-sm)] bg-surface-2 px-2 py-0.5 text-mini text-text-2">
                {h.label}: {h.formula.replace(/_/g, " ")}
                {h.retention_target_3s != null ? ` · target ${h.retention_target_3s}%` : ""}
              </span>
              {memory && <GrowthMessageChip message={memory} />}
            </span>
          );
        })}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-mini">
          <thead>
            <tr className="border-b border-line text-text-3">
              <th className="py-1 pr-2 font-semibold">Day</th>
              {hookLegend.map((h) => (
                <th key={h.id} className="px-1 py-1 font-semibold">
                  {h.label}
                </th>
              ))}
              <th className="px-1 py-1 font-semibold">Engage</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const dayVol = resolveDailyVolumeTarget(operator, d);
              return (
                <tr key={d} className="border-b border-line/40">
                  <td className="py-1.5 pr-2 text-text-2">
                    D{d}
                    {dayVol.max > 0 && (
                      <span className="ml-1 text-text-3">
                        ({dayVol.done}/{dayVol.max})
                      </span>
                    )}
                  </td>
                  {hookLegend.map((h) => {
                    const cell = postSlots.find(
                      (s) => s.day_index === d && s.hook_id === h.id,
                    );
                    return (
                      <td key={h.id} className="px-1 py-1.5">
                        {cell ? (
                          <button
                            type="button"
                            className="rounded px-1 py-0.5 hover:bg-surface-2"
                            onClick={() => cell.status === "pending" && openProof(cell.id)}
                            title={slotDisplayLabel(operator, cell)}
                          >
                            {cell.status === "measured" || cell.status === "posted" ? (
                              <CheckCircle2 size={14} className="text-ok" />
                            ) : cell.status === "skipped" ? (
                              <span className="text-text-3">—</span>
                            ) : (
                              <span className="text-accent">○</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-text-3">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-1 py-1.5">
                    {operator.slots.some(
                      (s) => s.day_index === d && s.slot_kind === "engage",
                    ) ? (
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => {
                          const eng = operator.slots.find(
                            (s) => s.day_index === d && s.slot_kind === "engage",
                          );
                          if (eng) openProof(eng.id);
                        }}
                      >
                        30m
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {operator.verdict && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-line/60 bg-surface-2/50 p-3">
          <p className="text-body-sm font-medium text-text">{operator.verdict.headline}</p>
          <p className="mt-1 text-mini text-text-2">{operator.verdict.rationale[0]}</p>
          {(operator.verdict.kind === "double_down" || operator.verdict.kind === "scale") && (
            <Button
              variant="subtle"
              size="sm"
              className="mt-2"
              onClick={() => startNextCmoCycle({ mode: "double_down" })}
            >
              Double down next week
            </Button>
          )}
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-mini text-text-3">Script scaffolds</summary>
        <ul className="mt-2 space-y-2">
          {operator.hooks.map((h) => (
            <li key={h.id} className="text-mini text-text-2">
              <span className="font-medium text-text">{h.label}:</span> {h.script_hint}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
