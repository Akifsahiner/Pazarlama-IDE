import { Rocket, Compass } from "lucide-react";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { useApp } from "@renderer/state/store";

export function QuickStartForkCard({ compact }: { compact?: boolean }) {
  const setOnboardingTrack = useApp((s) => s.setOnboardingTrack);

  return (
    <Card
      className={compact ? "p-4" : "p-5"}
      data-testid="quick-start-fork-card"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
        How do you want to start?
      </p>
      <div className={`mt-3 grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        <Button
          variant="primary"
          className="h-auto flex-col items-start gap-2 px-4 py-4 text-left"
          data-testid="quick-start-choose"
          onClick={() => setOnboardingTrack("quick_start")}
        >
          <Rocket size={18} />
          <span className="text-body-sm font-semibold">Quick Start</span>
          <span className="text-mini font-normal text-text-2">
            Ship your first marketing change in ~15 min — hero, meta, CTA.
          </span>
        </Button>
        <Button
          variant="secondary"
          className="h-auto flex-col items-start gap-2 px-4 py-4 text-left"
          data-testid="full-cmo-choose"
          onClick={() => setOnboardingTrack("full_cmo")}
        >
          <Compass size={18} />
          <span className="text-body-sm font-semibold">Full CMO setup</span>
          <span className="text-mini font-normal text-text-2">
            Founder fit, channel thesis, Week 1 ops — the full Software CMO loop.
          </span>
        </Button>
      </div>
    </Card>
  );
}
