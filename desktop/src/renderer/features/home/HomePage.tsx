import {
  ArrowRight,
  Compass,
  FolderOpen,
  Globe,
  ListTodo,
  Mail,
  MessageSquare,
  PenLine,
  Rocket,
  Search,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@renderer/state/store";
import { assessMeasurementBaseline, isMeasurementGateHard } from "@shared/measurementBaseline";
import { Page } from "@renderer/components/ui/Page";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { EmptyState } from "@renderer/components/EmptyState";
import {
  QUICK_ACTION_GOALS,
  type QuickActionId,
  isQuickActionDisabled,
  resolveQuickAction,
} from "@shared/quickActions";
import { personaValue } from "@shared/personaValue";
import { planModeBadge } from "@shared/planLabels";
import {
  CAMPAIGN_PHASE_LABELS,
  campaignProgressPercent,
} from "@shared/campaignSession";
import { isContinuousReplanReady } from "@shared/cmoContinuous";
import { isCommandSurfaceActive } from "@shared/cmoCommandSurface";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";
import { shouldDeferFullCmoIntake } from "@shared/quickStartWedge";
import { ShipFirstWinBanner } from "./ShipFirstWinBanner";
import { ShipWinCard } from "@renderer/features/workspace/ShipWinCard";
import { nextActionableTask } from "@shared/planProgress";
import type { CampaignSession } from "@shared/types";
import { CmoIntakeCard } from "@renderer/features/onboarding/CmoIntakeCard";
import { CmoStrategicIntakeFlow } from "@renderer/features/onboarding/CmoStrategicIntakeFlow";
import { BudgetSetupCard } from "@renderer/features/onboarding/BudgetSetupCard";
import { ProductActivationCard } from "@renderer/features/onboarding/ProductActivationCard";
import { RevenueSetupCard } from "@renderer/features/onboarding/RevenueSetupCard";
import { ExecutionRecordCard } from "@renderer/features/workspace/executionRecord/ExecutionRecordCard";
import { useActiveExecutionRecord } from "@renderer/features/workspace/executionRecord/useExecutionRecord";
import { CmoBackstage } from "@renderer/features/workspace/CmoBackstage";
import { isDistributionOperatorGate } from "@shared/cmoDistributionOperator";
import { isInfluencerOperatorGate } from "@shared/cmoInfluencerOperator";
import { isDelegateOperatorGate, resolveDelegateOperator } from "@shared/cmoDelegateOperator";
import { GtmKnowledgeStrip } from "./GtmKnowledgeStrip";

interface Move {
  icon: LucideIcon;
  title: string;
  desc: string;
  tone?: "accent" | "sales";
  /** Works offline (e.g. plan outline preview). */
  offlineCapable?: boolean;
  /** Immediate run (edit/browse/plan) — bypasses composer prefill. */
  run?: () => void;
  /** Composer prefill via quick action registry. */
  quickAction?: QuickActionId;
}

export function HomePage() {
  const project = useApp((s) => s.project);
  const persona = useApp((s) => s.settings.persona);
  const pv = personaValue(persona);
  const personaPromise = pv.promise;
  const navigate = useApp((s) => s.navigate);
  const startRun = useApp((s) => s.startRun);
  const generatePlan = useApp((s) => s.generatePlan);
  const runQuickAction = useApp((s) => s.runQuickAction);
  const openProjectPicker = useApp((s) => s.openProjectPicker);
  const run = useApp((s) => s.run);
  const connected = useApp((s) => s.runtime === "connected");
  const previewPlanOutline = useApp((s) => s.previewPlanOutline);
  const hasFolder = project?.source.kind === "folder";
  const runsArchive = useApp((s) => s.runsArchive);
  const sessions = useApp((s) => s.sessions);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const plan = useApp((s) => s.plan);
  const planPreviewMode = useApp((s) => s.planPreviewMode);
  const planProgress = useApp((s) => s.planProgress);
  const campaignSession = useApp((s) => s.marketingProfile?.campaign_session ?? null);
  const openRunReplay = useApp((s) => s.openRunReplay);
  const focusArtifact = useApp((s) => s.focusArtifact);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const firstShipAt = useApp((s) => s.firstShipAt);
  const sessionOutcomes = useApp((s) => s.sessionOutcomes);
  const channelThesis = useApp((s) => s.channelThesis ?? s.marketingProfile?.channel_thesis);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const laneBWorkspace = useApp((s) => s.laneBWorkspace ?? s.marketingProfile?.lane_b_workspace);
  const laneAWorkspace = useApp((s) => s.laneAWorkspace ?? s.marketingProfile?.lane_a_workspace);
  const laneDWorkspace = useApp((s) => s.laneDWorkspace ?? s.marketingProfile?.lane_d_workspace);
  const monetizationWorkspace = useApp(
    (s) => s.monetizationWorkspace ?? s.marketingProfile?.monetization_workspace,
  );
  const revenueProfile = useApp((s) => s.revenueProfile ?? s.marketingProfile?.revenue_profile);
  const productActivation = useApp(
    (s) => s.productActivation ?? s.marketingProfile?.product_activation,
  );
  const cmoContinuous = useApp((s) => s.cmoContinuous ?? s.marketingProfile?.cmo_continuous);
  const growthMemory = useApp((s) => s.growthMemory ?? s.marketingProfile?.growth_memory);
  const delegateRaw = useApp(
    (s) =>
      s.delegateOperator ??
      s.delegateWorkspace ??
      s.marketingProfile?.delegate_operator ??
      s.marketingProfile?.lane_c_workspace,
  );
  const delegateWorkspace = useMemo(
    () => resolveDelegateOperator(delegateRaw, channelThesis),
    [delegateRaw, channelThesis],
  );
  const growthControlPlane = useApp(
    (s) => s.growthControlPlane ?? s.marketingProfile?.growth_control_plane,
  );
  const warRoomExpanded = useApp((s) => s.warRoomExpanded);
  const distributionOperator = useApp(
    (s) => s.distributionOperator ?? s.marketingProfile?.distribution_operator,
  );
  const influencerOperator = useApp(
    (s) => s.influencerOperator ?? s.marketingProfile?.influencer_operator,
  );
  const beginCmoWeek1 = useApp((s) => s.beginCmoWeek1);
  const beginFirstHour = useApp((s) => s.beginFirstHour);
  const firstShipLedger = useApp((s) => s.firstShipLedger);
  const onboardingTrack = useApp((s) => s.onboardingTrack);
  const openStrategicIntake = useApp((s) => s.openStrategicIntake);
  const executionRecord = useActiveExecutionRecord();

  const baselineReady = assessMeasurementBaseline(marketingProfile, project).ready;
  const week1Ready = Boolean(
    productActivation &&
      revenueProfile &&
      (!isMeasurementGateHard() || baselineReady),
  );
  const needsPreWeek1Setup =
    Boolean(channelThesis) &&
    !opsCadence &&
    isStrategicDecisionSealed(marketingProfile) &&
    !week1Ready;
  const showCmoIntakeSection =
    Boolean(channelThesis) &&
    !opsCadence &&
    !campaignSession &&
    (!plan || needsPreWeek1Setup) &&
    !shouldDeferFullCmoIntake({ firstShipAt, onboardingTrack });

  const shippedToday =
    firstShipLedger &&
    new Date(firstShipLedger.at).toDateString() === new Date().toDateString();

  const commandSurfaceActive = isCommandSurfaceActive({ growthControlPlane, opsCadence });
  const distOperatorActive =
    !!distributionOperator &&
    isDistributionOperatorGate({
      thesis: channelThesis,
      opsCadence,
      growthPlane: growthControlPlane,
    });
  const infOperatorActive =
    !!influencerOperator &&
    isInfluencerOperatorGate({
      thesis: channelThesis,
      opsCadence,
      growthPlane: growthControlPlane,
    });
  const delegateOperatorActive =
    !!delegateWorkspace &&
    isDelegateOperatorGate({
      thesis: channelThesis,
      opsCadence,
    });
  if (!project) {
    return (
      <Page title="Dashboard" eyebrow="Marketing IDE">
        <div className="flex h-[60vh] items-center justify-center">
          <EmptyState
            icon={FolderOpen}
            title="Open a project to begin"
            description="The operator works against an open project — a repo, folder, or live site. Pick one to get started."
            primaryAction={{ label: "Open a project", onClick: openProjectPicker, icon: FolderOpen }}
          />
        </div>
      </Page>
    );
  }

  const goWorkspace = () => navigate("workspace");

  const runMove = (move: Move) => {
    if (move.run) {
      move.run();
      return;
    }
    if (move.quickAction) runQuickAction(move.quickAction);
  };

  const moveDisabled = (move: Move): string | null => {
    if (move.quickAction) {
      return isQuickActionDisabled(resolveQuickAction(move.quickAction), { connected, hasFolder });
    }
    if (move.run) {
      if (!connected && !move.offlineCapable) {
        return "Connect for full AI — or use plan outline preview when available.";
      }
      if (
        connected &&
        (move.title === "Prepare for launch" ||
          move.title === "Understand the product" ||
          move.title === "Build my ICP")
      ) {
        if (!hasFolder) return "Open a local folder to edit project files.";
      }
    }
    return null;
  };

  const marketingMoves: Move[] = [
    {
      icon: Rocket,
      title: "Prepare for launch",
      desc: "Audit landing, plan, and assets end-to-end.",
      tone: "accent",
      run: () => {
        void startRun(QUICK_ACTION_GOALS.LAUNCH);
        goWorkspace();
      },
    },
    {
      icon: Sparkles,
      title: "Understand the product",
      desc: "Scan the repo and summarize positioning.",
      run: () => {
        void startRun(QUICK_ACTION_GOALS.SCAN);
        goWorkspace();
      },
    },
    {
      icon: Wand2,
      title: connected ? "30-day launch plan" : "Preview launch outline",
      desc: connected ? "AI-generated plan from your repo." : "Scan-based outline — connect for full AI.",
      offlineCapable: true,
      run: () => {
        if (connected) {
          void generatePlan();
        } else {
          previewPlanOutline();
        }
        goWorkspace();
      },
    },
    {
      icon: Compass,
      title: "Live Computer Use",
      desc: "Watch the agent research competitors on Google — live sandbox stage.",
      quickAction: "competitors",
    },
  ];

  const salesMoves: Move[] = [
    {
      icon: Target,
      title: "Build my ICP",
      desc: "Define your ideal customer profile.",
      tone: "sales",
      run: () => {
        void startRun(QUICK_ACTION_GOALS.ICP);
        goWorkspace();
      },
    },
    {
      icon: Search,
      title: "Research 20 leads",
      desc: "Research up to 20 ICP leads — export CSV when ready. You send.",
      tone: "sales",
      quickAction: "leads",
    },
    {
      icon: PenLine,
      title: "Landing copy",
      desc: "Draft high-converting page copy.",
      tone: "accent",
      quickAction: "landing_copy",
    },
    {
      icon: Mail,
      title: "Draft outreach",
      desc: "Personalized first-touch + follow-ups — you send from your client.",
      tone: "sales",
      quickAction: "outreach",
    },
  ];

  const primary = persona === "sales" ? salesMoves : marketingMoves;
  const secondary = persona === "sales" ? marketingMoves : salesMoves;
  const planHourStarted = Boolean(plan && planProgress);
  const nextPlanTask =
    plan && planProgress ? nextActionableTask(plan, planProgress.byTaskId) : null;
  const planDone = planProgress?.computed.done ?? 0;
  const planTotal = planProgress?.computed.total ?? plan?.taskGraph.length ?? 0;

  const continueFirstHour = () => {
    navigate("workspace");
    setWorkSurface("campaign-plan");
    setActiveCanvas("campaign-plan");
    if (nextPlanTask) {
      focusPlanTask({ playbookId: nextPlanTask.playbookId, taskId: nextPlanTask.id });
    } else {
      focusArtifact({ mode: "plan" });
    }
  };

  return (
    <Page
      title="Dashboard"
      eyebrow="Claude for Marketing & Sales"
      actions={
        <Button variant="secondary" iconRight={<ArrowRight size={15} />} onClick={goWorkspace}>
          Open workspace
        </Button>
      }
    >
      <Card className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-h2 text-text">{project.name}</span>
            {project.framework && <Badge>{project.framework}</Badge>}
            <Badge tone={persona === "sales" ? "sales" : "marketing"}>
              {persona === "sales" ? "Sales" : "Marketing"}
            </Badge>
          </div>
          <p className="mt-1 text-body-sm text-text-2">
            {project.readmeSummary?.slice(0, 140) ??
              `${project.routes.length} routes · ${project.scannedFileCount} files scanned`}
          </p>
          <p className="mt-2 text-mini text-text-3">{personaPromise}</p>
          <p className="mt-1 text-[10px] text-text-3">{pv.honestyNote}</p>
        </div>
        {run && (run.status === "running" || run.status === "planning") && (
          <Button variant="subtle" onClick={goWorkspace}>
            Run in progress…
          </Button>
        )}
      </Card>

      {!firstShipAt && hasFolder && <ShipFirstWinBanner />}

      {firstShipAt && firstShipLedger && (
        <>
          {shippedToday && (
            <Card className="border-ok/25 bg-ok-soft/10 p-3" data-testid="home-today-shipped">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ok">
                Today you shipped
              </p>
              <p className="mt-1 text-body-sm text-text">{firstShipLedger.summary}</p>
            </Card>
          )}
          <ShipWinCard
            ledger={firstShipLedger}
            compact
            onContinueCmo={
              channelThesis && !isStrategicDecisionSealed(marketingProfile)
                ? openStrategicIntake
                : undefined
            }
          />
        </>
      )}

      {commandSurfaceActive && growthControlPlane && opsCadence && (
        <div className="space-y-3">
          <ExecutionRecordCard record={executionRecord} />
          <div className="flex justify-end">
            <Button variant="subtle" size="sm" onClick={() => navigate("workspace")}>
              Workspace&apos;te aç <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {commandSurfaceActive && warRoomExpanded && growthControlPlane && opsCadence && (
        <CmoBackstage
          cadence={opsCadence}
          thesis={channelThesis}
          plane={growthControlPlane}
          laneAWorkspace={laneAWorkspace}
          laneBWorkspace={laneBWorkspace}
          laneDWorkspace={laneDWorkspace}
          monetizationWorkspace={monetizationWorkspace}
          distributionOperator={distOperatorActive ? distributionOperator : null}
          influencerOperator={infOperatorActive ? influencerOperator : null}
          delegateOperator={delegateOperatorActive ? delegateWorkspace : null}
          continuous={cmoContinuous}
          campaignSession={campaignSession}
          growthMemory={growthMemory}
        />
      )}
      {!commandSurfaceActive && growthControlPlane && opsCadence && (
        <CmoBackstage
          cadence={opsCadence}
          thesis={channelThesis}
          plane={growthControlPlane}
          laneAWorkspace={laneAWorkspace}
          laneBWorkspace={laneBWorkspace}
          laneDWorkspace={laneDWorkspace}
          monetizationWorkspace={monetizationWorkspace}
          distributionOperator={distOperatorActive ? distributionOperator : null}
          influencerOperator={infOperatorActive ? influencerOperator : null}
          delegateOperator={delegateOperatorActive ? delegateWorkspace : null}
          continuous={cmoContinuous}
          campaignSession={campaignSession}
          growthMemory={growthMemory}
        />
      )}

      {showCmoIntakeSection && (
        channelThesis!.verdict === "not_ready" ? (
          <CmoIntakeCard thesis={channelThesis!} />
        ) : isStrategicDecisionSealed(marketingProfile) ? (
          <>
            {needsPreWeek1Setup && (
              <>
                <BudgetSetupCard />
                <ProductActivationCard />
                <RevenueSetupCard />
              </>
            )}
            <CmoIntakeCard
              thesis={channelThesis!}
              narrative={marketingProfile?.growth_narrative}
              strategicDecision={marketingProfile?.strategic_decision}
              onStartWeek1={week1Ready ? () => beginCmoWeek1() : undefined}
              onFullPlan={() => beginFirstHour()}
              week1BlockedReason={
                !week1Ready
                  ? !productActivation
                    ? "Complete product activation above before Week 1."
                    : "Complete revenue intake above before Week 1."
                  : undefined
              }
            />
          </>
        ) : (
          <CmoStrategicIntakeFlow />
        )
      )}

      {campaignSession && (
        <ActiveCampaignCard
          session={campaignSession}
          progress={campaignProgressPercent(campaignSession, planProgress)}
          planPreviewMode={planPreviewMode}
          onContinue={() => {
            navigate("workspace");
          }}
        />
      )}

      {planHourStarted && !campaignSession && (
        <FirstHourProgressCard
          done={planDone}
          total={planTotal}
          planPreviewMode={planPreviewMode}
          nextTask={nextPlanTask}
          firstShipAt={firstShipAt}
          onContinue={continueFirstHour}
        />
      )}

      {!connected && !plan && (
        <p className="mt-4 text-body-sm text-text-2">
          Offline mode — preview a scan-based outline (not AI). Use Connection setup for full plans and agent runs.
        </p>
      )}

      {plan && (
        <div className="mt-3 flex items-center gap-2">
          <Badge tone={planPreviewMode ? "warn" : "accent"}>{planModeBadge(planPreviewMode)}</Badge>
          {planPreviewMode && (
            <span className="text-mini text-text-3">Connect to replace with an AI-generated plan.</span>
          )}
        </div>
      )}

      <RecentActivityStrip
        runs={runsArchive.slice(0, 2)}
        lastShip={sessionOutcomes.find((o) => o.commitSha || o.filesApplied)?.label}
        sessionTitle={sessions.find((s) => s.id === activeSessionId)?.title}
        hasPlan={!!plan}
        planPreviewMode={planPreviewMode}
        onRun={(id) => void openRunReplay(id)}
        onPlan={() => focusArtifact({ mode: "plan" })}
        onRuns={() => navigate("runs")}
        onWorkspace={() => navigate("workspace")}
      />

      <div className="mt-8">
        <GtmKnowledgeStrip />
      </div>

      {!planHourStarted && (
        <>
          <div className="mt-8">
            <h2 className="mb-3 text-h3 text-text">Suggested moves</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {primary.map((m) => {
                const disabled = moveDisabled(m);
                const softDisabled = !!disabled && !m.offlineCapable;
                return (
                  <Card
                    key={m.title}
                    interactive
                    onClick={() => runMove(m)}
                    padded
                    className={softDisabled ? "cursor-not-allowed opacity-50" : undefined}
                    title={disabled ?? undefined}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                          m.tone === "sales" ? "bg-sales-soft text-sales" : "bg-accent-soft text-accent"
                        }`}
                      >
                        <m.icon size={17} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-body font-medium text-text">{m.title}</div>
                        <div className="text-body-sm text-text-2">{m.desc}</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-3 text-h3 text-text-2">More</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {secondary.map((m) => {
                const disabled = moveDisabled(m);
                return (
                  <button
                    key={m.title}
                    onClick={disabled ? undefined : () => runMove(m)}
                    disabled={!!disabled}
                    title={disabled ?? undefined}
                    className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-2 px-4 py-3 text-left transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <m.icon size={16} className={m.tone === "sales" ? "text-sales" : "text-accent"} />
                    <span className="text-body text-text-2">{m.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function FirstHourProgressCard({
  done,
  total,
  planPreviewMode,
  nextTask,
  firstShipAt,
  onContinue,
}: {
  done: number;
  total: number;
  planPreviewMode: boolean;
  nextTask: { id: string; day: number; title: string } | null;
  firstShipAt?: number;
  onContinue: () => void;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const firstShipLabel = firstShipAt
    ? "First change applied ✓"
    : !firstShipAt && done === 0
      ? "Ship one patch from reveal"
      : undefined;
  const ctaLabel = nextTask
    ? done === 0
      ? `Start Day ${nextTask.day}`
      : `Continue · Day ${nextTask.day}`
    : done >= total
      ? "Review plan"
      : "Open plan studio";

  return (
    <Card
      className="mt-4 border-accent/20 bg-accent-soft/10"
      data-testid="first-hour-progress-card"
      role="region"
      aria-label="First hour progress"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              Your first hour
            </span>
            <Badge tone={planPreviewMode ? "warn" : "accent"}>
              {planPreviewMode ? "Outline" : "Launch plan"}
            </Badge>
          </div>
          <h2 className="mt-1 text-h3 text-text">
            {nextTask ? `Next: Day ${nextTask.day} · ${nextTask.title}` : "Plan ready — pick your next task"}
          </h2>
          <p className="mt-1 text-mini text-text-3">
            {done}/{total} tasks complete
            {firstShipLabel ? ` · ${firstShipLabel}` : ""}
            {planPreviewMode ? " · Connect for full AI personalization" : ""}
          </p>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] text-text-3">
              <span>Hour-one progress</span>
              <span className="font-medium tabular-nums text-text-2">{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${Math.max(done > 0 ? 8 : 4, pct)}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
        <Button variant="primary" iconRight={<ArrowRight size={15} />} onClick={onContinue} className="shrink-0">
          {ctaLabel}
        </Button>
      </div>
    </Card>
  );
}

function ActiveCampaignCard({
  session,
  progress,
  planPreviewMode,
  onContinue,
}: {
  session: CampaignSession;
  progress: number;
  planPreviewMode: boolean;
  onContinue: () => void;
}) {
  const phaseLabel = CAMPAIGN_PHASE_LABELS[session.phase];
  const cmoContinuous = useApp((s) => s.cmoContinuous ?? s.marketingProfile?.cmo_continuous);
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const appendEvent = useApp((s) => s.appendEvent);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const ctaLabel =
    session.phase === "measuring"
      ? "Start next week"
      : session.phase === "reviewing"
        ? "Review & apply"
        : session.phase === "planning"
          ? "Open plan studio"
          : "Continue campaign";

  const replanReady = isContinuousReplanReady(cmoContinuous, opsCadence, session.phase);

  const handleContinue = () => {
    if (session.phase === "measuring" && replanReady) {
      const pivot = opsCadence?.pivot_suggestion;
      const suggested =
        pivot && !pivot.dismissed_at ? pivot.suggested_thesis_ids[0] : undefined;
      const err = startNextCmoCycle({
        thesisId: suggested,
        mode: suggested && pivot?.verdict === "flat" ? "pivot" : "double_down",
      });
      if (err) {
        appendEvent({ role: "system", kind: "error", text: err });
      }
    }
    onContinue();
  };

  return (
    <Card
      className="mt-4 border-accent/20 bg-accent-soft/10"
      data-testid="active-campaign-card"
      role="region"
      aria-label="Active campaign"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              Active campaign
            </span>
            <Badge tone={session.phase === "measuring" ? "ok" : "accent"}>{phaseLabel}</Badge>
            {planPreviewMode && <Badge tone="warn">Outline</Badge>}
          </div>
          <h2 className="mt-1 truncate text-h3 text-text">{session.goal}</h2>
          <p className="mt-1 text-mini text-text-3">
            {session.runIds.length} run{session.runIds.length === 1 ? "" : "s"}
            {session.assetIds.length > 0
              ? ` · ${session.assetIds.length} asset${session.assetIds.length === 1 ? "" : "s"}`
              : ""}
            {session.milestones.length >= 4
              ? ` · ${session.milestones.length} milestones`
              : ""}
          </p>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] text-text-3">
              <span>Progress</span>
              <span className="font-medium tabular-nums text-text-2">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${Math.max(4, progress)}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          iconRight={<ArrowRight size={15} />}
          onClick={handleContinue}
          className="shrink-0"
        >
          {ctaLabel}
        </Button>
      </div>
    </Card>
  );
}

function RecentActivityStrip({
  runs,
  lastShip,
  sessionTitle,
  hasPlan,
  planPreviewMode,
  onRun,
  onPlan,
  onRuns,
  onWorkspace,
}: {
  runs: { id: string; goal: string; status: string; kind: string }[];
  lastShip?: string;
  sessionTitle?: string;
  hasPlan: boolean;
  planPreviewMode: boolean;
  onRun: (id: string) => void;
  onPlan: () => void;
  onRuns: () => void;
  onWorkspace: () => void;
}) {
  const items: { key: string; label: string; sub?: string; onClick: () => void; icon: LucideIcon }[] =
    [];

  if (lastShip) {
    items.push({
      key: "last-ship",
      label: lastShip.slice(0, 72),
      sub: "Last shipped change",
      onClick: onWorkspace,
      icon: Rocket,
    });
  }

  for (const r of runs) {
    items.push({
      key: r.id,
      label: r.goal.slice(0, 72) + (r.goal.length > 72 ? "…" : ""),
      sub: `${r.status} · ${r.kind}`,
      onClick: () => onRun(r.id),
      icon: r.kind === "browse" ? Globe : PenLine,
    });
  }
  if (sessionTitle) {
    items.push({
      key: "session",
      label: sessionTitle,
      sub: "Chat session",
      onClick: onWorkspace,
      icon: MessageSquare,
    });
  }
  if (hasPlan && items.length < 3) {
    items.push({
      key: "plan",
      label: planPreviewMode ? "Outline preview ready" : "AI launch plan ready",
      sub: planPreviewMode ? "Scan-based — not AI" : "Open plan canvas",
      onClick: onPlan,
      icon: ListTodo,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-h3 text-text">Recent activity</h2>
        <button onClick={onRuns} className="text-body-sm text-accent hover:underline">
          All runs
        </button>
      </div>
      <div className="grid gap-2">
        {items.slice(0, 3).map((item) => (
          <button
            key={item.key}
            onClick={item.onClick}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-2 px-4 py-3 text-left transition-colors hover:bg-elevated"
          >
            <item.icon size={16} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-body text-text">{item.label}</div>
              {item.sub && <div className="text-caption text-text-3">{item.sub}</div>}
            </div>
            <ArrowRight size={14} className="shrink-0 text-text-3" />
          </button>
        ))}
      </div>
    </div>
  );
}
