import { BarChart3, RefreshCw, RotateCcw } from "lucide-react";
import type { CommandSurfaceGovernance } from "@shared/cmoCommandSurface";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";

export function CommandSurfaceGovernanceBanner({
  governance,
}: {
  governance: CommandSurfaceGovernance;
}) {
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const appendEvent = useApp((s) => s.appendEvent);
  const focusWarRoomAnchor = useApp((s) => s.focusWarRoomAnchor);

  const openWarRoom = (anchor: string) => {
    focusWarRoomAnchor(anchor);
  };

  const onPrimary = () => {
    if (governance.kind === "replan") {
      const err = startNextCmoCycle({
        thesisId: governance.thesisId as import("@shared/cmoIntake").ChannelThesisId | undefined,
        mode: governance.mode,
      });
      if (err) appendEvent({ role: "system", kind: "error", text: err });
      return;
    }
    if (governance.kind === "product_loop") {
      openWarRoom("lane-d-panel-wrap");
      return;
    }
    if (governance.kind === "revenue_focus") {
      openWarRoom("revenue-plane-panel-wrap");
      return;
    }
    openWarRoom(governance.kind === "pivot" ? "cmo-ops-board" : "cmo-cycle-panel");
  };

  const Icon =
    governance.kind === "replan"
      ? RefreshCw
      : governance.kind === "measuring"
        ? BarChart3
        : RotateCcw;

  return (
    <div
      data-testid="command-surface-governance"
      className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-warn/25 bg-warn-soft/15 px-3 py-2"
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2">
        <Icon size={14} className="mt-0.5 shrink-0 text-warn" />
        <div className="min-w-0">
          <p className="text-mini font-medium text-text">{governance.title}</p>
          <p className="text-micro text-text-2">{governance.reason}</p>
        </div>
      </div>
      <Button variant="subtle" size="sm" onClick={onPrimary}>
        {governance.primaryLabel}
      </Button>
    </div>
  );
}
