import { RefreshCw, Wrench } from "lucide-react";
import type { ShipRecoveryAction } from "@shared/shipPipelineRecovery";
import { buildVerifyChecklistFromTask } from "@shared/browserVerify";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { useApp } from "@renderer/state/store";

export function ShipRecoveryCard({ recovery }: { recovery: ShipRecoveryAction }) {
  const retryQuickStartShip = useApp((s) => s.retryQuickStartShip);
  const lastShipReceipt = useApp((s) => s.lastShipReceipt);
  const startVerifyAfterApply = useApp((s) => s.startVerifyAfterApply);
  const workspaceHandoff = useApp((s) => s.workspaceHandoff);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const channelThesis = useApp((s) => s.channelThesis ?? s.marketingProfile?.channel_thesis);

  const isVerifyFailed = recovery.kind === "verify_failed";
  const isVerifyUnavailable = recovery.kind === "verify_unavailable";
  const isPreviewMissing = recovery.kind === "preview_missing";

  const handleRetry = () => {
    if (isVerifyUnavailable) {
      useApp.getState().navigate("home");
      return;
    }
    if (isVerifyFailed && lastShipReceipt?.previewUrl) {
      const activeOps = opsCadence?.tasks.find(
        (t) => t.status === "in_progress" && t.owner === "system",
      );
      const checklist = buildVerifyChecklistFromTask(activeOps, channelThesis);
      void startVerifyAfterApply(lastShipReceipt.previewUrl, checklist);
      return;
    }
    if (recovery.retryGoal) retryQuickStartShip(recovery.retryGoal);
  };

  const handleFixInIde = () => {
    const handoff = workspaceHandoff;
    if (handoff?.primaryAction === "execute_intent" && handoff.payload?.intent) {
      void useApp.getState().executeIntent(handoff.payload.intent);
    }
  };

  const showFixInIde =
    isVerifyFailed &&
    workspaceHandoff?.primaryAction === "execute_intent" &&
    workspaceHandoff.payload?.intent;

  return (
    <Card className="border-warn/30 bg-warn-soft/10 p-4" data-testid="ship-recovery-card">
      <p className="text-body-sm font-semibold text-text">{recovery.title}</p>
      <p className="mt-1 text-mini text-text-2">{recovery.detail}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(recovery.retryGoal || isVerifyFailed) && (
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<RefreshCw size={13} />}
            data-testid="ship-recovery-retry"
            onClick={handleRetry}
          >
            {isVerifyFailed || isPreviewMissing
              ? "Re-run verify"
              : isVerifyUnavailable
                ? "Open settings"
                : "Retry with narrower goal"}
          </Button>
        )}
        {showFixInIde && (
          <Button
            size="sm"
            variant="primary"
            iconLeft={<Wrench size={13} />}
            data-testid="ship-recovery-fix-ide"
            onClick={handleFixInIde}
          >
            Fix in IDE
          </Button>
        )}
      </div>
    </Card>
  );
}
