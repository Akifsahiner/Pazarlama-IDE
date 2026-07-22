import { ArrowRight } from "lucide-react";
import { resolveLaunchReadinessSteps, isWeek1Ready } from "@shared/launchReadiness";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";
import { assessMeasurementBaseline } from "@shared/measurementBaseline";
import { useApp } from "@renderer/state/store";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";

/** Shown after seal, before Week 1 ops cadence exists — bridges Step 2 → ops table. */
export function LaunchReadinessBanner() {
  const marketingProfile = useApp((s) => s.marketingProfile);
  const channelThesis = useApp((s) => s.channelThesis);
  const project = useApp((s) => s.project);
  const productActivation = useApp((s) => s.productActivation);
  const revenueProfile = useApp((s) => s.revenueProfile);
  const firstShipAt = useApp((s) => s.firstShipAt);
  const onboardingTrack = useApp((s) => s.onboardingTrack);
  const openLaunchReadiness = useApp((s) => s.openLaunchReadiness);
  const beginCmoWeek1 = useApp((s) => s.beginCmoWeek1);

  if (!channelThesis || !isStrategicDecisionSealed(marketingProfile)) return null;

  const baseline = assessMeasurementBaseline(marketingProfile, project);
  const readiness = resolveLaunchReadinessSteps({
    founderFit: marketingProfile?.founder_fit,
    productActivation: productActivation ?? marketingProfile?.product_activation,
    revenueProfile: revenueProfile ?? marketingProfile?.revenue_profile,
    measurementReady: baseline.ready,
    measurementAcknowledged: Boolean(marketingProfile?.measurement_ack?.acknowledged_at),
    firstShipAt,
    onboardingTrack,
  });
  const canStart = isWeek1Ready({
    founderFit: marketingProfile?.founder_fit,
    productActivation: productActivation ?? marketingProfile?.product_activation,
    revenueProfile: revenueProfile ?? marketingProfile?.revenue_profile,
    measurementReady: baseline.ready,
    measurementAcknowledged: Boolean(marketingProfile?.measurement_ack?.acknowledged_at),
    firstShipAt,
    onboardingTrack,
  });

  const remaining = readiness.total - readiness.completed;
  const estimateMin = readiness.steps
    .filter((s) => s.required && !s.complete)
    .reduce((sum, s) => sum + s.estimateMinutes, 0);

  return (
    <Card
      className="border-accent/25 bg-accent-soft/10 p-4"
      data-testid="launch-readiness-banner"
      role="region"
      aria-label="Launch setup before Week 1"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">After seal</Badge>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              Launch setup
            </span>
          </div>
          <h3 className="mt-1 text-body-sm font-semibold text-text">
            {readiness.canStartWeek1 || canStart
              ? "Ready to start Week 1 ops"
              : `${remaining} setup step${remaining === 1 ? "" : "s"} before Week 1`}
          </h3>
          <p className="mt-1 text-mini text-text-2">
            {canStart
              ? firstShipAt && onboardingTrack === "quick_start"
                ? "First patch shipped — Week 1 ops unlock without extra measurement ceremony."
                : "Activation, measurement, and revenue gates passed — your ops table will appear next."
              : estimateMin > 0
                ? `About ${estimateMin} min — activation, measurement ack, and revenue (if applicable). Then Week 1 ops unlock.`
                : "Complete launch setup to unlock the Week 1 ops table."}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          iconRight={<ArrowRight size={13} />}
          onClick={() => (canStart ? beginCmoWeek1() : openLaunchReadiness())}
          data-testid="launch-readiness-banner-cta"
        >
          {canStart ? "Start Week 1" : "Continue launch setup"}
        </Button>
      </div>
    </Card>
  );
}
