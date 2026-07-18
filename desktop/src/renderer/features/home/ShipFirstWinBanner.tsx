import { ArrowRight } from "lucide-react";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";
import { useApp } from "@renderer/state/store";

export function ShipFirstWinBanner() {
  const beginQuickStartShip = useApp((s) => s.beginQuickStartShip);
  const project = useApp((s) => s.project);

  if (!project) return null;

  return (
    <Card
      className="border-accent/30 bg-accent-soft/10 p-4"
      data-testid="ship-first-win-banner"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body-sm font-semibold text-text">Ship your first marketing win</p>
          <p className="mt-1 text-mini text-text-2">
            Agent improves hero + meta in your repo — apply one patch like Cursor.
          </p>
        </div>
        <Button
          variant="primary"
          iconRight={<ArrowRight size={14} />}
          data-testid="ship-first-win-cta"
          onClick={() => beginQuickStartShip()}
        >
          Run and apply first change
        </Button>
      </div>
    </Card>
  );
}
