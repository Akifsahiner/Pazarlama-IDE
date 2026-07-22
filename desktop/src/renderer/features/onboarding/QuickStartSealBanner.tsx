import { Sparkles } from "lucide-react";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";

export function QuickStartSealBanner({ onSeal }: { onSeal: () => void }) {
  return (
    <Card
      className="border-accent/30 bg-accent-soft/10 p-4"
      data-testid="quick-start-seal-banner"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-accent">
            <Sparkles size={13} />
            Personalize Week 1
          </div>
          <p className="mt-1 text-body-sm text-text">
            Ops stay generic until you seal — 7 min to personalize Week 1
          </p>
          <p className="mt-1 text-mini text-text-3">
            Seal your strategic bet to unlock mechanism-specific tasks, contracts, and measurement
            gates.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={onSeal} data-testid="quick-start-seal-cta">
          Seal strategy
        </Button>
      </div>
    </Card>
  );
}
