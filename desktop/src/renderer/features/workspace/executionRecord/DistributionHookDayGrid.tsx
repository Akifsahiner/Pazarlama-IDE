import { useMemo } from "react";
import type { DistributionOperatorWorkspace } from "@shared/cmoDistributionOperator";
import { evaluateHookPerformance, currentOperatorDayIndex } from "@shared/cmoDistributionOperator";
import { Badge } from "@renderer/components/ui/Badge";
import { useApp } from "@renderer/state/store";

const VERDICT_TONE: Record<string, "ok" | "warn" | "neutral" | "accent"> = {
  scale: "ok",
  double_down: "accent",
  kill: "warn",
  test_more: "neutral",
};

export function DistributionHookDayGrid({
  workspace,
}: {
  workspace: DistributionOperatorWorkspace;
}) {
  const openDistributionProofModal = useApp((s) => s.openDistributionProofModal);
  const openHumanTaskKitDrawer = useApp((s) => s.openHumanTaskKitDrawer);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);

  const dayIndex = currentOperatorDayIndex(workspace);
  const verdict = useMemo(() => evaluateHookPerformance(workspace), [workspace]);

  const todaySlots = workspace.slots.filter((s) => s.day_index === dayIndex && s.slot_kind === "post");

  const openSlotKit = (slotId: string) => {
    const task = opsCadence?.tasks.find((t) => t.human_execution_ref?.item_id === slotId);
    if (task?.human_execution_ref) {
      openHumanTaskKitDrawer(task.human_execution_ref);
      return;
    }
    openDistributionProofModal(slotId);
  };

  return (
    <div
      className="border-b border-line/60 bg-surface-2/20 px-4 py-3"
      data-testid="distribution-hook-day-grid"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-mini font-semibold uppercase tracking-wide text-text-3">
          Distribution — Day {dayIndex}
        </span>
        <Badge tone={VERDICT_TONE[verdict.kind] ?? "neutral"} data-testid="distribution-verdict-chip">
          {verdict.kind.replace("_", " ")}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {workspace.hooks.map((hook) => {
          const slot = todaySlots.find((s) => s.hook_id === hook.id);
          const retention = slot?.proof?.retention_3s_pct;
          return (
            <button
              key={hook.id}
              type="button"
              className="rounded-[var(--radius-md)] border border-line bg-surface/80 p-2 text-left transition-colors hover:border-accent/40"
              onClick={() => slot && openSlotKit(slot.id)}
              data-testid={`distribution-hook-${hook.id}`}
            >
              <div className="text-mini font-semibold text-text">{hook.label}</div>
              <p className="mt-1 line-clamp-2 text-[11px] text-text-3">{hook.script_hint}</p>
              {hook.retention_target_3s != null && (
                <p className="mt-1 text-[10px] text-text-3">Target: {hook.retention_target_3s}% 3s</p>
              )}
              {retention != null && (
                <p className="mt-0.5 text-mini font-medium text-accent">{retention}% logged</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
