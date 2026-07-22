import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  FileCode2,
  FileText,
  Route as RouteIcon,
} from "lucide-react";
import { inferMarketingGaps } from "@shared/marketingGaps";
import { orderRevealRoutes, resolveFirstShipTarget } from "@shared/firstHourWow";
import { useApp } from "@renderer/state/store";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { sceneReveal } from "@renderer/design/animations";
import { CmoIntakeCard } from "@renderer/features/onboarding/CmoIntakeCard";
import { CmoStrategicIntakeFlow } from "@renderer/features/onboarding/CmoStrategicIntakeFlow";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";
import { isWeek1Ready } from "@shared/launchReadiness";
import { assessMeasurementBaseline } from "@shared/measurementBaseline";
import {
  isQuickStartTrack,
  quickStartThesisLine,
} from "@shared/quickStartWedge";
import logoUrl from "@renderer/assets/logo.png";
import { QuickStartForkCard } from "@renderer/features/onboarding/QuickStartForkCard";
import {
  revealBeatDelayMs,
  revealBeatsForTrack,
  revealInitialDelayMs,
  shouldShowQuickStartFork,
  type RevealBeatId,
} from "@shared/instantWow";
import { HumanExecutionContractBanner } from "@renderer/components/HumanExecutionContractBanner";
import { ThesisChip } from "@renderer/components/ThesisChip";
import { OneNextActionCard } from "@renderer/components/OneNextActionCard";
import { resolveFirstRunPrimaryAction } from "@shared/northStarFunnel";

type RevealBeat = RevealBeatId;

const BEAT_LABEL: Record<RevealBeat, string> = {
  name: "Product",
  stack: "Stack",
  routes: "Routes",
  readme: "Insights",
  gaps: "Gaps",
  thesis: "CMO",
  moves: "Ready",
};

