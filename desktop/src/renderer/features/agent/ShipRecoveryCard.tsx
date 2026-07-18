import { RefreshCw } from "lucide-react";
import type { ShipRecoveryAction } from "@shared/shipPipelineRecovery";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { useApp } from "@renderer/state/store";

export function ShipRecoveryCard({ recovery }: { recovery: ShipRecoveryAction }) {
  const retryQuickStartShip = useApp((s) => s.retryQuickStartShip);

  return (
    <Card className="border-warn/30 bg-warn-soft/10 p-4" data-testid="ship-recovery-card">
      <p className="text-body-sm font-semibold text-text">{recovery.title}</p>
      <p className="mt-1 text-mini text-text-2">{recovery.detail}</p>
      {recovery.retryGoal && (
        <Button
          className="mt-3"
          size="sm"
          variant="secondary"
          iconLeft={<RefreshCw size={13} />}
          data-testid="ship-recovery-retry"
          onClick={() => retryQuickStartShip(recovery.retryGoal)}
        >
          Retry with narrower goal
        </Button>
      )}
    </Card>
  );
}
