import { useMemo, useState } from "react";
import type { DistributionOperatorWorkspace } from "@shared/cmoDistributionOperator";
import {
  computeHookKillSuggestion,
  evaluateHookPerformance,
  currentOperatorDayIndex,
} from "@shared/cmoDistributionOperator";
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
  const openHumanTaskKitDrawer = useApp((s) => s.openHumanTaskKitDrawer);
  const logHumanTaskMetrics = useApp((s) => s.logHumanTaskMetrics);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const humanProofDrafts = useApp((s) => s.humanProofDrafts ?? {});

  const dayIndex = currentOperatorDayIndex(workspace);
  const verdict = useMemo(() => evaluateHookPerformance(workspace), [workspace]);
  const liveKill = useMemo(() => computeHookKillSuggestion(workspace), [workspace]);

  const todaySlots = workspace.slots.filter((s) => s.day_index === dayIndex && s.slot_kind === "post");

  const [retentionInputs, setRetentionInputs] = useState<Record<string, string>>({});

  const openSlotKit = (slotId: string) => {
    const task = opsCadence?.tasks.find((t) => t.human_execution_ref?.item_id === slotId);
    if (task?.human_execution_ref) {
      openHumanTaskKitDrawer(task.human_execution_ref);
    }
  };

  const saveRetention = (slotId: string) => {
    const task = opsCadence?.tasks.find((t) => t.human_execution_ref?.item_id === slotId);
    const ref = task?.human_execution_ref;
    const draft = humanProofDrafts[slotId];
    const slot = workspace.slots.find((s) => s.id === slotId);
    const postedUrl = draft?.posted_url ?? slot?.proof?.post_url;
    if (!ref || !postedUrl?.trim()) {
      openSlotKit(slotId);
      return;
    }
    const val = Number(retentionInputs[slotId]);
    if (!Number.isFinite(val)) return;
    logHumanTaskMetrics(ref, { retention_3s_pct: val });
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

      {liveKill && (
        <div
          className="mb-2 rounded-[var(--radius-sm)] border border-warn/40 bg-warn/8 px-2 py-1.5 text-mini text-warn"
          data-testid="distribution-grid-kill-banner"
        >
          {liveKill.headline}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {workspace.hooks.map((hook) => {
          const slot = todaySlots.find((s) => s.hook_id === hook.id);
          const retention = slot?.proof?.retention_3s_pct ?? humanProofDrafts[slot?.id ?? ""]?.retention_3s_pct;
          return (
            <div
              key={hook.id}
              className="rounded-[var(--radius-md)] border border-line bg-surface/80 p-2"
              data-testid={`distribution-hook-${hook.id}`}
            >
              <button type="button" className="w-full text-left" onClick={() => slot && openSlotKit(slot.id)}>
                <div className="text-mini font-semibold text-text">{hook.label}</div>
                <p className="mt-1 line-clamp-2 text-body-sm text-text-3">{hook.script_hint}</p>
                {hook.retention_target_3s != null && (
                  <p className="mt-1 text-mini text-text-3">Target: {hook.retention_target_3s}% 3s</p>
                )}
              </button>
              {slot && (
                <div className="mt-2 flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="3s %"
                    value={retentionInputs[slot.id] ?? (retention != null ? String(retention) : "")}
                    onChange={(e) =>
                      setRetentionInputs((prev) => ({ ...prev, [slot.id]: e.target.value }))
                    }
                    className="w-full rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2 py-1 text-mini"
                    data-testid={`distribution-retention-${hook.id}`}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-[var(--radius-sm)] bg-surface-2 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/10"
                    onClick={() => saveRetention(slot.id)}
                  >
                    Log
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
