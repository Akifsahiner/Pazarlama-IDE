import { useMemo, useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { assessMeasurementBaseline } from "@shared/measurementBaseline";
import { isWeek1Ready, resolveLaunchReadinessSteps } from "@shared/launchReadiness";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { ProductActivationCard } from "./ProductActivationCard";
import { RevenueSetupCard } from "./RevenueSetupCard";
import { MeasurementBaselineCard } from "./MeasurementBaselineCard";

export function LaunchReadinessStepper() {
  const open = useApp((s) => s.launchReadinessOpen);
  const closeLaunchReadiness = useApp((s) => s.closeLaunchReadiness);
  const beginCmoWeek1 = useApp((s) => s.beginCmoWeek1);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const project = useApp((s) => s.project);
  const productActivation = useApp(
    (s) => s.productActivation ?? s.marketingProfile?.product_activation,
  );
  const revenueProfile = useApp((s) => s.revenueProfile ?? s.marketingProfile?.revenue_profile);
  const applyDefaults = useApp((s) => s.applyProductActivationDefaults);
  const channelThesis = useApp((s) => s.channelThesis ?? s.marketingProfile?.channel_thesis);
  const budgetPlan = useApp((s) => s.budgetPlan ?? s.marketingProfile?.budget_plan);
  const saveBudgetPlan = useApp((s) => s.saveBudgetPlan);
  const firstShipAt = useApp((s) => s.firstShipAt);
  const onboardingTrack = useApp((s) => s.onboardingTrack);

  useEffect(() => {
    if (!open || budgetPlan || !channelThesis || !marketingProfile?.founder_fit) return;
    saveBudgetPlan();
  }, [open, budgetPlan, channelThesis, marketingProfile?.founder_fit, saveBudgetPlan]);

  const baseline = assessMeasurementBaseline(marketingProfile, project);
  const readiness = useMemo(
    () =>
      resolveLaunchReadinessSteps({
        founderFit: marketingProfile?.founder_fit,
        productActivation,
        revenueProfile,
        measurementReady: baseline.ready,
        measurementAcknowledged: Boolean(marketingProfile?.measurement_ack?.acknowledged_at),
        firstShipAt,
        onboardingTrack,
      }),
    [baseline.ready, firstShipAt, marketingProfile, onboardingTrack, productActivation, revenueProfile],
  );

  const canStartWeek1 = useMemo(
    () =>
      isWeek1Ready({
        founderFit: marketingProfile?.founder_fit,
        productActivation,
        revenueProfile,
        measurementReady: baseline.ready,
        measurementAcknowledged: Boolean(marketingProfile?.measurement_ack?.acknowledged_at),
        firstShipAt,
        onboardingTrack,
      }),
    [
      baseline.ready,
      firstShipAt,
      marketingProfile?.founder_fit,
      marketingProfile?.measurement_ack?.acknowledged_at,
      onboardingTrack,
      productActivation,
      revenueProfile,
    ],
  );

  const actionableSteps = readiness.steps.filter((s) => s.id !== "start");
  const [activeStepId, setActiveStepId] = useState<string>(() => {
    const firstIncomplete = actionableSteps.find((s) => !s.complete);
    return firstIncomplete?.id ?? actionableSteps[0]?.id ?? "activation";
  });

  useEffect(() => {
    if (!open) return;
    if (canStartWeek1) {
      setActiveStepId("start");
    }
  }, [open, canStartWeek1]);

  if (!open) return null;

  const activeStep = readiness.steps.find((s) => s.id === activeStepId) ?? readiness.steps[0];
  const progressPct =
    readiness.total > 0 ? Math.round((readiness.completed / readiness.total) * 100) : 0;

  const goNext = () => {
    const idx = actionableSteps.findIndex((s) => s.id === activeStepId);
    const next = actionableSteps[idx + 1];
    if (next) setActiveStepId(next.id);
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-readiness-title"
      data-testid="launch-readiness-stepper"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-3)]">
        <div className="shrink-0 border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="launch-readiness-title" className="text-body font-semibold text-text">
                Launch readiness
              </h2>
              <p className="mt-0.5 text-mini text-text-2">
                Launch readiness {readiness.completed}/{readiness.total} · ~2 min per step
              </p>
            </div>
            <button
              type="button"
              onClick={() => closeLaunchReadiness()}
              className="rounded-[var(--radius-sm)] p-1 text-text-3 hover:bg-surface-2 hover:text-text"
              aria-label="Close launch setup"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progressPct}%` }}
              data-testid="launch-readiness-progress"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {readiness.steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id === "start" && !canStartWeek1) return;
                  setActiveStepId(step.id);
                }}
                disabled={step.id === "start" && !canStartWeek1}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  step.id === activeStepId
                    ? "border-accent bg-accent-soft/40 text-accent"
                    : step.complete
                      ? "border-ok/30 bg-ok/8 text-ok"
                      : "border-line text-text-3"
                }`}
              >
                {step.complete && <CheckCircle2 size={10} />}
                {step.label}
                {step.optional && !step.complete && (
                  <span className="text-text-3">(optional)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeStep?.id === "activation" && (
            <div className="space-y-3">
              <p className="text-mini text-text-2">
                Define your activation event — or use scan defaults to move fast.
              </p>
              {!productActivation ? (
                <>
                  <ProductActivationCard embedded onComplete={goNext} />
                  <Button variant="ghost" size="sm" onClick={() => applyDefaults() && goNext()}>
                    Use scan defaults (~30 sec)
                  </Button>
                </>
              ) : (
                <div className="rounded-[var(--radius-md)] border border-ok/30 bg-ok/8 px-3 py-2 text-mini text-ok">
                  Activation saved: {productActivation.activation_event_label}
                </div>
              )}
            </div>
          )}

          {activeStep?.id === "revenue" && (
            <div className="space-y-3">
              <p className="text-mini text-text-2">
                Your 30-day win is paying customers — revenue intake is required.
              </p>
              {!revenueProfile ? (
                <RevenueSetupCard embedded onComplete={goNext} />
              ) : (
                <div className="rounded-[var(--radius-md)] border border-ok/30 bg-ok/8 px-3 py-2 text-mini text-ok">
                  Revenue profile saved
                </div>
              )}
            </div>
          )}

          {activeStep?.id === "measurement" && (
            <div className="space-y-3">
              <p className="text-mini text-text-2">
                Connect GA4 or log a manual baseline so Week 1 proof is honest.
              </p>
              {baseline.ready || marketingProfile?.measurement_ack?.acknowledged_at ? (
                <div className="rounded-[var(--radius-md)] border border-ok/30 bg-ok/8 px-3 py-2 text-mini text-ok">
                  Measurement baseline ready
                </div>
              ) : (
                <MeasurementBaselineCard compact embedded onStepComplete={goNext} />
              )}
            </div>
          )}

          {activeStep?.id === "start" && (
            <div className="space-y-4" data-testid="launch-readiness-start-panel">
              <p className="text-body-sm text-text">
                Required setup is complete. Starting Week 1 locks your ops cadence and opens the
                execution record.
              </p>
              {channelThesis && (
                <div className="rounded-[var(--radius-md)] border border-accent/25 bg-accent-soft/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                    Channel thesis
                  </p>
                  <p className="mt-1 text-body-sm font-medium text-text">{channelThesis.title}</p>
                  {channelThesis.headline && (
                    <p className="mt-0.5 text-mini text-text-3">{channelThesis.headline}</p>
                  )}
                </div>
              )}
              <ul className="space-y-1.5 text-mini text-text-2">
                {readiness.steps
                  .filter((s) => s.id !== "start")
                  .map((step) => (
                    <li key={step.id} className="flex items-center gap-2">
                      <CheckCircle2
                        size={12}
                        className={step.complete ? "text-ok" : "text-text-3"}
                      />
                      <span>
                        {step.label}
                        {step.optional && !step.complete && (
                          <span className="text-text-3"> (skipped)</span>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
              <Button
                variant="primary"
                iconRight={<ArrowRight size={14} />}
                data-testid="launch-readiness-start-panel-cta"
                onClick={() => {
                  closeLaunchReadiness();
                  beginCmoWeek1();
                }}
              >
                Start Week 1{channelThesis ? ` — ${channelThesis.title}` : ""}
              </Button>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <Badge tone={canStartWeek1 ? "ok" : "warn"}>
            {canStartWeek1
              ? firstShipAt && onboardingTrack === "quick_start"
                ? "First patch shipped — Week 1 unlocked"
                : "Ready to start Week 1"
              : "Complete required steps"}
          </Badge>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => closeLaunchReadiness()}>
              Later
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconRight={<ArrowRight size={14} />}
              disabled={!canStartWeek1}
              data-testid="launch-readiness-start-week1"
              onClick={() => {
                closeLaunchReadiness();
                beginCmoWeek1();
              }}
            >
              Start Week 1
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