function RevealProgressRail({
  current,
  beats,
}: {
  current: RevealBeat;
  beats: RevealBeat[];
}) {
  const idx = beats.indexOf(current);
  return (
    <nav aria-label="Intelligence reveal progress" className="mb-8 flex flex-wrap justify-center gap-1">
      {beats.map((beat, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={beat} className="flex items-center">
            {i > 0 && (
              <span className={`mx-1 h-px w-6 ${i <= idx ? "bg-accent/40" : "bg-line"}`} />
            )}
            <span className="flex items-center gap-1 text-[10px]">
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                  done ? "bg-ok text-white" : active ? "border border-accent" : "border border-line"
                }`}
              >
                {done && <Check size={8} strokeWidth={3} />}
              </span>
              <span className={active ? "text-text" : done ? "text-text-2" : "text-text-3"}>
                {BEAT_LABEL[beat]}
              </span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}

/** Product Intelligence Reveal — staged build-up before the workspace. */
export function ProjectReveal() {
  const project = useApp((s) => s.project);
  const persona = useApp((s) => s.settings.persona);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const openConnectFlow = useApp((s) => s.openConnectFlow);
  const beginQuickStartShip = useApp((s) => s.beginQuickStartShip);
  const beginCmoWeek1 = useApp((s) => s.beginCmoWeek1);
  const setOnboardingTrack = useApp((s) => s.setOnboardingTrack);
  const firstShipAt = useApp((s) => s.firstShipAt);
  const onboardingTrack = useApp((s) => s.onboardingTrack);
  const channelThesis = useApp((s) => s.channelThesis ?? s.marketingProfile?.channel_thesis);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const productActivation = useApp(
    (s) => s.productActivation ?? s.marketingProfile?.product_activation,
  );
  const revenueProfile = useApp((s) => s.revenueProfile ?? s.marketingProfile?.revenue_profile);
  const week1Ready = isWeek1Ready({
    founderFit: marketingProfile?.founder_fit,
    revenueProfile,
    productActivation,
    measurementReady: assessMeasurementBaseline(marketingProfile, project).ready,
    measurementAcknowledged: Boolean(marketingProfile?.measurement_ack?.acknowledged_at),
    firstShipAt,
    onboardingTrack,
  });
  const strategicIntakeOpen = useApp((s) => s.strategicIntakeOpen);
  const openStrategicIntake = useApp((s) => s.openStrategicIntake);
  const openLaunchReadiness = useApp((s) => s.openLaunchReadiness);
  const runtime = useApp((s) => s.runtime);
  const connected = runtime === "connected";

  const [beat, setBeat] = useState<RevealBeat>("name");

  const revealBeats = useMemo(
    () => revealBeatsForTrack(onboardingTrack ?? "quick_start"),
    [onboardingTrack],
  );

  const enterHome = () => useApp.setState({ phase: "workspace", route: "home" });

  useEffect(() => {
    if (!project) enterHome();
  }, [project]);

  useEffect(() => {
    if (!project || reducedMotion) {
      setBeat("moves");
      return;
    }
    setBeat(revealBeats[0] ?? "name");
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const delay = revealBeatDelayMs(onboardingTrack, reducedMotion);
    const tick = () => {
      if (i >= revealBeats.length - 1) return;
      timers.push(
        setTimeout(() => {
          i += 1;
          setBeat(revealBeats[i]!);
          tick();
        }, delay),
      );
    };
    timers.push(setTimeout(tick, revealInitialDelayMs(reducedMotion)));
    return () => timers.forEach(clearTimeout);
  }, [project?.id, reducedMotion, onboardingTrack, revealBeats]);

  const beatIdx = revealBeats.indexOf(beat);
  const show = (b: RevealBeat) => beatIdx >= revealBeats.indexOf(b);

  const gaps = useMemo(() => (project ? inferMarketingGaps(project) : []), [project]);
  const shipTarget = useMemo(() => (project ? resolveFirstShipTarget(project) : null), [project]);
  const orderedRoutes = useMemo(() => (project ? orderRevealRoutes(project) : { rest: [] }), [project]);

  const quickStart = isQuickStartTrack(onboardingTrack) && !firstShipAt;
  const thesisLine = quickStartThesisLine(channelThesis);

  const primaryRunAction = useMemo(
    () =>
      resolveFirstRunPrimaryAction({
        firstShipAt,
        heroPath: shipTarget?.heroPath,
        channelThesis,
        marketingProfile,
        week1Ready,
        onboardingTrack,
        connected,
        persona,
      }),
    [
      channelThesis,
      connected,
      firstShipAt,
      marketingProfile,
      onboardingTrack,
      persona,
      shipTarget?.heroPath,
      week1Ready,
    ],
  );

  const runPrimaryRevealAction = () => {
    switch (primaryRunAction.id) {
      case "ship_first_patch":
        beginQuickStartShip();
        break;
      case "complete_cmo_strategy":
        openStrategicIntake();
        break;
      case "complete_launch_setup":
        openLaunchReadiness();
        break;
      case "start_week1":
        week1Ready ? beginCmoWeek1() : openLaunchReadiness();
        break;
      case "connect":
        openConnectFlow();
        break;
      default:
        beginQuickStartShip();
        break;
    }
  };

  if (!project) return null;

  const sourceKindLabel =
    project.source.kind === "folder" ? "Local folder" : project.source.kind === "repo" ? "Repository" : "Live site";

  const stats = [
    { icon: FileCode2, label: "Stack", value: shipTarget?.stackLine ?? project.framework ?? "Detected" },
    { icon: RouteIcon, label: "Routes", value: String(project.routes.length) },
    { icon: BarChart3, label: "Analytics", value: project.hasAnalytics ? "Yes" : "None" },
    {
      icon: FileText,
      label: "Files scanned",
      value: project.scannedFileCount > 0 ? String(project.scannedFileCount) : "—",
    },
  ];

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
      <div className="app-bg" aria-hidden />
      <motion.div
        className="relative w-full max-w-2xl px-8 py-12"
        variants={sceneReveal}
        initial="hidden"
        animate="visible"
      >
        <motion.img
          layoutId="onboarding-logo"
          src={logoUrl}
          alt=""
          aria-hidden
          className="mx-auto mb-6 h-12 w-12 rounded-[var(--radius-lg)] opacity-80 shadow-[var(--shadow-2)]"
        />

        <RevealProgressRail current={beat} beats={revealBeats} />

        <AnimatePresence mode="popLayout">
          {show("name") && (
            <motion.div
              key="name"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 text-ok">
                <CheckCircle2 size={16} />
                <span className="text-label">Product understood</span>
                <Badge className="ml-1">{sourceKindLabel}</Badge>
              </div>
              <h1 className="mt-2 text-display text-text">{project.name}</h1>
              <p className="mt-2 max-w-[60ch] rounded-[var(--radius-md)] border border-accent/25 bg-accent-soft/15 px-3 py-2 text-body-sm text-text-2">
                This is your Cursor project — market it here from the same folder. No re-upload; the agent
                edits files and runs browser research in place.
              </p>
            </motion.div>
          )}

          {show("stack") && (
            <motion.div
              key="stack"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((s) => (
                  <Card key={s.label} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-text-3">
                      <s.icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-caption">{s.label}</div>
                      <div className="truncate text-body font-medium text-text">{s.value}</div>
                    </div>
                  </Card>
                ))}
              </div>
              {shipTarget?.heroPath && (
                <p className="mt-3 rounded-[var(--radius-md)] border border-ok-border/40 bg-ok-soft/15 px-3 py-2 font-mono text-mini text-text-2">
                  Landing file: <span className="text-ok">{shipTarget.heroPath}</span>
                </p>
              )}
            </motion.div>
          )}

          {show("routes") && project.routes.length > 0 && (
            <motion.div
              key="routes"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="mb-1.5 text-caption uppercase tracking-wider">Key routes</div>
              <div className="flex flex-wrap gap-1.5">
                {orderedRoutes.hero && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent-soft/25 px-2 py-0.5 font-mono text-micro text-accent"
                    data-testid="reveal-hero-route"
                  >
                    {orderedRoutes.hero}
                    <Badge tone="accent" className="!px-1 !py-0 text-[9px]">
                      Hero
                    </Badge>
                  </span>
                )}
                {orderedRoutes.rest.slice(0, 7).map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-line bg-surface-2 px-2 py-0.5 font-mono text-micro text-text-2"
                  >
                    {r}
                  </span>
                ))}
                {project.routes.length > 8 && (
                  <span className="rounded-full px-2 py-0.5 text-micro text-text-3">
                    +{project.routes.length - 8} more
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {show("readme") && project.readmeSummary && (
            <motion.div
              key="readme"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="mb-1.5 text-caption uppercase tracking-wider">README insights</div>
              <p className="max-w-[60ch] rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body text-text-2">
                {project.readmeSummary.slice(0, 220)}
                {project.readmeSummary.length > 220 ? "…" : ""}
              </p>
            </motion.div>
          )}

          {show("gaps") && (
            <motion.div
              key="gaps"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              {gaps.length > 0 ? (
                <>
                  <div className="mb-2 flex items-center gap-1.5 text-caption uppercase tracking-wider text-warn">
                    <AlertTriangle size={12} /> Marketing gaps to close
                  </div>
                  <ul className="space-y-2">
                    {gaps.map((g) => (
                      <li
                        key={g.id}
                        className="rounded-[var(--radius-md)] border border-warn-border/40 bg-warn-soft/20 px-3 py-2"
                      >
                        <div className="text-body-sm font-medium text-text">{g.label}</div>
                        <div className="text-mini text-text-2">{g.hint}</div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="rounded-[var(--radius-md)] border border-ok-border/40 bg-ok-soft/20 px-3 py-2 text-body-sm text-text-2">
                  Scan looks GTM-ready — no critical marketing gaps detected.
                </p>
              )}
            </motion.div>
          )}

          {show("thesis") && channelThesis && (
            <motion.div
              key="thesis"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
              data-testid="reveal-cmo-thesis"
            >
              {quickStart && thesisLine ? (
                <>
                  <div className="mb-1.5 text-caption uppercase tracking-wider">Channel thesis</div>
                  <ThesisChip
                    title={channelThesis.title}
                    headline={channelThesis.headline}
                    compact
                  />
                </>
              ) : (
                <CmoIntakeCard
                  thesis={channelThesis}
                  compact
                  sealed={isStrategicDecisionSealed(marketingProfile)}
                  narrative={marketingProfile?.growth_narrative}
                  strategicDecision={marketingProfile?.strategic_decision}
                  thesisQualityReport={marketingProfile?.thesis_quality_report}
                />
              )}
            </motion.div>
          )}

          {show("moves") && (
            <motion.div
              key="moves"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <OneNextActionCard
                action={primaryRunAction}
                onPrimary={runPrimaryRevealAction}
                onTertiary={
                  primaryRunAction.id === "ship_first_patch"
                    ? () => setOnboardingTrack("full_cmo")
                    : undefined
                }
                testId="reveal-one-next-action"
              />

              <div className="mt-4">
                <HumanExecutionContractBanner compact />
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {shouldShowQuickStartFork({ onboardingTrack, firstShipAt }) && (
                  <QuickStartForkCard compact />
                )}
                {!connected && (
                  <p className="text-body-sm text-text-2">
                    Offline scan is ready — connect for AI diffs and Week 1 ops.
                    <button type="button" onClick={openConnectFlow} className="ml-1 text-accent hover:underline">
                      Connect
                    </button>
                  </p>
                )}
                <Button variant="ghost" size="sm" onClick={enterHome} className="self-start">
                  Open dashboard
                </Button>
                {strategicIntakeOpen &&
                  channelThesis &&
                  channelThesis.verdict !== "not_ready" &&
                  !isStrategicDecisionSealed(marketingProfile) && <CmoStrategicIntakeFlow />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
