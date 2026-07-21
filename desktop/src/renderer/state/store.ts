import { create } from "zustand";
import type {
  InitPhase,
  MarketingAsset,
  MarketingPlan,
  ProjectProfile,
  ProjectSource,
  RecentProject,
  ServerAsset,
  ServerConfig,
  ServerProject,
  ServerSession,
  SessionOutcome,
  Settings,
  CampaignSession,
  Finding,
  FounderFitProfile,
  GrowthNarrative,
  StrategicDecision,
  StrategicOptionId,
} from "@shared/types";
import { DEFAULT_SETTINGS, emptyMarketingProfile } from "@shared/defaults";
import {
  DEMO_CONNECTOR_FEED_PREFIX,
  isDemoConnectorsAllowed,
  setDemoConnectorsEnabled,
} from "@shared/demoConnectors";
import {
  connectorFeedPlaceholderItem,
  hasConnectorFeedPlaceholder,
  isConnectorFeedPlaceholder,
} from "@shared/connectorFeedPlaceholder";
import { buildOfflinePlanOutline } from "@shared/offlinePlanOutline";
import {
  compactPlanSnapshot,
  DEFAULT_CONTEXT_LIMIT,
  trimHistoryToBudget,
} from "@shared/contextBudget";
import {
  canRunAgent,
  type RuntimeCapability,
} from "@shared/runtimeCapability";
import {
  assertCan,
  deriveMatrix,
  type CapabilityMatrix,
} from "@shared/capability";
import type { IdeNotification } from "@shared/orchestration";
import { profileFromProjectScan } from "@shared/profileFromScan";
import { parseMentionsFromText } from "@shared/mentionParse";
import { enrichEditGoal } from "@shared/editGoalEnrich";
import { buildTurnReceipt, type TurnReceipt } from "@shared/turnReceipt";
import { aggregatePatchStats } from "@shared/turnReceipt";
import { presentError } from "@renderer/lib/errorPresenter";
import { reportBackgroundError, swallowBackground } from "@renderer/lib/backgroundError";
import {
  apiCreateProject,
  apiCreateSession,
  apiDeleteSession,
  apiGetMe,
  apiBillingCheckout,
  apiBillingPortal,
  apiGetRun,
  apiGetRunEvents,
  apiListAssets,
  apiListMessages,
  apiListPlans,
  apiListProjects,
  apiListRuns,
  apiListSessions,
  apiMarkAssetApplied,
  apiGetPlanProgress,
  apiPatchPlanProgress,
  apiReconcilePlanProgress,
  apiPatchSession,
  apiScanProject,
  apiStartGa4Connect,
  apiSyncGa4Metrics,
  checkHealth,
  streamPlan,
  StreamHttpError,
  type ServerPlanRow,
} from "@renderer/lib/api";
import {
  createAskFoldSession,
  finalizeAskFold,
  foldAskStreamEvent,
  type AskFoldDeps,
  type AskFoldSession,
} from "./askStreamFold";
import { AuthError } from "@renderer/lib/http";
import {
  completeAuthFromCallbackUrl,
  fetchConfig,
  sendCode,
  setAuthConfig,
  getAuthConfig,
  getValidAccessToken,
  signOut as authSignOut,
  startGoogleOAuth,
  verifyCode,
} from "@renderer/lib/auth";
import { BrowserSocket } from "@renderer/lib/browserSocket";
import { resolveBackendToken } from "@renderer/lib/backendToken";
import { setAnalyticsEnabled, track } from "@renderer/lib/analytics";
import {
  makeEventId,
  type AuthInfo,
  type BrowserState,
  type CanvasMode,
  type CanvasState,
  type ConnectionInfo,
  type Phase,
  type Route,
  type RunInfo,
  type SessionEvent,
} from "./session";
import {
  DEFAULT_PERMISSION_POLICY,
  PERMISSION_SCOPE_LABELS,
  type FrameHistoryEntry,
  type MarketingProfile,
  type PermissionScope,
  type RunEvent,
  type RunStatus,
  type AgentStreamEvent,
} from "@shared/types";
import type { ArchiveRunItem } from "@shared/runs";
import { runChangedFiles, serverEventToRunEvent } from "@shared/runs";
import { authedFetch } from "@renderer/lib/http";
import { applyRunEvent, clearApproval } from "./runEvents";
import { initTheme, migrateTheme } from "@renderer/design/theme";
import {
  type ComposerMode,
  DEFAULT_COMPOSER_MODE,
  type QuickActionId,
  isQuickActionDisabled,
  resolveQuickAction,
} from "@shared/quickActions";
import { strategyContextSummary } from "@shared/brainLabels";
import {
  normalizeTier,
  tierBlockedMessage,
  tierHasFeature,
  type TierFeature,
} from "@shared/tierFeatures";
import {
  prepareMarketingAssetFromDecision,
  resolveAssetActions,
} from "@shared/assetActions";
import { buildOutreachPack, packToWebhookPayload } from "@shared/outreachPack";
import { hasLocalFolder, inferIntegrateRoute, projectFolderPath, resolveSidecarTarget } from "@shared/assetTarget";
import {
  normalizeCanvasMode,
  normalizeToWorkSurface,
  workSurfaceToCanvasMode,
  type WorkSurface,
} from "@shared/workSurfaces";
import type { FeedFilter, FeedItem } from "@shared/feed";
import type { ExecutionRecordDetailTab } from "@shared/executionRecord";
import { railSectionToWorkSurface, type RailSection } from "@shared/projectRail";
import { mockConnectorFeedItems, runEventToFeedItem } from "@renderer/features/workspace/feed/feedModel";
import {
  computePlanProgress,
  emptyProgressSnapshot,
  legacyMapFromSnapshot,
  mergeReconciledRuns,
  nextActionableTask,
  weekForDay,
  type PlanProgressSnapshot,
  type PlanTaskStatus,
} from "@shared/planProgress";
import {
  buildIntegrateAssetGoal,
  intentRequiresConfirm,
  resolveIntent,
  type ConversationIntent,
} from "@shared/conversationIntent";
import { handoffFromResolved, type HandoffConfirmState } from "@shared/workspaceHandoff";
import { resolveFirstShipTarget, resolveFirstHourAutoHandoff, FIRST_HOUR_AUTO_HANDOFF_DELAY_MS } from "@shared/firstHourWow";
import {
  parseShipSnapshotFromSource,
  buildShipSummary,
  type FirstShipSnapshot,
} from "@shared/firstShipSnapshot";
import {
  type OnboardingTrack,
  type WedgePhase,
} from "@shared/quickStartWedge";
import {
  nextShipPipelineStage,
  patchCountFromEvents,
  initialShipPipelineState,
  type ShipPipelineState,
} from "@shared/shipPipeline";
import { buildShipRecovery, type ShipRecoveryAction } from "@shared/shipPipelineRecovery";
import { appendExecutionMetric, type ExecutionMetricsRollup } from "@shared/executionMetrics";
import type { FirstShipLedger } from "@shared/types";
import {
  captureFirstShipSnapshotFromProject,
  loadExecutionMetrics,
  loadFirstShipLedger,
  loadOnboardingTrack,
  loadSessionOutcomesLocal,
  loadShipReceipt,
  persistExecutionMetricsLocal,
  persistFirstShipLedgerLocal,
  persistOnboardingTrack,
  persistSessionOutcomesLocal,
  persistShipReceiptLocal,
} from "@renderer/state/quickStartWedgeHelpers";
import { buildCmoIntake, buildFinalChannelThesis } from "@shared/cmoIntake";
import type { ChannelThesis } from "@shared/cmoIntake";
import { validateFounderFit } from "@shared/cmoFounderFit";
import { synthesizeGrowthNarrative } from "@shared/cmoGrowthNarrative";
import {
  buildStrategicDecision,
  isStrategicDecisionSealed,
  sealStrategicDecision as sealStrategicDecisionCore,
} from "@shared/cmoStrategicOptions";
import {
  completeOpsTask as completeOpsTaskCore,
  completeWeekReview,
  createOpsCadenceFromThesis,
  getNowTask,
  hydrateOpsCadenceFromJson,
  markOpsTaskInProgress,
  skipOpsTask as skipOpsTaskCore,
  tryAutoCompleteSystemTask,
  attachBrowserEvidenceToSystemTask,
  type CmoOpsCadence,
} from "@shared/cmoOpsCadence";
import {
  buildVerifyFixGoal,
} from "@shared/browserVerify";
import {
  assessMeasurementBaseline,
} from "@shared/measurementBaseline";
import { resolveLaunchReadinessSteps } from "@shared/launchReadiness";
import {
  buildShipReceiptFromApply,
  markShipReceiptVerifyRunning,
  markShipReceiptVerifySkipped,
} from "@shared/shipReceipt";
import { finalizeVerifyRun, planVerifyAfterApply } from "@shared/executionKernelBridge";
import { runShipQualityLint } from "@shared/shipQualityLint";
import {
  buildMorningBriefView,
  morningBriefDayKey,
  shouldShowDayUnlockToast,
} from "@shared/morningBrief";
import {
  allOpsTasksTerminal,
  attachKpiToCompletedProof,
  buildManualKpiFromOpsProof,
  buildPivotSuggestion,
  canCompleteWeekReview,
  evaluateWeek1Metrics,
  evaluateWeek1MetricsWithGa4Priority,
  hasGa4Connected,
  validateFullOpsProof,
} from "@shared/cmoProofLoop";
import {
  applyNextCycleStarted,
  archiveCompletedCycle,
  buildIntakeContextForNextCycle,
  buildIntakeDelta,
  canStartNextCycle,
  createInitialContinuousState,
  hydrateContinuousStateFromJson,
  resolveNextCycleThesisId,
  weekLabel,
  type CmoContinuousState,
  type NextCycleMode,
} from "@shared/cmoContinuous";
import {
  completeLaneBItem as completeLaneBItemCore,
  createLaneBWorkspaceFromThesis,
  hydrateLaneBWorkspaceFromJson,
  skipLaneBItem as skipLaneBItemCore,
  updateLaneBTarget as updateLaneBTargetCore,
  type LaneBWorkspace,
} from "@shared/cmoLaneB";
import {
  completeLaneAItemOnApply,
  createLaneAWorkspaceFromThesis,
  getLaneAItemForOpsTask,
  hydrateLaneAWorkspaceFromJson,
  markLaneAItemInProgress,
  resolveLaneARunPlan,
  type LaneARunPlan,
  type LaneAWorkspace,
} from "@shared/cmoLaneA";
import {
  bindExecutionPlansForCadence,
  executionPlanToLaneARunPlan,
} from "@shared/cmoExecutionBind";
import {
  bindHumanExecutionForCadence,
  resolveHumanProofAction,
  type HumanExecutionRef,
} from "@shared/cmoHumanExecutionBind";
import {
  buildProductActivationProfile,
  canResumeMarketing,
  completeLinkedProductRequestOnApply,
  completeProductRequest as completeProductRequestCore,
  createLaneDWorkspaceFromBinding,
  createProductLoopOpsCadence,
  detectProductBinding,
  hydrateLaneDWorkspaceFromJson,
  linkSiteLevelToLaneA,
  resumeMarketing,
  skipProductRequest as skipProductRequestCore,
  type LaneDWorkspace,
  type ProductActivationProfile,
  type ProductRequestProofInput,
} from "@shared/cmoLaneD";
import {
  completeDelegateBrief as completeDelegateBriefCore,
  hydrateDelegateWorkspaceFromJson,
  skipDelegateBrief as skipDelegateBriefCore,
} from "@shared/cmoLaneC";
import {
  buildDelegateHandoffBundle,
  completeRubricDay as completeRubricDayCore,
  createDelegateOperatorFromThesis,
  hydrateDelegateOperatorFromJson,
  importDelegateDelivery,
  migrateToOperatorWorkspace,
  prepareDelegateHandoff,
  resolveDelegateOperator,
  rollupDelegateKpis,
  type DelegateOperatorWorkspace,
  type RubricProofInput,
} from "@shared/cmoDelegateOperator";
import {
  buildGrowthControlPlane,
  hydrateGrowthControlPlaneFromJson,
  type GrowthControlPlane,
} from "@shared/cmoGrowthPlane";
import {
  applyMechanismToChannelThesis,
  buildGrowthMechanismProfile,
  hydrateGrowthMechanismProfileFromJson,
  resolveMechanismLaneBMode,
  resolveMechanismOperatorFlags,
  type PublicPresencePolicy,
} from "@shared/cmoGrowthEngine";
import type { GrowthMechanismId } from "@shared/cmoGrowthMechanismKnowledge";
import {
  applyMemoryReplan,
  buildReplanPreview,
  createInitialGrowthMemory,
  growthMemorySummary,
  harvestMemoryFromCycle,
  hydrateGrowthMemoryFromJson,
  replanLaneBFromMemory,
  rollupGrowthMemoryKpis,
  type GrowthMemoryState,
} from "@shared/cmoGrowthMemory";
import {
  applyActionCostEstimates,
  applyBudgetReallocation,
  buildBudgetAllocation,
  buildBudgetSnapshot,
  hydrateBudgetPlanFromJson,
  rollupBudgetActuals,
  seedActionCosts,
  type BudgetPlan,
} from "@shared/cmoBudgetPlane";
import {
  buildRevenueCloseout,
  buildRevenueProfile,
  buildRevenueScanSignals,
  buildRevenueSnapshot,
  completeLinkedMonetizationTaskOnApply,
  completeMonetizationTask as completeMonetizationTaskCore,
  createMonetizationWorkspaceFromBinding,
  detectRevenueBinding,
  hydrateMonetizationWorkspaceFromJson,
  hydrateRevenueProfileFromJson,
  linkSiteLevelMonetizationToLaneA,
  logRevenueAttribution,
  skipMonetizationTask as skipMonetizationTaskCore,
  type MonetizationTaskProofInput,
  type MonetizationWorkspace,
  type RevenueProfile,
} from "@shared/cmoRevenuePlane";
import {
  completeDistributionSlot,
  createDistributionOperatorFromThesis,
  evaluateHookPerformanceWithProfile,
  hydrateDistributionOperatorFromJson,
  isDistributionOperatorGate,
  rollupOperatorKpis,
  skipDistributionSlot,
  syncLaneBFromOperator,
  type DistributionOperatorWorkspace,
  type DistributionProofInput,
} from "@shared/cmoDistributionOperator";
import {
  completeInfluencerTouch,
  createInfluencerOperatorFromThesis,
  evaluatePitchPerformanceWithProfile,
  hydrateInfluencerOperatorFromJson,
  isInfluencerOperatorGate,
  rollupInfluencerKpis,
  skipInfluencerTouch,
  syncLaneBFromInfluencerOperator,
  updateInfluencerTouchCreator,
  type InfluencerDeal,
  type InfluencerOperatorWorkspace,
  type InfluencerProofInput,
} from "@shared/cmoInfluencerOperator";
import { ga4SyncStatusMessage, planGa4SyncOnCycleStart } from "@shared/cmoMeasurement";
import {
  buildAgentTurnContext,
  type ProactiveSuggestionAction,
  type ProactiveTrigger,
} from "@shared/agentTurnContext";
import {
  allPlanTasksDone,
  appendCampaignAsset,
  appendCampaignRun,
  applyCampaignPhaseEvent,
  createCampaignSession,
  hydrateCampaignSessionFromJson,
  type CampaignPhaseEvent,
} from "@shared/campaignSession";
import { resolveBrowserGoal } from "@shared/cuTemplates";
import {
  appendPlanStatusLine,
  stubIdFromStructuringMessage,
  type PlanStatusLine,
} from "@shared/planGeneration";
import { mergeProgressMaps } from "@shared/planProgressMerge";
import {
  countPendingPatches,
  resolveTaskExecutionMode,
  transitionAfterApply,
  transitionAfterBrowserComplete,
  transitionAfterConnectorReadNoOAuth,
  transitionAfterRepoRunComplete,
} from "@shared/planTaskCompletion";
import type { PlanPlaybook, PlaybookStub } from "@shared/planPlaybooks";
import {
  buildPlanProgressSummaryForAgent,
  planPlaybookMarkdownLink,
  resolvePlanDeepLink,
} from "@shared/planNavigation";
import {
  getPlaybook,
  nextActionableTaskInPlaybook,
  normalizePlan,
  buildPlanTaskRunGoal,
  isBrowserPlanTask,
  isConnectorReadPlanTask,
} from "@shared/planPlaybooks";
import {
  enqueueOutbox,
  loadOutbox,
  removeOutboxEntry,
  peekOutbox,
  outboxCount,
} from "@shared/messageOutbox";
import {
  enqueueExecution,
  removeQueuedExecution,
  dequeueExecution,
  canDrainExecutionQueue,
  type ExecutionQueueItem,
} from "@shared/executionQueue";
import { diffPlanVersions } from "@shared/planDiff";
import {
  reconcileProgressAfterPlanChange,
  validPlanTaskIds,
} from "@shared/planProgressReconcile";

function hasGa4OAuth(profile: MarketingProfile | null | undefined): boolean {
  return !!profile?.ga4_oauth?.refresh_token;
}

function planTaskGoal(task: Parameters<typeof buildPlanTaskRunGoal>[0]): string {
  return buildPlanTaskRunGoal(task);
}
import { buildAgentHistory, restoreEventsFromPersist } from "./agentHistory";
import type { AgentTurnPersist, MarketingDecisionAsset } from "@shared/types";

function toServerSource(source: ProjectSource): {
  kind: "folder" | "repo" | "url";
  ref: string;
} {
  return { kind: source.kind, ref: source.kind === "folder" ? source.path : source.url };
}

function sourceFromServer(p: ServerProject): ProjectSource {
  if (p.source_kind === "folder") return { kind: "folder", path: p.source_ref };
  return { kind: p.source_kind, url: p.source_ref };
}

function profileFromServer(p: ServerProject): ProjectProfile {
  const pj = p.profile_json;
  if (pj && typeof pj === "object" && "routes" in pj) {
    return pj as ProjectProfile;
  }
  return {
    id: p.id,
    name: p.name,
    source: sourceFromServer(p),
    framework: p.framework ?? undefined,
    productType: p.product_type ?? undefined,
    routes: [],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 0,
  };
}

/** Local cwd for file-editing agent runs (folder path or cloned repo). */
function projectAgentCwd(project?: ProjectProfile | null): string | undefined {
  if (!project) return undefined;
  if (project.source.kind === "folder") return project.source.path;
  return project.localPath;
}

function agentCwdErrorMessage(project?: ProjectProfile | null): string {
  const kind = project?.source.kind;
  if (kind === "url") {
    return "This task edits local files. Open a folder or clone the repo to run it — browser tasks still work from URL projects.";
  }
  if (kind === "repo") {
    return "Repo clone not ready yet. Re-open the project or pick a local folder — browser tasks still work.";
  }
  return "Open a local project folder to run file-editing tasks.";
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const INIT_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ]);
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let planAbort: AbortController | null = null;
let agentAbort: AbortController | null = null;
/** Active Ask fold session — Brain events arrive via RunEvent bus. */
let askFoldSession: AskFoldSession | null = null;
let firstHourAutoHandoffTimer: number | null = null;
let runEventsBound = false;
let activeRunResumed = false;
let authCallbackBound = false;
/** Edit-run thread bubble coalescing for successive agent.message deltas. */
let editStreamBubbleId: string | null = null;
let editStreamRunId: string | null = null;

function quotaBlocked(auth: AuthInfo, kind: "plan" | "agent"): boolean {
  if (!auth.usage || !auth.quota) return false;
  if (kind === "plan") return auth.usage.plan >= auth.quota.plan_limit;
  return auth.usage.agent >= auth.quota.agent_limit;
}

function tierFeatureBlocked(
  tierFeatures: string[] | undefined,
  feature: TierFeature,
): boolean {
  return !tierHasFeature(tierFeatures, feature);
}

function isNetworkFailure(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /fetch failed|ECONNREFUSED|NetworkError|Failed to fetch|connection lost|unreachable|network/i.test(
    raw,
  );
}

interface AppState {
  ready: boolean;
  initPhase: InitPhase;
  initError?: string;
  version: string;
  phase: Phase;
  route: Route;

  connection: ConnectionInfo;
  /** Derived from connection + auth — single source for AI gating. */
  runtime: RuntimeCapability;
  /** Per-capability readiness — gate CTAs on matrix.can* / assertCan. */
  capabilityMatrix: CapabilityMatrix;
  /** Background brain notifications (deduped). */
  ideNotifications: IdeNotification[];
  /** User chose local exploration (splash continue offline). */
  localOnlyMode: boolean;
  /** Plan is a read-only scan outline, not AI-generated. */
  planPreviewMode: boolean;
  settings: Settings;
  recents: RecentProject[];

  auth: AuthInfo;
  /** Feature flags from GET /me (Faz 12A). */
  tierFeatures?: string[];
  tierLabel?: string;
  /** Set when a 401 occurs after refresh (session expired). */
  authError?: string;
  projects: ServerProject[];
  sessions: ServerSession[];
  /** Last message snippet per session — powers SessionHistory previews. */
  sessionPreviews: Record<string, string>;
  /** Message counts loaded alongside previews for SessionHistory rows. */
  sessionMessageCounts: Record<string, number>;
  serverAssets: ServerAsset[];
  activeProjectId?: string;
  activeSessionId?: string;

  historyOpen: boolean;
  sidebarTab: "context" | "files";

  project: ProjectProfile | null;
  scanning: boolean;

  plan: MarketingPlan | null;
  planLoading: boolean;
  planStatus: string;
  planError: string | null;
  /** Per-task execution status when runs are started from PlanCanvas. */
  planTaskStatus: Record<string, "running" | "done" | "failed">;
  activePlanTaskId?: string;
  activePlanRowId?: string;
  planProgress: PlanProgressSnapshot | null;
  highlightPlanTaskId?: string;
  /** One-shot preset id for KpiLogCard deep links from task-complete CTAs. */
  kpiLogDefaultPresetId?: string;
  activePlaybookId?: string;
  planGenerationPhase: "idle" | "outline" | "playbooks" | "finalizing";
  /** Playbook stubs currently being expanded (batch-aware). */
  planLoadingPlaybookIds: string[];
  /** Typed status feed lines during plan generation. */
  planStatusLog: PlanStatusLine[];
  planOutlinePlaybooks: PlaybookStub[];
  planStreamingPlaybooks: PlanPlaybook[];
  planStreamingThesis?: string;
  planStreamingNarrative?: string;
  /** Readiness scores streamed during the finalizing phase. */
  planStreamingReadiness: import("@shared/planPlaybooks").ReadinessScoreWithRationale[];
  /** One-shot flag: the studio just crystallized from a fresh generation. */
  planJustGenerated: boolean;
  /** One-shot milestone beats for Plan Studio animations. */
  planMilestones: {
    lastTaskId?: string;
    lastPlaybookId?: string;
    lastWeek?: number;
    planJustCompleted?: boolean;
  };
  /** Scroll target id set when opening playbook detail from command center. */
  planDetailScrollNonce: number;

  thread: SessionEvent[];
  agentStreaming: boolean;

  canvas: CanvasState;
  browser: BrowserState;
  run: RunInfo | null;
  executionQueue: ExecutionQueueItem[];
  /** Last goal started from the execution queue (E2E + status). */
  lastQueueDrainGoal?: string;
  /** E2E fixture — queue drain records intent without starting agent host. */
  e2eDryRunExecution?: boolean;
  /** E2E: first-ship wedge tests — never auto-complete ops/runs. */
  e2eMockAgentEvents?: boolean;
  outboxCount: number;
  outboxFlushing: boolean;
  replayRun: RunInfo | null;
  /** Files selected for apply after run review — empty means none selected. */
  runApplySelection: string[];
  runsArchive: ArchiveRunItem[];
  runsArchiveLoading: boolean;
  runsArchiveError: string | null;
  runsArchiveLoadedAt: number;
  planHistory: ServerPlanRow[];
  /** Baseline plan row for side-by-side revision diff in Plan Studio. */
  planCompareBaseline: { rowId: string; plan: MarketingPlan } | null;

  /** Marketing Brain — structured project memory (loaded per active project). */
  marketingProfile: MarketingProfile | null;

  paletteOpen: boolean;
  settingsOpen: boolean;
  sidebarCollapsed: boolean;
  focusMode: boolean;

  /** Composer motor mode + prefill (Home/Empty → Workspace). */
  composerMode: ComposerMode;
  composerDraft: string;
  /** Incremented to focus the composer textarea after launchComposerAction. */
  composerFocusTick: number;
  suggestedComposerMode?: { mode: ComposerMode; reason?: string };
  /** Last user message in agent ask turn — used for suggested_mode handoff. */
  lastAgentUserMessage?: string;
  /** Last completed ask turn receipt — carried into edit runs. */
  lastTurnReceipt?: TurnReceipt;
  lastAskAssets: MarketingAsset[];
  lastAnswerText?: string;
  /** Timestamp of first successful apply (sidecar or edit run). */
  firstShipAt?: number;
  /** First session after reveal — skip edit confirm, prioritize ship wow. */
  firstHourActive?: boolean;
  /** Scout ask from beginFirstHourWow — auto-start edit when answer lands. */
  firstHourScoutPending?: boolean;
  /** Faz 1 — Quick Start vs Full CMO onboarding track. */
  onboardingTrack?: OnboardingTrack;
  wedgePhase?: WedgePhase;
  firstShipSnapshot?: FirstShipSnapshot;
  firstShipLedger?: FirstShipLedger;
  /** Faz 4 — last apply ship receipt SSOT for Record chips + Proof tab. */
  lastShipReceipt?: import("@shared/shipReceipt").ShipReceipt;
  shipPipeline?: ShipPipelineState;
  shipRecovery?: ShipRecoveryAction;
  executionMetrics?: ExecutionMetricsRollup;
  projectOpenedAt?: number;
  pendingAutoPreview?: boolean;
  /** P0 channel thesis — refreshed on project open via runCmoIntake. */
  channelThesis?: ChannelThesis;
  /** P1 — Week 1 ops cadence (daily table + user accountability). */
  opsCadence?: CmoOpsCadence;
  pendingOpsProofTaskId?: string;
  pendingWeekReviewOpen?: boolean;
  /** P3 — Lane B workspace (posting / outreach / runbook). */
  laneBWorkspace?: LaneBWorkspace;
  pendingLaneBProofItemId?: string;
  /** P6 — Lane A workspace (IDE ships — repo / browser / drafts). */
  laneAWorkspace?: LaneAWorkspace;
  /** P7 — Growth control plane (binding + today + red list). */
  growthControlPlane?: GrowthControlPlane;
  /** P7 — expand full ops / lane panels when command strip is active. */
  warRoomExpanded: boolean;
  /** Faz 2 — Week 1 command-surface-first UX; backstage collapsed until opened. */
  week1FocusMode?: boolean;
  /** P13 — first-session founder-fit / strategic decision surface. */
  strategicIntakeOpen: boolean;
  /** Faz 3 — calendar day key for morning unlock toast (`projectId:YYYY-MM-DD`). */
  lastMorningBriefDayKey?: string;
  /** Faz 3 — pending morning unlock toast payload for Shell. */
  morningUnlockToast?: { dayIndex: number; today: string };
  /** Faz 2 — Week 1 briefing modal after strategic seal. */
  week1BriefingOpen: boolean;
  /** Faz 2 — unified launch readiness stepper (activation / revenue / measurement). */
  launchReadinessOpen: boolean;
  /** Faz 5 — measurement baseline gate before Week 1. */
  measurementIntakeOpen: boolean;
  /** P8 — Distribution operator (hook grid + volume). */
  distributionOperator?: DistributionOperatorWorkspace;
  pendingDistributionProofSlotId?: string;
  /** P9 — Influencer operator (creator pipeline + DM/deal). */
  influencerOperator?: InfluencerOperatorWorkspace;
  pendingInfluencerProofTouchId?: string;
  pendingInfluencerDealTouchId?: string;
  /** P4 — Continuous CMO cycle history + measuring replan. */
  cmoContinuous?: CmoContinuousState;
  /** P11 — experiment ledger + message winners/losers + pending N+1 replan. */
  growthMemory?: GrowthMemoryState;
  /** P14 — monthly allocation, action-cost ledger, and spend closeout. */
  budgetPlan?: BudgetPlan;
  /** P15 — activation intake and Lane D product requests. */
  productActivation?: ProductActivationProfile;
  laneDWorkspace?: LaneDWorkspace;
  pendingProductRequestId?: string;
  pendingProductIssueRequestId?: string;
  /** P16 — revenue profile and monetization tasks. */
  revenueProfile?: RevenueProfile;
  monetizationWorkspace?: MonetizationWorkspace;
  pendingMonetizationTaskId?: string;
  pendingMonetizationIssueTaskId?: string;
  pendingRevenueAttributionSourceId?: string;
  /** P5 / P10 — Lane C delegate briefs + delegation operator. */
  delegateWorkspace?: DelegateOperatorWorkspace;
  delegateOperator?: DelegateOperatorWorkspace;
  pendingDelegateBriefId?: string;
  pendingDelegateRubricId?: string;
  pendingDelegateHireBriefId?: string;
  /** Edit / integrate run confirmation gate (Faz 4). */
  pendingHandoffConfirm?: HandoffConfirmState;

  feedItems: FeedItem[];
  feedFilter: FeedFilter;
  feedCollapsed: boolean;
  activeFeedItemId?: string;
  /** Part 0 — Execution Record detail panel tab. */
  executionRecordDetailTab: ExecutionRecordDetailTab;
  executionHistoryExpanded: boolean;
  /** Part 0 — bottom command dock collapsed to composer strip (Cursor-like). */
  commandDockCollapsed: boolean;
  /** Part 0 — user pinned full hero during an active run. */
  executionHeroExpanded: boolean;
  selectedRailSection: RailSection | null;
  selectedRailEntityId?: string;

  /** Brain missing_info event ids dismissed after answer. */
  dismissedBrainQuestionIds: string[];
  /** When set, composer is editing this user message (resubmit truncates thread). */
  editingMessageId?: string;
  /** Resume metric — legacy messages without content_json.kind. */
  sessionLegacyMessageCount: number;
  sessionOutcomes: SessionOutcome[];
  scanProgress?: { message: string; pct?: number };
  /** Last project scan failure — surfaced in onboarding, not just chat. */
  scanError?: string;
  /** One-shot "Welcome back" signal set by the returning-user fast path. */
  restoredProjectName?: string;
  /** One-shot onboarding → workspace bridge (dismissible). */
  workspaceHandoff?: import("@shared/workspaceHandoff").WorkspaceHandoff;
  /** Deep-link into Settings section (e.g. usage from quota banner). */
  settingsSection?: string;

  recordSessionOutcome: (outcome: Omit<SessionOutcome, "id" | "at">) => void;
  /** Append a system/user event to the active thread (status, errors). */
  appendEvent: (event: Omit<SessionEvent, "id" | "ts"> & { id?: string }) => string;

  init: () => Promise<void>;
  navigate: (route: Route, settingsSection?: string) => void;
  setWorkspaceHandoff: (handoff: import("@shared/workspaceHandoff").WorkspaceHandoff) => void;
  dismissWorkspaceHandoff: () => void;
  checkConnection: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  continueOffline: () => void;
  syncRuntimeCapability: () => void;
  openConnectFlow: () => void;
  dismissIdeNotification: (id: string) => void;
  /** Reveal → workspace: open Plan Studio and start plan (one click, no handoff). */
  beginFirstHour: () => void;
  /** Reveal → workspace: scout ask on hero file, then one-click edit (first-hour wow). */
  beginFirstHourWow: () => void;
  /** Faz 1 — Quick Start wedge: snapshot + ship pipeline + beginFirstHourWow. */
  beginQuickStartShip: (opts?: { skipScout?: boolean; goalOverride?: string }) => void;
  retryQuickStartShip: (goalOverride?: string) => void;
  setOnboardingTrack: (track: OnboardingTrack) => void;
  promptApplyFirstChange: () => void;
  beginFirstShip: () => void;
  /** P0 — rebuild channel thesis from scan + profile. */
  runCmoIntake: () => ChannelThesis | null;
  /** P13 — founder-fit + A/B/C decision actions. */
  saveFounderFit: (profile: FounderFitProfile) => void;
  savePublicPresencePolicy: (policy: PublicPresencePolicy) => void;
  runStrategicIntake: () => StrategicDecision | null;
  selectStrategicOption: (id: StrategicOptionId) => void;
  sealStrategicDecision: (id?: StrategicOptionId) => boolean;
  openStrategicIntake: () => void;
  closeStrategicIntake: () => void;
  openWeek1Briefing: () => void;
  closeWeek1Briefing: () => void;
  openLaunchReadiness: () => void;
  closeLaunchReadiness: () => void;
  openMeasurementIntake: () => void;
  closeMeasurementIntake: () => void;
  acknowledgeMeasurementBaseline: (note?: string) => void;
  applyProductActivationDefaults: () => boolean;
  /** P14 — confirm numeric budget or deterministic band estimate. */
  saveBudgetPlan: (monthlyAmountUsd?: number, cpaCeilingUsd?: number) => boolean;
  /** P15 — activation intake and product-loop proof actions. */
  saveProductActivation: (profile: Partial<ProductActivationProfile>) => boolean;
  openProductRequestModal: (requestId: string) => void;
  dismissProductRequestModal: () => void;
  openProductIssueModal: (requestId: string) => void;
  dismissProductIssueModal: () => void;
  completeProductRequest: (requestId: string, proof: ProductRequestProofInput) => string | null;
  skipProductRequest: (requestId: string, reason?: string) => void;
  resumeMarketingAfterProductLoop: () => string | null;
  /** P16 — revenue intake, attribution, and monetization task proof. */
  saveRevenueProfile: (input: {
    modelOverride?: import("@shared/cmoRevenuePlane").MonetizationModel;
    paymentProvider?: import("@shared/cmoRevenuePlane").PaymentProvider;
    paidCustomers?: number;
    mrrUsd?: number;
    ltvUsd?: number;
    pricingViews?: number;
    checkoutStarts?: number;
    trialStarts?: number;
  }) => boolean;
  logRevenueAttributionForSource: (
    sourceId: string,
    paidCustomers: number,
    note?: string,
  ) => string | null;
  openMonetizationTaskModal: (taskId: string) => void;
  dismissMonetizationTaskModal: () => void;
  openMonetizationIssueModal: (taskId: string) => void;
  dismissMonetizationIssueModal: () => void;
  openRevenueAttributionModal: (sourceId: string) => void;
  dismissRevenueAttributionModal: () => void;
  completeMonetizationTask: (taskId: string, proof: MonetizationTaskProofInput) => string | null;
  skipMonetizationTask: (taskId: string, reason?: string) => void;
  /** P7 — toggle war-room panel stack under command strip. */
  toggleWarRoomExpanded: () => void;
  /** P7/P12 — expand war room then scroll to anchor id. */
  focusWarRoomAnchor: (anchorId: string) => void;
  /** @deprecated use focusWarRoomAnchor */
  focusBackstageAnchor: (anchorId: string) => void;
  /** Faz 3 — detect calendar day rollover and queue morning unlock toast. */
  checkMorningDayUnlock: () => void;
  clearMorningUnlockToast: () => void;
  /** P8 — distribution operator proof actions. */
  openDistributionProofModal: (slotId: string) => void;
  dismissDistributionProofModal: () => void;
  completeDistributionSlot: (
    slotId: string,
    proof: DistributionProofInput,
  ) => string | null;
  skipDistributionSlot: (slotId: string) => void;
  /** P9 — influencer operator proof actions. */
  openInfluencerProofModal: (touchId: string) => void;
  dismissInfluencerProofModal: () => void;
  openInfluencerDealModal: (touchId: string) => void;
  dismissInfluencerDealModal: () => void;
  completeInfluencerTouch: (
    touchId: string,
    targetStage: import("@shared/cmoInfluencerOperator").PipelineStage,
    proof: InfluencerProofInput,
    deal?: InfluencerDeal,
  ) => string | null;
  skipInfluencerTouch: (touchId: string) => void;
  updateInfluencerCreator: (
    touchId: string,
    fields: Partial<
      Pick<
        import("@shared/cmoInfluencerOperator").InfluencerTouch,
        | "target_name"
        | "target_handle"
        | "platform"
        | "followers"
        | "engagement_rate_pct"
        | "icp_fit"
      >
    >,
  ) => void;
  /** P0 — start Week 1 from channel thesis (campaign + first system run). */
  beginCmoWeek1: () => void;
  /** P1 — ops cadence persistence + accountability actions. */
  openOpsProofModal: (taskId: string) => void;
  dismissOpsProofModal: () => void;
  persistOpsCadence: (cadence: CmoOpsCadence) => void;
  completeOpsTask: (
    taskId: string,
    proof: import("@shared/cmoOpsCadence").OpsProofInput,
  ) => string | null;
  skipOpsTask: (taskId: string, reason?: string) => void;
  startOpsSystemTask: (taskId: string) => void;
  /** Faz 2 — run bound execution_plan for a system ops task (no raw startRun bypass). */
  executeOpsSystemTask: (taskId: string) => void;
  /** P6 — thesis-aware Lane A run (skills, scout, browser). */
  startLaneARun: (plan: LaneARunPlan) => void;
  completeOpsWeekReview: (summary: string) => string | null;
  openWeekReviewModal: () => void;
  dismissWeekReviewModal: () => void;
  dismissPivotSuggestion: () => void;
  /** P4 — start next ops week from pivot or double-down. */
  startNextCmoCycle: (opts?: {
    thesisId?: import("@shared/cmoIntake").ChannelThesisId;
    mode?: NextCycleMode;
  }) => string | null;
  /** P3 — Lane B actions. */
  openLaneBProofModal: (itemId: string) => void;
  dismissLaneBProofModal: () => void;
  completeLaneBItem: (itemId: string, proof: import("@shared/cmoLaneB").LaneBProofInput) => string | null;
  skipLaneBItem: (itemId: string) => void;
  updateLaneBTarget: (
    itemId: string,
    patch: { target_name?: string; target_handle?: string },
  ) => void;
  /** P5 / P10 — Lane C delegate actions. */
  openDelegateBriefModal: (briefId: string) => void;
  dismissDelegateBriefModal: () => void;
  openDelegateHireModal: (briefId: string) => void;
  dismissDelegateHireModal: () => void;
  openDelegateRubricModal: (rubricId: string) => void;
  dismissDelegateRubricModal: () => void;
  handOffDelegateBrief: (
    briefId: string,
    input: import("@shared/cmoLaneC").DelegateHandoffInput,
  ) => string | null;
  completeDelegateBrief: (
    briefId: string,
    proof: import("@shared/cmoLaneC").DelegateProofInput,
  ) => string | null;
  completeDelegateRubricDay: (
    rubricId: string,
    input: RubricProofInput,
  ) => string | null;
  skipDelegateBrief: (briefId: string, reason?: string) => void;
  connectGa4: () => Promise<void>;
  syncGa4Metrics: () => Promise<void>;
  previewPlanOutline: () => void;
  clearDemoFeed: () => void;
  refreshConnectorFeed: () => void;

  initAuth: () => Promise<void>;
  sendSignInCode: (email: string) => Promise<void>;
  verifySignInCode: (email: string, code: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  handleAuthCallback: (url: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadMe: () => Promise<void>;
  startCheckout: (tier?: "pro" | "team") => Promise<void>;
  openBillingPortal: () => Promise<void>;

  syncProjects: () => Promise<void>;
  syncSessions: (projectId: string) => Promise<void>;
  loadSessionPreviews: (sessionIds: string[]) => Promise<void>;
  loadProjectData: (projectId: string) => Promise<void>;
  openServerProject: (project: ServerProject) => Promise<void>;

  openProject: (source: ProjectSource, opts?: { workspace?: boolean }) => Promise<void>;
  openFolderDialog: () => Promise<void>;
  openProjectPicker: () => void;
  closeProject: () => void;
  newSession: () => void;
  createNewSession: () => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  cancelPlan: () => void;
  cancelAgent: () => void;
  previewFile: (relPath: string) => Promise<void>;
  toggleHistory: (open?: boolean) => void;
  setSidebarTab: (tab: "context" | "files") => void;
  refreshRecents: () => Promise<void>;

  generatePlan: () => Promise<void>;
  sendMessage: (
    text: string,
    opts?: { silent?: boolean; context?: import("@shared/types").AgentTurnContext },
  ) => Promise<void>;
  requestProactiveSuggestion: (
    trigger: ProactiveTrigger,
    extra?: { lastAppliedSummary?: string },
  ) => void;
  executeProactiveAction: (action: ProactiveSuggestionAction) => void;
  /** Composer submit — handles Auto routing and message ↔ run correlation (Faz 5). */
  submitComposerText: (text: string) => Promise<void>;
  prefillComposerForPlanTask: (opts: { day: number; title: string; goal: string }) => void;

  loadMarketingProfile: (projectId: string) => Promise<void>;
  updateMarketingProfile: (patch: Partial<MarketingProfile>) => Promise<void>;
  startCampaignSession: (opts?: { goal?: string }) => void;
  advanceCampaignPhase: (event: CampaignPhaseEvent) => void;
  persistCampaignSession: (session: CampaignSession) => void;
  registerCampaignRun: (runId: string, taskId?: string) => void;
  registerCampaignAsset: (assetId: string) => void;
  markExperimentOutcome: (
    experimentId: string,
    payload: {
      outcome: MarketingProfile["previous_experiments"][number]["outcome"];
      metric?: { name: string; value: number };
      learning?: string;
      evidence_urls?: string[];
    },
  ) => Promise<void>;
  recordExperimentFromConversation: (experimentId?: string) => Promise<void>;
  upsertManualKpi: (kpi: import("@shared/types").ManualKpi) => Promise<boolean>;
  deleteManualKpi: (kpiId: string) => Promise<void>;

  runBrowserTask: (
    task: string,
    opts?: { sourceMessageId?: string; skipQueue?: boolean },
  ) => void;
  /** Apply-after verify via orchestrator browser.verify_checklist (same CU path). */
  startVerifyAfterApply: (url: string, checklist: string[]) => Promise<void>;
  stopBrowser: () => void;
  pauseBrowser: () => void;
  resumeBrowser: () => void;
  steerBrowser: (text: string) => void;
  approve: (id: string) => void;
  reject: (id: string) => void;
  setAutoApprove: (value: boolean) => void;

  startRun: (
    goal: string,
    planTaskId?: string,
    opts?: {
      sourceMessageId?: string;
      skipQueue?: boolean;
      skills?: string[];
      opsTaskId?: string;
      mentions?: import("@shared/orchestration").Mention[];
      guaranteedShip?: boolean;
    },
  ) => Promise<void>;
  interruptRun: () => void;
  approveRun: (approvalId: string) => void;
  rejectRun: (approvalId: string) => void;
  applyRunChanges: (files: string[]) => Promise<void>;
  applyRunHunks: (file: string, hunkIds: string[]) => Promise<void>;
  discardRunChanges: () => Promise<void>;
  discardRunSelection: (files: string[]) => Promise<void>;
  resetRunApplySelection: (files: string[]) => void;
  toggleRunApplyFile: (file: string, selected: boolean) => void;
  startRunPreview: () => void;
  validateRun: () => void;

  loadRunsArchive: () => Promise<void>;
  openRunReplay: (runId: string) => Promise<void>;
  clearReplayRun: () => void;
  loadPlanHistory: () => Promise<void>;
  loadPlanProgress: (planRowId?: string) => Promise<void>;
  patchPlanTaskStatus: (
    taskId: string,
    status: PlanTaskStatus,
    opts?: { lastRunId?: string },
  ) => Promise<void>;
  confirmPlanTaskWithoutApply: (taskId?: string) => void;
  markPlanTaskComplete: (taskId?: string) => void;
  setHighlightPlanTaskId: (taskId?: string) => void;
  openPlanVersion: (plan: MarketingPlan, planRowId?: string) => void;
  setPlanCompareBaseline: (row: ServerPlanRow) => void;
  clearPlanCompareBaseline: () => void;
  openPlanTaskFromArchive: (planTaskId: string) => void;
  setActivePlaybook: (playbookId?: string) => void;
  clearPlanMilestone: (key: keyof AppState["planMilestones"]) => void;
  startPlaybook: (playbookId: string) => void;
  focusPlanTask: (opts: { playbookId?: string; taskId?: string; startRun?: boolean }) => void;
  openKpiLog: (presetId: string) => void;
  clearKpiLogDefaultPreset: () => void;
  resolvePlanDeepLink: (opts: { playbookId?: string; taskId?: string }) => ReturnType<typeof resolvePlanDeepLink>;

  applyAsset: (asset: MarketingAsset) => Promise<void>;
  rollbackAsset: (assetId: string, commit: string) => Promise<void>;
  previewMarketingAsset: (asset: MarketingDecisionAsset) => Promise<void>;
  applyMarketingAsset: (assetOrId: MarketingAsset | string) => Promise<void>;
  integrateCopyIntoSite: (
    assetOrId: MarketingAsset | string,
    route?: string,
    opts?: { skipConfirm?: boolean },
  ) => void;
  updateAssetTargetFile: (assetId: string, targetFile: string) => Promise<void>;
  /** @deprecated Use previewMarketingAsset. */
  applyDecisionAsset: (asset: MarketingDecisionAsset) => void;
  focusArtifact: (target: { mode: CanvasMode; assetId?: string }) => void;
  setActiveCanvas: (mode: CanvasMode) => void;
  setWorkSurface: (
    surface: WorkSurface,
    opts?: { experimentId?: string; adPreviewAssetId?: string; assetId?: string },
  ) => void;

  appendFeedItem: (item: FeedItem) => void;
  openFeedItem: (id: string) => void;
  setFeedFilter: (filter: FeedFilter) => void;
  toggleFeedCollapsed: (collapsed?: boolean) => void;
  setExecutionRecordDetailTab: (tab: ExecutionRecordDetailTab) => void;
  toggleExecutionHistoryExpanded: () => void;
  setCommandDockCollapsed: (collapsed: boolean) => void;
  toggleCommandDockCollapsed: () => void;
  toggleExecutionHeroExpanded: () => void;
  setExecutionHeroExpanded: (expanded: boolean) => void;
  selectRailSection: (section: RailSection, entityId?: string) => void;
  seedMockConnectorFeed: () => void;
  seedConnectorFeedPlaceholder: () => void;

  togglePalette: (open?: boolean) => void;
  toggleSettings: (open?: boolean) => void;
  toggleSidebar: (collapsed?: boolean) => void;
  toggleFocusMode: (on?: boolean) => void;

  setComposerMode: (mode: ComposerMode) => void;
  clearSuggestedComposerMode: () => void;
  dismissMissingInfo: (eventId: string) => void;
  markMissingInfoAnswered: (eventId: string) => void;
  setComposerDraft: (draft: string) => void;
  launchComposerAction: (opts: { mode: ComposerMode; draft?: string }) => void;
  startEditMessage: (eventId: string) => void;
  cancelEditMessage: () => void;
  editUserMessage: (eventId: string, newText: string) => Promise<void>;
  runQuickAction: (id: QuickActionId) => void;
  executeIntent: (
    intent: ConversationIntent,
    opts?: { skipConfirm?: boolean; sourceMessageId?: string },
  ) => void;
  confirmPendingHandoff: () => void;
  cancelPendingHandoff: () => void;

  cancelQueuedExecution: (id: string) => void;
  processExecutionQueue: () => void;
  flushMessageOutbox: () => Promise<void>;

  /** Faz 10 — user-confirmed outreach webhook dispatch. */
  dispatchOutreachWebhook: () => Promise<{
    ok: boolean;
    message: string;
    detail?: string;
  }>;
}

const SIDEBAR_KEY = "panel.sidebar.collapsed";
const SIDEBAR_TAB_KEY = "panel.sidebar.tab";
const FEED_COLLAPSED_KEY = "panel.execution-feed.collapsed";
const COMPOSER_MODE_KEY = "composer.mode";

function syncCapabilityFromState(
  connection: ConnectionInfo,
  auth: AuthInfo,
  localOnlyMode: boolean,
): { runtime: RuntimeCapability; capabilityMatrix: CapabilityMatrix } {
  const capabilityMatrix = deriveMatrix({
    connectionState: connection.state,
    providers: connection.providers,
    connectors: connection.connectors,
    authEnabled: auth.authEnabled,
    authState: auth.state,
    localOnly: localOnlyMode,
  });
  return {
    capabilityMatrix,
    runtime: capabilityMatrix.canAsk
      ? "connected"
      : capabilityMatrix.caps.backend.state === "ready" &&
          capabilityMatrix.caps.anthropic.state === "unavailable"
        ? "degraded"
        : "local",
  };
}

function previewFromThread(thread: SessionEvent[]): string | null {
  for (let i = thread.length - 1; i >= 0; i--) {
    const e = thread[i];
    if (e.kind === "text" && e.text?.trim()) return e.text.trim().slice(0, 120);
    if (e.kind === "decision" && e.summary?.trim()) return e.summary.trim().slice(0, 120);
    if (e.kind === "asset" && e.asset) {
      const label = e.asset.targetFile ?? e.asset.type;
      return label.slice(0, 120);
    }
  }
  return null;
}

export const useApp = create<AppState>((set, get) => {
  const appendEvent = (event: Omit<SessionEvent, "id" | "ts"> & { id?: string }): string => {
    const id = event.id ?? makeEventId();
    const full: SessionEvent = { ...event, id, ts: Date.now() };
    set((s) => {
      const thread = [...s.thread, full];
      const activeSessionId = s.activeSessionId;
      const preview = activeSessionId ? previewFromThread(thread) : null;
      return {
        thread,
        sessionPreviews: preview && activeSessionId
          ? { ...s.sessionPreviews, [activeSessionId]: preview }
          : s.sessionPreviews,
      };
    });
    return id;
  };

  const appendPresentedError = (raw: string) => {
    appendEvent({ role: "system", kind: "error", text: presentError(raw).message });
  };

  const patchEvent = (id: string, patch: Partial<SessionEvent>) =>
    set((s) => ({
      thread: s.thread.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const linkMessageToRun = (messageId: string | undefined, runId: string) => {
    if (!messageId || !runId) return;
    patchEvent(messageId, { linkedRunId: runId });
  };

  const CAMPAIGN_SESSION_LS = "campaign_session.v1";
  const OPS_CADENCE_LS = "ops_cadence.v1";
  const LANE_B_LS = "lane_b_workspace.v1";
  const LANE_A_LS = "lane_a_workspace.v1";
  const GROWTH_PLANE_LS = "growth_control_plane.v1";
  const DISTRIBUTION_OPERATOR_LS = "distribution_operator.v1";
  const INFLUENCER_OPERATOR_LS = "influencer_operator.v1";
  const CMO_CONTINUOUS_LS = "cmo_continuous.v1";
  const DELEGATE_LS = "lane_c_workspace.v1";
  const DELEGATE_OPERATOR_LS = "delegate_operator.v1";
  const GROWTH_MEMORY_LS = "growth_memory.v1";
  const BUDGET_PLAN_LS = "budget_plan.v1";
  const PRODUCT_ACTIVATION_LS = "product_activation.v1";
  const LANE_D_LS = "lane_d_workspace.v1";
  const REVENUE_PROFILE_LS = "revenue_profile.v1";
  const MONETIZATION_WS_LS = "monetization_workspace.v1";
  const FOUNDER_FIT_LS = "founder_fit.v1";
  const GROWTH_NARRATIVE_LS = "growth_narrative.v1";
  const STRATEGIC_DECISION_LS = "strategic_decision.v1";
  const PUBLIC_PRESENCE_LS = "public_presence_policy.v1";
  const GROWTH_MECHANISM_LS = "growth_mechanism_profile.v1";
  const TURN_RECEIPTS_LS = "turn_receipts.v1";
  const FIRST_SHIP_LS = "first_ship_at.v1";

  const clearStrategicIntakeLocal = (projectId: string, keys: Array<"presence" | "mechanism" | "narrative" | "decision">) => {
    try {
      for (const key of keys) {
        if (key === "presence") localStorage.removeItem(`${PUBLIC_PRESENCE_LS}.${projectId}`);
        if (key === "mechanism") localStorage.removeItem(`${GROWTH_MECHANISM_LS}.${projectId}`);
        if (key === "narrative") localStorage.removeItem(`${GROWTH_NARRATIVE_LS}.${projectId}`);
        if (key === "decision") localStorage.removeItem(`${STRATEGIC_DECISION_LS}.${projectId}`);
      }
    } catch {
      /* private mode */
    }
  };

  const persistStrategicIntakeLocal = (
    projectId: string,
    data: {
      founder_fit?: FounderFitProfile;
      growth_narrative?: GrowthNarrative;
      strategic_decision?: StrategicDecision;
      public_presence_policy?: PublicPresencePolicy;
      growth_mechanism_profile?: import("@shared/cmoGrowthEngine").GrowthMechanismProfile;
    },
  ) => {
    try {
      if (data.founder_fit) {
        localStorage.setItem(`${FOUNDER_FIT_LS}.${projectId}`, JSON.stringify(data.founder_fit));
      }
      if (data.growth_narrative) {
        localStorage.setItem(
          `${GROWTH_NARRATIVE_LS}.${projectId}`,
          JSON.stringify(data.growth_narrative),
        );
      }
      if (data.strategic_decision) {
        localStorage.setItem(
          `${STRATEGIC_DECISION_LS}.${projectId}`,
          JSON.stringify(data.strategic_decision),
        );
      }
      if (data.public_presence_policy?.configured_at) {
        localStorage.setItem(
          `${PUBLIC_PRESENCE_LS}.${projectId}`,
          JSON.stringify(data.public_presence_policy),
        );
      }
      if (data.growth_mechanism_profile?.primary_mechanism_id) {
        localStorage.setItem(
          `${GROWTH_MECHANISM_LS}.${projectId}`,
          JSON.stringify(data.growth_mechanism_profile),
        );
      }
    } catch {
      /* quota / private mode */
    }
  };

  const hydrateStrategicIntakeLocal = (projectId: string) => {
    try {
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      const founderFit =
        profile.founder_fit ??
        (JSON.parse(localStorage.getItem(`${FOUNDER_FIT_LS}.${projectId}`) ?? "null") as
          | FounderFitProfile
          | null);
      const narrative =
        profile.growth_narrative ??
        (JSON.parse(localStorage.getItem(`${GROWTH_NARRATIVE_LS}.${projectId}`) ?? "null") as
          | GrowthNarrative
          | null);
      let decision =
        profile.strategic_decision ??
        (JSON.parse(localStorage.getItem(`${STRATEGIC_DECISION_LS}.${projectId}`) ?? "null") as
          | StrategicDecision
          | null);
      const presenceRaw =
        profile.public_presence_policy ??
        (JSON.parse(localStorage.getItem(`${PUBLIC_PRESENCE_LS}.${projectId}`) ?? "null") as
          | PublicPresencePolicy
          | null);
      const presence =
        presenceRaw?.configured_at ? presenceRaw : profile.public_presence_policy;
      const mechanismRaw =
        profile.growth_mechanism_profile ??
        hydrateGrowthMechanismProfileFromJson(
          JSON.parse(localStorage.getItem(`${GROWTH_MECHANISM_LS}.${projectId}`) ?? "null"),
        ) ??
        undefined;
      if (profile.ops_cadence && decision && !decision.sealed_at) {
        decision = {
          ...decision,
          selected_id: decision.selected_id ?? decision.recommended_id,
          sealed_at: profile.ops_cadence.started_at,
        };
      }
      const merged = {
        ...profile,
        ...(founderFit ? { founder_fit: founderFit } : {}),
        ...(narrative ? { growth_narrative: narrative } : {}),
        ...(decision ? { strategic_decision: decision } : {}),
        ...(presence ? { public_presence_policy: presence } : {}),
        ...(mechanismRaw ? { growth_mechanism_profile: mechanismRaw } : {}),
      };
      set({ marketingProfile: merged });
      persistStrategicIntakeLocal(projectId, merged);
    } catch {
      /* corrupt cache */
    }
  };

  const persistTurnReceipt = (projectId: string, receipt: TurnReceipt) => {
    try {
      const raw = localStorage.getItem(`${TURN_RECEIPTS_LS}.${projectId}`);
      const list: TurnReceipt[] = raw ? (JSON.parse(raw) as TurnReceipt[]) : [];
      localStorage.setItem(
        `${TURN_RECEIPTS_LS}.${projectId}`,
        JSON.stringify([receipt, ...list].slice(0, 24)),
      );
    } catch {
      /* non-blocking */
    }
  };

  const hydrateTurnReceiptLocal = (projectId: string) => {
    try {
      const raw = localStorage.getItem(`${TURN_RECEIPTS_LS}.${projectId}`);
      if (!raw) return;
      const list = JSON.parse(raw) as TurnReceipt[];
      if (list[0]) set({ lastTurnReceipt: list[0] });
    } catch {
      /* corrupt cache */
    }
  };

  const ensureChannelThesisAfterProfileLoad = () => {
    const { marketingProfile, channelThesis, project } = get();
    const thesis = channelThesis ?? marketingProfile?.channel_thesis;
    if (thesis) {
      if (!channelThesis) set({ channelThesis: thesis });
      recomputeGrowthPlane();
      return;
    }
    if (project) get().runCmoIntake();
  };

  const markFirstShip = (projectId: string) => {
    const at = Date.now();
    try {
      localStorage.setItem(`${FIRST_SHIP_LS}.${projectId}`, String(at));
    } catch {
      /* non-blocking */
    }
    clearFirstHourAutoHandoff();
    const metrics = get().executionMetrics;
    if (metrics) {
      const next = appendExecutionMetric(metrics, { event: "first_ship" });
      persistExecutionMetricsLocal(projectId, next);
      set({ executionMetrics: next });
    }
    set({
      firstShipAt: at,
      firstHourActive: false,
      firstHourScoutPending: false,
      wedgePhase: "shipped",
      shipPipeline: nextShipPipelineStage(get().shipPipeline ?? initialShipPipelineState(), {
        type: "first_ship",
      }),
    });
    const profile = get().marketingProfile;
    const project = get().project;
    const baseline = assessMeasurementBaseline(profile, project);
    if (!baseline.ready) {
      const ga4 = hasGa4Connected(profile);
      set({
        workspaceHandoff: {
          eyebrow: "Measure outcomes",
          title: ga4 ? "Sync GA4 baseline" : "Log measurement baseline",
          reason:
            "You shipped — connect GA4 or log a manual KPI before scaling Week 1 ops.",
          primaryLabel: ga4 ? "Open settings" : "Log baseline",
          primaryAction: ga4 ? "home" : "home",
          secondaryLabel: "Continue to Week 1 prep",
          secondaryAction: "home",
        },
      });
    }
  };

  const recordExecutionMetricEvent = (
    event: import("@shared/executionMetrics").ExecutionMetricEvent,
    extra?: Partial<import("@shared/executionMetrics").ExecutionMetricRow>,
  ) => {
    const projectId = get().activeProjectId ?? get().project?.id;
    if (!projectId) return;
    const base =
      get().executionMetrics ??
      ({
        projectId,
        projectOpenedAt: get().projectOpenedAt,
        rows: [],
      } satisfies ExecutionMetricsRollup);
    const next = appendExecutionMetric(base, { event, ...extra });
    persistExecutionMetricsLocal(projectId, next);
    set({ executionMetrics: next });
  };

  const bumpShipPipeline = (
    type: string,
    extra?: { runId?: string; events?: import("@shared/types").RunEvent[]; error?: string },
  ) => {
    const prev = get().shipPipeline ?? initialShipPipelineState();
    const next = nextShipPipelineStage(prev, { type, ...extra });
    const patch: Record<string, unknown> = { shipPipeline: next };
    const noPatches =
      next.error === "NO_PATCHES" ||
      extra?.error === "NO_PATCHES" ||
      extra?.error?.includes("NO_PATCHES");
    if (next.stage === "failed" && noPatches) {
      const target = get().project ? resolveFirstShipTarget(get().project!) : undefined;
      patch.shipRecovery = buildShipRecovery("no_patches", target);
    } else if (
      next.stage === "failed" &&
      (next.error === "VERIFY_FAILED" || extra?.error?.includes("VERIFY_FAILED"))
    ) {
      patch.shipRecovery = buildShipRecovery("verify_failed");
    }
    set(patch);
  };

  const loadFirstShipAt = (projectId: string): number | undefined => {
    try {
      const raw = localStorage.getItem(`${FIRST_SHIP_LS}.${projectId}`);
      return raw ? Number(raw) : undefined;
    } catch {
      return undefined;
    }
  };

  const persistCampaignSessionLocal = (projectId: string, session: CampaignSession) => {
    try {
      localStorage.setItem(`${CAMPAIGN_SESSION_LS}.${projectId}`, JSON.stringify(session));
    } catch {
      /* quota / private mode */
    }
  };

  const hydrateCampaignSessionLocal = (projectId: string) => {
    try {
      const raw = localStorage.getItem(`${CAMPAIGN_SESSION_LS}.${projectId}`);
      if (!raw) return;
      const session = hydrateCampaignSessionFromJson(JSON.parse(raw));
      if (!session || session.projectId !== projectId) return;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      if (!profile.campaign_session) {
        set({ marketingProfile: { ...profile, campaign_session: session } });
      }
    } catch {
      /* corrupt cache */
    }
  };

  const persistOpsCadenceLocal = (projectId: string, cadence: CmoOpsCadence) => {
    try {
      localStorage.setItem(`${OPS_CADENCE_LS}.${projectId}`, JSON.stringify(cadence));
    } catch {
      /* quota / private mode */
    }
  };

  const hydrateOpsCadenceLocal = (projectId: string) => {
    try {
      const raw = localStorage.getItem(`${OPS_CADENCE_LS}.${projectId}`);
      if (!raw) return;
      const cadence = hydrateOpsCadenceFromJson(JSON.parse(raw));
      if (!cadence) return;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      if (!profile.ops_cadence) {
        set({
          opsCadence: cadence,
          marketingProfile: { ...profile, ops_cadence: cadence },
        });
      } else if (!get().opsCadence) {
        set({ opsCadence: profile.ops_cadence });
      }
    } catch {
      /* corrupt cache */
    }
  };

  const syncOpsCadenceState = (cadence: CmoOpsCadence) => {
    const pid = get().activeProjectId;
    if (pid) persistOpsCadenceLocal(pid, cadence);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      opsCadence: cadence,
      marketingProfile: { ...profile, ops_cadence: cadence },
    });
    void get().updateMarketingProfile({ ops_cadence: cadence });
  };

  const finalizeVerifyAfterApplyRun = async (input: {
    runId: string;
    report?: { validations?: Array<{ label: string; passed: boolean; detail?: string }>; evidence?: import("@shared/types").Finding[] };
    failed?: boolean;
    summary?: string;
  }) => {
    const ctx = pendingVerifyAfterApply;
    pendingVerifyAfterApply = null;
    if (!ctx) return;

    const { browser, opsCadence, activeProjectId, lastShipReceipt, channelThesis } = get();
    const frame = browser.frameHistory.find((f) => f.pngBase64) ?? browser.frameHistory.at(-1);
    let screenshotPath: string | undefined;
    if (frame?.pngBase64 && activeProjectId) {
      try {
        const saved = await window.api.evidence.saveScreenshot({
          projectId: activeProjectId,
          runId: input.runId,
          base64: frame.pngBase64,
        });
        if (saved.ok && saved.path) screenshotPath = saved.path;
      } catch {
        /* best effort */
      }
    }

    const baseReceipt =
      lastShipReceipt ??
      buildShipReceiptFromApply({
        runId: input.runId,
        filesApplied: [],
        previewUrl: ctx.url,
      });

    const finalized = finalizeVerifyRun({
      receipt: baseReceipt,
      runId: input.runId,
      url: ctx.url,
      report: input.report,
      failed: input.failed,
      summary: input.summary,
      screenshotPath,
      thesisId: channelThesis?.id ?? opsCadence?.thesis_id,
      afterSnapshot: baseReceipt.after,
    });

    bumpShipPipeline(finalized.pipelineEvent, { error: finalized.pipelineError });

    if (!finalized.passed) {
      const failing = finalized.evidence.validations.filter((v) => !v.passed);
      set({
        workspaceHandoff: {
          eyebrow: "Verify failed",
          title: "Fix and re-verify",
          reason:
            input.summary ??
            `Failed: ${failing.map((v) => v.label).join(", ") || "checklist incomplete"}`,
          primaryLabel: "Fix in IDE",
          primaryAction: "execute_intent",
          payload: {
            intent: {
              kind: "start_edit_run",
              goal: buildVerifyFixGoal(failing, ctx.url),
            },
          },
        },
        shipRecovery: finalized.recovery,
      });
      get().appendFeedItem({
        id: `verify-fix-${Date.now()}`,
        ts: Date.now(),
        source: "system",
        category: "gate",
        title: "Fix and re-verify",
        summary:
          input.summary ??
          `Browser verify failed — ${failing.map((v) => v.label).join(", ") || "checklist incomplete"}`,
        status: "waiting",
        canvasTarget: { mode: "run", payload: { verifyFix: "1" } },
      });
    }

    if (activeProjectId) {
      persistShipReceiptLocal(activeProjectId, finalized.receipt);
    }
    set({ lastShipReceipt: finalized.receipt });

    if (opsCadence && !finalized.blockAutoComplete) {
      const { cadence: nextCadence, closed } = attachBrowserEvidenceToSystemTask(
        opsCadence,
        finalized.evidence,
        { minPassRate: 1 },
      );
      syncOpsCadenceState(nextCadence);
      if (closed) {
        const laneA = get().laneAWorkspace;
        if (laneA) {
          const inProgress = nextCadence.tasks.find(
            (t) => t.status === "done" && t.proof?.browser_evidence?.run_id === input.runId,
          );
          const laneItem = inProgress
            ? laneA.items.find((i) => i.linked_ops_task_id === inProgress.id)
            : laneA.items.find((i) => i.status === "in_progress");
          if (laneItem && inProgress) {
            syncLaneAState(
              completeLaneAItemOnApply(laneA, inProgress.id, {
                run_id: input.runId,
                browser_evidence: finalized.evidence,
              }),
            );
          }
        }
        notifyOpsProgress(nextCadence);
      }
    } else if (opsCadence && finalized.evidence) {
      const target = getNowTask(opsCadence);
      if (target && target.status !== "done") {
        const tasks = opsCadence.tasks.map((t) =>
          t.id === target.id
            ? {
                ...t,
                proof: {
                  ...(t.proof ?? { completed_at: new Date().toISOString() }),
                  browser_evidence: finalized.evidence,
                },
              }
            : t,
        );
        syncOpsCadenceState({ ...opsCadence, tasks });
      }
    }

    appendEvent({
      role: "system",
      kind: "status",
      text: finalized.passed
        ? `✓ Browser verify passed for ${ctx.url}`
        : `Browser verify needs a fix — ${input.summary ?? "checklist failed"}`,
    });
    recomputeGrowthPlane();
  };

  const scheduleVerifyAfterApply = (url: string, checklist: string[]) => {
    const last = lastVerifyAtByUrl[url];
    if (last && Date.now() - last < 10 * 60_000) return;
    lastVerifyAtByUrl[url] = Date.now();
    void (async () => {
      await new Promise((r) => setTimeout(r, 1500));
      if (get().capabilityMatrix.canBrowse) {
        void get().startVerifyAfterApply(url, checklist);
      }
    })();
  };

  const bindAndSyncHumanExecution = (input: {
    cadence: CmoOpsCadence;
    thesis: ChannelThesis;
    laneB?: LaneBWorkspace | null;
    distributionOperator?: DistributionOperatorWorkspace | null;
    influencerOperator?: InfluencerOperatorWorkspace | null;
    delegateOperator?: DelegateOperatorWorkspace | null;
  }) => {
    const result = bindHumanExecutionForCadence({
      ...input,
      strict: import.meta.env.DEV,
    });
    if (result.missingRefs.length > 0 && import.meta.env.DEV) {
      console.warn(
        "[cmo] human tasks missing execution ref:",
        result.missingRefs.join(", "),
      );
    }
    syncOpsCadenceState(result.cadence);
    if (result.laneB) syncLaneBState(result.laneB);
    if (result.distributionOperator) syncDistributionOperatorState(result.distributionOperator);
    if (result.influencerOperator) syncInfluencerOperatorState(result.influencerOperator);
    return result.cadence;
  };

  const laneBProofToOpsProof = (
    proof: import("@shared/cmoLaneB").LaneBProofInput,
  ): import("@shared/cmoOpsCadence").OpsProofInput => {
    const metricNum = proof.metric?.trim() ? Number(proof.metric) : undefined;
    return {
      urls: proof.url?.trim() ? [proof.url.trim()] : undefined,
      note: proof.note,
      metric_snapshot: proof.metric,
      kpi_value: Number.isFinite(metricNum) ? metricNum : undefined,
    };
  };

  const bindAndSyncOpsCadence = (input: {
    cadence: CmoOpsCadence;
    thesis: ChannelThesis;
    project: ProjectProfile;
    laneAWorkspace?: LaneAWorkspace | null;
    preferScoutForFirstSystem?: boolean;
  }) => {
    const { cadence, missingPlans } = bindExecutionPlansForCadence({
      ...input,
      strict: import.meta.env.DEV,
    });
    if (missingPlans.length > 0 && import.meta.env.DEV) {
      console.warn("[cmo] system tasks missing execution plan:", missingPlans.join(", "));
    }
    syncOpsCadenceState(cadence);
    return cadence;
  };

  const tryCompleteLinkedOpsFromHumanProof = (
    opsTaskId: string | undefined,
    proof: import("@shared/cmoOpsCadence").OpsProofInput,
  ) => {
    if (!opsTaskId) return;
    const cadence = get().opsCadence;
    if (!cadence) return;
    const task = cadence.tasks.find((t) => t.id === opsTaskId);
    if (!task || task.status === "done" || task.status === "skipped") return;
    const err = get().completeOpsTask(opsTaskId, proof);
    if (err) {
      appendEvent({ role: "system", kind: "error", text: err });
    }
  };

  const openHumanExecutionProof = (ref: HumanExecutionRef) => {
    if (ref.export_kind === "outreach_csv") {
      get().focusWarRoomAnchor("lane-b-panel-wrap");
      return;
    }
    if (ref.proof_surface === "lane_b_modal") {
      set({ pendingLaneBProofItemId: ref.item_id });
      return;
    }
    if (ref.proof_surface === "operator_modal") {
      if (ref.source === "distribution") {
        set({ pendingDistributionProofSlotId: ref.item_id });
      } else if (ref.source === "influencer") {
        set({ pendingInfluencerProofTouchId: ref.item_id });
      } else {
        set({ pendingDelegateRubricId: ref.item_id });
      }
      return;
    }
    set({ pendingOpsProofTaskId: ref.item_id });
  };

  const handoffForHumanOpsTask = (
    task: import("@shared/cmoOpsCadence").CmoOpsTask,
    week: number,
  ): import("@shared/workspaceHandoff").WorkspaceHandoff => {
    const ref = task.human_execution_ref;
    const proofHint =
      task.expected_proof_kind === "live_url"
        ? "Submit live post URLs as proof."
        : task.expected_proof_kind === "kpi"
          ? "Log the KPI value as proof."
          : "";
    const baseReason = `${task.why} Done when: ${task.done_when}${proofHint ? ` · ${proofHint}` : ""}`;
    if (!ref) {
      return {
        eyebrow: `Week ${week} · Your move`,
        title: task.what,
        reason: baseReason,
        primaryLabel: task.expected_proof_kind === "live_url" ? "Submit proof" : "Mark done",
        primaryAction: "ops_proof",
        opsTaskId: task.id,
      };
    }
    const proofMeta = resolveHumanProofAction(ref);
    if (ref.export_kind === "outreach_csv") {
      return {
        eyebrow: `Week ${week} · Prepare`,
        title: ref.label ?? task.what,
        reason: baseReason,
        primaryLabel: proofMeta.label,
        primaryAction: "export_outreach",
        opsTaskId: task.id,
        humanRef: ref,
      };
    }
    if (ref.proof_surface === "lane_b_modal") {
      return {
        eyebrow: `Week ${week} · Lane B`,
        title: ref.label ?? task.what,
        reason: baseReason,
        primaryLabel: proofMeta.label,
        primaryAction: "human_proof",
        opsTaskId: task.id,
        humanRef: ref,
      };
    }
    if (ref.proof_surface === "operator_modal") {
      return {
        eyebrow: `Week ${week} · Operator`,
        title: ref.label ?? task.what,
        reason: baseReason,
        primaryLabel: proofMeta.label,
        primaryAction: "operator_proof",
        opsTaskId: task.id,
        humanRef: ref,
      };
    }
    return {
      eyebrow: `Week ${week} · Your move`,
      title: task.what,
      reason: baseReason,
      primaryLabel: proofMeta.label,
      primaryAction: "ops_proof",
      opsTaskId: task.id,
      humanRef: ref,
    };
  };

  const autoCompleteBrowserResearchOps = (opts: { runId?: string; summary?: string }) => {
    const cadence = get().opsCadence;
    if (!cadence) return;
    const inProgress = cadence.tasks.find(
      (t) => t.status === "in_progress" && t.owner === "system",
    );
    if (inProgress?.execution_plan?.mode !== "browser_research") return;
    const before = inProgress;
    const next = tryAutoCompleteSystemTask(cadence, {
      runId: opts.runId,
      summaryNote: opts.summary?.trim() || "Browser research complete",
    });
    if (next === cadence) return;
    syncOpsCadenceState(next);
    const laneA = get().laneAWorkspace;
    if (laneA && before.id) {
      syncLaneAState(
        completeLaneAItemOnApply(laneA, before.id, {
          run_id: opts.runId,
        }),
      );
    }
    notifyOpsProgress(next, before.what);
    recomputeGrowthPlane();
  };

  const notifyOpsProgress = (cadence: CmoOpsCadence, completedWhat?: string) => {
    const week = cadence.week_index;
    if (completedWhat) {
      appendEvent({
        role: "system",
        kind: "status",
        text: `✓ Week ${week} ops: ${completedWhat}`,
      });
    }
    const next = getNowTask(cadence);
    if (next?.owner === "user" || next?.owner === "delegate") {
      const proofHint =
        next.expected_proof_kind === "live_url"
          ? "Submit live post URLs as proof."
          : next.expected_proof_kind === "kpi"
            ? "Log the KPI value as proof."
            : "";
      appendEvent({
        role: "system",
        kind: "status",
        text: `Your move: ${next.what} — Done when: ${next.done_when}${proofHint ? ` · ${proofHint}` : ""}`,
      });
      set({
        workspaceHandoff: handoffForHumanOpsTask(next, week),
      });
    }
  };

  const autoCompleteOpsOnApply = (opts: {
    runId?: string;
    commitSha?: string;
    filesApplied?: number;
  }) => {
    const cadence = get().opsCadence;
    if (!cadence) return;
    const before = cadence.tasks.find((t) => t.status === "in_progress" && t.owner === "system");
    if (before?.execution_plan?.mode === "browser_research") return;
    if (before?.expected_proof_kind === "browser_evidence") return;
    const next = tryAutoCompleteSystemTask(cadence, opts);
    if (next === cadence) return;
    syncOpsCadenceState(next);
    if (before?.id) {
      const laneA = get().laneAWorkspace;
      if (laneA) {
        const laneAItem = getLaneAItemForOpsTask(laneA, before.id);
        syncLaneAState(
          completeLaneAItemOnApply(laneA, before.id, {
            commit_sha: opts.commitSha,
            files_applied: opts.filesApplied,
            run_id: opts.runId,
          }),
        );
        const laneD = get().laneDWorkspace ?? get().marketingProfile?.lane_d_workspace;
        if (laneD && laneAItem) {
          syncLaneDState(
            completeLinkedProductRequestOnApply(laneD, laneAItem.id, {
              note: `Lane A applied ${opts.filesApplied ?? 0} file(s) for this P0 request.`,
            }),
          );
        }
        const monetization = get().monetizationWorkspace ?? get().marketingProfile?.monetization_workspace;
        if (monetization && laneAItem) {
          syncMonetizationWorkspaceState(
            completeLinkedMonetizationTaskOnApply(monetization, laneAItem.id),
          );
        }
      }
    }
    notifyOpsProgress(next, before?.what);
    recomputeGrowthPlane();
  };

  const persistLaneBLocal = (projectId: string, workspace: LaneBWorkspace) => {
    try {
      localStorage.setItem(`${LANE_B_LS}.${projectId}`, JSON.stringify(workspace));
    } catch {
      /* quota */
    }
  };

  const hydrateLaneBLocal = (projectId: string) => {
    try {
      const raw = localStorage.getItem(`${LANE_B_LS}.${projectId}`);
      if (!raw) return;
      const workspace = hydrateLaneBWorkspaceFromJson(JSON.parse(raw));
      if (!workspace) return;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      if (!profile.lane_b_workspace) {
        set({
          laneBWorkspace: workspace,
          marketingProfile: { ...profile, lane_b_workspace: workspace },
        });
      } else if (!get().laneBWorkspace) {
        set({ laneBWorkspace: profile.lane_b_workspace });
      }
    } catch {
      /* corrupt */
    }
  };

  const syncLaneBState = (workspace: LaneBWorkspace) => {
    const pid = get().activeProjectId;
    if (pid) persistLaneBLocal(pid, workspace);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      laneBWorkspace: workspace,
      marketingProfile: { ...profile, lane_b_workspace: workspace },
    });
    void get().updateMarketingProfile({ lane_b_workspace: workspace });
  };

  const persistLaneALocal = (projectId: string, workspace: LaneAWorkspace) => {
    try {
      localStorage.setItem(`${LANE_A_LS}.${projectId}`, JSON.stringify(workspace));
    } catch {
      /* quota */
    }
  };

  const hydrateLaneALocal = (projectId: string) => {
    try {
      const raw = localStorage.getItem(`${LANE_A_LS}.${projectId}`);
      if (!raw) return;
      const workspace = hydrateLaneAWorkspaceFromJson(JSON.parse(raw));
      if (!workspace) return;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      if (!profile.lane_a_workspace) {
        set({
          laneAWorkspace: workspace,
          marketingProfile: { ...profile, lane_a_workspace: workspace },
        });
      } else if (!get().laneAWorkspace) {
        set({ laneAWorkspace: profile.lane_a_workspace });
      }
    } catch {
      /* corrupt */
    }
  };

  const syncLaneAState = (workspace: LaneAWorkspace) => {
    const pid = get().activeProjectId;
    if (pid) persistLaneALocal(pid, workspace);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      laneAWorkspace: workspace,
      marketingProfile: { ...profile, lane_a_workspace: workspace },
    });
    void get().updateMarketingProfile({ lane_a_workspace: workspace });
  };

  const persistProductActivationLocal = (
    projectId: string,
    profile: ProductActivationProfile,
  ) => {
    try {
      localStorage.setItem(`${PRODUCT_ACTIVATION_LS}.${projectId}`, JSON.stringify(profile));
    } catch {
      /* quota */
    }
  };

  const syncProductActivationState = (state: ProductActivationProfile) => {
    const pid = get().activeProjectId ?? get().project?.id;
    if (pid) persistProductActivationLocal(pid, state);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      productActivation: state,
      marketingProfile: { ...profile, product_activation: state },
    });
    void get().updateMarketingProfile({ product_activation: state });
  };

  const hydrateProductActivationLocal = (projectId: string) => {
    try {
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      const raw = localStorage.getItem(`${PRODUCT_ACTIVATION_LS}.${projectId}`);
      const saved = raw
        ? (JSON.parse(raw) as Partial<ProductActivationProfile>)
        : profile.product_activation;
      if (!saved) return;
      const state = buildProductActivationProfile({
        founderFit: profile.founder_fit,
        manualKpis: profile.manual_kpis,
        scan: get().project,
        existing: saved,
      });
      set({
        productActivation: state,
        marketingProfile: { ...profile, product_activation: state },
      });
    } catch {
      /* corrupt */
    }
  };

  const persistLaneDLocal = (projectId: string, workspace: LaneDWorkspace) => {
    try {
      localStorage.setItem(`${LANE_D_LS}.${projectId}`, JSON.stringify(workspace));
    } catch {
      /* quota */
    }
  };

  const syncLaneDState = (workspace: LaneDWorkspace) => {
    const pid = get().activeProjectId ?? get().project?.id;
    if (pid) persistLaneDLocal(pid, workspace);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      laneDWorkspace: workspace,
      marketingProfile: { ...profile, lane_d_workspace: workspace },
    });
    void get().updateMarketingProfile({ lane_d_workspace: workspace });
  };

  const hydrateLaneDLocal = (projectId: string) => {
    try {
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      const raw = localStorage.getItem(`${LANE_D_LS}.${projectId}`);
      const workspace = hydrateLaneDWorkspaceFromJson(
        raw ? JSON.parse(raw) : profile.lane_d_workspace,
      );
      if (!workspace) return;
      set({
        laneDWorkspace: workspace,
        marketingProfile: { ...profile, lane_d_workspace: workspace },
      });
    } catch {
      /* corrupt */
    }
  };

  const persistRevenueProfileLocal = (projectId: string, profile: RevenueProfile) => {
    try {
      localStorage.setItem(`${REVENUE_PROFILE_LS}.${projectId}`, JSON.stringify(profile));
    } catch {
      /* quota */
    }
  };

  const syncRevenueProfileState = (state: RevenueProfile) => {
    const pid = get().activeProjectId ?? get().project?.id;
    if (pid) persistRevenueProfileLocal(pid, state);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      revenueProfile: state,
      marketingProfile: { ...profile, revenue_profile: state },
    });
    void get().updateMarketingProfile({ revenue_profile: state });
  };

  const hydrateRevenueProfileLocal = (projectId: string) => {
    try {
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      const raw = localStorage.getItem(`${REVENUE_PROFILE_LS}.${projectId}`);
      const saved = hydrateRevenueProfileFromJson(
        raw ? JSON.parse(raw) : profile.revenue_profile,
      );
      if (!saved) return;
      set({
        revenueProfile: saved,
        marketingProfile: { ...profile, revenue_profile: saved },
      });
    } catch {
      /* corrupt */
    }
  };

  const persistMonetizationWorkspaceLocal = (
    projectId: string,
    workspace: MonetizationWorkspace,
  ) => {
    try {
      localStorage.setItem(`${MONETIZATION_WS_LS}.${projectId}`, JSON.stringify(workspace));
    } catch {
      /* quota */
    }
  };

  const syncMonetizationWorkspaceState = (workspace: MonetizationWorkspace) => {
    const pid = get().activeProjectId ?? get().project?.id;
    if (pid) persistMonetizationWorkspaceLocal(pid, workspace);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      monetizationWorkspace: workspace,
      marketingProfile: { ...profile, monetization_workspace: workspace },
    });
    void get().updateMarketingProfile({ monetization_workspace: workspace });
  };

  const hydrateMonetizationWorkspaceLocal = (projectId: string) => {
    try {
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      const raw = localStorage.getItem(`${MONETIZATION_WS_LS}.${projectId}`);
      const workspace = hydrateMonetizationWorkspaceFromJson(
        raw ? JSON.parse(raw) : profile.monetization_workspace,
      );
      if (!workspace) return;
      set({
        monetizationWorkspace: workspace,
        marketingProfile: { ...profile, monetization_workspace: workspace },
      });
    } catch {
      /* corrupt */
    }
  };

  let lastGrowthAlignmentNote: string | undefined;
  let lastDistributionVerdictHeadline: string | undefined;
  let pendingVerifyAfterApply: {
    url: string;
    checklist: string[];
    startedAt: number;
  } | null = null;
  const lastVerifyAtByUrl: Record<string, number> = {};
  let lastInfluencerVerdictHeadline: string | undefined;

  const persistDistributionOperatorLocal = (
    projectId: string,
    workspace: DistributionOperatorWorkspace,
  ) => {
    try {
      localStorage.setItem(`${DISTRIBUTION_OPERATOR_LS}.${projectId}`, JSON.stringify(workspace));
    } catch {
      /* quota */
    }
  };

  const hydrateDistributionOperatorLocal = (projectId: string) => {
    try {
      const raw = localStorage.getItem(`${DISTRIBUTION_OPERATOR_LS}.${projectId}`);
      if (!raw) return;
      const workspace = hydrateDistributionOperatorFromJson(JSON.parse(raw));
      if (!workspace) return;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      if (!profile.distribution_operator) {
        set({
          distributionOperator: workspace,
          marketingProfile: { ...profile, distribution_operator: workspace },
        });
      } else if (!get().distributionOperator) {
        set({ distributionOperator: profile.distribution_operator });
      }
    } catch {
      /* corrupt */
    }
  };

  const syncDistributionOperatorState = (workspace: DistributionOperatorWorkspace) => {
    const pid = get().activeProjectId;
    if (pid) persistDistributionOperatorLocal(pid, workspace);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      distributionOperator: workspace,
      marketingProfile: { ...profile, distribution_operator: workspace },
    });
    void get().updateMarketingProfile({ distribution_operator: workspace });
  };

  const maybeCreateDistributionOperator = (opts?: {
    doubleDown?: boolean;
    winningHookId?: string;
    week_index?: number;
    character_mode?: boolean;
  }) => {
    if ((get().cmoContinuous ?? get().marketingProfile?.cmo_continuous)?.marketing_paused) {
      return;
    }
    const { channelThesis, marketingProfile, opsCadence, growthControlPlane } = get();
    const thesis = channelThesis ?? marketingProfile?.channel_thesis;
    const cadence = opsCadence ?? marketingProfile?.ops_cadence;
    if (!thesis || !cadence) return;
    if (
      !isDistributionOperatorGate({
        thesis,
        opsCadence: cadence,
        growthPlane: growthControlPlane,
      })
    ) {
      return;
    }
    const op = createDistributionOperatorFromThesis(thesis, {
      opsCadence: cadence,
      narrative: marketingProfile?.growth_narrative,
      week_index: opts?.week_index ?? cadence.week_index,
      doubleDown: opts?.doubleDown,
      winningHookId: opts?.winningHookId,
      character_mode: opts?.character_mode,
    });
    if (!op) return;
    syncDistributionOperatorState(op);
    const laneB = get().laneBWorkspace ?? marketingProfile?.lane_b_workspace;
    if (laneB) {
      const synced = syncLaneBFromOperator(op, laneB);
      syncDistributionOperatorState(synced.workspace);
      syncLaneBState(synced.laneB);
    }
  };

  const persistInfluencerOperatorLocal = (
    projectId: string,
    workspace: InfluencerOperatorWorkspace,
  ) => {
    try {
      localStorage.setItem(`${INFLUENCER_OPERATOR_LS}.${projectId}`, JSON.stringify(workspace));
    } catch {
      /* quota */
    }
  };

  const hydrateInfluencerOperatorLocal = (projectId: string) => {
    try {
      const raw = localStorage.getItem(`${INFLUENCER_OPERATOR_LS}.${projectId}`);
      if (!raw) return;
      const workspace = hydrateInfluencerOperatorFromJson(JSON.parse(raw));
      if (!workspace) return;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      if (!profile.influencer_operator) {
        set({
          influencerOperator: workspace,
          marketingProfile: { ...profile, influencer_operator: workspace },
        });
      } else if (!get().influencerOperator) {
        set({ influencerOperator: profile.influencer_operator });
      }
    } catch {
      /* corrupt */
    }
  };

  const syncInfluencerOperatorState = (workspace: InfluencerOperatorWorkspace) => {
    const pid = get().activeProjectId;
    if (pid) persistInfluencerOperatorLocal(pid, workspace);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      influencerOperator: workspace,
      marketingProfile: { ...profile, influencer_operator: workspace },
    });
    void get().updateMarketingProfile({ influencer_operator: workspace });
  };

  const maybeCreateInfluencerOperator = (opts?: {
    doubleDown?: boolean;
    winningPitchId?: string;
    week_index?: number;
  }) => {
    if ((get().cmoContinuous ?? get().marketingProfile?.cmo_continuous)?.marketing_paused) {
      return;
    }
    const { channelThesis, marketingProfile, opsCadence, growthControlPlane, influencerOperator } =
      get();
    const thesis = channelThesis ?? marketingProfile?.channel_thesis;
    const cadence = opsCadence ?? marketingProfile?.ops_cadence;
    if (!thesis || !cadence) return;
    if (
      !isInfluencerOperatorGate({
        thesis,
        opsCadence: cadence,
        growthPlane: growthControlPlane,
      })
    ) {
      return;
    }
    const prior =
      opts?.doubleDown
        ? (influencerOperator ?? marketingProfile?.influencer_operator)
        : undefined;
    const op = createInfluencerOperatorFromThesis(thesis, {
      opsCadence: cadence,
      narrative: marketingProfile?.growth_narrative,
      week_index: opts?.week_index ?? cadence.week_index,
      doubleDown: opts?.doubleDown,
      winningPitchId: opts?.winningPitchId,
      priorWorkspace: prior ?? undefined,
    });
    if (!op) return;
    syncInfluencerOperatorState(op);
    const laneB = get().laneBWorkspace ?? marketingProfile?.lane_b_workspace;
    if (laneB) {
      const synced = syncLaneBFromInfluencerOperator(op, laneB);
      syncInfluencerOperatorState(synced.workspace);
      syncLaneBState(synced.laneB);
    }
  };

  const persistGrowthPlaneLocal = (projectId: string, plane: GrowthControlPlane) => {
    try {
      localStorage.setItem(`${GROWTH_PLANE_LS}.${projectId}`, JSON.stringify(plane));
    } catch {
      /* quota */
    }
  };

  const hydrateGrowthPlaneLocal = (projectId: string) => {
    try {
      const raw = localStorage.getItem(`${GROWTH_PLANE_LS}.${projectId}`);
      if (!raw) return;
      const plane = hydrateGrowthControlPlaneFromJson(JSON.parse(raw));
      if (!plane) return;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      if (!profile.growth_control_plane) {
        set({
          growthControlPlane: plane,
          marketingProfile: { ...profile, growth_control_plane: plane },
        });
      } else if (!get().growthControlPlane) {
        set({ growthControlPlane: profile.growth_control_plane });
      }
    } catch {
      /* corrupt */
    }
  };

  const syncGrowthPlaneState = (plane: GrowthControlPlane) => {
    const pid = get().activeProjectId;
    if (pid) persistGrowthPlaneLocal(pid, plane);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      growthControlPlane: plane,
      marketingProfile: { ...profile, growth_control_plane: plane },
    });
    void get().updateMarketingProfile({ growth_control_plane: plane });
  };

  const recomputeGrowthPlane = () => {
    const {
      project,
      settings,
      marketingProfile,
      channelThesis,
      opsCadence,
      distributionOperator,
      influencerOperator,
    } = get();
    if (!project) return;
    const thesis = channelThesis ?? marketingProfile?.channel_thesis;
    const cadence = opsCadence ?? marketingProfile?.ops_cadence ?? null;
    const distOp = distributionOperator ?? marketingProfile?.distribution_operator ?? null;
    const infOp = influencerOperator ?? marketingProfile?.influencer_operator ?? null;
    const delOp = resolveDelegateOperator(
      get().delegateOperator ??
        get().delegateWorkspace ??
        marketingProfile?.delegate_operator ??
        marketingProfile?.lane_c_workspace,
      thesis,
    );
    const plane = buildGrowthControlPlane({
      project,
      persona: settings.persona,
      profile: marketingProfile,
      thesis,
      opsCadence: cadence,
      distributionOperator: distOp,
      influencerOperator: infOp,
      delegateOperator: delOp,
      growthMemory: get().growthMemory ?? marketingProfile?.growth_memory,
      budgetPlan: get().budgetPlan ?? marketingProfile?.budget_plan,
    });
    syncGrowthPlaneState(plane);
    if (
      !plane.thesis_aligned &&
      plane.alignment_note &&
      plane.alignment_note !== lastGrowthAlignmentNote
    ) {
      lastGrowthAlignmentNote = plane.alignment_note;
      appendEvent({
        role: "system",
        kind: "status",
        text: plane.alignment_note,
      });
    }
  };

  const persistContinuousLocal = (projectId: string, state: CmoContinuousState) => {
    try {
      localStorage.setItem(`${CMO_CONTINUOUS_LS}.${projectId}`, JSON.stringify(state));
    } catch {
      /* quota */
    }
  };

  const hydrateContinuousLocal = (projectId: string) => {
    try {
      const raw = localStorage.getItem(`${CMO_CONTINUOUS_LS}.${projectId}`);
      if (!raw) return;
      const state = hydrateContinuousStateFromJson(JSON.parse(raw));
      if (!state) return;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      if (!profile.cmo_continuous) {
        set({
          cmoContinuous: state,
          marketingProfile: { ...profile, cmo_continuous: state },
        });
      } else if (!get().cmoContinuous) {
        set({ cmoContinuous: profile.cmo_continuous });
      }
    } catch {
      /* corrupt */
    }
  };

  const syncContinuousState = (state: CmoContinuousState) => {
    const pid = get().activeProjectId;
    if (pid) persistContinuousLocal(pid, state);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      cmoContinuous: state,
      marketingProfile: { ...profile, cmo_continuous: state },
    });
    void get().updateMarketingProfile({ cmo_continuous: state });
  };

  const persistGrowthMemoryLocal = (projectId: string, state: GrowthMemoryState) => {
    try {
      localStorage.setItem(`${GROWTH_MEMORY_LS}.${projectId}`, JSON.stringify(state));
    } catch {
      /* quota */
    }
  };

  const hydrateGrowthMemoryLocal = (projectId: string) => {
    try {
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      const raw = localStorage.getItem(`${GROWTH_MEMORY_LS}.${projectId}`);
      const state = hydrateGrowthMemoryFromJson(raw ? JSON.parse(raw) : profile.growth_memory, {
        projectId,
        thesisId: (get().channelThesis ?? profile.channel_thesis)?.id,
        legacyExperiments: profile.previous_experiments,
      });
      if (!state) return;
      if (!profile.growth_memory) {
        set({
          growthMemory: state,
          marketingProfile: { ...profile, growth_memory: state },
        });
      } else if (!get().growthMemory) {
        set({ growthMemory: state });
      }
    } catch {
      /* corrupt */
    }
  };

  const syncGrowthMemoryState = (state: GrowthMemoryState) => {
    const pid = get().activeProjectId;
    if (pid) persistGrowthMemoryLocal(pid, state);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      growthMemory: state,
      marketingProfile: { ...profile, growth_memory: state },
    });
    void get().updateMarketingProfile({ growth_memory: state });
  };

  const persistBudgetPlanLocal = (projectId: string, state: BudgetPlan) => {
    try {
      localStorage.setItem(`${BUDGET_PLAN_LS}.${projectId}`, JSON.stringify(state));
    } catch {
      /* quota */
    }
  };

  const hydrateBudgetPlanLocal = (projectId: string) => {
    try {
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      const raw = localStorage.getItem(`${BUDGET_PLAN_LS}.${projectId}`);
      const state = hydrateBudgetPlanFromJson(raw ? JSON.parse(raw) : profile.budget_plan);
      if (!state) return;
      set({
        budgetPlan: state,
        marketingProfile: { ...profile, budget_plan: state },
      });
    } catch {
      /* corrupt */
    }
  };

  const syncBudgetPlanState = (state: BudgetPlan) => {
    const pid = get().activeProjectId ?? get().project?.id;
    if (pid) persistBudgetPlanLocal(pid, state);
    const mirrored = applyActionCostEstimates(state, {
      laneB: get().laneBWorkspace,
      laneC: get().marketingProfile?.lane_c_workspace,
      distribution: get().distributionOperator,
      influencer: get().influencerOperator,
      delegate: get().delegateOperator,
      cadence: get().opsCadence,
    });
    if (mirrored.laneB) syncLaneBState(mirrored.laneB);
    if (mirrored.delegate) syncDelegateState(mirrored.delegate);
    if (mirrored.distribution) syncDistributionOperatorState(mirrored.distribution);
    if (mirrored.influencer) syncInfluencerOperatorState(mirrored.influencer);
    if (mirrored.cadence) syncOpsCadenceState(mirrored.cadence);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      budgetPlan: state,
      marketingProfile: { ...profile, budget_plan: state },
    });
    void get().updateMarketingProfile({ budget_plan: state });
  };

  const persistDelegateLocal = (projectId: string, workspace: DelegateOperatorWorkspace) => {
    try {
      localStorage.setItem(`${DELEGATE_LS}.${projectId}`, JSON.stringify(workspace));
      localStorage.setItem(`${DELEGATE_OPERATOR_LS}.${projectId}`, JSON.stringify(workspace));
    } catch {
      /* quota */
    }
  };

  const hydrateDelegateLocal = (projectId: string) => {
    try {
      const thesis = get().channelThesis ?? get().marketingProfile?.channel_thesis;
      const rawOp = localStorage.getItem(`${DELEGATE_OPERATOR_LS}.${projectId}`);
      const rawLegacy = localStorage.getItem(`${DELEGATE_LS}.${projectId}`);
      const raw = rawOp ?? rawLegacy;
      if (!raw) return;
      const workspace =
        hydrateDelegateOperatorFromJson(JSON.parse(raw), thesis) ??
        (thesis ? migrateToOperatorWorkspace(hydrateDelegateWorkspaceFromJson(JSON.parse(raw))!, thesis) : null);
      if (!workspace) return;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      if (!profile.delegate_operator && !profile.lane_c_workspace) {
        set({
          delegateWorkspace: workspace,
          delegateOperator: workspace,
          marketingProfile: {
            ...profile,
            lane_c_workspace: workspace,
            delegate_operator: workspace,
          },
        });
      } else if (!get().delegateOperator) {
        const op = resolveDelegateOperator(
          profile.delegate_operator ?? profile.lane_c_workspace,
          thesis,
        );
        if (op) set({ delegateWorkspace: op, delegateOperator: op });
      }
    } catch {
      /* corrupt */
    }
  };

  const syncDelegateState = (workspace: DelegateOperatorWorkspace) => {
    const pid = get().activeProjectId;
    if (pid) persistDelegateLocal(pid, workspace);
    const profile = get().marketingProfile ?? emptyMarketingProfile();
    set({
      delegateWorkspace: workspace,
      delegateOperator: workspace,
      marketingProfile: {
        ...profile,
        lane_c_workspace: workspace,
        delegate_operator: workspace,
      },
    });
    void get().updateMarketingProfile({
      lane_c_workspace: workspace,
      delegate_operator: workspace,
    });
  };

  const maybeSyncGa4OnCycleStart = (weekIndex: number) => {
    const profile = get().marketingProfile;
    const plan = planGa4SyncOnCycleStart(profile, { week_index: weekIndex });
    appendEvent({ role: "system", kind: "status", text: plan.reason });
    if (!plan.shouldSync || get().runtime !== "connected") return;
    void get()
      .syncGa4Metrics()
      .then(() => {
        appendEvent({
          role: "system",
          kind: "status",
          text: ga4SyncStatusMessage(true, weekIndex),
        });
      })
      .catch(() => {
        appendEvent({
          role: "system",
          kind: "status",
          text: ga4SyncStatusMessage(false, weekIndex),
        });
      });
  };

  const notifyCampaignTaskDone = (taskId: string) => {
    const progress = get().planProgress;
    get().advanceCampaignPhase({
      type: "task_done",
      taskId,
      allTasksDone: allPlanTasksDone(progress),
    });
    queueMicrotask(() => get().requestProactiveSuggestion("plan_task_done"));
  };

  const patchThreadAsset = (assetId: string, patch: Partial<MarketingAsset>) =>
    set((s) => ({
      thread: s.thread.map((e) =>
        e.kind === "asset" && e.asset?.id === assetId
          ? { ...e, asset: { ...e.asset, ...patch } }
          : e,
      ),
    }));

  const findThreadAsset = (assetOrId: MarketingAsset | string): MarketingAsset | null => {
    if (typeof assetOrId !== "string") return assetOrId;
    for (let i = get().thread.length - 1; i >= 0; i -= 1) {
      const e = get().thread[i];
      if (e.kind === "asset" && e.asset?.id === assetOrId) return e.asset;
    }
    return null;
  };

  /** Remove approval bubble from chat and record the user's decision. */
  const resolveThreadApproval = (
    approvalId: string,
    approved: boolean,
    meta?: { intent?: string; scope?: PermissionScope },
  ) => {
    const intent = meta?.intent?.trim();
    const scopeLabel = meta?.scope ? PERMISSION_SCOPE_LABELS[meta.scope] : undefined;
    const outcome = approved ? "Approved" : "Rejected";
    const text = intent
      ? `${outcome}: ${intent}`
      : scopeLabel
        ? `${outcome} (${scopeLabel}).`
        : `${outcome}.`;

    set((s) => ({
      thread: [
        ...s.thread.filter((e) => !(e.kind === "approval" && e.approvalId === approvalId)),
        {
          id: makeEventId(),
          ts: Date.now(),
          role: "system",
          kind: "status",
          text,
        },
      ],
      feedItems: s.feedItems.map((f) =>
        f.approvalId === approvalId
          ? {
              ...f,
              status: approved ? ("success" as const) : ("failed" as const),
              title: approved ? "Approval granted" : "Approval rejected",
            }
          : f,
      ),
    }));
  };

  const hasThreadApproval = (approvalId: string) =>
    get().thread.some((e) => e.kind === "approval" && e.approvalId === approvalId);

  const isExecutionActive = () => {
    const { run, browser } = get();
    return !canDrainExecutionQueue({
      runStatus: run?.status,
      browserRunning: browser.running,
    });
  };

  /** Defer queue drain until run/browser flags have settled (auto-advance). */
  const drainExecutionQueueWhenIdle = () => {
    queueMicrotask(() => {
      const snap = get();
      if (
        !canDrainExecutionQueue({
          runStatus: snap.run?.status,
          browserRunning: snap.browser.running,
        })
      ) {
        return;
      }
      get().processExecutionQueue();
    });
  };

  const enqueueExecutionTask = (
    item: Omit<ExecutionQueueItem, "id" | "enqueuedAt"> & { label?: string },
  ) => {
    const { queue, item: enqueued, dropped } = enqueueExecution(get().executionQueue, item);
    set({ executionQueue: queue });
    if (dropped) {
      appendEvent({
        role: "system",
        kind: "status",
        text: `Queue full — dropped oldest: ${dropped.label}`,
      });
    }
    appendEvent({
      role: "system",
      kind: "status",
      text: `Queued: ${enqueued.label} (${queue.length} in queue)`,
    });
    if (!isExecutionActive()) drainExecutionQueueWhenIdle();
  };

  const setPlanFromSuite = (
    plan: MarketingPlan,
    planRowId?: string,
    opts?: {
      carryFrom?: {
        plan: MarketingPlan;
        byTaskId: Record<string, import("@shared/planProgress").PlanTaskProgressRow>;
      };
    },
  ) => {
    const normalized = normalizePlan(plan) ?? plan;
    set({
      plan: normalized,
      activePlanRowId: planRowId,
      planPreviewMode: false,
    });

    if (opts?.carryFrom) {
      const result = reconcileProgressAfterPlanChange(
        opts.carryFrom.plan,
        normalized,
        opts.carryFrom.byTaskId,
      );
      const rowId = planRowId ?? normalized.id;
      const snapshot: PlanProgressSnapshot = {
        planId: rowId,
        byTaskId: result.byTaskId,
        computed: computePlanProgress(normalized, result.byTaskId),
        launchAnchorAt: get().planProgress?.launchAnchorAt,
      };
      applyProgressSnapshot(snapshot);
      void persistProgressSnapshot(snapshot);

      const parts: string[] = [];
      if (result.carried) parts.push(`${result.carried} kept`);
      if (result.remapped) parts.push(`${result.remapped} remapped`);
      if (result.dropped) parts.push(`${result.dropped} cleared`);
      if (parts.length) {
        appendEvent({
          role: "system",
          kind: "status",
          text: `Plan progress reconciled — ${parts.join(", ")}.`,
        });
      }
    }

    void get().loadPlanProgress(planRowId ?? normalized.id);
  };

  const hintWorkSurface = (surface: WorkSurface) => {
    if (isExecutionActive()) return;
    get().setWorkSurface(surface);
  };

  const resolvePlanRowId = () => get().activePlanRowId ?? get().plan?.id;

  const emitPlanTaskOutcomeCard = (opts: {
    taskId: string;
    variant: "done" | "failed" | "awaiting_apply" | "awaiting_review" | "partial";
    reviewGate?: import("@shared/planTaskCompletion").PlanTaskCompletionGate;
  }) => {
    const { plan, activePlaybookId } = get();
    const completed = plan?.taskGraph.find((t) => t.id === opts.taskId);
    if (!completed) return;

    const suite = plan ? normalizePlan(plan) : null;
    const next =
      opts.variant === "done" && suite && get().planProgress
        ? resolvePlanDeepLink({
            plan: suite,
            planProgress: get().planProgress,
            activePlaybookId: completed.playbookId ?? activePlaybookId,
          })
        : null;

    appendEvent({
      role: "agent",
      kind: "plan_task_complete",
      text: completed.title,
      completedTaskId: opts.taskId,
      completedTaskDay: completed.day,
      planTaskVariant: opts.variant,
      ...(opts.reviewGate ? { planTaskReviewGate: opts.reviewGate } : {}),
      ...(opts.variant === "done"
        ? {
            nextTaskId: next?.taskId,
            nextTaskDay: next?.taskDay,
            nextTaskTitle: next?.taskTitle,
            nextPlaybookId: next?.playbookId,
          }
        : opts.variant === "failed"
          ? { planTaskFailed: true }
          : {}),
    });
  };

  const upsertApplyPendingFeed = (runId: string, task: { day: number; title: string }, patchCount: number) => {
    const gateId = `apply-pending-${runId}`;
    if (get().feedItems.some((i) => i.id === gateId)) return;
    get().appendFeedItem({
      id: gateId,
      ts: Date.now(),
      source: "system",
      category: "gate",
      planGate: "apply-pending",
      title: `Apply changes to complete Day ${task.day}`,
      summary: `${patchCount} file${patchCount === 1 ? "" : "s"} waiting in worktree — review diff, then apply to mark this task done.`,
      status: "waiting",
      runId,
      canvasTarget: { mode: "preview" },
    });
  };

  const removeApplyPendingFeed = (runId?: string) => {
    if (!runId) return;
    const gateId = `apply-pending-${runId}`;
    set((s) => ({ feedItems: s.feedItems.filter((i) => i.id !== gateId) }));
  };

  const settleActivePlanTaskAfterRun = async (
    taskId: string,
    events: RunEvent[],
    lastRunId?: string,
  ) => {
    const task = get().plan?.taskGraph.find((t) => t.id === taskId);
    if (!task) return;

    const transition = transitionAfterRepoRunComplete(events);
    const runId = get().run?.runId ?? lastRunId;

    if (transition.status === "done") {
      finalizeActivePlanTask("done", { lastRunId });
      return;
    }

    await get().patchPlanTaskStatus(taskId, transition.status, { lastRunId });
    set({ activePlanTaskId: taskId });

    if (transition.gate === "apply-pending" && runId) {
      upsertApplyPendingFeed(runId, task, countPendingPatches(events));
    }

    get().advanceCampaignPhase({ type: "awaiting_apply", taskId });

    emitPlanTaskOutcomeCard({
      taskId,
      variant: transition.status as "awaiting_apply" | "awaiting_review",
      reviewGate: transition.gate,
    });
    void get().loadRunsArchive();
  };

  const settleBrowserPlanTask = (browseRunId?: string) => {
    const taskId = get().activePlanTaskId;
    if (!taskId) return;

    const transition = transitionAfterBrowserComplete(get().browser.findings.length);
    if (transition.status === "done") {
      finalizeActivePlanTask("done", { lastRunId: browseRunId });
      return;
    }

    void (async () => {
      await get().patchPlanTaskStatus(taskId, "awaiting_review", { lastRunId: browseRunId });
      set({ activePlanTaskId: taskId });
      emitPlanTaskOutcomeCard({
        taskId,
        variant: "awaiting_review",
        reviewGate: transition.gate,
      });
    })();
  };

  /** Mark the active launch-plan task done/failed — agent runs and browser tasks share this path. */
  const finalizeActivePlanTask = (
    outcome: "done" | "failed",
    opts?: { lastRunId?: string },
  ) => {
    const taskId = get().activePlanTaskId;
    if (!taskId) return;

    const { plan, activePlaybookId, run } = get();
    const completed = plan?.taskGraph.find((t) => t.id === taskId);

    if (outcome === "done") {
      get().recordSessionOutcome({
        kind: "run",
        label: completed?.title ?? "Plan task complete",
        channel: completed?.channel,
      });
    }

    void (async () => {
      await get().patchPlanTaskStatus(taskId, outcome, {
        lastRunId: opts?.lastRunId ?? run?.serverRunId ?? run?.runId,
      });
      set({ activePlanTaskId: undefined });
      if (outcome === "done") {
        await get().loadPlanProgress();
        notifyCampaignTaskDone(taskId);
      }

      const suite = get().plan ? normalizePlan(get().plan) : null;
      const next =
        outcome === "done" && suite && get().planProgress
          ? resolvePlanDeepLink({
              plan: suite,
              planProgress: get().planProgress,
              activePlaybookId: completed?.playbookId ?? activePlaybookId,
            })
          : null;

      appendEvent({
        role: "agent",
        kind: "plan_task_complete",
        text: completed?.title,
        completedTaskId: taskId,
        completedTaskDay: completed?.day,
        planTaskVariant: outcome,
        ...(outcome === "done"
          ? {
              nextTaskId: next?.taskId,
              nextTaskDay: next?.taskDay,
              nextTaskTitle: next?.taskTitle,
              nextPlaybookId: next?.playbookId,
            }
          : { planTaskFailed: true }),
      });
      void get().loadRunsArchive();
    })();
  };

  const releaseActivePlanTask = (status: "pending" | "failed" = "pending") => {
    const taskId = get().activePlanTaskId;
    if (!taskId) return;
    void get().patchPlanTaskStatus(taskId, status);
    set({ activePlanTaskId: undefined });
  };

  const archiveBrowseRun = (status: "completed" | "failed") => {
    const { browser, activeProjectId, thread, run } = get();
    const lastTask = [...thread]
      .reverse()
      .find((t) => t.role === "user" && t.text?.startsWith("Browser task:"));
    const goal = lastTask?.text?.replace(/^Browser task:\s*/, "") ?? run?.goal ?? "Browser task";
    void window.api.activity
      .appendBrowseRun({
        goal,
        status,
        projectId: activeProjectId,
        steps: browser.step,
        url: browser.url,
        localRunId: run?.kind === "browse" ? run.runId : undefined,
        events: run?.kind === "browse" ? run.events : undefined,
        startedAt: run?.kind === "browse" ? run.startedAt : undefined,
        planTaskId: run?.planTaskId,
      })
      .then(() => get().loadRunsArchive())
      .catch((err) => reportBackgroundError("archiveBrowseRun", err, "user"));
    if (run?.kind === "browse") {
      set({ run: { ...run, status: status === "completed" ? "completed" : "failed" } });
    }
  };

  const applyProgressSnapshot = (snapshot: PlanProgressSnapshot | null) => {
    set({
      planProgress: snapshot,
      planTaskStatus: legacyMapFromSnapshot(snapshot),
    });
  };

  const persistProgressSnapshot = async (snapshot: PlanProgressSnapshot) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;
    try {
      await window.api.planProgress.save(activeProjectId, snapshot);
    } catch {
      /* ignore local save failures */
    }
  };

  const appendFeedFromRunEvent = (event: RunEvent) => {
    const item = runEventToFeedItem(event);
    if (!item) return;
    const sourceMessageId = get().run?.sourceMessageId;
    get().appendFeedItem({
      ...item,
      ...(sourceMessageId ? { sourceMessageId } : {}),
    });
  };

  const clearFirstHourAutoHandoff = () => {
    if (firstHourAutoHandoffTimer) {
      clearTimeout(firstHourAutoHandoffTimer);
      firstHourAutoHandoffTimer = null;
    }
  };

  const scheduleFirstHourAutoHandoff = (receipt: TurnReceipt, answerText?: string) => {
    clearFirstHourAutoHandoff();
    firstHourAutoHandoffTimer = window.setTimeout(() => {
      firstHourAutoHandoffTimer = null;
      const snap = get();
      if (!snap.firstHourActive || !snap.project) return;
      const intent = resolveFirstHourAutoHandoff({
        project: snap.project,
        receipt,
        answerText,
      });
      if (!intent || isExecutionActive()) return;
      track("first_hour_auto_handoff");
      appendEvent({
        role: "system",
        kind: "status",
        text: "Starting patch run from scout answer…",
      });
      get().executeIntent(intent, { skipConfirm: true, sourceMessageId: receipt.turnId });
      get().setActiveCanvas("run");
    }, FIRST_HOUR_AUTO_HANDOFF_DELAY_MS);
  };

  const buildAskFoldDeps = (): AskFoldDeps => ({
    appendEvent: (e) => appendEvent(e as Parameters<typeof appendEvent>[0]),
    patchEvent: (id, patch) => patchEvent(id, patch as Partial<SessionEvent>),
    getEventText: (id) => get().thread.find((x) => x.id === id)?.text ?? "",
    removeEventIds: (ids) =>
      set((s) => ({ thread: s.thread.filter((e) => !ids.includes(e.id)) })),
    appendPresentedError,
    setSuggestedMode: (mode, reason) => {
      const snap = get();
      const suite = snap.plan ? normalizePlan(snap.plan) : null;
      const resolved = resolveIntent({
        suggestedMode: mode,
        suggestedModeReason: reason,
        message: snap.lastAgentUserMessage,
        plan: suite,
        planProgress: snap.planProgress,
        activeRunId: snap.run?.runId,
        planTaskId: snap.activePlanTaskId,
      });
      const handoff = resolved ? handoffFromResolved(resolved) : null;
      set({
        suggestedComposerMode: { mode, reason: reason ?? "" },
        ...(handoff ? { workspaceHandoff: handoff } : {}),
      });
    },
    applyPlanRevision: ({ plan, summary, diff, sourcePlanId }) => {
      const currentPlan = get().plan;
      const prevProgress = get().planProgress?.byTaskId;
      const revised = normalizePlan(plan) ?? plan;
      const resolvedDiff =
        (diff as ReturnType<typeof diffPlanVersions> | undefined) ??
        (currentPlan ? diffPlanVersions(currentPlan, revised, summary) : undefined);
      setPlanFromSuite(
        revised,
        undefined,
        currentPlan && prevProgress
          ? { carryFrom: { plan: currentPlan, byTaskId: prevProgress } }
          : undefined,
      );
      appendEvent({
        role: "agent",
        kind: "plan_revision",
        text: summary,
        planRevisionSummary: summary,
        planRevisionDiff: resolvedDiff,
        sourcePlanId,
      });
      hintWorkSurface("campaign-plan");
      void get().loadPlanHistory().then(() => {
        const row = get().planHistory[0];
        if (!row) return;
        set({ activePlanRowId: row.id });
        const snap = get().planProgress;
        if (snap && snap.planId !== row.id) {
          const updated = { ...snap, planId: row.id };
          applyProgressSnapshot(updated);
          void persistProgressSnapshot(updated);
        }
        void get().loadPlanProgress(row.id);
      });
    },
    onAsset: (asset) => {
      get().recordSessionOutcome({
        kind: "asset",
        label: `${asset.type} draft ready`,
        channel: asset.type,
      });
    },
    onUsage: (u) => {
      set((s) => {
        if (!s.auth.usage) return s;
        return {
          auth: {
            ...s.auth,
            usage: {
              ...s.auth.usage,
              agent: s.auth.usage.agent + 1,
              tokens_in: s.auth.usage.tokens_in + u.tokens_in,
              tokens_out: s.auth.usage.tokens_out + u.tokens_out,
              cost_cents: s.auth.usage.cost_cents + u.cost_cents,
            },
          },
        };
      });
    },
    hintWorkSurface: (surface) => hintWorkSurface(surface as WorkSurface),
    strategyContextSummary,
    onTurnComplete: (receipt) => {
      const snap = get();
      const answerText = askFoldSession?.agentTextEventId
        ? snap.thread.find((x) => x.id === askFoldSession?.agentTextEventId)?.text
        : askFoldSession?.trimmed;
      set({
        lastTurnReceipt: receipt,
        lastAskAssets: askFoldSession?.collectedAssets ?? [],
        lastAnswerText: answerText,
      });
      const pid = snap.activeProjectId;
      if (pid) persistTurnReceipt(pid, receipt);
      get().recordSessionOutcome({
        kind: "copy",
        label: receipt.summaryLine,
        turnId: receipt.turnId,
        costCents: receipt.deliverables.costCents,
        ref: receipt.turnId,
      });

      const after = get();
      if (after.firstHourScoutPending && after.firstHourActive && after.project) {
        set({ firstHourScoutPending: false });
        scheduleFirstHourAutoHandoff(receipt, answerText);
      }
    },
  });

  /** Fold a RunEvent from the Local Agent Host into run + canvas + thread. */
  const ingestRunEvent = (event: RunEvent) => {
    const current = get().run;
    if (!current) return;
    // Ignore stale/out-of-run events.
    if (current.runId && event.runId && current.runId !== event.runId) return;

    const streamEvent = event.payload?.streamEvent as AgentStreamEvent | undefined;
    if (
      streamEvent &&
      askFoldSession &&
      (current.kind === "ask" || !askFoldSession.runId || askFoldSession.runId === event.runId)
    ) {
      if (event.runId) askFoldSession.runId = event.runId;
      foldAskStreamEvent(askFoldSession, streamEvent, buildAskFoldDeps());
    }

    const { run, canvas } = applyRunEvent(current, event);
    set((s) => ({
      run,
      canvas: canvas ? { ...s.canvas, mode: canvas } : s.canvas,
    }));

    appendFeedFromRunEvent(event);

    // Orchestrator-owned browse: mirror frames/status into Operator UI.
    if (current.kind === "browse" || get().browser.running) {
      if (event.type === "browser.frame") {
        const png = event.payload?.pngBase64 as string | undefined;
        const action = (event.payload?.action as string | undefined) ?? event.title;
        const url = event.payload?.url as string | undefined;
        if (png) {
          pushFrameHistory({
            pngBase64: png,
            url,
            action,
            ts: event.timestamp || new Date().toISOString(),
          });
          set((s) => ({
            browser: {
              ...s.browser,
              prevFrame: s.browser.frame,
              frame: png,
              lastAction: action ?? s.browser.lastAction,
              url: url ?? s.browser.url,
              phase: s.browser.phase ?? "acting",
            },
            canvas: { mode: "browser" as const },
            route: "workspace" as const,
          }));
          maybeAppendThreadFrame({ pngBase64: png, label: action || "Browser frame" });
        }
      } else if (event.type === "browser.navigated") {
        set((s) => ({
          browser: {
            ...s.browser,
            url: (event.payload?.url as string) ?? s.browser.url,
            title: (event.payload?.title as string) ?? event.title,
          },
        }));
      } else if (event.type === "agent.status") {
        set((s) => ({
          browser: {
            ...s.browser,
            lastStatus: event.title,
            phase: (event.payload?.phase as typeof s.browser.phase) ?? s.browser.phase,
            step: (event.payload?.step as number | undefined) ?? s.browser.step,
            stepMax: (event.payload?.stepMax as number | undefined) ?? s.browser.stepMax,
          },
        }));
      } else if (event.type === "evidence.captured" && event.payload?.finding) {
        const finding = event.payload.finding as Finding;
        set((s) => ({
          browser: {
            ...s.browser,
            findings: [...s.browser.findings, finding],
          },
        }));
      } else if (event.type === "approval.required") {
        set((s) => ({
          browser: {
            ...s.browser,
            pendingApprovalId: (event.payload?.approvalId as string) ?? undefined,
            pendingSummary: event.summary,
            paused: true,
          },
        }));
      } else if (event.type === "run.completed" && current.kind === "browse") {
        set((s) => ({
          browser: { ...s.browser, running: false, phase: undefined, paused: false },
        }));
        const report = event.payload?.report as
          | { validations?: Array<{ label: string; passed: boolean; detail?: string }>; evidence?: Finding[] }
          | undefined;
        if (pendingVerifyAfterApply) {
          void finalizeVerifyAfterApplyRun({
            runId: event.runId,
            report,
            summary: event.summary,
          });
        } else {
          archiveBrowseRun("completed");
          autoCompleteBrowserResearchOps({ runId: event.runId, summary: event.summary });
        }
        drainExecutionQueueWhenIdle();
      } else if (event.type === "run.failed" && current.kind === "browse") {
        if (pendingVerifyAfterApply) {
          void finalizeVerifyAfterApplyRun({
            runId: event.runId,
            failed: true,
            summary: event.summary,
          });
        }
        set((s) => ({
          browser: {
            ...s.browser,
            running: false,
            lastError: event.summary,
            phase: undefined,
          },
        }));
        archiveBrowseRun("failed");
        drainExecutionQueueWhenIdle();
      }
    }

    // Ask terminal: finalize fold + clear streaming (Ask lives on the RunEvent bus).
    if (
      (event.type === "run.completed" ||
        event.type === "run.failed" ||
        event.type === "run.paused") &&
      (current.kind === "ask" || askFoldSession)
    ) {
      finalizeAskFold(askFoldSession, buildAskFoldDeps());
      askFoldSession = null;
      set({ agentStreaming: false });
      if (event.type === "run.failed") {
        clearFirstHourAutoHandoff();
        set({ firstHourScoutPending: false });
      }
      if (event.type === "run.completed") {
        swallowBackground("loadMe", get().loadMe());
        const pid = get().activeProjectId;
        if (pid) {
          void apiListAssets(get().settings, get().auth.authEnabled, pid)
            .then(({ assets }) => set({ serverAssets: assets }))
            .catch((err) => reportBackgroundError("apiListAssets", err, "debug"));
        }
      } else if (event.type === "run.paused") {
        appendEvent({ role: "system", kind: "status", text: "Stopped." });
      }
      if (current.kind === "ask") return;
    }

    // Mirror narration into conversation — tool/file steps live in execution feed.
    // Ask cards/tokens already folded from payload.streamEvent — skip duplicates.
    if (streamEvent && current.kind === "ask") {
      /* folded above */
    } else if (event.type === "agent.message" && event.summary) {
      const delta =
        typeof event.payload?.delta === "string" ? event.payload.delta : event.summary;
      const isStream = event.payload?.stream === true;
      if (isStream && (current.kind === "edit" || !current.kind)) {
        if (editStreamRunId !== event.runId) {
          editStreamRunId = event.runId;
          editStreamBubbleId = null;
        }
        if (!editStreamBubbleId) {
          editStreamBubbleId = appendEvent({ role: "agent", kind: "text", text: delta });
        } else {
          const prev = get().thread.find((x) => x.id === editStreamBubbleId)?.text ?? "";
          const next =
            delta.startsWith(prev) && delta.length > prev.length ? delta : prev + delta;
          patchEvent(editStreamBubbleId, { text: next });
        }
      } else {
        appendEvent({ role: "agent", kind: "text", text: event.summary });
      }
    } else if (event.type === "run.completed") {
      editStreamBubbleId = null;
      editStreamRunId = null;
      if (current.kind === "browse") {
        drainExecutionQueueWhenIdle();
      } else {
      const finishedEvents = get().run?.events ?? run.events;
      const patchCount = patchCountFromEvents(finishedEvents);
      if (get().wedgePhase === "ship" || get().firstHourActive) {
        recordExecutionMetricEvent("run_completed", {
          runId: event.runId,
          patchCount,
          success: patchCount > 0,
        });
        bumpShipPipeline("run.completed", { runId: event.runId, events: finishedEvents });
        if (patchCount > 0) {
          set({ canvas: { mode: "preview" } });
        }
      }
      const taskId = get().activePlanTaskId ?? current.planTaskId;
      if (taskId) {
        set({ activePlanTaskId: taskId });
        void settleActivePlanTaskAfterRun(
          taskId,
          get().run?.events ?? run.events,
          get().run?.serverRunId,
        );
      } else {
        appendEvent({ role: "system", kind: "status", text: "Run complete." });
        get().recordSessionOutcome({ kind: "run", label: current.goal.slice(0, 120) });
        void get().loadRunsArchive();
      }
      // Golden path bridge: edit run produced a preview → offer browser verification.
      const finished = get().run ?? run;
      if (
        finished?.kind !== "browse" &&
        !get().browser.running &&
        finished?.events.some((e) => e.type === "preview.ready")
      ) {
        const gateId = `browser-verify-${finished.runId}`;
        if (!get().feedItems.some((i) => i.id === gateId)) {
          get().appendFeedItem({
            id: gateId,
            ts: Date.now(),
            source: "system",
            category: "gate",
            title: "Verify in browser",
            summary: "Local preview is ready — open Computer Use to check the live page.",
            status: "waiting",
            canvasTarget: { mode: "browser", payload: { verify: "1" } },
          });
        }
      }
      drainExecutionQueueWhenIdle();
      }
    } else if (event.type === "run.failed") {
      editStreamBubbleId = null;
      editStreamRunId = null;
      if (get().wedgePhase === "ship" || get().firstHourActive) {
        const code = (event.payload as { code?: string } | undefined)?.code;
        const err =
          code ??
          (event.summary?.includes("NO_PATCHES") ? "NO_PATCHES" : event.summary ?? "FAILED");
        bumpShipPipeline("run.failed", { error: err });
      }
      if (current.kind === "browse") {
        /* handled in browse mirror block */
      } else {
      appendEvent({ role: "agent", kind: "error", text: event.summary ?? "Run failed." });
      const taskId = get().activePlanTaskId ?? current.planTaskId;
      if (taskId) {
        set({ activePlanTaskId: taskId });
        finalizeActivePlanTask("failed", { lastRunId: get().run?.serverRunId });
      }
      void get().loadRunsArchive();
      drainExecutionQueueWhenIdle();
      }
    } else if (event.type === "approval.required") {
      const p = event.payload as { approvalId?: string; intent?: string } | undefined;
      if (p?.approvalId && !hasThreadApproval(p.approvalId)) {
        appendEvent({
          role: "agent",
          kind: "approval",
          approvalId: p.approvalId,
          summary: p.intent ?? event.summary ?? event.title,
        });
      }
    } else if (
      event.type === "tool.started" ||
      event.type === "file.patch_created" ||
      event.type === "file.patch_updated" ||
      event.type === "preview.ready"
    ) {
      if (
        (event.type === "file.patch_created" || event.type === "file.patch_updated") &&
        (get().wedgePhase === "ship" || get().firstHourActive)
      ) {
        bumpShipPipeline("file.patch_created", {
          runId: event.runId,
          events: get().run?.events,
        });
      }
      if (event.type === "preview.ready" && (get().wedgePhase === "ship" || get().firstShipAt)) {
        recordExecutionMetricEvent("preview_ready");
        bumpShipPipeline("preview.ready");
      }
      const feedItem = runEventToFeedItem(event);
      if (feedItem) {
        appendEvent({
          role: "system",
          kind: "feed_link",
          text: event.title,
          feedItemId: feedItem.id,
        });
      }
    }
  };

  /** Correlate a browser-sandbox event into the active run's RunEvent stream. */
  const foldBrowserIntoRun = (input: {
    type: RunEvent["type"];
    title: string;
    status?: RunEvent["status"];
    summary?: string;
    payload?: Record<string, unknown>;
  }) => {
    const run = get().run;
    if (!run) return;
    const active =
      run.status === "running" || run.status === "planning" || run.status === "created";
    if (!active) return;
    const event: RunEvent = {
      seq: run.lastSeq + 1,
      id: makeEventId(),
      timestamp: new Date().toISOString(),
      runId: run.runId,
      ...input,
    };
    const { run: next } = applyRunEvent(run, event);
    set({ run: next });
    appendFeedFromRunEvent(event);
  };

  const FRAME_CAP = 24;
  const FRAME_KEEP_BASE64 = 8;
  let lastThreadFrameAt = 0;
  const pushFrameHistory = (entry: FrameHistoryEntry) =>
    set((s) => {
      const next = [...s.browser.frameHistory, entry];
      while (next.length > FRAME_CAP) next.shift();
      for (let i = 0; i < next.length - FRAME_KEEP_BASE64; i++) {
        if (next[i].pngBase64) next[i] = { ...next[i], pngBase64: undefined };
      }
      return { browser: { ...s.browser, frameHistory: next } };
    });

  const maybeAppendThreadFrame = (opts: {
    pngBase64: string;
    label: string;
    force?: boolean;
  }) => {
    const now = Date.now();
    if (!opts.force && now - lastThreadFrameAt < 3500) return;
    lastThreadFrameAt = now;
    // Keep thread light: store a downsized-feeling card (full PNG is fine for a few).
    appendEvent({
      role: "agent",
      kind: "browser_frame",
      text: opts.label,
      frame: opts.pngBase64,
    });
  };

  const browserSocket = new BrowserSocket((e) => {
    if (e.type === "frame") {
      pushFrameHistory({ pngBase64: e.pngBase64, url: e.url, action: e.action, ts: e.timestamp });
      const isFirstFrame = !get().browser.frame;
      set((s) => ({
        browser: {
          ...s.browser,
          prevFrame: s.browser.frame,
          frame: e.pngBase64,
          lastAction: e.action ?? s.browser.lastAction,
          actionVerb: e.actionVerb,
          cursor: e.cursor,
          bbox: e.bbox,
          url: e.url ?? s.browser.url,
          title: e.title ?? s.browser.title,
          step: e.step ?? s.browser.step,
          stepMax: e.stepMax ?? s.browser.stepMax,
          phase: e.phase ?? s.browser.phase,
        },
        // Keep browse runs on the Operator stage (don't drift to plan/research surfaces).
        ...(s.run?.kind === "browse" || s.browser.running
          ? { canvas: { mode: "browser" as const }, route: "workspace" as const }
          : {}),
      }));
      foldBrowserIntoRun({
        type: "browser.frame",
        title: e.action ?? e.url ?? "Browser frame",
        payload: {
          pngBase64: e.pngBase64,
          action: e.action,
          cursor: e.cursor,
          url: e.url,
        },
      });
      maybeAppendThreadFrame({
        pngBase64: e.pngBase64,
        label: e.action ?? (isFirstFrame ? "Live browser opened" : e.url ?? "Browser step"),
        force: isFirstFrame || !!e.action,
      });
    } else if (e.type === "status") {
      set((s) => ({
        browser: {
          ...s.browser,
          phase: e.phase ?? s.browser.phase,
          step: e.step ?? s.browser.step,
          stepMax: e.stepMax ?? s.browser.stepMax,
          lastStatus: e.message ?? s.browser.lastStatus,
        },
      }));
      if (e.message) {
        appendEvent({ role: "agent", kind: "status", text: e.message });
        foldBrowserIntoRun({ type: "agent.status", title: e.message });
      }
    } else if (e.type === "navigated") {
      set((s) => ({ browser: { ...s.browser, url: e.url, title: e.title } }));
      foldBrowserIntoRun({
        type: "browser.navigated",
        title: `Navigated to ${e.title || e.url}`,
        payload: { url: e.url, title: e.title },
      });
      appendEvent({
        role: "agent",
        kind: "status",
        text: `Navigated to ${e.title || e.url}`,
      });
    } else if (e.type === "finding") {
      set((s) => ({
        browser: { ...s.browser, findings: [...s.browser.findings, e.finding].slice(-50) },
      }));
      foldBrowserIntoRun({
        type: e.finding.severity === "info" || e.finding.severity === "low"
          ? "evidence.captured"
          : "issue.detected",
        status: e.finding.severity === "high" || e.finding.severity === "critical" ? "failed" : undefined,
        title: e.finding.title,
        summary: e.finding.evidence,
        payload: { finding: e.finding },
      });
      // Keep user on Operator during live CU — Research Map after the run ends.
      get().recordSessionOutcome({
        kind: "research",
        label: e.finding.title,
        channel: "browser",
        ref: `finding-${e.finding.id}`,
        detail: e.finding.evidence.slice(0, 280),
      });
    } else if (e.type === "approval_request") {
      set((s) => ({
        browser: { ...s.browser, pendingApprovalId: e.id, pendingSummary: e.summary },
        canvas: { mode: "browser" },
        route: "workspace",
        focusMode: true,
      }));
      if (!hasThreadApproval(e.id)) {
        appendEvent({ role: "agent", kind: "approval", approvalId: e.id, summary: e.summary });
      }
    } else if (e.type === "paused") {
      set((s) => ({ browser: { ...s.browser, paused: true } }));
    } else if (e.type === "resumed") {
      set((s) => ({ browser: { ...s.browser, paused: false } }));
    } else if (e.type === "done") {
      set((s) => ({ browser: { ...s.browser, running: false, phase: undefined } }));
      appendEvent({ role: "system", kind: "status", text: "Browser task complete." });
      foldBrowserIntoRun({
        type: "verification.completed",
        status: "success",
        title: "Browser verification complete",
      });
      const browseRunId = get().run?.kind === "browse" ? get().run?.runId : undefined;
      settleBrowserPlanTask(browseRunId);
      const lastTask = [...get().thread]
        .reverse()
        .find((t) => t.role === "user" && t.text?.startsWith("Browser task:"));
      const goal = lastTask?.text?.replace(/^Browser task:\s*/, "") ?? "Browser task";
      get().recordSessionOutcome({
        kind: "research",
        label: goal.slice(0, 120),
        channel: "browser",
        ref: `browser-task-${goal.slice(0, 48)}`,
      });
      if (get().browser.findings.length >= 2) {
        hintWorkSurface("research-map");
      }
      archiveBrowseRun("completed");
      drainExecutionQueueWhenIdle();
    } else if (e.type === "error") {
      // Single story: the Operator surface owns browser errors (with Retry);
      // the feed records it — no duplicate red row in chat.
      set((s) => ({
        browser: { ...s.browser, running: false, lastError: e.message },
        canvas: { mode: "browser" },
      }));
      foldBrowserIntoRun({
        type: "issue.detected",
        status: "failed",
        title: e.message,
        summary: e.message,
      });
      const browseRunId = get().run?.kind === "browse" ? get().run?.runId : undefined;
      finalizeActivePlanTask("failed", { lastRunId: browseRunId });
      archiveBrowseRun("failed");
      drainExecutionQueueWhenIdle();
    }
  });

  return {
    ready: false,
    initPhase: "boot",
    initError: undefined,
    version: "0.1.0",
    phase: "onboarding",
    route: "workspace",

    connection: { state: "unknown" },
    runtime: "local",
    capabilityMatrix: deriveMatrix({
      connectionState: "unknown",
      authEnabled: false,
      authState: "unknown",
    }),
    ideNotifications: [],
    localOnlyMode: false,
    planPreviewMode: false,
    settings: DEFAULT_SETTINGS,
    recents: [],

    auth: { state: "unknown", authEnabled: false },
    tierFeatures: undefined,
    tierLabel: undefined,
    authError: undefined,
    projects: [],
    sessions: [],
    sessionPreviews: {},
    sessionMessageCounts: {},
    serverAssets: [],
    activeProjectId: undefined,
    activeSessionId: undefined,

    historyOpen: false,
    sidebarTab:
      typeof localStorage !== "undefined" && localStorage.getItem(SIDEBAR_TAB_KEY) === "files"
        ? "files"
        : "context",

    project: null,
    scanning: false,

    plan: null,
    planLoading: false,
    planStatus: "",
    planError: null,
    planTaskStatus: {},
    activePlanTaskId: undefined,
    activePlanRowId: undefined,
    planProgress: null,
    highlightPlanTaskId: undefined,
    kpiLogDefaultPresetId: undefined,
    activePlaybookId: undefined,
    planGenerationPhase: "idle",
    planLoadingPlaybookIds: [],
    planStatusLog: [],
    planOutlinePlaybooks: [],
    planStreamingPlaybooks: [],
    planStreamingThesis: undefined,
    planStreamingNarrative: undefined,
    planStreamingReadiness: [],
    planJustGenerated: false,
    planMilestones: {},
    planDetailScrollNonce: 0,

    thread: [],
    agentStreaming: false,

    canvas: { mode: "empty" },
    browser: { running: false, autoApprove: false, findings: [], frameHistory: [] },
    run: null,
    executionQueue: [],
    outboxCount: 0,
    outboxFlushing: false,
    replayRun: null,
    runApplySelection: [],
    runsArchive: [],
    runsArchiveLoading: false,
    runsArchiveError: null,
    runsArchiveLoadedAt: 0,
    planHistory: [],
    planCompareBaseline: null,
    marketingProfile: null,

    paletteOpen: false,
    settingsOpen: false,
    focusMode: false,
    dismissedBrainQuestionIds: [],
    sessionLegacyMessageCount: 0,
    sessionOutcomes: [],
    scanProgress: undefined,
    scanError: undefined,
    sidebarCollapsed:
      typeof localStorage !== "undefined" && localStorage.getItem(SIDEBAR_KEY) === "1",

    composerMode:
      (typeof localStorage !== "undefined" &&
        (localStorage.getItem(COMPOSER_MODE_KEY) as ComposerMode | null)) ||
      DEFAULT_COMPOSER_MODE,
    composerDraft: "",
    composerFocusTick: 0,
    suggestedComposerMode: undefined,
    lastTurnReceipt: undefined,
    lastAskAssets: [],
    lastAnswerText: undefined,
    firstShipAt: undefined,
    firstHourActive: undefined,
    firstHourScoutPending: undefined,
    lastAgentUserMessage: undefined,
    pendingHandoffConfirm: undefined,
    warRoomExpanded: false,
    strategicIntakeOpen: false,
    week1BriefingOpen: false,
    launchReadinessOpen: false,
    measurementIntakeOpen: false,
    lastMorningBriefDayKey: undefined,
    morningUnlockToast: undefined,

    feedItems: [],
    feedFilter: "all",
    feedCollapsed:
      typeof localStorage === "undefined" || localStorage.getItem(FEED_COLLAPSED_KEY) !== "0",
    activeFeedItemId: undefined,
    executionRecordDetailTab: "record",
    executionHistoryExpanded: false,
    commandDockCollapsed: false,
    executionHeroExpanded: false,
    selectedRailSection: null,
    selectedRailEntityId: undefined,

    init: async () => {
      set({ initPhase: "settings", initError: undefined });
      try {
        const [settings, version, recents] = await withTimeout(
          Promise.all([
            window.api.settings.get(),
            window.api.app.version().catch(() => "0.1.0"),
            window.api.project.recents().catch(() => [] as RecentProject[]),
          ]),
          INIT_TIMEOUT_MS,
          "Loading settings",
        );
        setAnalyticsEnabled(settings.telemetry);
        initTheme(migrateTheme(settings.theme));
        set({ settings, version, recents, ready: true, initPhase: "resuming" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Startup failed";
        set({
          ready: true,
          initPhase: "error",
          initError: message,
          settings: DEFAULT_SETTINGS,
          version: "0.1.0",
          recents: [],
        });
        return;
      }

      if (!activeRunResumed) {
        activeRunResumed = true;
        try {
          const active = await withTimeout(
            window.api.agent.activeRun(),
            INIT_TIMEOUT_MS,
            "Resuming run",
          );
          if (active && !get().run) {
            let goal = "";
            let run: RunInfo = {
              runId: active.runId,
              goal: "",
              status: "running",
              events: [],
              lastSeq: 0,
              policy: DEFAULT_PERMISSION_POLICY,
              startedAt: Date.now(),
            };
            let hint: CanvasMode | undefined;
            for (const event of active.events) {
              if (
                !goal &&
                event.summary &&
                (event.type === "run.created" || event.type === "agent.message")
              ) {
                goal = event.summary;
              }
              const reduction = applyRunEvent(run, event);
              run = reduction.run;
              if (reduction.canvas) hint = reduction.canvas;
            }
            if (goal) run = { ...run, goal };
            if (!get().run) {
              set({ run, canvas: hint ? { mode: hint } : { mode: "run" } });
            }
          }
        } catch {
          /* best-effort resume */
        }
      }
      if (!runEventsBound) {
        runEventsBound = true;
        window.api.agent.onEvent((event) => ingestRunEvent(event));
        window.api.agent.onRunRegistered(({ localRunId, serverRunId }) => {
          const current = get().run;
          if (current?.runId === localRunId) {
            set({ run: { ...current, serverRunId } });
          }
        });
      }
      if (!authCallbackBound) {
        authCallbackBound = true;
        window.api.auth.onCallback((url) => {
          void get().handleAuthCallback(url);
        });
      }

      window.api.notifications.onUpdated((items) => {
        set({ ideNotifications: items });
      });
      void window.api.notifications.list().then((items) => set({ ideNotifications: items }));

      set({ initPhase: "connecting" });
      try {
        await withTimeout(get().initAuth(), INIT_TIMEOUT_MS, "Connecting");
      } catch {
        /* auth resolution is best-effort at startup */
      }

      // Returning-user fast path: restore the last project and skip onboarding.
      if (
        !get().project &&
        get().phase === "onboarding" &&
        (get().auth.state === "signed-in" || get().localOnlyMode)
      ) {
        try {
          const last = await window.api.cache.get<{
            profile: ProjectProfile;
            activeProjectId?: string;
          }>("lastProject");
          if (last?.profile) {
            set({
              project: last.profile,
              activeProjectId: last.activeProjectId,
              phase: "workspace",
              route: "workspace",
              restoredProjectName: last.profile.name,
            });
            if (last.activeProjectId) {
              swallowBackground("loadProjectData", get().loadProjectData(last.activeProjectId));
              swallowBackground(
                "loadMarketingProfile",
                get().loadMarketingProfile(last.activeProjectId),
              );
            }
            swallowBackground("loadRunsArchive", get().loadRunsArchive());
            swallowBackground("loadPlanHistory", get().loadPlanHistory());
          }
        } catch {
          /* cache unavailable — normal onboarding */
        }
      }

      set({ initPhase: "done" });
      if (!pollTimer) {
        pollTimer = setInterval(() => void get().checkConnection(), 20000);
      }

      try {
        const e2e = await window.api.app.e2e();
        if (e2e.fixturePath && !get().project) {
          if (!get().localOnlyMode) get().continueOffline();
          if (!get().settings.personaChosen) {
            await get().updateSettings({ persona: "marketing", personaChosen: true });
          }
          set({ e2eDryRunExecution: true });
          await get().openProject({ kind: "folder", path: e2e.fixturePath }, { workspace: true });
        }
      } catch {
        /* e2e bootstrap optional */
      }
    },

    recordSessionOutcome: (outcome) => {
      set((s) => {
        if (outcome.ref && s.sessionOutcomes.some((o) => o.ref === outcome.ref)) return s;
        const row: SessionOutcome = {
          ...outcome,
          id: crypto.randomUUID(),
          at: Date.now(),
        };
        const sessionOutcomes = [...s.sessionOutcomes, row].slice(-24);
        const projectId = s.activeProjectId ?? s.project?.id;
        if (projectId) persistSessionOutcomesLocal(projectId, sessionOutcomes);
        return { sessionOutcomes };
      });
    },

    appendEvent: (event) => appendEvent(event as Parameters<typeof appendEvent>[0]),

    initAuth: async () => {
      const { settings } = get();
      await get().checkConnection();
      const connection = get().connection;

      let config: ServerConfig;
      try {
        config = await fetchConfig(settings.serverUrl);
      } catch {
        set((s) => {
          const auth = { ...s.auth, state: "signed-out" as const, authEnabled: false };
          return {
            auth,
            // Let Connect onboarding offer preview-only — don't auto-skip setup.
            localOnlyMode: false,
            ...syncCapabilityFromState(connection, auth, false),
          };
        });
        return;
      }
      setAuthConfig(config);

      if (!config.authEnabled) {
        const signedIn = connection.state === "connected";
        set((s) => {
          const auth = {
            ...s.auth,
            state: signedIn ? ("signed-in" as const) : ("signed-out" as const),
            authEnabled: false,
          };
          const localOnlyMode = !signedIn;
          return {
            auth,
            localOnlyMode,
            ...syncCapabilityFromState(connection, auth, localOnlyMode),
          };
        });
        if (signedIn) swallowBackground("syncProjects", get().syncProjects());
        return;
      }

      const blob = await window.api.auth.getTokens();
      if (!blob || !blob.access_token) {
        set((s) => ({ auth: { ...s.auth, state: "signed-out", authEnabled: true } }));
        get().syncRuntimeCapability();
        return;
      }

      set((s) => ({
        auth: {
          ...s.auth,
          authEnabled: true,
          state: "signed-in",
          email: blob.email,
          user: { id: blob.userId, email: blob.email },
        },
      }));

      const validToken = await getValidAccessToken();
      if (!validToken) {
        await authSignOut();
        set({
          auth: { state: "signed-out", authEnabled: true },
          authError: "Your session expired. Please sign in again.",
        });
        return;
      }

      // Show cached projects immediately, then refresh in the background.
      const cached = await window.api.cache.get<ServerProject[]>("projects").catch(() => null);
      if (cached) set({ projects: cached });

      try {
        await get().loadMe();
        await get().syncProjects();
      } catch {
        // Token no longer valid → require sign-in again.
        await authSignOut();
        set({
          auth: { state: "signed-out", authEnabled: true },
          authError: "Your session expired. Please sign in again.",
          projects: [],
        });
      }
      get().syncRuntimeCapability();
    },

    sendSignInCode: async (email) => {
      const config = getAuthConfig();
      if (!config) {
        set((s) => ({ auth: { ...s.auth, error: "Server is not configured for sign-in." } }));
        return;
      }
      set((s) => ({ auth: { ...s.auth, state: "signing-in", email, error: undefined } }));
      try {
        await sendCode(config.supabaseUrl, config.supabaseAnonKey, email);
        set((s) => ({ auth: { ...s.auth, codeSent: true } }));
      } catch (err) {
        set((s) => ({ auth: { ...s.auth, error: errorMessage(err) } }));
      }
    },

    verifySignInCode: async (email, code) => {
      const config = getAuthConfig();
      if (!config) return;
      set((s) => ({ auth: { ...s.auth, error: undefined } }));
      try {
        const blob = await verifyCode(config.supabaseUrl, config.supabaseAnonKey, email, code);
        set((s) => ({
          auth: {
            ...s.auth,
            state: "signed-in",
            email: blob.email,
            user: { id: blob.userId, email: blob.email },
            codeSent: false,
          },
          authError: undefined,
        }));
        track("sign_in");
        try {
          await get().loadMe();
        } catch (err) {
          reportBackgroundError("loadMe", err, "warn");
        }
        swallowBackground("syncProjects", get().syncProjects());
      } catch (err) {
        set((s) => ({ auth: { ...s.auth, error: errorMessage(err) } }));
      }
    },

    signInWithGoogle: async () => {
      const config = getAuthConfig();
      if (!config) {
        set((s) => ({ auth: { ...s.auth, error: "Server is not configured for sign-in." } }));
        return;
      }
      set((s) => ({ auth: { ...s.auth, error: undefined, state: "signing-in" } }));
      try {
        await startGoogleOAuth(config.supabaseUrl, config.supabaseAnonKey);
      } catch (err) {
        set((s) => ({ auth: { ...s.auth, error: errorMessage(err), state: "signed-out" } }));
      }
    },

    handleAuthCallback: async (url) => {
      if (!url.startsWith("marketingide://")) return;
      const config = getAuthConfig();
      if (!config) return;
      try {
        const blob = await completeAuthFromCallbackUrl(
          url,
          config.supabaseUrl,
          config.supabaseAnonKey,
        );
        set((s) => ({
          auth: {
            ...s.auth,
            state: "signed-in",
            authEnabled: true,
            email: blob.email,
            user: { id: blob.userId, email: blob.email },
            codeSent: false,
            error: undefined,
          },
          authError: undefined,
        }));
        track("sign_in");
        try {
          await get().loadMe();
        } catch (err) {
          reportBackgroundError("loadMe", err, "warn");
        }
        swallowBackground("syncProjects", get().syncProjects());
      } catch (err) {
        set((s) => ({
          auth: { ...s.auth, state: "signed-out", error: errorMessage(err) },
        }));
      }
    },

    signOut: async () => {
      await authSignOut();
      browserSocket.stop();
      set((s) => ({
        auth: { state: "signed-out", authEnabled: s.auth.authEnabled },
        tierFeatures: undefined,
        tierLabel: undefined,
        projects: [],
        sessions: [],
        activeProjectId: undefined,
        activeSessionId: undefined,
        project: null,
        plan: null,
        planError: null,
        planStatus: "",
        planPreviewMode: false,
        thread: [],
        canvas: { mode: "empty" },
        phase: "onboarding",
      }));
    },

    loadMe: async () => {
      const { settings, auth } = get();
      try {
        const me = await apiGetMe(settings, auth.authEnabled);
        const usage = {
          plan: me.usage?.plan ?? 0,
          agent: me.usage?.agent ?? 0,
          browser_min: me.usage?.browser_min ?? 0,
          tokens_in: me.usage?.tokens_in ?? 0,
          tokens_out: me.usage?.tokens_out ?? 0,
          cost_cents: me.usage?.cost_cents ?? 0,
        };
        set((s) => ({
          auth: {
            ...s.auth,
            user: me.user,
            usage,
            quota: me.quota,
            billingConfigured: me.billingConfigured ?? false,
          },
          tierFeatures: me.features,
          tierLabel: me.tierLabel,
        }));
        void window.api.cache.set("me", me);
      } catch (err) {
        reportBackgroundError("loadMe", err, "warn");
        throw err;
      }
    },

    startCheckout: async (tier = "pro") => {
      const { settings, auth } = get();
      try {
        const { url } = await apiBillingCheckout(settings, auth.authEnabled, tier);
        await window.api.shell.openExternal(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("billing_not_configured")) {
          appendPresentedError(
            "Billing is not configured on this server. Add Stripe keys to server/.env.",
          );
        } else {
          appendPresentedError(msg);
        }
        throw err;
      }
    },

    openBillingPortal: async () => {
      const { settings, auth } = get();
      try {
        const { url } = await apiBillingPortal(settings, auth.authEnabled);
        await window.api.shell.openExternal(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("billing_not_configured") || msg.includes("no_stripe_customer")) {
          appendPresentedError(
            msg.includes("no_stripe_customer")
              ? "No billing account yet — upgrade to Pro first."
              : "Billing is not configured on this server.",
          );
        } else {
          appendPresentedError(msg);
        }
        throw err;
      }
    },

    syncProjects: async () => {
      const { settings, auth } = get();
      const { projects } = await apiListProjects(settings, auth.authEnabled);
      set({ projects });
      void window.api.cache.set("projects", projects);
    },

    syncSessions: async (projectId) => {
      const { settings, auth } = get();
      const { sessions } = await apiListSessions(settings, auth.authEnabled, projectId);
      set({ sessions });
    },

    loadSessionPreviews: async (sessionIds) => {
      const { settings, auth, sessionPreviews } = get();
      const todo = sessionIds.filter((id) => !sessionPreviews[id]);
      if (todo.length === 0) return;

      const updates: Record<string, string> = {};
      const countUpdates: Record<string, number> = {};
      await Promise.all(
        todo.slice(0, 12).map(async (id) => {
          try {
            const { messages } = await apiListMessages(settings, auth.authEnabled, id);
            if (messages.length === 0) return;
            countUpdates[id] = messages.length;
            const last = messages[messages.length - 1];
            const content = (last.content_json ?? {}) as { text?: string; summary?: string };
            const text =
              content.text?.trim() ||
              content.summary?.trim() ||
              (last.role === "user" ? "User message" : "Agent response");
            updates[id] = text.slice(0, 120);
          } catch {
            /* offline or unauthorized */
          }
        }),
      );

      if (Object.keys(updates).length > 0 || Object.keys(countUpdates).length > 0) {
        set((s) => ({
          sessionPreviews: { ...s.sessionPreviews, ...updates },
          sessionMessageCounts: { ...s.sessionMessageCounts, ...countUpdates },
        }));
      }
    },

    loadProjectData: async (projectId) => {
      try {
        await get().syncSessions(projectId);
        const { settings, auth } = get();
        const { assets } = await apiListAssets(settings, auth.authEnabled, projectId).catch(() => ({
          assets: [],
        }));
        set({ serverAssets: assets });
      } catch {
        return;
      }
      const latest = get().sessions[0];
      if (!latest) return;
      await get().resumeSession(latest.id);
    },

    openServerProject: async (project) => {
      browserSocket.stop();
      void window.api.cache.set("lastProject", {
        profile: profileFromServer(project),
        activeProjectId: project.id,
      });
      set({
        project: profileFromServer(project),
        activeProjectId: project.id,
        activeSessionId: undefined,
        phase: "reveal",
        route: "workspace",
        plan: null,
        planError: null,
        planStatus: "",
        planPreviewMode: false,
        thread: [],
        canvas: { mode: "empty" },
        runsArchive: [],
        planHistory: [],
        planCompareBaseline: null,
        replayRun: null,
      });
      track("project_open_server");
      const { settings, auth } = get();
      try {
        const { latest } = await apiListPlans(settings, auth.authEnabled, project.id);
        if (latest?.plan_json) {
          const normalized = normalizePlan(latest.plan_json as MarketingPlan) ?? latest.plan_json;
          set({
            plan: normalized,
            activePlanRowId: latest.id,
            planPreviewMode: false,
            canvas: { mode: "campaign-plan" },
            outboxCount: loadOutbox(project.id).length,
          });
          void get().loadPlanProgress(latest.id);
        }
      } catch {
        /* offline */
      }
      await get().loadProjectData(project.id);
      void get().loadMarketingProfile(project.id);
      void get().loadRunsArchive();
      void get().loadPlanHistory();
    },

    navigate: (route, settingsSection) => {
      set({
        route,
        ...(settingsSection && route === "settings" ? { settingsSection } : {}),
      });
      if (route === "runs") void get().loadRunsArchive();
    },

    setWorkspaceHandoff: (handoff) => set({ workspaceHandoff: handoff }),

    dismissWorkspaceHandoff: () => set({ workspaceHandoff: undefined }),

    loadMarketingProfile: async (projectId) => {
      const { settings, auth } = get();
      try {
        const res = await authedFetch(
          `${settings.serverUrl}/projects/${encodeURIComponent(projectId)}/marketing-profile`,
          {},
          { authEnabled: auth.authEnabled, apiToken: settings.apiToken },
        );
        if (!res.ok) {
          hydrateCampaignSessionLocal(projectId);
          hydrateOpsCadenceLocal(projectId);
          hydrateLaneBLocal(projectId);
          hydrateLaneALocal(projectId);
          hydrateContinuousLocal(projectId);
          hydrateGrowthMemoryLocal(projectId);
          hydrateBudgetPlanLocal(projectId);
          hydrateProductActivationLocal(projectId);
          hydrateLaneDLocal(projectId);
          hydrateRevenueProfileLocal(projectId);
          hydrateMonetizationWorkspaceLocal(projectId);
          hydrateStrategicIntakeLocal(projectId);
          hydrateDelegateLocal(projectId);
          hydrateGrowthPlaneLocal(projectId);
          hydrateDistributionOperatorLocal(projectId);
          hydrateInfluencerOperatorLocal(projectId);
          recomputeGrowthPlane();
          ensureChannelThesisAfterProfileLoad();
          return;
        }
        const profile = (await res.json()) as MarketingProfile;
        const { project } = get();
        let merged =
          project && (project.id === projectId || get().activeProjectId === projectId)
            ? profileFromProjectScan(project, profile)
            : profile;
        const hydratedMechanism = hydrateGrowthMechanismProfileFromJson(
          merged.growth_mechanism_profile,
        );
        if (hydratedMechanism) {
          merged = { ...merged, growth_mechanism_profile: hydratedMechanism };
        }
        const delResolved = resolveDelegateOperator(
          merged.delegate_operator ?? merged.lane_c_workspace,
          merged.channel_thesis,
        );
        set({
          marketingProfile: merged,
          channelThesis: merged.channel_thesis,
          opsCadence: merged.ops_cadence,
          laneAWorkspace: merged.lane_a_workspace,
          laneBWorkspace: merged.lane_b_workspace,
          cmoContinuous: merged.cmo_continuous,
          growthMemory: hydrateGrowthMemoryFromJson(merged.growth_memory, {
            projectId,
            thesisId: merged.channel_thesis?.id,
            legacyExperiments: merged.previous_experiments,
          }) ?? undefined,
          budgetPlan: hydrateBudgetPlanFromJson(merged.budget_plan) ?? undefined,
          productActivation: merged.product_activation,
          laneDWorkspace: hydrateLaneDWorkspaceFromJson(merged.lane_d_workspace) ?? undefined,
          revenueProfile: hydrateRevenueProfileFromJson(merged.revenue_profile) ?? undefined,
          monetizationWorkspace:
            hydrateMonetizationWorkspaceFromJson(merged.monetization_workspace) ?? undefined,
          delegateWorkspace: delResolved ?? undefined,
          delegateOperator: delResolved ?? undefined,
          growthControlPlane: merged.growth_control_plane,
          distributionOperator: merged.distribution_operator,
          influencerOperator: merged.influencer_operator,
        });
        persistStrategicIntakeLocal(projectId, merged);
        hydrateStrategicIntakeLocal(projectId);
        if (merged.campaign_session) {
          persistCampaignSessionLocal(projectId, merged.campaign_session);
        } else {
          hydrateCampaignSessionLocal(projectId);
        }
        if (merged.ops_cadence) {
          persistOpsCadenceLocal(projectId, merged.ops_cadence);
        } else {
          hydrateOpsCadenceLocal(projectId);
        }
        if (merged.lane_b_workspace) {
          persistLaneBLocal(projectId, merged.lane_b_workspace);
        } else {
          hydrateLaneBLocal(projectId);
        }
        if (merged.lane_a_workspace) {
          persistLaneALocal(projectId, merged.lane_a_workspace);
        } else {
          hydrateLaneALocal(projectId);
        }
        if (merged.cmo_continuous) {
          persistContinuousLocal(projectId, merged.cmo_continuous);
        } else {
          hydrateContinuousLocal(projectId);
        }
        const loadedMemory = hydrateGrowthMemoryFromJson(merged.growth_memory, {
          projectId,
          thesisId: merged.channel_thesis?.id,
          legacyExperiments: merged.previous_experiments,
        });
        if (loadedMemory) {
          persistGrowthMemoryLocal(projectId, loadedMemory);
        } else {
          hydrateGrowthMemoryLocal(projectId);
        }
        if (merged.budget_plan) {
          persistBudgetPlanLocal(projectId, merged.budget_plan);
        } else {
          hydrateBudgetPlanLocal(projectId);
        }
        if (merged.product_activation) {
          persistProductActivationLocal(projectId, merged.product_activation);
        } else {
          hydrateProductActivationLocal(projectId);
        }
        if (merged.lane_d_workspace) {
          persistLaneDLocal(projectId, merged.lane_d_workspace);
        } else {
          hydrateLaneDLocal(projectId);
        }
        if (merged.revenue_profile) {
          persistRevenueProfileLocal(projectId, merged.revenue_profile);
        } else {
          hydrateRevenueProfileLocal(projectId);
        }
        if (merged.monetization_workspace) {
          persistMonetizationWorkspaceLocal(projectId, merged.monetization_workspace);
        } else {
          hydrateMonetizationWorkspaceLocal(projectId);
        }
        if (delResolved) {
          persistDelegateLocal(projectId, delResolved);
        } else {
          hydrateDelegateLocal(projectId);
        }
        if (merged.growth_control_plane) {
          persistGrowthPlaneLocal(projectId, merged.growth_control_plane);
        } else {
          hydrateGrowthPlaneLocal(projectId);
        }
        if (merged.distribution_operator) {
          persistDistributionOperatorLocal(projectId, merged.distribution_operator);
        } else {
          hydrateDistributionOperatorLocal(projectId);
        }
        if (merged.influencer_operator) {
          persistInfluencerOperatorLocal(projectId, merged.influencer_operator);
        } else {
          hydrateInfluencerOperatorLocal(projectId);
        }
        recomputeGrowthPlane();
        ensureChannelThesisAfterProfileLoad();
        const oi = merged.outreach_integrations;
        if (oi && (oi.webhook_url || oi.webhook_provider)) {
          const { settings } = get();
          void get().updateSettings({
            outreachWebhookUrl: oi.webhook_url ?? settings.outreachWebhookUrl,
            outreachWebhookProvider: oi.webhook_provider ?? settings.outreachWebhookProvider,
          });
        }
        get().refreshConnectorFeed();
        get().checkMorningDayUnlock();
      } catch {
        hydrateCampaignSessionLocal(projectId);
        hydrateOpsCadenceLocal(projectId);
        hydrateLaneBLocal(projectId);
        hydrateLaneALocal(projectId);
        hydrateContinuousLocal(projectId);
        hydrateGrowthMemoryLocal(projectId);
        hydrateBudgetPlanLocal(projectId);
        hydrateProductActivationLocal(projectId);
        hydrateLaneDLocal(projectId);
        hydrateRevenueProfileLocal(projectId);
        hydrateMonetizationWorkspaceLocal(projectId);
        hydrateStrategicIntakeLocal(projectId);
        hydrateDelegateLocal(projectId);
        hydrateGrowthPlaneLocal(projectId);
        hydrateDistributionOperatorLocal(projectId);
        hydrateInfluencerOperatorLocal(projectId);
        recomputeGrowthPlane();
        ensureChannelThesisAfterProfileLoad();
        get().checkMorningDayUnlock();
        /* offline / persistence off — UI just shows defaults */
      }
    },

    updateMarketingProfile: async (patch) => {
      const { settings, auth, activeProjectId, marketingProfile } = get();
      // Optimistic local merge first so MissingInfoCard collapses immediately.
      if (marketingProfile) {
        set({ marketingProfile: { ...marketingProfile, ...patch } });
      }
      if (!activeProjectId) return;
      try {
        const res = await authedFetch(
          `${settings.serverUrl}/projects/${encodeURIComponent(activeProjectId)}/marketing-profile`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patch }),
          },
          { authEnabled: auth.authEnabled, apiToken: settings.apiToken },
        );
        if (res.ok) {
          const profile = (await res.json()) as MarketingProfile;
          const hydratedMechanism = hydrateGrowthMechanismProfileFromJson(
            profile.growth_mechanism_profile,
          );
          const merged = hydratedMechanism
            ? { ...profile, growth_mechanism_profile: hydratedMechanism }
            : profile;
          set({ marketingProfile: merged });
          if (merged.channel_thesis) {
            set({ channelThesis: merged.channel_thesis });
          }
          recomputeGrowthPlane();
          if (profile.campaign_session) {
            persistCampaignSessionLocal(activeProjectId, profile.campaign_session);
          }
        }
      } catch {
        /* keep optimistic state */
      }
    },

    startCampaignSession: (opts) => {
      const { activeProjectId, project, settings, marketingProfile } = get();
      const projectId = activeProjectId ?? project?.id;
      if (!projectId) return;
      const existing = marketingProfile?.campaign_session;
      if (existing && existing.projectId === projectId) return;
      const session = createCampaignSession({
        projectId,
        persona: settings.persona,
        planHorizon: settings.planHorizon,
        goal: opts?.goal,
      });
      get().persistCampaignSession(session);
    },

    persistCampaignSession: (session) => {
      persistCampaignSessionLocal(session.projectId, session);
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      set({ marketingProfile: { ...profile, campaign_session: session } });
      void get().updateMarketingProfile({ campaign_session: session });
    },

    advanceCampaignPhase: (event) => {
      const { marketingProfile, activeProjectId, project } = get();
      const projectId = activeProjectId ?? project?.id;
      if (!projectId) return;
      let session = marketingProfile?.campaign_session;
      if (!session || session.projectId !== projectId) {
        get().startCampaignSession();
        session = get().marketingProfile?.campaign_session;
      }
      if (!session) return;
      const next = applyCampaignPhaseEvent(session, event);
      if (next === session) return;
      get().persistCampaignSession(next);
      if (
        event.type === "log_kpi" ||
        (event.type === "task_done" && event.allTasksDone)
      ) {
        queueMicrotask(() => get().requestProactiveSuggestion("measuring_phase"));
      }
    },

    registerCampaignRun: (runId, taskId) => {
      const session = get().marketingProfile?.campaign_session;
      if (!session || !runId) return;
      const next = appendCampaignRun(session, runId, taskId);
      if (next === session) return;
      get().persistCampaignSession(next);
    },

    registerCampaignAsset: (assetId) => {
      const session = get().marketingProfile?.campaign_session;
      if (!session || !assetId) return;
      const next = appendCampaignAsset(session, assetId);
      if (next === session) return;
      get().persistCampaignSession(next);
    },

    markExperimentOutcome: async (experimentId, payload) => {
      const { settings, auth, activeProjectId, marketingProfile } = get();
      if (!activeProjectId || !marketingProfile) return;
      if (marketingProfile) {
        set({
          marketingProfile: {
            ...marketingProfile,
            previous_experiments: marketingProfile.previous_experiments.map((e) =>
              e.id === experimentId ? { ...e, ...payload } : e,
            ),
          },
        });
      }
      try {
        const res = await authedFetch(
          `${settings.serverUrl}/projects/${encodeURIComponent(activeProjectId)}/marketing-profile/experiments/${encodeURIComponent(experimentId)}/outcome`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          { authEnabled: auth.authEnabled, apiToken: settings.apiToken },
        );
        if (res.ok) {
          const profile = (await res.json()) as MarketingProfile;
          set({ marketingProfile: profile });
        }
      } catch {
        /* keep optimistic */
      }
    },

    recordExperimentFromConversation: async (experimentId) => {
      const { settings, auth, activeProjectId, marketingProfile, run, thread, plan } = get();
      const pid = activeProjectId ?? get().project?.id;
      if (!pid || !marketingProfile) {
        appendEvent({ role: "system", kind: "error", text: "Open a project to record experiments." });
        return;
      }

      const lastDecision = [...thread]
        .reverse()
        .find((e) => e.kind === "decision" && e.decision)?.decision;
      const changedFiles = run ? runChangedFiles(run.events) : [];
      const ga4Metrics = marketingProfile.connector_snapshots?.ga4?.metrics ?? [];
      const conversions = ga4Metrics.find((m) => m.name === "conversions");

      const exp: MarketingProfile["previous_experiments"][number] = {
        id: experimentId ?? `exp_${Date.now().toString(36)}`,
        date: new Date().toISOString(),
        hypothesis:
          lastDecision?.decision ??
          run?.goal?.slice(0, 200) ??
          plan?.thesis?.slice(0, 200) ??
          "Launch experiment",
        discipline: lastDecision ? "measurement" : "launch",
        outcome: "pending",
        metric: lastDecision?.success_metric
          ? { name: lastDecision.success_metric.name, value: conversions?.value ?? 0 }
          : conversions
            ? { name: "conversions", value: conversions.value }
            : undefined,
        evidence_urls: changedFiles,
        learning:
          changedFiles.length > 0
            ? `Evidence from last run: ${changedFiles.join(", ")}`
            : undefined,
      };

      set({
        marketingProfile: {
          ...marketingProfile,
          previous_experiments: [
            ...marketingProfile.previous_experiments.filter((e) => e.id !== exp.id),
            exp,
          ],
        },
      });

      try {
        const res = await authedFetch(
          `${settings.serverUrl}/projects/${encodeURIComponent(pid)}/marketing-profile/experiments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(exp),
          },
          { authEnabled: auth.authEnabled, apiToken: settings.apiToken },
        );
        if (res.ok) {
          const profile = (await res.json()) as MarketingProfile;
          set({ marketingProfile: profile });
        }
      } catch {
        /* keep optimistic */
      }

      get().registerCampaignAsset(exp.id);
      set({ route: "workspace" });
      get().setWorkSurface("experiment", { experimentId: exp.id });
      get().setActiveCanvas("experiment");
      appendEvent({
        role: "system",
        kind: "status",
        text: "Experiment recorded — review outcome and metrics on the experiment surface.",
      });
    },

    upsertManualKpi: async (kpi) => {
      const { settings, auth, activeProjectId, project, marketingProfile } = get();
      const pid = activeProjectId ?? project?.id;
      if (!pid) return false;
      if (!activeProjectId && project?.id) {
        set({ activeProjectId: project.id });
      }
      const base = marketingProfile ?? emptyMarketingProfile();
      const merged = [...(base.manual_kpis ?? []).filter((k) => k.id !== kpi.id), kpi];
      set({ marketingProfile: { ...base, manual_kpis: merged } });
      try {
        const res = await authedFetch(
          `${settings.serverUrl}/projects/${encodeURIComponent(pid)}/marketing-profile/kpis/${encodeURIComponent(kpi.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(kpi),
          },
          { authEnabled: auth.authEnabled, apiToken: settings.apiToken },
        );
        if (res.ok) {
          const profile = (await res.json()) as MarketingProfile;
          set({ marketingProfile: profile });
        }
      } catch {
        /* keep optimistic local entry */
      }
      recomputeGrowthPlane();
      return true;
    },

    deleteManualKpi: async (kpiId) => {
      const { settings, auth, activeProjectId, marketingProfile } = get();
      if (!activeProjectId || !marketingProfile) return;
      set({
        marketingProfile: {
          ...marketingProfile,
          manual_kpis: (marketingProfile.manual_kpis ?? []).filter((k) => k.id !== kpiId),
        },
      });
      try {
        const res = await authedFetch(
          `${settings.serverUrl}/projects/${encodeURIComponent(activeProjectId)}/marketing-profile/kpis/${encodeURIComponent(kpiId)}`,
          { method: "DELETE" },
          { authEnabled: auth.authEnabled, apiToken: settings.apiToken },
        );
        if (res.ok) {
          const profile = (await res.json()) as MarketingProfile;
          set({ marketingProfile: profile });
        }
      } catch {
        /* keep optimistic */
      }
    },

    checkConnection: async () => {
      const wasConnected = get().connection.state === "connected";
      set((s) => ({ connection: { ...s.connection, state: "checking" } }));
      const health = await checkHealth(get().settings);
      if (health?.ok) {
        set(() => ({
          connection: {
            state: "connected",
            providers: health.providers,
            connectors: health.connectors,
          },
        }));
        if (!wasConnected) void get().flushMessageOutbox();
      } else {
        set({ connection: { state: "error" } });
      }
      get().syncRuntimeCapability();
    },

    syncRuntimeCapability: () => {
      const { connection, auth, localOnlyMode } = get();
      set(syncCapabilityFromState(connection, auth, localOnlyMode));
    },

    openConnectFlow: () => {
      const { auth, phase, settingsOpen, capabilityMatrix } = get();
      if (settingsOpen) get().toggleSettings(false);

      const fix =
        capabilityMatrix.caps.auth.fix?.action === "signin"
          ? capabilityMatrix.caps.auth.fix
          : capabilityMatrix.caps.anthropic.state !== "ready"
            ? capabilityMatrix.caps.anthropic.fix
            : capabilityMatrix.caps.backend.fix;

      // During onboarding/reveal, open connection setup without discarding scan progress.
      if (phase !== "workspace") {
        set({ settingsSection: "connection" });
        get().toggleSettings(true);
        if (fix?.action === "signin" || (auth.authEnabled && auth.state !== "signed-in")) {
          appendEvent({
            role: "system",
            kind: "status",
            text: "Sign in from Connection to enable AI features.",
          });
        }
        return;
      }

      if (fix?.action === "signin" || (auth.authEnabled && auth.state !== "signed-in")) {
        get().navigate("settings", "connection");
        appendEvent({
          role: "system",
          kind: "status",
          text: "Sign in from Settings → Connection to enable AI features.",
        });
        return;
      }
      get().navigate("settings", "connection");
    },

    dismissIdeNotification: (id) => {
      void window.api.notifications.dismiss(id);
      set((s) => ({
        ideNotifications: s.ideNotifications.filter((n) => n.id !== id),
      }));
    },

    beginFirstHour: () => {
      const { project, runtime } = get();
      if (!project) return;
      clearFirstHourAutoHandoff();
      track("begin_first_hour");
      set({
        phase: "workspace",
        route: "workspace",
        workspaceHandoff: undefined,
        firstHourScoutPending: false,
      });
      get().setWorkSurface("campaign-plan");
      get().setActiveCanvas("campaign-plan");
      if (runtime === "connected") {
        void get().generatePlan();
      } else {
        get().previewPlanOutline();
      }
    },

    beginFirstHourWow: () => {
      const { project, runtime } = get();
      if (!project) return;
      const target = resolveFirstShipTarget(project);
      clearFirstHourAutoHandoff();
      track("begin_first_hour_wow");
      const scout = canRunAgent(runtime);
      set({
        phase: "workspace",
        route: "workspace",
        workspaceHandoff: undefined,
        firstHourActive: true,
        firstHourScoutPending: scout,
      });
      get().setActiveCanvas("run");

      if (scout) {
        void get().sendMessage(target.scoutPrompt);
        return;
      }

      const resolved = resolveIntent({
        uiIntent: { kind: "start_edit_run", goal: target.editGoal },
        message: target.editGoal,
        plan: get().plan ? normalizePlan(get().plan) : null,
        planProgress: get().planProgress,
      });
      if (resolved) {
        get().executeIntent(resolved.intent, { skipConfirm: true });
      } else {
        void get().startRun(target.editGoal);
      }
    },

    setOnboardingTrack: (onboardingTrack) => {
      const projectId = get().activeProjectId ?? get().project?.id;
      if (projectId) persistOnboardingTrack(projectId, onboardingTrack);
      set({ onboardingTrack });
      track("onboarding_track_set", { track: onboardingTrack });
    },

    beginQuickStartShip: (opts) => {
      const { project } = get();
      if (!project) return;
      const target = resolveFirstShipTarget(project);
      const skipScout = opts?.skipScout ?? get().onboardingTrack !== "full_cmo";

      void (async () => {
        let snapshot = get().firstShipSnapshot;
        if (!snapshot) {
          try {
            const cwd =
              project.source.kind === "folder" ? project.source.path : project.localPath;
            snapshot = await captureFirstShipSnapshotFromProject(project, async (relPath) => {
              if (!cwd) throw new Error("no cwd");
              return window.api.fs.read(cwd, relPath);
            });
            set({ firstShipSnapshot: snapshot });
          } catch {
            snapshot = { capturedAt: Date.now(), heroPath: target.heroPath };
            set({ firstShipSnapshot: snapshot });
          }
        }

        recordExecutionMetricEvent("quick_start_begin");
        bumpShipPipeline("run.started");

        set({
          onboardingTrack: get().onboardingTrack ?? "quick_start",
          wedgePhase: "ship",
          shipRecovery: undefined,
          shipPipeline: { stage: "run", patchCount: 0, updatedAt: Date.now() },
        });

        track("quick_start_ship_begin", { heroPath: target.heroPath });

        if (skipScout && canRunAgent(get().runtime)) {
          clearFirstHourAutoHandoff();
          const goal = opts?.goalOverride ?? target.editGoal;
          set({
            phase: "workspace",
            route: "workspace",
            workspaceHandoff: undefined,
            firstHourActive: true,
            firstHourScoutPending: false,
          });
          get().setActiveCanvas("run");
          recordExecutionMetricEvent("run_started");
          const resolved = resolveIntent({
            uiIntent: { kind: "start_edit_run", goal },
            message: goal,
            plan: get().plan ? normalizePlan(get().plan) : null,
            planProgress: get().planProgress,
          });
          if (resolved) {
            get().executeIntent(resolved.intent, { skipConfirm: true });
          } else {
            void get().startRun(goal, undefined, {
              skills: ["landing-page-conversion", "seo-content-engine"],
              guaranteedShip: true,
            });
          }
          return;
        }

        get().beginFirstHourWow();
      })();
    },

    retryQuickStartShip: (goalOverride) => {
      set({ shipRecovery: undefined, shipPipeline: initialShipPipelineState() });
      get().beginQuickStartShip({ skipScout: true, goalOverride });
    },

    promptApplyFirstChange: () => {
      const { run } = get();
      if (!run?.runId) {
        get().beginQuickStartShip({ skipScout: true });
        return;
      }
      const files = runChangedFiles(run.events);
      if (files.length === 0) return;
      set({ canvas: { mode: "preview" }, shipPipeline: { ...get().shipPipeline!, stage: "apply" } });
      void get().applyRunChanges(files);
    },

    beginFirstShip: () => {
      const { project } = get();
      if (!project) return;
      const target = resolveFirstShipTarget(project);
      track("begin_first_ship");
      set({
        phase: "workspace",
        route: "workspace",
        workspaceHandoff: undefined,
        firstHourActive: true,
        warRoomExpanded: false,
      });
      get().setActiveCanvas("run");
      const resolved = resolveIntent({
        uiIntent: { kind: "start_edit_run", goal: target.editGoal },
        message: target.editGoal,
        plan: get().plan ? normalizePlan(get().plan) : null,
        planProgress: get().planProgress,
      });
      if (resolved) {
        get().executeIntent(resolved.intent, { skipConfirm: true });
      } else {
        void get().startRun(target.editGoal);
      }
    },

    runCmoIntake: () => {
      const { project, settings, marketingProfile } = get();
      if (!project) return null;
      const profile = marketingProfile ?? emptyMarketingProfile();
      const lockedThesis =
        isStrategicDecisionSealed(profile) ||
        Boolean(profile.ops_cadence) ||
        (profile.channel_thesis && profile.channel_thesis.draft === false);
      if (lockedThesis && profile.channel_thesis) {
        set({
          channelThesis: profile.channel_thesis,
          marketingProfile: { ...profile, channel_thesis: profile.channel_thesis },
        });
        recomputeGrowthPlane();
        return profile.channel_thesis;
      }
      const thesis = buildCmoIntake({
        project,
        persona: settings.persona,
        profile,
        draft: true,
      });
      track("cmo_intake", { thesis_id: thesis.id, verdict: thesis.verdict });
      set({
        channelThesis: thesis,
        marketingProfile: { ...profile, channel_thesis: thesis },
      });
      if (!isStrategicDecisionSealed(profile) && !profile.ops_cadence) {
        void get().updateMarketingProfile({ channel_thesis: thesis });
      }
      recomputeGrowthPlane();
      return thesis;
    },

    saveFounderFit: (founderFit) => {
      const error = validateFounderFit(founderFit);
      if (error) {
        appendEvent({ role: "system", kind: "status", text: error });
        return;
      }
      const projectId = get().activeProjectId ?? get().project?.id;
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      const next = {
        ...profile,
        founder_fit: founderFit,
        public_presence_policy: undefined,
        growth_mechanism_profile: undefined,
        growth_narrative: undefined,
        strategic_decision: undefined,
      };
      set({ marketingProfile: next, strategicIntakeOpen: true });
      if (projectId) {
        clearStrategicIntakeLocal(projectId, ["presence", "mechanism", "narrative", "decision"]);
        persistStrategicIntakeLocal(projectId, next);
      }
      void get().updateMarketingProfile({
        founder_fit: founderFit,
        public_presence_policy: undefined,
        growth_mechanism_profile: undefined,
        growth_narrative: undefined,
        strategic_decision: undefined,
      });
      track("founder_fit_complete", {
        brand_face_readiness: founderFit.brand_face_readiness,
        weekly_marketing_hours: founderFit.weekly_marketing_hours,
      });
    },

    savePublicPresencePolicy: (policy) => {
      const { project, marketingProfile } = get();
      const founderFit = marketingProfile?.founder_fit;
      if (!project || !founderFit) return;
      const growthMechanismProfile = buildGrowthMechanismProfile({
        project,
        profile: marketingProfile,
        founderFit,
        presence: policy,
      });
      const next = {
        ...(marketingProfile ?? emptyMarketingProfile()),
        public_presence_policy: policy,
        growth_mechanism_profile: growthMechanismProfile,
        strategic_decision: undefined,
        growth_narrative: undefined,
      };
      set({ marketingProfile: next, strategicIntakeOpen: true });
      const projectId = get().activeProjectId ?? project.id;
      clearStrategicIntakeLocal(projectId, ["narrative", "decision"]);
      persistStrategicIntakeLocal(projectId, next);
      void get().updateMarketingProfile({
        public_presence_policy: policy,
        growth_mechanism_profile: growthMechanismProfile,
        strategic_decision: undefined,
        growth_narrative: undefined,
      });
      track("public_presence_saved", {
        reputational_risk: policy.reputational_risk,
        founder_allowed: policy.founder.allowed,
      });
      get().runStrategicIntake();
    },

    runStrategicIntake: () => {
      const { project, marketingProfile, channelThesis } = get();
      const founderFit = marketingProfile?.founder_fit;
      const presence = marketingProfile?.public_presence_policy;
      const baseline = channelThesis ?? marketingProfile?.channel_thesis;
      if (
        !project ||
        !founderFit ||
        !baseline ||
        !presence?.configured_at ||
        validateFounderFit(founderFit)
      ) {
        return null;
      }
      const narrative = synthesizeGrowthNarrative({
        project,
        profile: marketingProfile,
        founderFit,
      });
      const growthMechanismProfile =
        marketingProfile?.growth_mechanism_profile ??
        buildGrowthMechanismProfile({
          project,
          profile: marketingProfile,
          founderFit,
          presence,
        });
      const decision = buildStrategicDecision({
        project,
        profile: { ...marketingProfile, public_presence_policy: presence },
        founderFit,
        narrative,
        baselineThesis: baseline,
      });
      const profile = marketingProfile ?? emptyMarketingProfile();
      const next = {
        ...profile,
        founder_fit: founderFit,
        public_presence_policy: presence,
        growth_mechanism_profile: growthMechanismProfile,
        growth_narrative: narrative,
        strategic_decision: decision,
      };
      set({ marketingProfile: next, strategicIntakeOpen: true });
      const projectId = get().activeProjectId ?? project.id;
      persistStrategicIntakeLocal(projectId, next);
      void get().updateMarketingProfile({
        founder_fit: founderFit,
        public_presence_policy: presence,
        growth_mechanism_profile: growthMechanismProfile,
        growth_narrative: narrative,
        strategic_decision: decision,
      });
      track("strategic_intake_generated", {
        baseline_thesis_id: baseline.id,
        recommended_option_id: decision.recommended_id,
      });
      return decision;
    },

    selectStrategicOption: (id) => {
      const profile = get().marketingProfile;
      const decision = profile?.strategic_decision;
      const selected = decision?.options.find((option) => option.id === id);
      if (!profile || !decision || !selected?.eligible || decision.sealed_at) return;
      const nextDecision = { ...decision, selected_id: id };
      const next = { ...profile, strategic_decision: nextDecision };
      set({ marketingProfile: next });
      const projectId = get().activeProjectId ?? get().project?.id;
      if (projectId) persistStrategicIntakeLocal(projectId, next);
      void get().updateMarketingProfile({ strategic_decision: nextDecision });
    },

    sealStrategicDecision: (selectedId) => {
      const { project, settings, marketingProfile } = get();
      const decision = marketingProfile?.strategic_decision;
      const founderFit = marketingProfile?.founder_fit;
      const narrative = marketingProfile?.growth_narrative;
      if (!project || !marketingProfile || !decision || !founderFit || !narrative) return false;
      const id = selectedId ?? decision.selected_id ?? decision.recommended_id;
      const sealed = sealStrategicDecisionCore(decision, id);
      if (!sealed.sealed_at) return false;
      const selected = sealed.options.find((option) => option.id === sealed.selected_id);
      if (!selected) return false;
      const mechanismId = selected.primary_mechanism_id;
      const growthMechanismProfile =
        marketingProfile.growth_mechanism_profile ??
        (mechanismId
          ? buildGrowthMechanismProfile({
              project,
              profile: marketingProfile,
              founderFit,
              presence: marketingProfile.public_presence_policy,
            })
          : undefined);
      const sealedSecondary =
        growthMechanismProfile?.secondary_mechanism_id ??
        growthMechanismProfile?.assessment.secondary;
      const thesis = buildFinalChannelThesis({
        project,
        persona: settings.persona,
        profile: marketingProfile,
        founder_fit: founderFit,
        selected_option: selected,
        narrative,
        primary_mechanism_id: mechanismId,
        secondary_mechanism_id: sealedSecondary,
      });
      const syncedMechanismProfile = growthMechanismProfile
        ? {
            ...growthMechanismProfile,
            primary_mechanism_id: mechanismId ?? growthMechanismProfile.primary_mechanism_id,
            secondary_mechanism_id: sealedSecondary,
            assessment: {
              ...growthMechanismProfile.assessment,
              primary: mechanismId ?? growthMechanismProfile.assessment.primary,
              secondary: sealedSecondary,
            },
          }
        : undefined;
      const next = {
        ...marketingProfile,
        strategic_decision: sealed,
        channel_thesis: thesis,
        growth_mechanism_profile: syncedMechanismProfile,
      };
      set({
        marketingProfile: next,
        channelThesis: thesis,
        strategicIntakeOpen: false,
        week1BriefingOpen: true,
      });
      const projectId = get().activeProjectId ?? project.id;
      persistStrategicIntakeLocal(projectId, next);
      void get().updateMarketingProfile({
        strategic_decision: sealed,
        channel_thesis: thesis,
        growth_mechanism_profile: next.growth_mechanism_profile,
      });
      track("strategic_decision_sealed", {
        option_id: selected.id,
        thesis_id: selected.thesis_id,
      });
      appendEvent({
        role: "system",
        kind: "status",
        text: `Strategic contract sealed — Option ${selected.id}. Complete setup, then start Week 1.`,
      });
      recomputeGrowthPlane();
      return true;
    },

    openStrategicIntake: () => set({ strategicIntakeOpen: true }),
    closeStrategicIntake: () => set({ strategicIntakeOpen: false }),
    openWeek1Briefing: () => set({ week1BriefingOpen: true }),
    closeWeek1Briefing: () => set({ week1BriefingOpen: false }),
    openLaunchReadiness: () => set({ launchReadinessOpen: true }),
    closeLaunchReadiness: () => set({ launchReadinessOpen: false }),
    openMeasurementIntake: () => set({ measurementIntakeOpen: true }),
    closeMeasurementIntake: () => set({ measurementIntakeOpen: false }),
    acknowledgeMeasurementBaseline: (note) => {
      const profile = get().marketingProfile ?? emptyMarketingProfile();
      const next = {
        ...profile,
        measurement_ack: {
          acknowledged_at: new Date().toISOString(),
          note: note?.trim() || undefined,
        },
      };
      set({ marketingProfile: next, measurementIntakeOpen: false });
      void get().updateMarketingProfile({ measurement_ack: next.measurement_ack });
      appendEvent({
        role: "system",
        kind: "status",
        text: "Manual KPI logging acknowledged — log outcomes in week review.",
      });
    },

    saveBudgetPlan: (monthlyAmountUsd, cpaCeilingUsd) => {
      const profile = get().marketingProfile;
      const thesis = get().channelThesis ?? profile?.channel_thesis;
      const founderFit = profile?.founder_fit;
      if (!thesis || !founderFit) return false;
      if (monthlyAmountUsd != null && (!Number.isFinite(monthlyAmountUsd) || monthlyAmountUsd < 0)) {
        return false;
      }
      const built = buildBudgetAllocation(thesis, founderFit, {
        monthlyAmountUsd,
        cpaCeilingUsd,
      });
      const seeded = seedActionCosts(built, {
        laneB: get().laneBWorkspace ?? profile?.lane_b_workspace,
        laneC: profile?.lane_c_workspace,
        distribution: get().distributionOperator ?? profile?.distribution_operator,
        influencer: get().influencerOperator ?? profile?.influencer_operator,
        delegate: get().delegateOperator ?? profile?.delegate_operator,
        cadence: get().opsCadence ?? profile?.ops_cadence,
      });
      syncBudgetPlanState(seeded);
      track("budget_plan_saved", {
        monthly_amount_usd: seeded.monthly_amount_usd,
        amount_confidence: seeded.amount_confidence,
      });
      return true;
    },

    saveProductActivation: (input) => {
      const { project, marketingProfile } = get();
      if (!project) return false;
      if (!input.activation_event_label?.trim() && !marketingProfile?.founder_fit?.magic_moment) {
        return false;
      }
      const built = buildProductActivationProfile({
        founderFit: marketingProfile?.founder_fit,
        manualKpis: marketingProfile?.manual_kpis,
        scan: project,
        existing: {
          ...(get().productActivation ?? marketingProfile?.product_activation),
          ...input,
        },
      });
      syncProductActivationState(built);
      track("product_activation_saved", {
        confidence: built.confidence,
        has_activation_rate: built.activation_rate_pct != null,
        has_ttfv: built.ttfv_hours != null,
      });
      return true;
    },

    applyProductActivationDefaults: () => {
      const { project, marketingProfile } = get();
      if (!project) return false;
      const built = buildProductActivationProfile({
        founderFit: marketingProfile?.founder_fit,
        manualKpis: marketingProfile?.manual_kpis,
        scan: project,
      });
      syncProductActivationState(built);
      track("product_activation_defaults", { confidence: built.confidence });
      return true;
    },

    openProductRequestModal: (requestId) => set({ pendingProductRequestId: requestId }),
    dismissProductRequestModal: () => set({ pendingProductRequestId: undefined }),
    openProductIssueModal: (requestId) => set({ pendingProductIssueRequestId: requestId }),
    dismissProductIssueModal: () => set({ pendingProductIssueRequestId: undefined }),

    completeProductRequest: (requestId, proof) => {
      const workspace = get().laneDWorkspace ?? get().marketingProfile?.lane_d_workspace;
      if (!workspace) return "No product loop is active.";
      const result = completeProductRequestCore(workspace, requestId, proof);
      if (result.error) return result.error;
      syncLaneDState(result.workspace);
      set({ pendingProductRequestId: undefined });
      appendEvent({
        role: "system",
        kind: "status",
        text: `P0 PRODUCT REQUEST shipped — ${result.workspace.requests.find((item) => item.id === requestId)?.title ?? requestId}.`,
      });
      return null;
    },

    skipProductRequest: (requestId, reason) => {
      const workspace = get().laneDWorkspace ?? get().marketingProfile?.lane_d_workspace;
      if (!workspace) return;
      syncLaneDState(skipProductRequestCore(workspace, requestId, reason ?? "Founder decision"));
    },

    resumeMarketingAfterProductLoop: () => {
      const workspace = get().laneDWorkspace ?? get().marketingProfile?.lane_d_workspace;
      if (!workspace) return "No product loop is active.";
      if (!canResumeMarketing(workspace)) {
        return "Ship or explicitly skip every P0 PRODUCT REQUEST before resuming marketing.";
      }
      syncLaneDState(resumeMarketing(workspace));
      const continuous = get().cmoContinuous ?? get().marketingProfile?.cmo_continuous;
      if (continuous) {
        syncContinuousState({
          ...continuous,
          marketing_paused: false,
          marketing_resumed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      appendEvent({
        role: "system",
        kind: "status",
        text: "Product loop cleared — marketing can resume on the next CMO cycle.",
      });
      return null;
    },

    saveRevenueProfile: (input) => {
      const { project, marketingProfile, settings } = get();
      if (!project || !marketingProfile?.founder_fit) return false;
      const built = buildRevenueProfile({
        scan: buildRevenueScanSignals(project, marketingProfile.gaps),
        founderFit: marketingProfile.founder_fit,
        strategicDecision: marketingProfile.strategic_decision,
        persona: settings.persona,
        manualKpis: marketingProfile.manual_kpis,
        salesPipelineEmpty: marketingProfile.sales_pipeline_empty,
        existing: get().revenueProfile ?? marketingProfile.revenue_profile,
        intake: input,
      });
      syncRevenueProfileState(built);
      track("revenue_profile_saved", {
        model: built.pricing_thesis.model,
        target: built.revenue_target.target,
        confidence: built.revenue_target.confidence,
      });
      return true;
    },

    logRevenueAttributionForSource: (sourceId, paidCustomers, note) => {
      const profile = get().revenueProfile ?? get().marketingProfile?.revenue_profile;
      if (!profile) return "Save revenue intake before logging attribution.";
      const existing = profile.attributions.find((row) => row.source_id === sourceId);
      const next = logRevenueAttribution(profile, {
        source_id: sourceId,
        source_label: existing?.source_label ?? sourceId.replace(/_/g, " "),
        channel_kind: existing?.channel_kind ?? "organic",
        spend_usd: existing?.spend_usd,
        spend_confidence: existing?.spend_confidence ?? "missing",
        paid_customers: paidCustomers,
        attribution_confidence: "measured",
      });
      syncRevenueProfileState(next);
      set({ pendingRevenueAttributionSourceId: undefined });
      appendEvent({
        role: "system",
        kind: "status",
        text: `Revenue attribution logged — ${paidCustomers} paid customer(s) for ${sourceId}.${note ? ` ${note}` : ""}`,
      });
      return null;
    },

    openMonetizationTaskModal: (taskId) => set({ pendingMonetizationTaskId: taskId }),
    dismissMonetizationTaskModal: () => set({ pendingMonetizationTaskId: undefined }),
    openMonetizationIssueModal: (taskId) => set({ pendingMonetizationIssueTaskId: taskId }),
    dismissMonetizationIssueModal: () => set({ pendingMonetizationIssueTaskId: undefined }),
    openRevenueAttributionModal: (sourceId) =>
      set({ pendingRevenueAttributionSourceId: sourceId }),
    dismissRevenueAttributionModal: () => set({ pendingRevenueAttributionSourceId: undefined }),

    completeMonetizationTask: (taskId, proof) => {
      const workspace =
        get().monetizationWorkspace ?? get().marketingProfile?.monetization_workspace;
      if (!workspace) return "No monetization workspace is active.";
      const result = completeMonetizationTaskCore(workspace, taskId, proof);
      if (result.error) return result.error;
      syncMonetizationWorkspaceState(result.workspace);
      set({ pendingMonetizationTaskId: undefined, pendingMonetizationIssueTaskId: undefined });
      appendEvent({
        role: "system",
        kind: "status",
        text: `Monetization task shipped — ${result.workspace.tasks.find((item) => item.id === taskId)?.title ?? taskId}.`,
      });
      return null;
    },

    skipMonetizationTask: (taskId, reason) => {
      const workspace =
        get().monetizationWorkspace ?? get().marketingProfile?.monetization_workspace;
      if (!workspace) return;
      syncMonetizationWorkspaceState(
        skipMonetizationTaskCore(workspace, taskId, reason ?? "Founder decision"),
      );
    },

    toggleWarRoomExpanded: () =>
      set((s) => ({
        warRoomExpanded: !s.warRoomExpanded,
        week1FocusMode: !s.warRoomExpanded ? false : s.week1FocusMode,
      })),
    focusWarRoomAnchor: (anchorId) => {
      if (!get().warRoomExpanded) get().toggleWarRoomExpanded();
      requestAnimationFrame(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    focusBackstageAnchor: (anchorId) => {
      get().focusWarRoomAnchor(anchorId);
    },

    checkMorningDayUnlock: () => {
      const state = get();
      const { project, opsCadence, growthControlPlane, lastMorningBriefDayKey, marketingProfile } =
        state;
      if (!project?.id || !opsCadence || !growthControlPlane?.today) return;
      const dayKey = morningBriefDayKey(project.id);
      if (!shouldShowDayUnlockToast(lastMorningBriefDayKey, project.id, opsCadence)) return;
      const brief = buildMorningBriefView({
        plane: growthControlPlane,
        cadence: opsCadence,
        laneBWorkspace: state.laneBWorkspace ?? marketingProfile?.lane_b_workspace,
        laneDWorkspace: state.laneDWorkspace ?? marketingProfile?.lane_d_workspace,
        monetizationWorkspace:
          state.monetizationWorkspace ?? marketingProfile?.monetization_workspace,
        distributionOperator:
          state.distributionOperator ?? marketingProfile?.distribution_operator,
        influencerOperator:
          state.influencerOperator ?? marketingProfile?.influencer_operator,
        delegateOperator:
          state.delegateOperator ??
          state.delegateWorkspace ??
          marketingProfile?.delegate_operator,
        continuous: state.cmoContinuous ?? marketingProfile?.cmo_continuous,
        campaignPhase: marketingProfile?.campaign_session?.phase,
        growthMemory: state.growthMemory ?? marketingProfile?.growth_memory,
        narrativeOneLiner: marketingProfile?.growth_narrative?.one_liner,
        firstShipAt: state.firstShipAt,
        wedgePhase: state.wedgePhase,
        mechanismFallback:
          state.channelThesis?.title ?? marketingProfile?.channel_thesis?.title,
      });
      if (!brief) return;
      set({
        lastMorningBriefDayKey: dayKey,
        morningUnlockToast: { dayIndex: brief.dayIndex, today: brief.today },
      });
    },
    clearMorningUnlockToast: () => set({ morningUnlockToast: undefined }),

    openDistributionProofModal: (slotId) =>
      set({ pendingDistributionProofSlotId: slotId }),
    dismissDistributionProofModal: () =>
      set({ pendingDistributionProofSlotId: undefined }),

    completeDistributionSlot: (slotId, proof) => {
      const op = get().distributionOperator ?? get().marketingProfile?.distribution_operator;
      if (!op) return "No distribution operator active.";
      const slotBefore = op.slots.find((s) => s.id === slotId);
      const { workspace, error } = completeDistributionSlot(op, slotId, proof);
      if (error) return error;

      const { channelThesis, marketingProfile, opsCadence } = get();
      const thesis = channelThesis ?? marketingProfile?.channel_thesis;
      const cadence = opsCadence ?? marketingProfile?.ops_cadence;
      let next = workspace;
      if (thesis && cadence) {
        next = {
          ...next,
          verdict: evaluateHookPerformanceWithProfile(next, cadence, marketingProfile, thesis),
        };
      }

      const laneB = get().laneBWorkspace ?? marketingProfile?.lane_b_workspace;
      if (laneB) {
        const synced = syncLaneBFromOperator(next, laneB);
        next = synced.workspace;
        syncLaneBState(synced.laneB);
      }
      syncDistributionOperatorState(next);

      const linkedOpsId =
        next.slots.find((s) => s.id === slotId)?.linked_ops_task_id ??
        slotBefore?.linked_ops_task_id;
      tryCompleteLinkedOpsFromHumanProof(linkedOpsId, {
        urls: proof.post_url?.trim() ? [proof.post_url.trim()] : undefined,
        note: proof.note,
        metric_snapshot:
          proof.views_24h != null
            ? String(proof.views_24h)
            : proof.impressions != null
              ? String(proof.impressions)
              : proof.replies != null
                ? String(proof.replies)
                : undefined,
        kpi_value: proof.views_24h ?? proof.impressions ?? proof.replies,
      });

      for (const kpi of rollupOperatorKpis(next, marketingProfile)) {
        void get().upsertManualKpi(kpi);
      }

      if (
        next.verdict?.headline &&
        next.verdict.headline !== lastDistributionVerdictHeadline
      ) {
        lastDistributionVerdictHeadline = next.verdict.headline;
        appendEvent({
          role: "system",
          kind: "status",
          text: next.verdict.headline,
        });
      }

      recomputeGrowthPlane();
      return null;
    },

    skipDistributionSlot: (slotId) => {
      const op = get().distributionOperator ?? get().marketingProfile?.distribution_operator;
      if (!op) return;
      const next = skipDistributionSlot(op, slotId);
      syncDistributionOperatorState(next);
      recomputeGrowthPlane();
    },

    openInfluencerProofModal: (touchId) => set({ pendingInfluencerProofTouchId: touchId }),
    dismissInfluencerProofModal: () => set({ pendingInfluencerProofTouchId: undefined }),
    openInfluencerDealModal: (touchId) => set({ pendingInfluencerDealTouchId: touchId }),
    dismissInfluencerDealModal: () => set({ pendingInfluencerDealTouchId: undefined }),

    completeInfluencerTouch: (touchId, targetStage, proof, deal) => {
      const op = get().influencerOperator ?? get().marketingProfile?.influencer_operator;
      if (!op) return "No influencer operator active.";
      const touchBefore = op.touches.find((t) => t.id === touchId);
      const { workspace, error } = completeInfluencerTouch(op, touchId, targetStage, proof, deal);
      if (error) return error;

      const { channelThesis, marketingProfile, opsCadence } = get();
      const thesis = channelThesis ?? marketingProfile?.channel_thesis;
      const cadence = opsCadence ?? marketingProfile?.ops_cadence;
      let next = workspace;
      if (thesis && cadence) {
        next = {
          ...next,
          verdict: evaluatePitchPerformanceWithProfile(next, cadence, marketingProfile, thesis),
        };
      }

      const laneB = get().laneBWorkspace ?? marketingProfile?.lane_b_workspace;
      if (laneB) {
        const synced = syncLaneBFromInfluencerOperator(next, laneB);
        next = synced.workspace;
        syncLaneBState(synced.laneB);
      }
      syncInfluencerOperatorState(next);

      const linkedOpsId =
        next.touches.find((t) => t.id === touchId)?.linked_ops_task_id ??
        touchBefore?.linked_ops_task_id;
      tryCompleteLinkedOpsFromHumanProof(linkedOpsId, {
        urls: proof?.live_post_url?.trim() ? [proof.live_post_url.trim()] : proof?.thread_url?.trim() ? [proof.thread_url.trim()] : undefined,
        note: proof?.note ?? proof?.reply_note,
        metric_snapshot:
          proof?.signups != null
            ? String(proof.signups)
            : proof?.clicks != null
              ? String(proof.clicks)
              : undefined,
        kpi_value: proof?.signups ?? proof?.clicks,
      });

      for (const kpi of rollupInfluencerKpis(next, marketingProfile)) {
        void get().upsertManualKpi(kpi);
      }

      if (
        next.verdict?.headline &&
        next.verdict.headline !== lastInfluencerVerdictHeadline
      ) {
        lastInfluencerVerdictHeadline = next.verdict.headline;
        appendEvent({
          role: "system",
          kind: "status",
          text: next.verdict.headline,
        });
      }

      recomputeGrowthPlane();
      return null;
    },

    skipInfluencerTouch: (touchId) => {
      const op = get().influencerOperator ?? get().marketingProfile?.influencer_operator;
      if (!op) return;
      const next = skipInfluencerTouch(op, touchId);
      syncInfluencerOperatorState(next);
      recomputeGrowthPlane();
    },

    updateInfluencerCreator: (touchId, fields) => {
      const op = get().influencerOperator ?? get().marketingProfile?.influencer_operator;
      if (!op) return;
      syncInfluencerOperatorState(updateInfluencerTouchCreator(op, touchId, fields));
    },

    beginCmoWeek1: () => {
      const { project, settings, marketingProfile, channelThesis } = get();
      const thesis = channelThesis ?? marketingProfile?.channel_thesis;
      if (!thesis || !project) return;
      if (!isStrategicDecisionSealed(marketingProfile)) {
        set({ strategicIntakeOpen: true });
        appendEvent({
          role: "system",
          kind: "status",
          text: "Complete the founder-fit decision and seal one strategic option before Week 1 starts.",
        });
        return;
      }
      if (thesis.verdict === "not_ready") {
        appendEvent({
          role: "system",
          kind: "status",
          text: thesis.verdict_reason,
        });
        return;
      }
      if (!get().budgetPlan && marketingProfile?.founder_fit) {
        const assumed = buildBudgetAllocation(thesis, marketingProfile.founder_fit);
        syncBudgetPlanState(assumed);
        appendEvent({
          role: "system",
          kind: "status",
          text: `Budget plan uses the ${marketingProfile.founder_fit.monthly_budget_band} band estimate until you confirm a numeric ceiling.`,
        });
      }
      const baseline = assessMeasurementBaseline(marketingProfile, project);
      const readiness = resolveLaunchReadinessSteps({
        founderFit: marketingProfile?.founder_fit,
        productActivation:
          get().productActivation ?? marketingProfile?.product_activation,
        revenueProfile: get().revenueProfile ?? marketingProfile?.revenue_profile,
        measurementReady: baseline.ready,
        measurementAcknowledged: Boolean(marketingProfile?.measurement_ack?.acknowledged_at),
      });
      if (!readiness.canStartWeek1) {
        set({ launchReadinessOpen: true });
        appendEvent({
          role: "system",
          kind: "status",
          text: "Complete launch setup — activation, revenue (if applicable), and measurement — before Week 1 starts.",
        });
        return;
      }

      track("begin_cmo_week1", { thesis_id: thesis.id });
      const projectId = get().activeProjectId ?? project.id;
      const session = createCampaignSession({
        projectId,
        persona: settings.persona,
        planHorizon: settings.planHorizon,
        goal: thesis.headline.slice(0, 160),
      });
      const now = new Date().toISOString();
      get().persistCampaignSession({
        ...session,
        phase: "executing",
        milestones: [
          ...session.milestones,
          { label: `Channel thesis: ${thesis.title}`, at: now, kind: "phase" },
        ],
      });

      const productActivation =
        get().productActivation ??
        marketingProfile?.product_activation ??
        buildProductActivationProfile({
          founderFit: marketingProfile?.founder_fit,
          manualKpis: marketingProfile?.manual_kpis,
          scan: project,
        });
      syncProductActivationState(productActivation);
      const revenueProfile =
        get().revenueProfile ??
        marketingProfile?.revenue_profile ??
        buildRevenueProfile({
          scan: buildRevenueScanSignals(project, marketingProfile?.gaps),
          founderFit: marketingProfile?.founder_fit,
          strategicDecision: marketingProfile?.strategic_decision,
          persona: settings.persona,
          manualKpis: marketingProfile?.manual_kpis,
          salesPipelineEmpty: marketingProfile?.sales_pipeline_empty,
        });
      syncRevenueProfileState(revenueProfile);
      const productBinding = detectProductBinding({
        founderFit: marketingProfile?.founder_fit,
        activation: productActivation,
        growthBinding: get().growthControlPlane?.binding,
        gaps: marketingProfile?.gaps,
      });
      let opsCadence = productBinding.active
        ? createProductLoopOpsCadence({
            thesis,
            activation: productActivation,
            campaignSessionId: session.id,
          })
        : createOpsCadenceFromThesis(thesis, { campaignSessionId: session.id });

      let laneA = productBinding.active
        ? {
            id: `lanea.${thesis.id}.product.${Date.now()}`,
            thesis_id: thesis.id,
            ops_cadence_id: opsCadence.id,
            started_at: now,
            items: [],
          }
        : createLaneAWorkspaceFromThesis(thesis, {
            opsCadence,
            narrative: marketingProfile?.growth_narrative,
          });

      const laneD = createLaneDWorkspaceFromBinding({
        thesis,
        binding: productBinding,
        activation: productActivation,
        gaps: marketingProfile?.gaps,
        hasAnalytics: project.hasAnalytics,
        opsCadence,
      });
      if (laneD) {
        const linked = linkSiteLevelToLaneA(laneA, laneD);
        laneA = linked.laneA;
        syncLaneDState(linked.laneD);
      }
      const revenueBinding = detectRevenueBinding({
        founderFit: marketingProfile?.founder_fit,
        revenueProfile,
        productBindingActive: productBinding.active,
        marketingPaused: productBinding.active,
        growthBinding: get().growthControlPlane?.binding,
        activation: productActivation,
        gaps: marketingProfile?.gaps,
        manualKpis: marketingProfile?.manual_kpis,
      });
      const monetizationWs = createMonetizationWorkspaceFromBinding({
        thesis,
        binding: revenueBinding,
        revenueProfile,
        gaps: marketingProfile?.gaps,
      });
      if (monetizationWs) {
        const monetizationLinked = linkSiteLevelMonetizationToLaneA(monetizationWs, laneA, thesis);
        laneA = monetizationLinked.laneA ?? laneA;
        syncMonetizationWorkspaceState(monetizationLinked.workspace);
      }
      syncLaneAState(laneA);
      if (!productBinding.active) {
        opsCadence = bindAndSyncOpsCadence({
          cadence: opsCadence,
          thesis,
          project,
          laneAWorkspace: laneA,
          preferScoutForFirstSystem: true,
        });
      } else {
        syncOpsCadenceState(opsCadence);
      }

      const mechanismPrimary =
        (thesis.signals?.primary_mechanism_id as GrowthMechanismId | undefined) ??
        marketingProfile?.growth_mechanism_profile?.primary_mechanism_id;
      const mechanismSecondary =
        marketingProfile?.growth_mechanism_profile?.secondary_mechanism_id ??
        (thesis.signals?.secondary_mechanism_id as GrowthMechanismId | undefined);
      const mechanismFlags = mechanismPrimary
        ? resolveMechanismOperatorFlags(mechanismPrimary, mechanismSecondary)
        : undefined;

      const laneBMode = resolveMechanismLaneBMode(mechanismPrimary);

      const delegateWs =
        productBinding.active || (mechanismFlags && !mechanismFlags.delegate)
          ? null
          : createDelegateOperatorFromThesis(thesis, { opsCadence });
      if (delegateWs) {
        syncDelegateState(delegateWs);
        appendEvent({
          role: "system",
          kind: "status",
          text: `Lane C ready — ${delegateWs.briefs.length} delegate brief(s) for handoff.`,
        });
      }

      const continuous = createInitialContinuousState({ campaignSessionId: session.id });
      syncContinuousState(
        productBinding.active
          ? {
              ...continuous,
              marketing_paused: true,
              marketing_paused_reason: productBinding.headline,
              product_loop_started_at: now,
            }
          : continuous,
      );
      syncGrowthMemoryState(createInitialGrowthMemory(projectId));

      maybeSyncGa4OnCycleStart(1);
      recomputeGrowthPlane();
      if (!productBinding.active) {
        const allowDist = mechanismFlags ? Boolean(mechanismFlags.distribution) : true;
        const allowInf = mechanismFlags ? Boolean(mechanismFlags.influencer) : true;
        if (allowDist) {
          maybeCreateDistributionOperator({
            week_index: 1,
            character_mode: mechanismFlags?.character_mode,
          });
        } else {
          set({ distributionOperator: undefined });
          void get().updateMarketingProfile({ distribution_operator: undefined });
        }
        if (allowInf) {
          maybeCreateInfluencerOperator({ week_index: 1 });
        } else {
          set({ influencerOperator: undefined });
          void get().updateMarketingProfile({ influencer_operator: undefined });
        }
      } else {
        set({ distributionOperator: undefined, influencerOperator: undefined });
      }

      let laneB = productBinding.active
        ? undefined
        : createLaneBWorkspaceFromThesis(thesis, {
            opsCadence: get().opsCadence ?? opsCadence,
            narrative: marketingProfile?.growth_narrative,
            laneBMode,
          });
      const distOp = get().distributionOperator;
      const infOp = get().influencerOperator;
      if (distOp && laneB) {
        const synced = syncLaneBFromOperator(distOp, laneB);
        syncDistributionOperatorState(synced.workspace);
        laneB = synced.laneB;
        syncLaneBState(synced.laneB);
      } else if (infOp && laneB) {
        const synced = syncLaneBFromInfluencerOperator(infOp, laneB);
        syncInfluencerOperatorState(synced.workspace);
        laneB = synced.laneB;
        syncLaneBState(synced.laneB);
      } else if (laneB) {
        syncLaneBState(laneB);
      }

      if (!productBinding.active) {
        bindAndSyncHumanExecution({
          cadence: get().opsCadence ?? opsCadence,
          thesis,
          laneB: get().laneBWorkspace ?? laneB,
          distributionOperator: get().distributionOperator,
          influencerOperator: get().influencerOperator,
          delegateOperator: get().delegateOperator ?? delegateWs,
        });
      }

      const activeBudget = get().budgetPlan ?? get().marketingProfile?.budget_plan;
      if (activeBudget) {
        syncBudgetPlanState(
          seedActionCosts(activeBudget, {
            laneB: get().laneBWorkspace,
            laneC: get().marketingProfile?.lane_c_workspace,
            distribution: get().distributionOperator,
            influencer: get().influencerOperator,
            delegate: get().delegateOperator,
            cadence: get().opsCadence,
          }),
        );
      }

      appendEvent({
        role: "system",
        kind: "status",
        text: `Lane A ready — ${laneA.items.length} IDE ship step(s) with thesis skills.`,
      });

      if (laneB) {
        appendEvent({
          role: "system",
          kind: "status",
          text: `Lane B ready — ${laneB.items.length} human execution steps (${laneB.mode.replace(/_/g, " ")}).`,
        });
      } else if (laneD) {
        appendEvent({
          role: "system",
          kind: "status",
          text: `Marketing paused — Lane D has ${laneD.requests.length} P0 PRODUCT REQUEST(s).`,
        });
      } else if (monetizationWs) {
        appendEvent({
          role: "system",
          kind: "status",
          text: `Revenue focus — ${monetizationWs.tasks.length} monetization P0 task(s) before scaling paid spend.`,
        });
      }

      set({
        phase: "workspace",
        route: "workspace",
        workspaceHandoff: undefined,
        firstHourActive: true,
        week1FocusMode: true,
        warRoomExpanded: true,
        launchReadinessOpen: false,
        week1BriefingOpen: false,
      });
      get().setActiveCanvas("run");

      const firstSystemOps = opsCadence.tasks.find((t) => t.owner === "system");
      const firstUser = productBinding.active
        ? opsCadence.tasks.find((task) => task.owner === "user")
        : thesis.week1_priorities.find((p) => p.owner === "user");

      appendEvent({
        role: "agent",
        kind: "status",
        text: `Week 1 — ${thesis.title}. ${thesis.headline}`,
      });

      if (firstUser) {
        appendEvent({
          role: "system",
          kind: "status",
          text: `Your move when ready: ${firstUser.what} — Done when: ${firstUser.done_when}`,
        });
      }

      if (firstSystemOps) {
        get().executeOpsSystemTask(firstSystemOps.id);
        return;
      }

      if (firstUser) {
        set({
          workspaceHandoff: {
            eyebrow: "Week 1",
            title: firstUser.what,
            reason: `${firstUser.why} Done when: ${firstUser.done_when}`,
            primaryLabel: "Open workspace",
            primaryAction: "composer",
          },
        });
      }
    },

    openOpsProofModal: (taskId) => {
      const cadence = get().opsCadence;
      const task = cadence?.tasks.find((t) => t.id === taskId);
      if (task?.human_execution_ref) {
        openHumanExecutionProof(task.human_execution_ref);
        return;
      }
      set({ pendingOpsProofTaskId: taskId });
    },
    dismissOpsProofModal: () => set({ pendingOpsProofTaskId: undefined }),

    persistOpsCadence: (cadence) => syncOpsCadenceState(cadence),

    completeOpsTask: (taskId, proof) => {
      const cadence = get().opsCadence;
      if (!cadence) return "No active ops cadence.";
      const task = cadence.tasks.find((t) => t.id === taskId);
      if (!task) return "Task not found.";
      const { marketingProfile: profile, channelThesis } = get();
      const enriched = attachKpiToCompletedProof(proof, task, cadence.thesis_id);
      const fullProof = {
        ...enriched.proof,
        kpi_id: enriched.kpiFields.kpi_id,
        kpi_name: enriched.kpiFields.kpi_name,
        kpi_value: enriched.kpiFields.kpi_value,
        kpi_target: enriched.kpiFields.kpi_target,
        kpi_source: enriched.kpiFields.kpi_source,
        kpi_unit: enriched.kpiFields.kpi_unit,
      };
      const validation = validateFullOpsProof(task, fullProof, profile);
      if (!validation.ok) return validation.errors.join(" ");

      const { cadence: next, error } = completeOpsTaskCore(cadence, taskId, fullProof);
      if (error && !error.ok) return error.errors.join(" ");

      const kpi = buildManualKpiFromOpsProof(task, fullProof, cadence.thesis_id);
      if (kpi) void get().upsertManualKpi(kpi);

      let finalCadence = next;
      const thesis = channelThesis ?? profile?.channel_thesis;
      if (thesis && allOpsTasksTerminal(next)) {
        const distVerdict =
          get().distributionOperator?.verdict ??
          profile?.distribution_operator?.verdict ??
          null;
        const infVerdict =
          get().influencerOperator?.verdict ??
          profile?.influencer_operator?.verdict ??
          null;
        const delVerdict =
          get().delegateOperator?.verdict ??
          get().delegateWorkspace?.verdict ??
          profile?.delegate_operator?.verdict ??
          null;
        const pivot = buildPivotSuggestion(
          next,
          profile,
          thesis,
          distVerdict,
          infVerdict,
          delVerdict,
          get().growthMemory ?? profile?.growth_memory,
        );
        if (pivot) finalCadence = { ...next, pivot_suggestion: pivot };
        get().advanceCampaignPhase({ type: "log_kpi" });
      }

      syncOpsCadenceState(finalCadence);
      notifyOpsProgress(finalCadence, task.what);
      recomputeGrowthPlane();
      track("ops_task_done", { task_id: taskId, owner: task.owner, kpi: fullProof.kpi_id });
      return null;
    },

    skipOpsTask: (taskId, reason) => {
      const cadence = get().opsCadence;
      if (!cadence) return;
      const { cadence: next, error } = skipOpsTaskCore(cadence, taskId, reason);
      if (error) {
        appendEvent({ role: "system", kind: "error", text: error });
        return;
      }
      syncOpsCadenceState(next);
      appendEvent({
        role: "system",
        kind: "status",
        text: `Skipped ops task — ${cadence.tasks.find((t) => t.id === taskId)?.what ?? taskId}`,
      });
      notifyOpsProgress(next);
      recomputeGrowthPlane();
    },

    executeOpsSystemTask: (taskId) => {
      const cadence = get().opsCadence;
      if (!cadence) return;
      const task = cadence.tasks.find((t) => t.id === taskId);
      if (!task || task.owner !== "system") return;

      const thesis = get().channelThesis ?? get().marketingProfile?.channel_thesis;
      const project = get().project;
      if (!thesis || !project) {
        appendEvent({
          role: "system",
          kind: "error",
          text: "Cannot start ops task — project or thesis missing.",
        });
        return;
      }

      let plan: LaneARunPlan | null = null;
      if (task.execution_plan) {
        plan = executionPlanToLaneARunPlan(taskId, task.execution_plan);
      } else {
        const laneA = get().laneAWorkspace;
        const laneItem = laneA ? getLaneAItemForOpsTask(laneA, taskId) : undefined;
        plan = resolveLaneARunPlan({
          task,
          thesis,
          project,
          laneAItemId: laneItem?.id,
        });
        if (import.meta.env.DEV) {
          console.warn("[cmo] executeOpsSystemTask without bound execution_plan:", taskId);
        }
      }
      if (!plan) {
        appendEvent({
          role: "system",
          kind: "error",
          text: `No execution plan for: ${task.what}`,
        });
        return;
      }
      get().startLaneARun(plan);
    },

    startOpsSystemTask: (taskId) => {
      const cadence = get().opsCadence;
      if (!cadence) return;
      const task = cadence.tasks.find((t) => t.id === taskId);
      if (!task || task.owner !== "system") return;

      if (get().e2eDryRunExecution) {
        syncOpsCadenceState(markOpsTaskInProgress(cadence, taskId));
        const err = get().completeOpsTask(taskId, {
          note: "E2E dry-run: Lane A shipped without live agent execution.",
          commit_sha: "e2e0000",
        });
        if (err) {
          appendEvent({ role: "system", kind: "error", text: err });
        }
        return;
      }

      get().executeOpsSystemTask(taskId);
    },

    startLaneARun: (plan) => {
      const cadence = get().opsCadence;
      if (!cadence) return;

      if (get().e2eDryRunExecution) {
        syncOpsCadenceState(markOpsTaskInProgress(cadence, plan.opsTaskId));
        const err = get().completeOpsTask(plan.opsTaskId, {
          note: "E2E dry-run: Lane A run plan completed without live agent.",
          commit_sha: "e2e0000",
        });
        if (err) {
          appendEvent({ role: "system", kind: "error", text: err });
        }
        return;
      }

      syncOpsCadenceState(markOpsTaskInProgress(cadence, plan.opsTaskId));
      const laneA = get().laneAWorkspace;
      if (laneA) {
        syncLaneAState(markLaneAItemInProgress(laneA, plan.opsTaskId));
      }

      if (plan.mode === "scout_then_edit" && plan.scoutPrompt) {
        if (canRunAgent(get().runtime)) {
          set({ firstHourScoutPending: true });
          void get().sendMessage(plan.scoutPrompt);
        }
        return;
      }

      if (plan.mode === "browser_research") {
        const msgId = appendEvent({ role: "user", kind: "text", text: plan.goal });
        get().runBrowserTask(plan.goal, { sourceMessageId: msgId });
        return;
      }

      void get().startRun(plan.goal, undefined, {
        skills: plan.skills,
        opsTaskId: plan.opsTaskId,
        mentions: plan.mentions,
      });
    },

    completeOpsWeekReview: (summary) => {
      const cadence = get().opsCadence;
      if (!cadence) return "No active ops cadence.";
      const { marketingProfile: profile, channelThesis } = get();
      const thesis = channelThesis ?? profile?.channel_thesis;
      const laneD = get().laneDWorkspace ?? profile?.lane_d_workspace;
      const check = canCompleteWeekReview(
        cadence,
        profile,
        thesis,
        summary,
        laneD,
        get().monetizationWorkspace ?? profile?.monetization_workspace,
      );
      if (!check.ok) return check.errors.join(" ");
      if (!thesis) return "Channel thesis required for week review.";

      const pivot =
        thesis != null && !laneD?.marketing_paused
          ? buildPivotSuggestion(
              cadence,
              profile,
              thesis,
              get().distributionOperator?.verdict ?? profile?.distribution_operator?.verdict,
              get().influencerOperator?.verdict ?? profile?.influencer_operator?.verdict,
              get().delegateOperator?.verdict ??
                get().delegateWorkspace?.verdict ??
                profile?.delegate_operator?.verdict,
              get().growthMemory ?? profile?.growth_memory,
            )
          : null;
      const next = completeWeekReview(cadence, summary, pivot);
      syncOpsCadenceState(next);
      set({ week1FocusMode: false });
      get().advanceCampaignPhase({ type: "log_kpi" });

      const delOp = resolveDelegateOperator(
        get().delegateOperator ??
          get().delegateWorkspace ??
          profile?.delegate_operator ??
          profile?.lane_c_workspace,
        thesis,
      );
      const revenueProfile = get().revenueProfile ?? profile?.revenue_profile;
      const assessment = evaluateWeek1MetricsWithGa4Priority(
        next,
        profile,
        thesis,
        get().distributionOperator ?? profile?.distribution_operator,
        get().influencerOperator ?? profile?.influencer_operator,
        delOp,
        get().growthMemory ?? profile?.growth_memory,
        revenueProfile,
      );
      const distOp = get().distributionOperator ?? profile?.distribution_operator;
      const infOp = get().influencerOperator ?? profile?.influencer_operator;
      const laneBWorkspace = get().laneBWorkspace;
      const budgetPlan = get().budgetPlan ?? profile?.budget_plan;
      const budgetCloseout = budgetPlan
        ? rollupBudgetActuals(budgetPlan, profile, {
            laneB: laneBWorkspace ?? profile?.lane_b_workspace,
            laneC: profile?.lane_c_workspace,
            distribution: distOp,
            influencer: infOp,
            delegate: delOp,
            cadence: next,
          })
        : undefined;
      const revenueCloseout = revenueProfile
        ? buildRevenueCloseout(revenueProfile, profile?.manual_kpis, budgetCloseout)
        : undefined;
      const memoryBase =
        get().growthMemory ??
        profile?.growth_memory ??
        createInitialGrowthMemory(get().activeProjectId ?? get().project?.id);
      let growthMemory = harvestMemoryFromCycle({
        memory: memoryBase,
        cadence: next,
        thesis,
        laneB: laneBWorkspace ?? profile?.lane_b_workspace,
        distributionOperator: distOp,
        influencerOperator: infOp,
        delegateOperator: delOp,
        budgetCloseout,
        laneD,
        revenueCloseout,
        growthMechanismProfile: profile?.growth_mechanism_profile,
      });
      let replanPreview = buildReplanPreview(growthMemory, {
        thesis,
        nextWeekIndex: cadence.week_index + 1,
        assessment,
        budgetPlan,
        budgetCloseout,
        founderFit: profile?.founder_fit,
        laneD,
        revenueProfile,
        revenueCloseout,
        gaps: profile?.gaps,
        weekIndex: cadence.week_index,
        growthMechanismProfile: profile?.growth_mechanism_profile,
      });
      const suggestedThesisId = pivot?.suggested_thesis_ids[0];
      const currentProject = get().project;
      if (replanPreview.mode === "pivot" && suggestedThesisId && currentProject) {
        const targetThesis = buildCmoIntake({
          project: currentProject,
          persona: get().settings.persona,
          profile,
          context: {
            force_thesis_id: suggestedThesisId,
            previous_thesis_id: thesis.id,
            cycle_index: cadence.week_index + 1,
            mode: "pivot",
          },
        });
        replanPreview = buildReplanPreview(growthMemory, {
          thesis: targetThesis,
          nextWeekIndex: cadence.week_index + 1,
          assessment,
          preferredMode: "pivot",
          budgetPlan,
          budgetCloseout,
          founderFit: profile?.founder_fit,
          laneD,
          revenueProfile,
          revenueCloseout,
          gaps: profile?.gaps,
          weekIndex: cadence.week_index + 1,
          growthMechanismProfile: profile?.growth_mechanism_profile,
        });
      }
      growthMemory = { ...growthMemory, pending_replan: replanPreview };
      let continuous =
        get().cmoContinuous ??
        profile?.cmo_continuous ??
        createInitialContinuousState({
          campaignSessionId: profile?.campaign_session?.id,
        });
      continuous = archiveCompletedCycle(continuous, {
        cadence: next,
        thesis,
        assessment,
        weekReviewSummary: summary,
        pivot,
        laneBWorkspaceId: laneBWorkspace?.id,
        hookSummary: infOp?.verdict?.headline ?? distOp?.verdict?.headline,
        delegateSummary: delOp?.verdict?.headline,
        memorySummary: growthMemorySummary(growthMemory),
        experimentCount: growthMemory.experiments.filter(
          (experiment) => experiment.cycle_index === cadence.week_index,
        ).length,
        winningMessageLabels: growthMemory.messages
          .filter(
            (message) =>
              message.cycle_index === cadence.week_index && message.verdict === "winner",
          )
          .map((message) => message.label),
        budgetSnapshot:
          budgetPlan && budgetCloseout
            ? buildBudgetSnapshot(budgetPlan, budgetCloseout)
            : undefined,
        revenueSnapshot:
          revenueProfile && revenueCloseout
            ? buildRevenueSnapshot(revenueProfile, revenueCloseout)
            : undefined,
      });
      syncContinuousState(continuous);
      syncGrowthMemoryState(growthMemory);
      for (const kpi of rollupGrowthMemoryKpis(growthMemory)) {
        void get().upsertManualKpi(kpi);
      }

      appendEvent({
        role: "system",
        kind: "status",
        text: `${weekLabel(cadence.week_index)} review captured — ${summary.trim().slice(0, 120)}`,
      });
      if (pivot?.verdict === "flat") {
        appendEvent({
          role: "agent",
          kind: "status",
          text: pivot.headline,
        });
      }
      track("ops_week_review", { week_index: cadence.week_index, verdict: pivot?.verdict });
      return null;
    },

    openWeekReviewModal: () => set({ pendingWeekReviewOpen: true }),
    dismissWeekReviewModal: () => set({ pendingWeekReviewOpen: false }),

    dismissPivotSuggestion: () => {
      const cadence = get().opsCadence;
      if (!cadence?.pivot_suggestion) return;
      syncOpsCadenceState({
        ...cadence,
        pivot_suggestion: {
          ...cadence.pivot_suggestion,
          dismissed_at: new Date().toISOString(),
        },
      });
      const continuous = get().cmoContinuous;
      if (continuous?.phase === "pivot_ready") {
        syncContinuousState({ ...continuous, phase: "measuring" });
      }
    },

    startNextCmoCycle: (opts) => {
      const { project, settings, marketingProfile, channelThesis, opsCadence } = get();
      const cadence = opsCadence;
      const priorThesis = channelThesis ?? marketingProfile?.channel_thesis;
      const continuous = get().cmoContinuous ?? marketingProfile?.cmo_continuous;
      const session = marketingProfile?.campaign_session;

      const check = canStartNextCycle(continuous, cadence);
      if (!check.ok) return check.errors.join(" ");
      if (!project || !priorThesis || !cadence) return "Missing project or thesis.";

      const mode: NextCycleMode = opts?.mode ?? "pivot";
      if (mode === "pivot") {
        const assessment = evaluateWeek1MetricsWithGa4Priority(
          cadence,
          marketingProfile,
          priorThesis,
          get().distributionOperator ?? marketingProfile?.distribution_operator,
          get().influencerOperator ?? marketingProfile?.influencer_operator,
          get().delegateOperator ??
            get().delegateWorkspace ??
            marketingProfile?.delegate_operator,
          get().growthMemory ?? marketingProfile?.growth_memory,
        );
        if (assessment.primaryValue == null || assessment.loggedCount <= 0) {
          return "Log a numeric KPI in week review before pivoting thesis.";
        }
      }
      const forceThesisId = resolveNextCycleThesisId(cadence, {
        mode,
        explicitThesisId: opts?.thesisId,
      });
      const nextWeekIndex = cadence.week_index + 1;
      const activeMemory =
        get().growthMemory ??
        marketingProfile?.growth_memory ??
        createInitialGrowthMemory(get().activeProjectId ?? project.id);
      const intakeContext = buildIntakeContextForNextCycle(
        cadence,
        continuous!,
        forceThesisId,
        mode,
      );
      const memoryMessages = activeMemory.messages.filter(
        (message) => message.cycle_index === activeMemory.last_harvest_cycle_index,
      );
      intakeContext.memory_snapshot = {
        winners: memoryMessages
          .filter((message) => message.verdict === "winner")
          .map((message) => ({
            label: message.label,
            kind: message.kind,
            metric:
              message.metric_value != null
                ? `${message.metric_value}${message.metric_name?.includes("pct") ? "%" : ""}`
                : undefined,
          })),
        losers: memoryMessages
          .filter((message) => message.verdict === "loser")
          .map((message) => ({ label: message.label, kind: message.kind })),
        recommended_mode: activeMemory.pending_replan?.mode,
      };

      let newThesis = buildCmoIntake({
        project,
        persona: settings.persona,
        profile: marketingProfile,
        context: intakeContext,
      });
      const mechProfile = marketingProfile?.growth_mechanism_profile;
      if (mechProfile?.primary_mechanism_id) {
        newThesis = applyMechanismToChannelThesis(
          newThesis,
          mechProfile.primary_mechanism_id,
          mechProfile.secondary_mechanism_id,
          nextWeekIndex,
        );
      }

      const assessment = evaluateWeek1Metrics(
        cadence,
        marketingProfile,
        priorThesis,
        get().distributionOperator ?? marketingProfile?.distribution_operator,
        get().influencerOperator ?? marketingProfile?.influencer_operator,
        get().delegateOperator ??
          get().delegateWorkspace ??
          marketingProfile?.delegate_operator,
        get().growthMemory ?? marketingProfile?.growth_memory,
      );
      const memoryPreview =
        activeMemory.pending_replan?.mode === mode &&
        activeMemory.pending_replan.target_thesis_id === newThesis.id
          ? activeMemory.pending_replan
          : buildReplanPreview(activeMemory, {
              thesis: newThesis,
              nextWeekIndex,
              assessment,
              preferredMode: mode,
              budgetPlan: get().budgetPlan ?? marketingProfile?.budget_plan,
              budgetCloseout: continuous?.cycles.at(-1)?.budget_snapshot?.closeout,
              founderFit: marketingProfile?.founder_fit,
              laneD: get().laneDWorkspace ?? marketingProfile?.lane_d_workspace,
              growthMechanismProfile: marketingProfile?.growth_mechanism_profile,
            });
      const memoryApplied = applyMemoryReplan(activeMemory, newThesis, memoryPreview, {
        weekIndex: nextWeekIndex,
        campaignSessionId: session?.id,
        priorOpsCadenceId: cadence.id,
      });
      newThesis = memoryApplied.thesis;
      const productActivation =
        get().productActivation ??
        marketingProfile?.product_activation ??
        buildProductActivationProfile({
          founderFit: marketingProfile?.founder_fit,
          manualKpis: marketingProfile?.manual_kpis,
          scan: project,
        });
      const productBinding = detectProductBinding({
        founderFit: marketingProfile?.founder_fit,
        activation: productActivation,
        growthBinding: get().growthControlPlane?.binding,
        gaps: marketingProfile?.gaps,
      });
      const newCadence = productBinding.active
        ? createProductLoopOpsCadence({
            thesis: newThesis,
            activation: productActivation,
            campaignSessionId: session?.id,
            priorOpsCadenceId: cadence.id,
            weekIndex: nextWeekIndex,
          })
        : memoryApplied.cadence;
      const delta = buildIntakeDelta(priorThesis, newThesis, {
        fromCycleIndex: cadence.week_index,
        toCycleIndex: nextWeekIndex,
        assessment,
        pivot: cadence.pivot_suggestion,
        memoryRationale: memoryPreview.rationale,
        priorKpiValue: continuous?.cycles.find((c) => c.cycle_index === cadence.week_index)
          ?.primary_kpi?.value,
      });

      let newLaneA: LaneAWorkspace = productBinding.active
        ? {
            id: `lanea.${newThesis.id}.product.${Date.now()}`,
            thesis_id: newThesis.id,
            ops_cadence_id: newCadence.id,
            started_at: new Date().toISOString(),
            items: [],
          }
        : createLaneAWorkspaceFromThesis(newThesis, {
          opsCadence: newCadence,
          narrative: marketingProfile?.growth_narrative,
          });
      const nextLaneD = createLaneDWorkspaceFromBinding({
        thesis: newThesis,
        binding: productBinding,
        activation: productActivation,
        gaps: marketingProfile?.gaps,
        hasAnalytics: project.hasAnalytics,
        opsCadence: newCadence,
      });
      if (nextLaneD) {
        const linked = linkSiteLevelToLaneA(newLaneA, nextLaneD);
        newLaneA = linked.laneA;
        syncLaneDState(linked.laneD);
      }
      const revenueProfile =
        get().revenueProfile ??
        marketingProfile?.revenue_profile ??
        buildRevenueProfile({
          scan: buildRevenueScanSignals(project, marketingProfile?.gaps),
          founderFit: marketingProfile?.founder_fit,
          strategicDecision: marketingProfile?.strategic_decision,
          persona: settings.persona,
          manualKpis: marketingProfile?.manual_kpis,
          salesPipelineEmpty: marketingProfile?.sales_pipeline_empty,
        });
      const revenueBinding = detectRevenueBinding({
        founderFit: marketingProfile?.founder_fit,
        revenueProfile,
        productBindingActive: productBinding.active,
        marketingPaused: productBinding.active,
        growthBinding: get().growthControlPlane?.binding,
        activation: productActivation,
        gaps: marketingProfile?.gaps,
        manualKpis: marketingProfile?.manual_kpis,
      });
      const nextMonetization = createMonetizationWorkspaceFromBinding({
        thesis: newThesis,
        binding: revenueBinding,
        revenueProfile,
        gaps: marketingProfile?.gaps,
      });
      if (nextMonetization) {
        const monetizationLinked = linkSiteLevelMonetizationToLaneA(
          nextMonetization,
          newLaneA,
          newThesis,
        );
        newLaneA = monetizationLinked.laneA ?? newLaneA;
        syncMonetizationWorkspaceState(monetizationLinked.workspace);
      } else {
        set({ monetizationWorkspace: undefined });
      }
      const cycleMechanismPrimary =
        (newThesis.signals?.primary_mechanism_id as GrowthMechanismId | undefined) ??
        marketingProfile?.growth_mechanism_profile?.primary_mechanism_id;
      const cycleMechanismSecondary =
        marketingProfile?.growth_mechanism_profile?.secondary_mechanism_id ??
        (newThesis.signals?.secondary_mechanism_id as GrowthMechanismId | undefined);
      const cycleMechanismFlags = cycleMechanismPrimary
        ? resolveMechanismOperatorFlags(cycleMechanismPrimary, cycleMechanismSecondary)
        : undefined;
      const newLaneB = productBinding.active
        ? undefined
        : replanLaneBFromMemory(
            createLaneBWorkspaceFromThesis(newThesis, {
              opsCadence: newCadence,
              narrative: marketingProfile?.growth_narrative,
              laneBMode: resolveMechanismLaneBMode(cycleMechanismPrimary),
            }),
            memoryPreview,
            activeMemory,
          );
      const newDelegate =
        productBinding.active || (cycleMechanismFlags && !cycleMechanismFlags.delegate)
          ? null
          : createDelegateOperatorFromThesis(newThesis, {
              opsCadence: newCadence,
              week_index: nextWeekIndex,
            });
      const priorBudget = get().budgetPlan ?? marketingProfile?.budget_plan;
      const reallocatedBudget = priorBudget
        ? {
            ...applyBudgetReallocation(priorBudget, {
              mutations: memoryPreview.budget_mutations ?? [],
            }),
            thesis_id: newThesis.id,
          }
        : marketingProfile?.founder_fit
          ? buildBudgetAllocation(newThesis, marketingProfile.founder_fit)
          : undefined;

      let nextContinuous = applyNextCycleStarted(continuous!, delta, {
        weekIndex: nextWeekIndex,
        thesisId: newThesis.id,
        mode,
      });
      nextContinuous = productBinding.active
        ? {
            ...nextContinuous,
            marketing_paused: true,
            marketing_paused_reason: productBinding.headline,
            product_loop_started_at:
              nextContinuous.product_loop_started_at ?? new Date().toISOString(),
          }
        : {
            ...nextContinuous,
            marketing_paused: false,
            marketing_paused_reason: undefined,
          };

      track("cmo_cycle_restart", {
        week_index: nextWeekIndex,
        thesis_id: newThesis.id,
        mode,
        thesis_changed: delta.thesis_changed,
      });

      const base = marketingProfile ?? emptyMarketingProfile();
      set({
        channelThesis: newThesis,
        marketingProfile: { ...base, channel_thesis: newThesis },
      });
      void get().updateMarketingProfile({ channel_thesis: newThesis });

      syncContinuousState(nextContinuous);
      syncGrowthMemoryState(memoryApplied.memory);
      syncLaneAState(newLaneA);
      if (!productBinding.active) {
        bindAndSyncOpsCadence({
          cadence: newCadence,
          thesis: newThesis,
          project,
          laneAWorkspace: newLaneA,
          preferScoutForFirstSystem: true,
        });
      } else {
        syncOpsCadenceState(newCadence);
      }
      if (newLaneB) syncLaneBState(newLaneB);
      if (newDelegate) {
        syncDelegateState(newDelegate);
      } else if (cycleMechanismFlags && !cycleMechanismFlags.delegate) {
        set({ delegateWorkspace: undefined, delegateOperator: undefined });
        void get().updateMarketingProfile({
          delegate_operator: undefined,
          lane_c_workspace: undefined,
        });
      }
      if (reallocatedBudget) syncBudgetPlanState(reallocatedBudget);

      maybeSyncGa4OnCycleStart(nextWeekIndex);
      recomputeGrowthPlane();
      const priorDist =
        get().distributionOperator ?? marketingProfile?.distribution_operator;
      const priorInf =
        get().influencerOperator ?? marketingProfile?.influencer_operator;
      if (!productBinding.active) {
        const allowDist = cycleMechanismFlags ? Boolean(cycleMechanismFlags.distribution) : true;
        const allowInf = cycleMechanismFlags ? Boolean(cycleMechanismFlags.influencer) : true;
        if (allowDist) {
          maybeCreateDistributionOperator({
            week_index: nextWeekIndex,
            doubleDown: mode === "double_down",
            winningHookId:
              memoryPreview.operator_hints.winning_hook_id ??
              (mode === "double_down" ? priorDist?.verdict?.hook_id : undefined),
            character_mode: cycleMechanismFlags?.character_mode,
          });
        } else {
          set({ distributionOperator: undefined });
          void get().updateMarketingProfile({ distribution_operator: undefined });
        }
        if (allowInf) {
          maybeCreateInfluencerOperator({
            week_index: nextWeekIndex,
            doubleDown: mode === "double_down",
            winningPitchId:
              memoryPreview.operator_hints.winning_pitch_id ??
              (mode === "double_down" ? priorInf?.verdict?.pitch_id : undefined),
          });
        } else {
          set({ influencerOperator: undefined });
          void get().updateMarketingProfile({ influencer_operator: undefined });
        }
      } else {
        set({ distributionOperator: undefined, influencerOperator: undefined });
      }

      if (!productBinding.active) {
        bindAndSyncHumanExecution({
          cadence: get().opsCadence ?? newCadence,
          thesis: newThesis,
          laneB: get().laneBWorkspace ?? newLaneB,
          distributionOperator: get().distributionOperator,
          influencerOperator: get().influencerOperator,
          delegateOperator: get().delegateOperator ?? newDelegate,
        });
      }

      if (reallocatedBudget) {
        syncBudgetPlanState(
          seedActionCosts(reallocatedBudget, {
            laneB: get().laneBWorkspace,
            laneC: get().marketingProfile?.lane_c_workspace,
            distribution: get().distributionOperator,
            influencer: get().influencerOperator,
            delegate: get().delegateOperator,
            cadence: get().opsCadence,
          }),
        );
      }
      for (const kpi of rollupGrowthMemoryKpis(memoryApplied.memory, true)) {
        void get().upsertManualKpi(kpi);
      }

      get().advanceCampaignPhase({
        type: "cmo_cycle_restart",
        cycleIndex: nextWeekIndex,
        thesisTitle: newThesis.title,
      });

      set({
        phase: "workspace",
        route: "workspace",
        workspaceHandoff: undefined,
        warRoomExpanded: false,
        week1FocusMode: nextWeekIndex === 1,
      });
      get().setActiveCanvas("run");

      appendEvent({
        role: "agent",
        kind: "status",
        text: delta.headline,
      });
      appendEvent({
        role: "system",
        kind: "status",
        text: delta.rationale[0] ?? `${weekLabel(nextWeekIndex)} ops cadence ready.`,
      });

      const firstSystemCadenceTask = get().opsCadence?.tasks.find((t) => t.owner === "system");
      const firstUser = newThesis.week1_priorities.find((p) => p.owner === "user");

      if (firstUser) {
        appendEvent({
          role: "system",
          kind: "status",
          text: `Your move: ${firstUser.what} — Done when: ${firstUser.done_when}`,
        });
      }

      if (firstSystemCadenceTask && canRunAgent(get().runtime)) {
        get().executeOpsSystemTask(firstSystemCadenceTask.id);
      } else if (firstUser) {
        set({
          workspaceHandoff: {
            eyebrow: weekLabel(nextWeekIndex),
            title: firstUser.what,
            reason: `${firstUser.why} Done when: ${firstUser.done_when}`,
            primaryLabel: "Mark done",
            primaryAction: "ops_proof",
            opsTaskId: newCadence.tasks.find((t) => t.owner === "user")?.id,
          },
        });
      }

      return null;
    },

    openLaneBProofModal: (itemId) => set({ pendingLaneBProofItemId: itemId }),
    dismissLaneBProofModal: () => set({ pendingLaneBProofItemId: undefined }),

    completeLaneBItem: (itemId, proof) => {
      const workspace = get().laneBWorkspace;
      if (!workspace) return "No Lane B workspace.";
      const itemBefore = workspace.items.find((i) => i.id === itemId);
      const { workspace: next, error } = completeLaneBItemCore(workspace, itemId, proof);
      if (error) return error;
      syncLaneBState(next);
      tryCompleteLinkedOpsFromHumanProof(
        itemBefore?.linked_ops_task_id,
        laneBProofToOpsProof(proof),
      );
      const item = workspace.items.find((i) => i.id === itemId);
      track("lane_b_item_done", { item_id: itemId, mode: workspace.mode });
      appendEvent({
        role: "system",
        kind: "status",
        text: `✓ Lane B: ${item?.title ?? itemId}`,
      });
      return null;
    },

    skipLaneBItem: (itemId) => {
      const workspace = get().laneBWorkspace;
      if (!workspace) return;
      syncLaneBState(skipLaneBItemCore(workspace, itemId));
    },

    updateLaneBTarget: (itemId, patch) => {
      const workspace = get().laneBWorkspace;
      if (!workspace) return;
      syncLaneBState(updateLaneBTargetCore(workspace, itemId, patch));
    },

    openDelegateBriefModal: (briefId) => set({ pendingDelegateBriefId: briefId }),
    dismissDelegateBriefModal: () => set({ pendingDelegateBriefId: undefined }),
    openDelegateHireModal: (briefId) => set({ pendingDelegateHireBriefId: briefId }),
    dismissDelegateHireModal: () => set({ pendingDelegateHireBriefId: undefined }),
    openDelegateRubricModal: (rubricId) => set({ pendingDelegateRubricId: rubricId }),
    dismissDelegateRubricModal: () => set({ pendingDelegateRubricId: undefined }),

    handOffDelegateBrief: (briefId, input) => {
      const thesis = get().channelThesis ?? get().marketingProfile?.channel_thesis;
      const workspace = resolveDelegateOperator(
        get().delegateOperator ?? get().delegateWorkspace,
        thesis,
      );
      if (!workspace) return "No Lane C workspace.";
      if (!thesis) return "Channel thesis required for handoff.";
      const laneB = get().laneBWorkspace ?? get().marketingProfile?.lane_b_workspace ?? null;
      const { workspace: next, laneB: syncedLaneB, error } = prepareDelegateHandoff(
        workspace,
        briefId,
        input,
        thesis,
        laneB,
      );
      if (error) return error;
      syncDelegateState(next);
      if (syncedLaneB) syncLaneBState(syncedLaneB);
      const bundle = buildDelegateHandoffBundle(next, thesis, briefId, syncedLaneB ?? laneB);
      if (bundle?.markdown) {
        const parts = [bundle.markdown];
        if (bundle.hire_markdown) parts.push(bundle.hire_markdown);
        if (bundle.rubric_schedule) parts.push(`## Rubric schedule\n${bundle.rubric_schedule}`);
        void navigator.clipboard.writeText(parts.join("\n\n---\n\n"));
      }
      const brief = workspace.briefs.find((b) => b.id === briefId);
      track("delegate_brief_handoff", { brief_id: briefId, role: brief?.role });
      appendEvent({
        role: "system",
        kind: "status",
        text: `Handed off to ${input.assignee_name}: ${brief?.title ?? briefId}`,
      });
      recomputeGrowthPlane();
      return null;
    },

    completeDelegateRubricDay: (rubricId, input) => {
      const thesis = get().channelThesis ?? get().marketingProfile?.channel_thesis;
      const workspace = resolveDelegateOperator(
        get().delegateOperator ?? get().delegateWorkspace,
        thesis,
      );
      if (!workspace || !thesis) return "No delegate operator active.";
      const { workspace: next, error } = completeRubricDayCore(workspace, rubricId, input, thesis);
      if (error) return error;
      syncDelegateState(next);
      recomputeGrowthPlane();
      return null;
    },

    completeDelegateBrief: (briefId, proof) => {
      const thesis = get().channelThesis ?? get().marketingProfile?.channel_thesis;
      const workspace = resolveDelegateOperator(
        get().delegateOperator ?? get().delegateWorkspace,
        thesis,
      );
      if (!workspace) return "No Lane C workspace.";
      if (!thesis) return "Channel thesis required.";
      const { workspace: next, error } = completeDelegateBriefCore(workspace, briefId, proof);
      if (error) return error;
      let finalWs = migrateToOperatorWorkspace(next, thesis);
      const brief = finalWs.briefs.find((b) => b.id === briefId);
      if (brief && thesis && proof.note?.trim()) {
        const imported = importDelegateDelivery(finalWs, brief, proof, {
          thesis,
          laneB: get().laneBWorkspace ?? get().marketingProfile?.lane_b_workspace,
          influencerOperator:
            get().influencerOperator ?? get().marketingProfile?.influencer_operator,
          distributionOperator:
            get().distributionOperator ?? get().marketingProfile?.distribution_operator,
        });
        if (imported.laneB) syncLaneBState(imported.laneB);
        if (imported.influencerOperator) {
          syncInfluencerOperatorState(imported.influencerOperator);
          const laneB = get().laneBWorkspace ?? get().marketingProfile?.lane_b_workspace;
          if (laneB) {
            const synced = syncLaneBFromInfluencerOperator(imported.influencerOperator, laneB);
            syncInfluencerOperatorState(synced.workspace);
            syncLaneBState(synced.laneB);
          }
        }
        if (imported.distributionOperator) {
          syncDistributionOperatorState(imported.distributionOperator);
        }
        if (imported.imported > 0) {
          appendEvent({
            role: "system",
            kind: "status",
            text: `Imported ${imported.imported} row(s) from delegate delivery.`,
          });
        }
        if (imported.errors.length) {
          appendEvent({
            role: "system",
            kind: "status",
            text: imported.errors[0]!,
          });
        }
      }
      const kpis = rollupDelegateKpis(finalWs);
      for (const kpi of kpis) {
        void get().upsertManualKpi(kpi);
      }
      syncDelegateState(finalWs);
      track("delegate_brief_done", { brief_id: briefId, role: brief?.role });
      appendEvent({
        role: "system",
        kind: "status",
        text: `✓ Lane C delivered: ${brief?.title ?? briefId}`,
      });
      recomputeGrowthPlane();
      return null;
    },

    skipDelegateBrief: (briefId, reason) => {
      const thesis = get().channelThesis ?? get().marketingProfile?.channel_thesis;
      const workspace = resolveDelegateOperator(
        get().delegateOperator ?? get().delegateWorkspace,
        thesis,
      );
      if (!workspace) return;
      const skipped = skipDelegateBriefCore(workspace, briefId, reason);
      syncDelegateState({ ...workspace, briefs: skipped.briefs });
    },

    connectGa4: async () => {
      const { settings, auth, activeProjectId, project } = get();
      const pid = activeProjectId ?? project?.id;
      if (!pid) {
        appendEvent({ role: "system", kind: "error", text: "Open a project before connecting GA4." });
        return;
      }
      try {
        const { authUrl } = await apiStartGa4Connect(settings, auth.authEnabled, pid);
        await window.api.shell.openExternal(authUrl);
        appendEvent({
          role: "system",
          kind: "status",
          text: "Complete GA4 sign-in in your browser, then return here. Metrics sync automatically.",
        });
        window.setTimeout(() => {
          void get().loadMarketingProfile(pid);
          void get().syncGa4Metrics();
        }, 6000);
      } catch (err) {
        appendEvent({
          role: "agent",
          kind: "error",
          text:
            err instanceof StreamHttpError && err.status === 501
              ? "GA4 OAuth is not configured on this server yet. Log KPIs manually in Plan Studio."
              : errorMessage(err),
        });
      }
    },

    syncGa4Metrics: async () => {
      const { settings, auth, activeProjectId, project } = get();
      const pid = activeProjectId ?? project?.id;
      if (!pid) return;
      try {
        const { profile } = await apiSyncGa4Metrics(settings, auth.authEnabled, pid);
        set({ marketingProfile: profile });
        get().refreshConnectorFeed();
        recomputeGrowthPlane();
        appendEvent({
          role: "system",
          kind: "status",
          text: "GA4 metrics synced.",
        });
      } catch (err) {
        appendEvent({
          role: "agent",
          kind: "error",
          text:
            err instanceof StreamHttpError && err.status === 501
              ? "GA4 is not configured on this server. Log KPIs manually in Plan Studio."
              : errorMessage(err),
        });
      }
    },

    previewPlanOutline: () => {
      const { project } = get();
      if (!project) return;
      get().startCampaignSession();
      get().advanceCampaignPhase({ type: "plan_generate_start" });
      const outline = buildOfflinePlanOutline(project, { persona: get().settings.persona });
      const snapshot = emptyProgressSnapshot(outline);
      applyProgressSnapshot(snapshot);
      void persistProgressSnapshot(snapshot);
      set({
        plan: outline,
        planPreviewMode: true,
        planError: null,
        canvas: { mode: "campaign-plan" },
        activePlanRowId: outline.id,
      });
      get().advanceCampaignPhase({ type: "plan_generate_success", planId: outline.id });
      track("plan_preview_outline");
    },

    clearDemoFeed: () => {
      setDemoConnectorsEnabled(false);
      set((s) => ({
        feedItems: s.feedItems.filter((i) => !i.isDemo),
        activeFeedItemId: s.feedItems.some((f) => f.id === s.activeFeedItemId && f.isDemo)
          ? undefined
          : s.activeFeedItemId,
      }));
      const { activeProjectId } = get();
      if (activeProjectId) {
        try {
          localStorage.removeItem(`${DEMO_CONNECTOR_FEED_PREFIX}.${activeProjectId}`);
        } catch {
          // ignore
        }
      }
    },

    refreshConnectorFeed: () => {
      const { activeProjectId, project } = get();
      const pid = activeProjectId ?? project?.id;
      if (!pid) return;
      set((s) => ({
        feedItems: s.feedItems.filter(
          (f) => !f.isDemo && f.source !== "connector" && !isConnectorFeedPlaceholder(f),
        ),
        activeFeedItemId: s.feedItems.some(
          (f) => f.id === s.activeFeedItemId && (f.isDemo || f.source === "connector" || isConnectorFeedPlaceholder(f)),
        )
          ? undefined
          : s.activeFeedItemId,
      }));
      try {
        localStorage.removeItem(`${DEMO_CONNECTOR_FEED_PREFIX}.${pid}`);
      } catch {
        // ignore
      }
      if (isDemoConnectorsAllowed()) {
        get().seedMockConnectorFeed();
      } else {
        get().seedConnectorFeedPlaceholder();
      }
    },

    updateSettings: async (patch) => {
      const settings = await window.api.settings.set(patch);
      if (patch.telemetry !== undefined) setAnalyticsEnabled(settings.telemetry);
      if (patch.theme !== undefined) initTheme(migrateTheme(settings.theme));
      set({ settings });
      if (patch.serverUrl !== undefined || patch.apiToken !== undefined) {
        void get().checkConnection();
      }
    },

    continueOffline: () => {
      track("continue_offline");
      set({ localOnlyMode: true, initPhase: "done", initError: undefined });
      get().syncRuntimeCapability();
    },

    openProject: async (source, opts) => {
      set({ scanning: true, scanError: undefined, scanProgress: { message: "Starting scan…", pct: 5 } });
      const unsub = window.api.project.onScanProgress((p) => set({ scanProgress: p }));
      try {
        const project = await window.api.project.scan(source);
        track("project_open", { framework: project.framework });
        void window.api.cache.set("lastProject", { profile: project });
        const toWorkspace = opts?.workspace === true;
        const patchedProfile = profileFromProjectScan(project, emptyMarketingProfile());
        lastGrowthAlignmentNote = undefined;
        lastDistributionVerdictHeadline = undefined;
        set({
          project,
          scanning: false,
          scanProgress: undefined,
          phase: toWorkspace ? "workspace" : "reveal",
          route: "workspace",
          plan: null,
          planError: null,
          planStatus: "",
          thread: [],
          canvas: { mode: toWorkspace ? "empty" : "empty" },
          activeProjectId: project.id,
          activeSessionId: undefined,
          marketingProfile: patchedProfile,
          channelThesis: undefined,
          opsCadence: undefined,
          laneBWorkspace: undefined,
          laneAWorkspace: undefined,
          productActivation: undefined,
          laneDWorkspace: undefined,
          revenueProfile: undefined,
          monetizationWorkspace: undefined,
          pendingMonetizationTaskId: undefined,
          pendingMonetizationIssueTaskId: undefined,
          pendingRevenueAttributionSourceId: undefined,
          pendingProductRequestId: undefined,
          pendingProductIssueRequestId: undefined,
          growthControlPlane: undefined,
          distributionOperator: undefined,
          pendingDistributionProofSlotId: undefined,
          influencerOperator: undefined,
          pendingInfluencerProofTouchId: undefined,
          pendingInfluencerDealTouchId: undefined,
          warRoomExpanded: false,
          delegateWorkspace: undefined,
          delegateOperator: undefined,
          pendingDelegateBriefId: undefined,
          cmoContinuous: undefined,
          growthMemory: undefined,
          pendingLaneBProofItemId: undefined,
          pendingOpsProofTaskId: undefined,
          firstShipAt: loadFirstShipAt(project.id),
          firstHourActive: !loadFirstShipAt(project.id),
          onboardingTrack: loadOnboardingTrack(project.id),
          firstShipLedger: loadFirstShipLedger(project.id),
          lastShipReceipt: loadShipReceipt(project.id),
          executionMetrics: loadExecutionMetrics(project.id) ?? {
            projectId: project.id,
            projectOpenedAt: Date.now(),
            rows: [],
          },
          projectOpenedAt: Date.now(),
          wedgePhase: loadFirstShipAt(project.id) ? "shipped" : "scan",
          shipPipeline: initialShipPipelineState(),
          sessionOutcomes: loadSessionOutcomesLocal(project.id),
          lastTurnReceipt: undefined,
          lastAskAssets: [],
          lastAnswerText: undefined,
        });
        hydrateTurnReceiptLocal(project.id);
        const cwd =
          project.source.kind === "folder" ? project.source.path : project.localPath;
        if (cwd) {
          void window.api.index.enqueue({
            type: "index.full",
            projectId: project.id,
            cwd,
          });
        }
        get().refreshConnectorFeed();
        void get().loadMarketingProfile(project.id);
        hydrateCampaignSessionLocal(project.id);
        hydrateOpsCadenceLocal(project.id);
        hydrateLaneBLocal(project.id);
        hydrateLaneALocal(project.id);
        hydrateContinuousLocal(project.id);
        hydrateGrowthMemoryLocal(project.id);
        hydrateDelegateLocal(project.id);
        hydrateGrowthPlaneLocal(project.id);
        hydrateDistributionOperatorLocal(project.id);
        hydrateInfluencerOperatorLocal(project.id);
        hydrateBudgetPlanLocal(project.id);
        hydrateProductActivationLocal(project.id);
        hydrateLaneDLocal(project.id);
        hydrateRevenueProfileLocal(project.id);
        hydrateMonetizationWorkspaceLocal(project.id);
        void get().loadRunsArchive();
        void get().refreshRecents();
        // Persist to the backend so the project syncs across devices (best-effort).
        void (async () => {
          try {
            const { settings, auth } = get();
            const { project: created } = await apiCreateProject(settings, auth.authEnabled, {
              name: project.name,
              source: toServerSource(project.source),
              framework: project.framework,
              productType: project.productType,
              profileJson: project,
            });
            set({ activeProjectId: created.id });
            const mp = get().marketingProfile;
            if (mp) void get().updateMarketingProfile(mp);
            get().refreshConnectorFeed();
            void get().loadMarketingProfile(created.id);
            swallowBackground("syncProjects", get().syncProjects());
            if (project.source.kind === "repo" || project.source.kind === "url") {
              void apiScanProject(settings, auth.authEnabled, created.id)
                .then(({ project: scanned }) => {
                  set({ project: profileFromServer(scanned) });
                })
                .catch((err) => reportBackgroundError("apiScanProject", err, "debug"));
            }
          } catch (err) {
            reportBackgroundError("openServerProject", err, "debug");
          }
        })();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        set({ scanning: false, scanProgress: undefined, scanError: message });
        appendEvent({
          role: "system",
          kind: "error",
          text: `Could not open project: ${message}`,
        });
      } finally {
        unsub();
      }
    },

    openFolderDialog: async () => {
      const source = await window.api.dialog.openProjectFolder();
      if (!source) return;
      await get().openProject(source);
    },

    openProjectPicker: () => {
      set({ phase: "onboarding" });
    },

    newSession: () => {
      browserSocket.stop();
      set((s) => ({
        thread: [],
        canvas: { mode: "empty" },
        activeSessionId: undefined,
        browser: { ...s.browser, running: false, frame: undefined, pendingApprovalId: undefined, pendingSummary: undefined },
      }));
    },

    createNewSession: async () => {
      const { settings, auth, activeProjectId } = get();
      get().newSession();
      if (!activeProjectId) return;
      try {
        const { session } = await apiCreateSession(settings, auth.authEnabled, {
          projectId: activeProjectId,
          title: "New session",
        });
        set({ activeSessionId: session.id });
        await get().syncSessions(activeProjectId);
      } catch {
        /* offline */
      }
    },

    resumeSession: async (sessionId) => {
      const { settings, auth, activeProjectId } = get();
      set({ activeSessionId: sessionId, thread: [], canvas: { mode: "empty" } });
      try {
        const [{ messages }, { latest }] = await Promise.all([
          apiListMessages(settings, auth.authEnabled, sessionId),
          activeProjectId
            ? apiListPlans(settings, auth.authEnabled, activeProjectId)
            : Promise.resolve({ latest: null, plans: [] }),
        ]);
        const restored: SessionEvent[] = [];
        let legacyCount = 0;
        for (const m of messages) {
          const content = (m.content_json ?? {}) as AgentTurnPersist & {
            text?: string;
            assets?: MarketingAsset[];
          };
          const ts = m.ts ? new Date(m.ts).getTime() : Date.now();
          if (m.role === "user") {
            restored.push({
              id: makeEventId(),
              ts,
              role: "user",
              kind: "text",
              text: content.text ?? "",
            });
          } else if (m.role === "agent") {
            if (content.kind) {
              for (const ev of restoreEventsFromPersist(content, makeEventId)) {
                restored.push({ ...ev, ts });
              }
            } else {
              legacyCount += 1;
              if (content.text) {
                restored.push({
                  id: makeEventId(),
                  ts,
                  role: "agent",
                  kind: "text",
                  text: content.text,
                });
              }
              for (const asset of content.assets ?? []) {
                restored.push({ id: makeEventId(), ts, role: "agent", kind: "asset", asset });
              }
            }
          }
        }
        const preview = previewFromThread(restored);
        set({
          thread: restored,
          sessionLegacyMessageCount: legacyCount,
          sessionPreviews: preview
            ? { ...get().sessionPreviews, [sessionId]: preview }
            : get().sessionPreviews,
          plan: latest?.plan_json ? normalizePlan(latest.plan_json as MarketingPlan) ?? latest.plan_json : get().plan,
          canvas: latest?.plan_json ? { mode: "campaign-plan" } : { mode: restored.length ? "empty" : "empty" },
        });
      } catch (err) {
        appendEvent({
          role: "system",
          kind: "error",
          text: `Could not restore session: ${errorMessage(err)}`,
        });
      }
    },

    deleteSession: async (sessionId) => {
      const { settings, auth, activeProjectId, activeSessionId } = get();
      try {
        await apiDeleteSession(settings, auth.authEnabled, sessionId);
        if (activeProjectId) await get().syncSessions(activeProjectId);
        if (activeSessionId === sessionId) get().newSession();
      } catch {
        /* ignore */
      }
    },

    renameSession: async (sessionId, title) => {
      const { settings, auth, activeProjectId } = get();
      try {
        await apiPatchSession(settings, auth.authEnabled, sessionId, title);
        if (activeProjectId) await get().syncSessions(activeProjectId);
      } catch {
        /* ignore */
      }
    },

    cancelPlan: () => {
      planAbort?.abort();
      planAbort = null;
      set({
        planLoading: false,
        planStatus: "",
        planGenerationPhase: "idle",
        planLoadingPlaybookIds: [],
      });
    },

    cancelAgent: () => {
      const run = get().run;
      if (run?.kind === "ask" && run.runId) {
        void window.api.runs.interrupt(run.runId);
      }
      agentAbort?.abort();
      agentAbort = null;
      if (askFoldSession) {
        finalizeAskFold(askFoldSession, buildAskFoldDeps());
        askFoldSession = null;
      }
      set({ agentStreaming: false });
    },

    previewFile: async (relPath) => {
      const { project } = get();
      if (!project || project.source.kind !== "folder") return;
      set((s) => ({
        canvas: { ...s.canvas, mode: "file", previewPath: relPath, previewContent: undefined },
      }));
      try {
        const content = await window.api.fs.read(project.source.path, relPath);
        set((s) => ({ canvas: { ...s.canvas, previewContent: content } }));
      } catch (err) {
        set((s) => ({
          canvas: {
            ...s.canvas,
            previewContent: err instanceof Error ? err.message : String(err),
          },
        }));
      }
    },

    toggleHistory: (open) => set((s) => ({ historyOpen: open ?? !s.historyOpen })),
    setSidebarTab: (tab) => {
      try {
        localStorage.setItem(SIDEBAR_TAB_KEY, tab);
      } catch {
        // ignore
      }
      set({ sidebarTab: tab });
    },

    closeProject: () => {
      browserSocket.stop();
      void window.api.cache.set("lastProject", null);
      set({
        project: null,
        plan: null,
        planError: null,
        planStatus: "",
        planLoading: false,
        planPreviewMode: false,
        thread: [],
        canvas: { mode: "empty" },
        feedItems: [],
        activeFeedItemId: undefined,
        selectedRailSection: null,
        selectedRailEntityId: undefined,
        planProgress: null,
        activePlanRowId: undefined,
        highlightPlanTaskId: undefined,
        activePlanTaskId: undefined,
        planTaskStatus: {},
        browser: { running: false, autoApprove: false, findings: [], frameHistory: [] },
        run: null,
        phase: "onboarding",
        activeProjectId: undefined,
        activeSessionId: undefined,
        sessions: [],
        marketingProfile: null,
      });
    },

    refreshRecents: async () => {
      const recents = await window.api.project.recents().catch(() => [] as RecentProject[]);
      set({ recents });
    },

    generatePlan: async () => {
      const { project, settings, planLoading, auth, activeProjectId, connection } = get();
      if (!project || planLoading) return;

      // Same guards as sendMessage so users see useful banners instead of fetch noise.
      if (!canRunAgent(get().runtime)) {
        appendPresentedError(
          get().runtime === "degraded"
            ? "anthropic_not_configured"
            : "not connected to backend",
        );
        return;
      }
      if (settings.provider === "openai") {
        appendPresentedError("Plan Studio requires Anthropic (Claude). Switch provider in Settings.");
        return;
      }
      if (!connection.providers?.anthropic) {
        appendPresentedError("anthropic_not_configured");
        return;
      }
      if (quotaBlocked(auth, "plan")) {
        appendPresentedError("Monthly plan quota reached.");
        return;
      }
      const { tierFeatures } = get();
      if (tierFeatureBlocked(tierFeatures, "ai_plan")) {
        appendPresentedError(
          tierBlockedMessage("ai_plan", normalizeTier(auth.user?.tier)),
        );
        return;
      }
      if (auth.authEnabled) {
        const token = await resolveBackendToken(settings, auth.authEnabled);
        if (!token) {
          appendPresentedError("Sign in required to generate a plan.");
          set({ authError: "Please sign in again." });
          return;
        }
      }

      planAbort?.abort();
      planAbort = new AbortController();
      const slowBeat = setTimeout(() => {
        if (get().planLoading && !get().planError) {
          set({
            planStatus: "Still working — complex repos can take up to 2 minutes…",
          });
        }
      }, 45_000);
      const hardTimeout = setTimeout(() => {
        if (!get().planLoading) return;
        planAbort?.abort();
        const msg =
          "Plan generation timed out after 2 minutes. Retry generation, or preview an offline outline.";
        set({
          planError: msg,
          planLoading: false,
          planGenerationPhase: "idle",
          planStatus: "",
          planLoadingPlaybookIds: [],
        });
        appendEvent({ role: "agent", kind: "error", text: msg });
      }, 120_000);
      appendEvent({ role: "user", kind: "text", text: `Generate a ${get().settings.planHorizon ?? 30}-day launch plan.` });
      get().startCampaignSession();
      get().advanceCampaignPhase({ type: "plan_generate_start" });
      set({
        planLoading: true,
        planError: null,
        planStatus: "Connecting…",
        planPreviewMode: false,
        planGenerationPhase: "idle",
        planLoadingPlaybookIds: [],
        planStatusLog: appendPlanStatusLine(
          [],
          { kind: "connect", message: "Connecting to plan studio…" },
          makeEventId,
        ),
        planOutlinePlaybooks: [],
        planStreamingPlaybooks: [],
        planStreamingThesis: undefined,
        planStreamingNarrative: undefined,
        planStreamingReadiness: [],
        planJustGenerated: false,
        planMilestones: {},
        canvas: { mode: "campaign-plan" },
      });
      track("plan_generate", { provider: settings.provider });

      let inlineError: string | null = null;
      try {
        await streamPlan(
          settings,
          {
            profile: project,
            projectId: activeProjectId,
            persona: settings.persona,
            planHorizon: settings.planHorizon ?? 30,
          },
          auth.authEnabled,
          (e) => {
            if (e.type === "status") {
              set((s) => {
                const stubId = stubIdFromStructuringMessage(e.message, s.planOutlinePlaybooks);
                const loadingIds = stubId
                  ? s.planLoadingPlaybookIds.includes(stubId)
                    ? s.planLoadingPlaybookIds
                    : [...s.planLoadingPlaybookIds, stubId]
                  : s.planLoadingPlaybookIds;
                return {
                  planStatus: e.message,
                  planLoadingPlaybookIds: loadingIds,
                  planStatusLog: appendPlanStatusLine(
                    s.planStatusLog,
                    { kind: "status", message: e.message, playbookId: stubId },
                    makeEventId,
                  ),
                };
              });
            } else if (e.type === "plan.outline") {
              const firstStub = e.playbooks[0]?.id;
              set((s) => ({
                planGenerationPhase: "outline",
                planOutlinePlaybooks: e.playbooks,
                planStreamingThesis: e.thesis,
                planStreamingNarrative: e.narrativeHook,
                planLoadingPlaybookIds: firstStub ? [firstStub] : [],
                planStatus: "Playbook structure ready…",
                planStatusLog: appendPlanStatusLine(
                  s.planStatusLog,
                  {
                    kind: "outline",
                    message: `Playbook structure ready (${e.playbooks.length} tracks)`,
                  },
                  makeEventId,
                ),
              }));
            } else if (e.type === "plan.playbook") {
              set((s) => {
                const streamingPlaybooks = [
                  ...s.planStreamingPlaybooks.filter((p) => p.id !== e.playbook.id),
                  e.playbook,
                ];
                const filled = new Set(streamingPlaybooks.map((p) => p.id));
                const nextLoading = s.planOutlinePlaybooks
                  .filter((stub) => !filled.has(stub.id))
                  .map((stub) => stub.id);
                return {
                  planGenerationPhase: "playbooks",
                  planStatus: `Structured ${e.playbook.title}`,
                  planStreamingPlaybooks: streamingPlaybooks,
                  planLoadingPlaybookIds: nextLoading,
                  planStatusLog: appendPlanStatusLine(
                    s.planStatusLog,
                    {
                      kind: "playbook",
                      message: `Structured ${e.playbook.title}`,
                      playbookId: e.playbook.id,
                    },
                    makeEventId,
                  ),
                };
              });
            } else if (e.type === "plan.readiness") {
              set((s) => ({
                planGenerationPhase: "finalizing",
                planStatus: "Scoring launch readiness…",
                planStreamingReadiness: e.readiness ?? [],
                planLoadingPlaybookIds: [],
                planStatusLog: appendPlanStatusLine(
                  s.planStatusLog,
                  { kind: "readiness", message: "Scoring launch readiness" },
                  makeEventId,
                ),
              }));
            } else if (e.type === "plan") {
              const normalized = normalizePlan(e.plan);
              const planDoc = normalized ?? e.plan;
              get().recordSessionOutcome({
                kind: "plan",
                label: "Launch plan generated",
                channel: "plan studio",
              });
              const planId = planDoc.id;
              get().advanceCampaignPhase({ type: "plan_generate_success", planId });
              const snapshot = emptyProgressSnapshot(planDoc);
              applyProgressSnapshot(snapshot);
              void persistProgressSnapshot(snapshot);
              set({
                plan: planDoc,
                planGenerationPhase: "idle",
                planLoadingPlaybookIds: [],
                planOutlinePlaybooks: [],
                planStreamingPlaybooks: [],
                planStreamingReadiness: [],
                planJustGenerated: true,
                planStatusLog: [],
                activePlanRowId: planId,
              });
            } else if (e.type === "error") {
              // Plan SSE errors are now surfaced in BOTH the canvas AND the chat thread,
              // so users never wonder why "nothing happened" after a long wait.
              const presented = presentError(e.message);
              inlineError = presented.message;
              set({ planError: presented.message });
              appendEvent({ role: "agent", kind: "error", text: presented.message });
            } else if (e.type === "usage") {
              set((s) => {
                if (!s.auth.usage) return s;
                return {
                  auth: {
                    ...s.auth,
                    usage: {
                      ...s.auth.usage,
                      plan: s.auth.usage.plan + 1,
                      tokens_in: s.auth.usage.tokens_in + e.tokens_in,
                      tokens_out: s.auth.usage.tokens_out + e.tokens_out,
                      cost_cents: s.auth.usage.cost_cents + e.cost_cents,
                    },
                  },
                };
              });
            }
          },
          planAbort.signal,
        );
        if (!get().planError && !inlineError) {
          const p = get().plan ? normalizePlan(get().plan) : null;
          const progress = get().planProgress;
          const startHere =
            p && progress
              ? resolvePlanDeepLink({ plan: p, planProgress: progress })
              : null;
          const playbookLinks =
            p?.playbooks
              .slice(0, 6)
              .map((pb) =>
                `- ${planPlaybookMarkdownLink(pb.id, pb.title, p, progress)}`,
              )
              .join("\n") ?? "";
          const startLine = startHere
            ? `\n\n**Start here:** [${startHere.label}](plan-task://${startHere.taskId})`
            : "";
          appendEvent({
            role: "agent",
            kind: "text",
            text: p
              ? `## Plan Studio ready\n\n**Thesis:** ${p.thesis ?? p.positioning.slice(0, 160)}\n\n${p.playbooks.length} playbooks · ${p.taskGraph.length} tasks — progress saves automatically.\n\n**Playbooks:**\n${playbookLinks}${startLine}\n\n[Open Plan Studio](surface://campaign-plan)`
              : "Launch plan is ready — [open Plan Studio](surface://campaign-plan).",
          });
        }
        swallowBackground("loadMe", get().loadMe());
        void get().loadPlanHistory().then(() => {
          const row = get().planHistory[0];
          if (row) {
            set({ activePlanRowId: row.id });
            void get().loadPlanProgress(row.id);
          } else {
            const planId = get().plan?.id;
            if (planId) void get().loadPlanProgress(planId);
          }
        });
      } catch (err) {
        if (planAbort.signal.aborted) {
          appendEvent({ role: "system", kind: "status", text: "Plan generation stopped." });
          return;
        }
        const raw = err instanceof Error ? err.message : String(err);
        if (err instanceof AuthError) set({ authError: raw });
        const presented = presentError(raw);
        set({ planError: presented.message });
        appendEvent({ role: "agent", kind: "error", text: presented.message });
      } finally {
        clearTimeout(slowBeat);
        clearTimeout(hardTimeout);
        planAbort = null;
        set((s) =>
          s.planLoading
            ? {
                planLoading: false,
                planStatus: "",
                planGenerationPhase: "idle",
              }
            : s,
        );
      }
    },

    sendMessage: async (text, opts) => {
      const trimmed = text.trim();
      const proactive = opts?.context?.proactive_trigger;
      if (!trimmed && !proactive) return;
      if (!proactive && get().agentStreaming) return;

      const { settings, project, auth, activeProjectId, connection } = get();
      if (!canRunAgent(get().runtime)) {
        if (!proactive && trimmed && activeProjectId) {
          if (!opts?.silent) {
            appendEvent({ role: "user", kind: "text", text: trimmed });
          }
          enqueueOutbox(activeProjectId, {
            text: trimmed,
            silent: true,
            context: opts?.context,
          });
          set({ outboxCount: outboxCount(activeProjectId) });
          appendEvent({
            role: "system",
            kind: "status",
            text: "Message queued — will send when connected.",
          });
          return;
        }
        if (!proactive) {
          appendPresentedError(
            get().runtime === "degraded"
              ? "anthropic_not_configured"
              : "not connected to backend",
          );
        }
        return;
      }
      const providerReady =
        settings.provider === "anthropic"
          ? connection.providers?.anthropic
          : connection.providers?.openai;
      if (!providerReady) {
        if (!proactive) {
          appendPresentedError(
            settings.provider === "anthropic" ? "anthropic_not_configured" : "OpenAI is not configured on the server.",
          );
        }
        return;
      }
      if (!proactive && quotaBlocked(auth, "agent")) {
        appendPresentedError("Monthly agent quota reached.");
        return;
      }
      const { tierFeatures } = get();
      if (!proactive && tierFeatureBlocked(tierFeatures, "ai_agent")) {
        appendPresentedError(
          tierBlockedMessage("ai_agent", normalizeTier(auth.user?.tier)),
        );
        return;
      }
      if (!opts?.silent && trimmed) {
        appendEvent({ role: "user", kind: "text", text: trimmed });
      }

      // Ensure a backend session exists so the turn is persisted (best-effort).
      let sessionId = get().activeSessionId;
      if (!sessionId && activeProjectId) {
        try {
          const { session } = await apiCreateSession(settings, auth.authEnabled, {
            projectId: activeProjectId,
          });
          sessionId = session.id;
          set({ activeSessionId: sessionId });
        } catch {
          // No persistence — continue stateless.
        }
      }

      const historyRaw = buildAgentHistory(get().thread.slice(0, -1));
      const historyBudget = Math.floor(DEFAULT_CONTEXT_LIMIT * 0.45);
      const history = trimHistoryToBudget(historyRaw, historyBudget);

      const thinkingEventId = appendEvent({
        role: "agent",
        kind: "thinking",
        thinkingPhase: "Thinking",
        thinkingText: "Understanding your request…",
      });

      set({
        agentStreaming: true,
        suggestedComposerMode: undefined,
        lastAgentUserMessage: trimmed || undefined,
        run: {
          runId: "",
          goal: trimmed || "(proactive)",
          status: "running",
          kind: "ask",
          events: [],
          lastSeq: 0,
          policy: DEFAULT_PERMISSION_POLICY,
          startedAt: Date.now(),
        },
        canvas: { mode: get().canvas.mode === "empty" ? "run" : get().canvas.mode },
      });

      askFoldSession = createAskFoldSession({
        runId: "",
        thinkingEventId,
        proactive: Boolean(proactive),
        trimmed,
        activeProjectId: activeProjectId ?? null,
      });

      const { planProgress, settings: st, canvas, activePlaybookId, plan, marketingProfile } = get();
      const activeSurface = normalizeToWorkSurface(canvas.mode) ?? undefined;
      const planProgressSummary = buildPlanProgressSummaryForAgent({
        plan: get().plan,
        planProgress,
        activePlaybookId,
      });
      const planSnapshotRaw = plan ? normalizePlan(plan) ?? plan : undefined;
      const planSnapshot = planSnapshotRaw
        ? (compactPlanSnapshot(planSnapshotRaw) as typeof planSnapshotRaw)
        : undefined;
      const agentContext =
        opts?.context ??
        buildAgentTurnContext({
          run: get().run,
          plan: get().plan,
          planProgress,
          campaignSession: get().marketingProfile?.campaign_session ?? null,
        });

      try {
        const token = await resolveBackendToken(settings, auth.authEnabled);
        const cwd = projectAgentCwd(project) ?? ".";
        const mentions = parseMentionsFromText(trimmed);
        const { runId } = await window.api.runs.start({
          projectId: activeProjectId ?? "local",
          cwd,
          intent: { kind: "ask", prompt: trimmed || "(proactive)", mentions },
          sessionId: sessionId ?? undefined,
          serverUrl: settings.serverUrl,
          sessionToken: token,
          persona: st.persona,
          marketingProfile: marketingProfile ?? undefined,
          ask: {
            history,
            planSnapshot,
            planProgressSummary,
            context: agentContext,
            activeSurface,
            provider: settings.provider,
          },
        });
        if (askFoldSession) askFoldSession.runId = runId;
        set((s) =>
          s.run?.kind === "ask"
            ? { run: { ...s.run, runId, status: "running" } }
            : s,
        );
      } catch (err) {
        finalizeAskFold(askFoldSession, buildAskFoldDeps());
        askFoldSession = null;
        const raw = err instanceof Error ? err.message : String(err);
        if (err instanceof AuthError) set({ authError: raw });
        if (!proactive && trimmed && activeProjectId && isNetworkFailure(err)) {
          enqueueOutbox(activeProjectId, {
            text: trimmed,
            silent: true,
            context: opts?.context,
          });
          set({ outboxCount: outboxCount(activeProjectId) });
          appendEvent({
            role: "system",
            kind: "status",
            text: "Message queued — will send when connected.",
          });
        } else {
          appendPresentedError(raw);
        }
        set({ agentStreaming: false, run: null });
      }
    },

    requestProactiveSuggestion: (trigger, extra) => {
      if (get().agentStreaming) return;
      const context = buildAgentTurnContext({
        run: get().run,
        plan: get().plan,
        planProgress: get().planProgress,
        campaignSession: get().marketingProfile?.campaign_session ?? null,
        proactive_trigger: trigger,
        lastAppliedSummary: extra?.lastAppliedSummary,
      });
      if (!context?.proactive_trigger) return;
      void get().sendMessage("", { silent: true, context });
    },

    executeProactiveAction: (action) => {
      switch (action.kind) {
        case "continue_plan":
          if (action.taskId) {
            get().focusPlanTask({
              playbookId: action.playbookId,
              taskId: action.taskId,
              startRun: true,
            });
          } else {
            get().navigate("workspace");
            get().setWorkSurface("campaign-plan");
            get().setActiveCanvas("campaign-plan");
          }
          break;
        case "log_kpi":
          get().openKpiLog(action.presetId ?? "waitlist");
          break;
        case "focus_run":
          get().navigate("workspace");
          get().setActiveCanvas("run");
          break;
        case "open_plan":
          get().navigate("workspace");
          get().setWorkSurface("campaign-plan");
          get().setActiveCanvas("campaign-plan");
          break;
        case "generate_plan":
          get().navigate("workspace");
          get().setWorkSurface("campaign-plan");
          get().setActiveCanvas("campaign-plan");
          void get().generatePlan();
          break;
        default:
          break;
      }
    },

    runBrowserTask: (task, opts) => {
      const trimmed = task.trim();
      if (!trimmed) return;
      const { plan, activePlaybookId, activePlanTaskId, highlightPlanTaskId } = get();
      const taskId = activePlanTaskId ?? highlightPlanTaskId;
      if (isExecutionActive() && !opts?.skipQueue) {
        enqueueExecutionTask({
          kind: "browse",
          goal: trimmed,
          planTaskId: taskId,
          sourceMessageId: opts?.sourceMessageId,
          label: trimmed.slice(0, 72),
        });
        return;
      }
      const { settings, browser, auth } = get();
      const planTask = taskId ? plan?.taskGraph.find((t) => t.id === taskId) : undefined;
      const resolvedGoal = resolveBrowserGoal({
        rawGoal: trimmed,
        playbookId: planTask?.playbookId ?? activePlaybookId,
        task: planTask,
      });

      {
        const preflight = assertCan(get().capabilityMatrix, [
          "backend",
          "auth",
          "anthropic",
          "computer_use",
        ]);
        if (!preflight.ok) {
          const missing = preflight.missing[0];
          appendPresentedError(
            missing?.id === "anthropic"
              ? "anthropic_not_configured"
              : missing?.id === "auth"
                ? "Sign in to use AI features."
                : missing?.reason ?? "not connected to backend",
          );
          appendEvent({
            role: "system",
            kind: "status",
            text: missing?.fix
              ? `${missing.reason ?? "Can't start browser task."} → ${missing.fix.label}`
              : missing?.reason ?? "Can't start browser task.",
          });
          return;
        }
      }

      const sourceMessageId =
        opts?.sourceMessageId ??
        appendEvent({ role: "user", kind: "text", text: `Browser task: ${trimmed}` });
      const browseRunId = `browse-${Date.now()}`;
      const run: RunInfo = {
        runId: browseRunId,
        goal: resolvedGoal.slice(0, 200),
        status: "running",
        kind: "browse",
        events: [],
        lastSeq: 0,
        policy: DEFAULT_PERMISSION_POLICY,
        startedAt: Date.now(),
        planTaskId: taskId,
        sourceMessageId,
      };
      linkMessageToRun(sourceMessageId, browseRunId);
      get().registerCampaignRun(browseRunId, taskId);
      set({
        run,
        route: "workspace",
        focusMode: true,
        canvas: { mode: "browser" },
        browser: {
          ...browser,
          running: true,
          currentGoal: resolvedGoal.slice(0, 200),
          frame: undefined,
          prevFrame: undefined,
          pendingApprovalId: undefined,
          lastError: undefined,
          lastStatus: "Starting secure browser sandbox…",
          lastAction: undefined,
          cursor: undefined,
          bbox: undefined,
          url: undefined,
          title: undefined,
          step: undefined,
          stepMax: undefined,
          phase: "thinking",
          paused: false,
          findings: [],
          frameHistory: [],
        },
      });
      appendEvent({
        role: "system",
        kind: "status",
        text: "Opening live Computer Use stage — watch the agent browse in the center canvas.",
      });
      track("browser_task");
      void (async () => {
        const token = await resolveBackendToken(settings, auth.authEnabled);
        const cwd = projectAgentCwd(get().project) ?? "";
        const projectId = get().activeProjectId ?? "local";
        try {
          const { runId } = await window.api.runs.start({
            projectId,
            cwd: cwd || ".",
            intent: { kind: "browse", goal: resolvedGoal },
            sessionId: get().activeSessionId,
            planTaskId: taskId,
            serverUrl: settings.serverUrl,
            sessionToken: token,
            autoApproveBrowser: browser.autoApprove,
            persona: settings.persona,
          });
          set((s) =>
            s.run
              ? { run: { ...s.run, runId, status: "running" } }
              : {},
          );
          linkMessageToRun(sourceMessageId, runId);
        } catch (err) {
          appendPresentedError(errorMessage(err));
          set((s) => ({
            browser: { ...s.browser, running: false, lastError: errorMessage(err) },
            run: null,
          }));
        }
      })();
    },

    startVerifyAfterApply: async (url, checklist) => {
      pendingVerifyAfterApply = { url, checklist, startedAt: Date.now() };
      const preflight = assertCan(get().capabilityMatrix, [
        "backend",
        "auth",
        "anthropic",
        "computer_use",
      ]);
      if (!preflight.ok) {
        const missing = preflight.missing[0];
        appendPresentedError(missing?.reason ?? "not connected to backend");
        return;
      }
      const { settings, auth, browser } = get();
      const cwd = projectAgentCwd(get().project) ?? ".";
      const projectId = get().activeProjectId ?? "local";
      const sourceMessageId = appendEvent({
        role: "user",
        kind: "text",
        text: `Verify after apply${url ? `: ${url}` : ""}`,
      });
      const browseRunId = `verify-${Date.now()}`;
      set({
        run: {
          runId: browseRunId,
          goal: `Verify ${url || "preview"}`,
          status: "running",
          kind: "browse",
          events: [],
          lastSeq: 0,
          policy: DEFAULT_PERMISSION_POLICY,
          startedAt: Date.now(),
          sourceMessageId,
        },
        route: "workspace",
        focusMode: true,
        canvas: { mode: "browser" },
        browser: {
          ...browser,
          running: true,
          currentGoal: `Verify ${url || "preview"}`,
          frame: undefined,
          prevFrame: undefined,
          pendingApprovalId: undefined,
          lastError: undefined,
          lastStatus: "Starting verify in Computer Use…",
          lastAction: undefined,
          cursor: undefined,
          bbox: undefined,
          url: url || undefined,
          title: undefined,
          step: undefined,
          stepMax: undefined,
          phase: "thinking",
          paused: false,
          findings: [],
          frameHistory: [],
        },
      });
      try {
        const token = await resolveBackendToken(settings, auth.authEnabled);
        const { runId } = await window.api.runs.start({
          projectId,
          cwd,
          intent: {
            kind: "verify",
            afterApply: true,
            url,
            checklist,
          },
          serverUrl: settings.serverUrl,
          sessionToken: token,
          autoApproveBrowser: browser.autoApprove,
          persona: settings.persona,
        });
        set((s) => (s.run ? { run: { ...s.run, runId } } : {}));
        linkMessageToRun(sourceMessageId, runId);
      } catch (err) {
        pendingVerifyAfterApply = null;
        appendPresentedError(errorMessage(err));
        set((s) => ({
          browser: { ...s.browser, running: false, lastError: errorMessage(err) },
          run: null,
        }));
      }
    },

    stopBrowser: () => {
      const runId = get().run?.kind === "browse" ? get().run?.runId : undefined;
      if (runId) {
        void window.api.runs.browserControl({ runId, action: "stop" });
        void window.api.runs.interrupt(runId);
      }
      browserSocket.stop();
      releaseActivePlanTask("pending");
      set((s) => ({
        run: s.run?.kind === "browse" ? null : s.run,
        browser: {
          ...s.browser,
          running: false,
          paused: false,
          phase: undefined,
          pendingApprovalId: undefined,
          pendingSummary: undefined,
        },
      }));
      appendEvent({ role: "system", kind: "status", text: "Browser task stopped." });
      drainExecutionQueueWhenIdle();
    },

    pauseBrowser: () => {
      const runId = get().run?.kind === "browse" ? get().run?.runId : undefined;
      if (runId) void window.api.runs.browserControl({ runId, action: "pause" });
      else browserSocket.pause();
      set((s) => ({ browser: { ...s.browser, paused: true } }));
    },

    resumeBrowser: () => {
      const runId = get().run?.kind === "browse" ? get().run?.runId : undefined;
      if (runId) void window.api.runs.browserControl({ runId, action: "resume" });
      else browserSocket.resume();
      set((s) => ({ browser: { ...s.browser, paused: false } }));
    },

    steerBrowser: (text) => {
      const t = text.trim();
      if (!t) return;
      const runId = get().run?.kind === "browse" ? get().run?.runId : undefined;
      if (runId) {
        void window.api.runs.browserControl({ runId, action: "steer", text: t });
        void window.api.runs.browserControl({ runId, action: "resume" });
      } else {
        browserSocket.steer(t);
        browserSocket.resume();
      }
      appendEvent({ role: "user", kind: "text", text: `↪ ${t}` });
      set((s) => ({ browser: { ...s.browser, paused: false } }));
    },

    approve: (id) => {
      const { pendingSummary } = get().browser;
      const runId = get().run?.kind === "browse" ? get().run?.runId : undefined;
      if (runId) {
        void window.api.runs.browserControl({ runId, action: "approve", approvalId: id });
      } else {
        browserSocket.approve(id);
      }
      resolveThreadApproval(id, true, {
        intent: pendingSummary,
        scope: "submit_public_forms",
      });
      set((s) => ({
        browser: { ...s.browser, pendingApprovalId: undefined, pendingSummary: undefined },
      }));
    },

    reject: (id) => {
      const { pendingSummary } = get().browser;
      const runId = get().run?.kind === "browse" ? get().run?.runId : undefined;
      if (runId) {
        void window.api.runs.browserControl({ runId, action: "reject", approvalId: id });
      } else {
        browserSocket.reject(id);
      }
      resolveThreadApproval(id, false, {
        intent: pendingSummary,
        scope: "submit_public_forms",
      });
      set((s) => ({
        browser: { ...s.browser, pendingApprovalId: undefined, pendingSummary: undefined },
      }));
    },

    setAutoApprove: (value) => {
      browserSocket.setAuto(value);
      set((s) => ({ browser: { ...s.browser, autoApprove: value } }));
    },

    cancelQueuedExecution: (id) => {
      set({ executionQueue: removeQueuedExecution(get().executionQueue, id) });
    },

    processExecutionQueue: () => {
      if (isExecutionActive()) return;
      const { head, queue } = dequeueExecution(get().executionQueue);
      if (!head) return;
      set({
        executionQueue: queue,
        lastQueueDrainGoal: head.goal,
      });
      appendEvent({
        role: "system",
        kind: "status",
        text:
          queue.length > 0
            ? `Running queued: ${head.label} (${queue.length} remaining)`
            : `Running queued: ${head.label}`,
      });
      if (get().e2eDryRunExecution) return;
      if (head.kind === "edit") {
        void get().startRun(head.goal, head.planTaskId, {
          sourceMessageId: head.sourceMessageId,
          skipQueue: true,
        });
      } else {
        get().runBrowserTask(head.goal, {
          sourceMessageId: head.sourceMessageId,
          skipQueue: true,
        });
      }
    },

    flushMessageOutbox: async () => {
      const { activeProjectId, outboxFlushing } = get();
      if (!activeProjectId || outboxFlushing) return;
      if (!canRunAgent(get().runtime)) return;
      set({ outboxFlushing: true });
      try {
        let entry = peekOutbox(activeProjectId);
        while (entry) {
          await get().sendMessage(entry.text, {
            silent: entry.silent ?? true,
            context: entry.context,
          });
          removeOutboxEntry(activeProjectId, entry.id);
          set({ outboxCount: outboxCount(activeProjectId) });
          entry = peekOutbox(activeProjectId);
        }
      } finally {
        const pid = get().activeProjectId;
        set({ outboxFlushing: false, outboxCount: pid ? outboxCount(pid) : 0 });
      }
    },

    startRun: async (goal, planTaskId, opts) => {
      const trimmed = goal.trim();
      if (!trimmed) return;

      if (planTaskId) {
        const { plan, marketingProfile } = get();
        const suite = plan ? normalizePlan(plan) : null;
        const task = suite?.taskGraph.find((t) => t.id === planTaskId);
        if (task && isConnectorReadPlanTask(task)) {
          if (isExecutionActive() && !opts?.skipQueue) {
            enqueueExecutionTask({
              kind: "edit",
              goal: trimmed,
              planTaskId,
              sourceMessageId: opts?.sourceMessageId,
              label: trimmed.slice(0, 72),
            });
            return;
          }
          if (hasGa4OAuth(marketingProfile)) {
            set({
              activePlanTaskId: planTaskId,
              highlightPlanTaskId: planTaskId,
              route: "workspace",
              canvas: { mode: "performance" },
            });
            get().setWorkSurface("performance");
            void get().patchPlanTaskStatus(planTaskId, "running");
            appendEvent({
              role: "system",
              kind: "status",
              text: `Syncing GA4 for plan task: ${task.title}`,
            });
            void get()
              .syncGa4Metrics()
              .then(() => get().patchPlanTaskStatus(planTaskId, "done"))
              .catch(() => get().patchPlanTaskStatus(planTaskId, "failed"));
            return;
          }
          const connectorTransition = transitionAfterConnectorReadNoOAuth();
          set({
            activePlanTaskId: planTaskId,
            highlightPlanTaskId: planTaskId,
            route: "workspace",
            canvas: { mode: "performance" },
          });
          get().setWorkSurface("performance");
          void get().patchPlanTaskStatus(planTaskId, connectorTransition.status);
          appendEvent({
            role: "system",
            kind: "status",
            text: `GA4 not connected — open Performance to log KPIs manually or connect GA4 in Settings.`,
          });
          emitPlanTaskOutcomeCard({
            taskId: planTaskId,
            variant: "awaiting_review",
            reviewGate: connectorTransition.gate,
          });
          return;
        }
        if (task && isBrowserPlanTask(task)) {
          if (isExecutionActive() && !opts?.skipQueue) {
            enqueueExecutionTask({
              kind: "browse",
              goal: trimmed,
              planTaskId,
              sourceMessageId: opts?.sourceMessageId,
              label: trimmed.slice(0, 72),
            });
            return;
          }
          set({
            activePlanTaskId: planTaskId,
            highlightPlanTaskId: planTaskId,
            canvas: { mode: "browser" },
          });
          void get().patchPlanTaskStatus(planTaskId, "running");
          const msgId =
            opts?.sourceMessageId ??
            appendEvent({ role: "user", kind: "text", text: trimmed });
          get().runBrowserTask(planTaskGoal(task), { sourceMessageId: msgId });
          return;
        }
      }

      const { settings, project, auth } = get();
      if (!canRunAgent(get().runtime)) {
        appendPresentedError(
          get().runtime === "degraded"
            ? "anthropic_not_configured"
            : "not connected to backend",
        );
        return;
      }
      const cwd = projectAgentCwd(project);
      if (!cwd) {
        appendEvent({
          role: "system",
          kind: "error",
          text: agentCwdErrorMessage(project),
        });
        return;
      }

      if (isExecutionActive() && !opts?.skipQueue) {
        enqueueExecutionTask({
          kind: "edit",
          goal: trimmed,
          planTaskId,
          sourceMessageId: opts?.sourceMessageId,
          label: trimmed.slice(0, 72),
        });
        return;
      }

      const run: RunInfo = {
        runId: "",
        goal: trimmed,
        status: "created",
        events: [],
        lastSeq: 0,
        policy: DEFAULT_PERMISSION_POLICY,
        startedAt: Date.now(),
        sourceMessageId: opts?.sourceMessageId,
      };
      const sourceMessageId =
        opts?.sourceMessageId ?? appendEvent({ role: "user", kind: "text", text: trimmed });
      set(() => ({
        run: { ...run, sourceMessageId },
        replayRun: null,
        canvas: { mode: "run" },
        ...(planTaskId
          ? {
              activePlanTaskId: planTaskId,
              highlightPlanTaskId: planTaskId,
            }
          : {}),
      }));
      if (planTaskId) void get().patchPlanTaskStatus(planTaskId, "running");
      track("agent_run");

      const token = await resolveBackendToken(settings, auth.authEnabled);
      if (auth.authEnabled && !token) {
        appendEvent({
          role: "agent",
          kind: "error",
          text: "Sign in required to run the agent. Use Google or email from onboarding.",
        });
        set({ authError: "Please sign in again.", run: null, canvas: { mode: "empty" } });
        return;
      }

      try {
        const snap = get();
        const enrichedGoal = enrichEditGoal({
          userGoal: trimmed,
          turnReceipt: snap.lastTurnReceipt,
          lastAnswerText: snap.lastAnswerText,
          lastAssets: snap.lastAskAssets,
        });
        const mentions =
          opts?.mentions?.length ? opts.mentions : parseMentionsFromText(enrichedGoal);
        const { runId } = await window.api.runs.start({
          projectId: get().activeProjectId ?? "local",
          cwd,
          intent: {
            kind: "edit",
            goal: enrichedGoal,
            mentions,
            skills: opts?.skills,
            guaranteedShip:
              opts?.guaranteedShip ??
              (get().wedgePhase === "ship" || get().firstHourActive ? true : undefined),
          },
          sessionId: get().activeSessionId,
          planTaskId,
          serverUrl: settings.serverUrl,
          sessionToken: token,
          persona: settings.persona,
          marketingProfile: get().marketingProfile ?? undefined,
          ask: {
            turnReceipt: snap.lastTurnReceipt,
            lastAssets: snap.lastAskAssets,
            lastAnswerText: snap.lastAnswerText,
          },
        });
        set((s) => (s.run ? { run: { ...s.run, runId } } : {}));
        linkMessageToRun(sourceMessageId, runId);
        if (get().wedgePhase === "ship" || get().firstHourActive) {
          recordExecutionMetricEvent("run_started", { runId });
          bumpShipPipeline("run.started", { runId });
        }
        get().registerCampaignRun(runId, planTaskId);
        const cadence = get().opsCadence;
        const opsTaskId = opts?.opsTaskId;
        if (cadence && opsTaskId && !planTaskId) {
          syncOpsCadenceState(markOpsTaskInProgress(cadence, opsTaskId, runId));
          const laneA = get().laneAWorkspace;
          if (laneA) {
            syncLaneAState(markLaneAItemInProgress(laneA, opsTaskId, runId));
          }
        } else if (cadence && !planTaskId) {
          const nowOps = getNowTask(cadence);
          if (nowOps?.owner === "system") {
            syncOpsCadenceState(markOpsTaskInProgress(cadence, nowOps.id, runId));
            const laneA = get().laneAWorkspace;
            if (laneA) {
              syncLaneAState(markLaneAItemInProgress(laneA, nowOps.id, runId));
            }
          }
        }
      } catch (err) {
        appendEvent({ role: "agent", kind: "error", text: errorMessage(err) });
        set((s) => (s.run ? { run: { ...s.run, status: "failed" } } : {}));
      }
    },

    interruptRun: () => {
      const { run } = get();
      if (!run?.runId) return;
      void window.api.runs.interrupt(run.runId);
      void window.api.agent.interrupt(run.runId);
      if (run.kind === "ask") {
        if (askFoldSession) {
          finalizeAskFold(askFoldSession, buildAskFoldDeps());
          askFoldSession = null;
        }
        clearFirstHourAutoHandoff();
        set({ agentStreaming: false, firstHourScoutPending: false });
      }
    },

    approveRun: (approvalId) => {
      const pending = get().run?.pendingApproval;
      void window.api.agent.approve(approvalId, true);
      resolveThreadApproval(approvalId, true, {
        intent: pending?.intent,
        scope: pending?.scope,
      });
      set((s) => (s.run ? { run: clearApproval(s.run, approvalId) } : {}));
    },

    rejectRun: (approvalId) => {
      const pending = get().run?.pendingApproval;
      void window.api.agent.approve(approvalId, false);
      resolveThreadApproval(approvalId, false, {
        intent: pending?.intent,
        scope: pending?.scope,
      });
      set((s) => (s.run ? { run: clearApproval(s.run, approvalId) } : {}));
    },

    applyRunChanges: async (files) => {
      const { run, planProgress } = get();
      if (!run?.runId) return;
      const allFiles = runChangedFiles(run.events);
      const taskId = get().activePlanTaskId ?? run.planTaskId;
      const taskStatus = taskId ? planProgress?.byTaskId[taskId]?.status : undefined;

      try {
        const result = await window.api.agent.apply(run.runId, files);
        if (result.applied.length === 0) {
          appendEvent({
            role: "agent",
            kind: "error",
            text: "No files were applied. The agent may not have edited any files in the worktree — try running a task that changes project files.",
          });
          set({ canvas: { mode: "preview" } });
          return;
        }
        const patchStats = aggregatePatchStats(run.events);
        const commitSha = (result as { commit?: string }).commit;
        const shippedReceipt = buildTurnReceipt({
          turnId: run.sourceMessageId ?? run.runId,
          runId: run.runId,
          startedAt: run.startedAt,
          events: run.events,
          applyResult: {
            files: result.applied,
            branch: result.branch,
            commitSha,
            linesAdded: patchStats.linesAdded,
            linesRemoved: patchStats.linesRemoved,
          },
        });
        const summaryWithCommit = [
          `Applied ${result.applied.length} file(s)`,
          result.branch ? `to ${result.branch}` : "",
          commitSha ? `· commit ${commitSha.slice(0, 7)}` : "",
          patchStats.linesAdded + patchStats.linesRemoved > 0
            ? `· +${patchStats.linesAdded}/−${patchStats.linesRemoved}`
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        appendEvent({
          role: "system",
          kind: "status",
          text: summaryWithCommit,
        });
        appendEvent({
          role: "agent",
          kind: "turn_receipt",
          turnReceipt: { ...shippedReceipt, shipped: true, summaryLine: summaryWithCommit },
          text: summaryWithCommit,
        });
        set({ lastTurnReceipt: shippedReceipt });
        const pid = get().activeProjectId;
        if (pid) {
          persistTurnReceipt(pid, shippedReceipt);
          if (!get().firstShipAt) markFirstShip(pid);
        }
        recordExecutionMetricEvent("apply_completed", {
          runId: run.runId,
          patchCount: result.applied.length,
        });
        bumpShipPipeline("approval.granted");
        bumpShipPipeline("apply.completed");

        const snapshot = get().firstShipSnapshot;
        const heroPath = snapshot?.heroPath ?? result.applied[0];
        let afterMeta: { metaTitle?: string; heroHeadline?: string } | undefined;
        const proj = get().project;
        if (heroPath && proj?.source.kind === "folder") {
          try {
            const source = await window.api.fs.read(proj.source.path, heroPath);
            afterMeta = parseShipSnapshotFromSource(source, heroPath);
          } catch {
            /* optional re-read */
          }
        }
        const previewUrl =
          run.events.find((e) => e.type === "preview.ready")?.payload &&
          typeof (run.events.find((e) => e.type === "preview.ready")?.payload as { url?: string })
            ?.url === "string"
            ? ((run.events.find((e) => e.type === "preview.ready")?.payload as { url?: string })
                ?.url ?? undefined)
            : undefined;
        const ledger: FirstShipLedger = {
          at: Date.now(),
          commitSha,
          summary: buildShipSummary(snapshot, afterMeta),
          files: result.applied,
          linesDelta: { add: patchStats.linesAdded, del: patchStats.linesRemoved },
          previewUrl,
          before: snapshot
            ? {
                metaTitle: snapshot.metaTitle,
                metaDesc: snapshot.metaDesc,
                heroHeadline: snapshot.heroHeadline,
                heroPath: snapshot.heroPath,
              }
            : undefined,
          after: afterMeta,
        };
        if (pid) {
          persistFirstShipLedgerLocal(pid, ledger);
          set({ firstShipLedger: ledger });
        }

        const qualityFindings = runShipQualityLint({
          after: afterMeta,
          thesisId: get().channelThesis?.id ?? get().marketingProfile?.channel_thesis?.id,
        });
        const shipReceipt = {
          ...buildShipReceiptFromApply({
            runId: run.runId,
            commitSha,
            branch: result.branch,
            filesApplied: result.applied,
            linesAdded: patchStats.linesAdded,
            linesRemoved: patchStats.linesRemoved,
            previewUrl,
            before: snapshot ?? undefined,
            after: afterMeta,
            events: run.events,
            ledger,
          }),
          qualityWarnings: qualityFindings,
        };
        if (pid) {
          persistShipReceiptLocal(pid, shipReceipt);
        }
        set({ lastShipReceipt: shipReceipt, executionRecordDetailTab: "proof" });

        autoCompleteOpsOnApply({
          runId: run.runId,
          commitSha,
          filesApplied: result.applied.length,
        });
        get().recordSessionOutcome({
          kind: "run",
          label: summaryWithCommit,
          commitSha,
          filesApplied: result.applied.length,
          linesDelta: `+${patchStats.linesAdded}/−${patchStats.linesRemoved}`,
          ref: run.runId,
        });

        removeApplyPendingFeed(run.runId);

        const appliedSet = new Set(result.applied);
        const remaining = allFiles.filter((f) => !appliedSet.has(f));

        if (
          taskId &&
          (taskStatus === "awaiting_apply" ||
            taskStatus === "partial" ||
            taskStatus === "running")
        ) {
          const transition = transitionAfterApply(result.applied.length, remaining.length);
          if (transition.status === "done") {
            finalizeActivePlanTask("done", { lastRunId: run.serverRunId ?? run.runId });
          } else if (transition.status === "partial") {
            await get().patchPlanTaskStatus(taskId, "partial", {
              lastRunId: run.serverRunId ?? run.runId,
            });
            set({ activePlanTaskId: taskId });
            emitPlanTaskOutcomeCard({ taskId, variant: "partial" });
          }
        }

        if (remaining.length === 0) {
          const inQuickShip = get().wedgePhase === "shipped" || get().wedgePhase === "ship";
          const previewEv = run.events.find((e) => e.type === "preview.ready");
          const previewUrl = (previewEv?.payload as { url?: string } | undefined)?.url?.trim();
          const cadenceBefore = get().opsCadence;
          const thesisBefore =
            get().channelThesis ?? get().marketingProfile?.channel_thesis ?? null;
          const activeOps = cadenceBefore?.tasks.find(
            (t) => t.status === "in_progress" && t.owner === "system",
          );
          set({
            run: null,
            replayRun: null,
            runApplySelection: [],
            canvas: { mode: inQuickShip ? "preview" : "browser" },
            route: "workspace",
            focusMode: inQuickShip ? false : true,
            pendingAutoPreview: inQuickShip,
          });
          if (inQuickShip) {
            get().startRunPreview();
          }
          const gateId = `browser-verify-after-apply-${Date.now()}`;
          get().appendFeedItem({
            id: gateId,
            ts: Date.now(),
            source: "system",
            category: "gate",
            title: "Verify in browser",
            summary: "Changes are in your repo — watch Computer Use check the live page.",
            status: "waiting",
            canvasTarget: { mode: "browser", payload: { verify: "1" } },
          });
          appendEvent({
            role: "system",
            kind: "feed_link",
            text: "Verify applied changes in live Computer Use",
            feedItemId: gateId,
          });
          if (previewUrl && get().capabilityMatrix.canBrowse) {
            const plan = planVerifyAfterApply({
              previewUrl,
              canBrowse: true,
              task: activeOps,
              thesis: thesisBefore,
            });
            if (plan?.shouldSchedule) {
              const runningReceipt = markShipReceiptVerifyRunning(shipReceipt);
              if (pid) persistShipReceiptLocal(pid, runningReceipt);
              set({ lastShipReceipt: runningReceipt });
              scheduleVerifyAfterApply(previewUrl, plan.checklist);
            }
          } else if (!get().capabilityMatrix.canBrowse) {
            const skipped = markShipReceiptVerifySkipped(shipReceipt);
            if (pid) persistShipReceiptLocal(pid, skipped);
            set({ lastShipReceipt: skipped });
            set({
              workspaceHandoff: {
                eyebrow: "Verify live",
                title: "Connect Computer Use to verify",
                reason:
                  "Changes are applied — connect backend + Computer Use to capture live CTA proof.",
                primaryLabel: "Open settings",
                primaryAction: "home",
              },
            });
          }
        } else {
          set({ runApplySelection: remaining, canvas: { mode: "preview" } });
        }
        void get().loadRunsArchive();
        get().requestProactiveSuggestion("apply_complete", {
          lastAppliedSummary: `Applied ${result.applied.length} file(s)${result.branch ? ` to ${result.branch}` : ""}.`,
        });
      } catch (err) {
        appendEvent({ role: "agent", kind: "error", text: errorMessage(err) });
      }
    },

    applyRunHunks: async (file, hunkIds) => {
      const { run } = get();
      if (!run?.runId || !file || hunkIds.length === 0) return;
      let patchText = "";
      for (let i = run.events.length - 1; i >= 0; i--) {
        const e = run.events[i];
        if (e.type === "file.patch_created" || e.type === "file.patch_updated") {
          const p = e.payload as { file?: string; patch?: string } | undefined;
          if (p?.file === file && p.patch) {
            patchText = p.patch;
            break;
          }
        }
      }
      if (!patchText) {
        appendEvent({
          role: "agent",
          kind: "error",
          text: `No patch found for ${file} — apply the whole file instead.`,
        });
        return;
      }
      try {
        const result = await window.api.agent.applyHunks(run.runId, file, patchText, hunkIds);
        if (!result.ok) {
          appendEvent({
            role: "agent",
            kind: "error",
            text: result.reason ?? "Hunk apply failed",
          });
          return;
        }
        appendEvent({
          role: "system",
          kind: "status",
          text: `Applied ${hunkIds.length} hunk(s) in ${file}.`,
        });
      } catch (err) {
        appendEvent({
          role: "agent",
          kind: "error",
          text: `Could not apply hunks: ${errorMessage(err)}`,
        });
      }
    },

    discardRunChanges: async () => {
      const { run, planProgress } = get();
      if (!run?.runId) return;
      if (
        !window.confirm(
          "Discard this entire run and remove the isolated worktree? Your main repo stays untouched.",
        )
      ) {
        return;
      }
      const taskId = get().activePlanTaskId ?? run.planTaskId;
      const taskStatus = taskId ? planProgress?.byTaskId[taskId]?.status : undefined;

      try {
        await window.api.agent.discard(run.runId);
        removeApplyPendingFeed(run.runId);
        if (
          taskId &&
          (taskStatus === "awaiting_apply" ||
            taskStatus === "partial" ||
            taskStatus === "awaiting_review")
        ) {
          await get().patchPlanTaskStatus(taskId, "pending");
          set({ activePlanTaskId: undefined });
          appendEvent({
            role: "system",
            kind: "status",
            text: "Discarded run — plan task returned to pending.",
          });
        } else {
          appendEvent({ role: "system", kind: "status", text: "Discarded run and worktree." });
        }
        set({ run: null, runApplySelection: [], canvas: { mode: "empty" } });
        void get().loadRunsArchive();
      } catch (err) {
        appendEvent({
          role: "agent",
          kind: "error",
          text: `Could not discard run: ${errorMessage(err)}`,
        });
      }
    },

    discardRunSelection: async (files) => {
      const { run } = get();
      if (!run?.runId || files.length === 0) return;
      if (
        !window.confirm(
          `Revert ${files.length} selected file(s) in the isolated worktree? Unselected changes stay until you apply or discard all.`,
        )
      ) {
        return;
      }
      try {
        const { discarded, remaining } = await window.api.agent.discardFiles(run.runId, files);
        if (discarded.length === 0) {
          appendEvent({
            role: "agent",
            kind: "error",
            text: "Could not revert selected files. Non-git projects require Discard all.",
          });
          return;
        }
        if (remaining.length === 0) {
          appendEvent({
            role: "system",
            kind: "status",
            text: `Reverted ${discarded.length} file(s). Worktree removed.`,
          });
          set({ run: null, runApplySelection: [], canvas: { mode: "empty" } });
        } else {
          appendEvent({
            role: "system",
            kind: "status",
            text: `Reverted ${discarded.length} file(s). ${remaining.length} still changed.`,
          });
          set({ runApplySelection: remaining });
        }
        void get().loadRunsArchive();
      } catch (err) {
        appendEvent({
          role: "agent",
          kind: "error",
          text: `Could not revert files: ${errorMessage(err)}`,
        });
      }
    },

    resetRunApplySelection: (files) => set({ runApplySelection: [...files] }),

    toggleRunApplyFile: (file, selected) =>
      set((s) => {
        const setFiles = new Set(s.runApplySelection);
        if (selected) setFiles.add(file);
        else setFiles.delete(file);
        return { runApplySelection: [...setFiles] };
      }),

    startRunPreview: () => {
      const { run } = get();
      if (run?.runId) void window.api.agent.preview(run.runId);
    },

    validateRun: () => {
      const { run } = get();
      if (run?.runId) void window.api.agent.validate(run.runId);
    },

    loadRunsArchive: async () => {
      const { activeProjectId, settings, auth, connection } = get();
      set({ runsArchiveLoading: true, runsArchiveError: null });
      try {
        const items: ArchiveRunItem[] = [];
        const seen = new Set<string>();

        if (connection.state === "connected") {
          try {
            const { runs } = await apiListRuns(settings, auth.authEnabled, {
              projectId: activeProjectId,
              limit: 50,
            });
            for (const r of runs) {
              items.push({
                id: r.id,
                goal: r.goal,
                status: r.status,
                kind: r.kind,
                created_at: r.created_at,
                summary_json: r.summary_json ?? {},
                plan_task_id: r.plan_task_id,
                source: "cloud",
              });
              seen.add(r.id);
              if (r.local_run_id) seen.add(r.local_run_id);
            }
          } catch {
            /* cloud empty or persistence off */
          }
        }

        const local = await window.api.activity.listRuns(activeProjectId);
        for (const r of local) {
          if (seen.has(r.id) || seen.has(r.localRunId)) continue;
          items.push({
            id: r.id,
            goal: r.goal,
            status: r.status,
            kind: r.kind,
            created_at: r.created_at,
            summary_json: r.summary_json,
            plan_task_id: r.summary_json.planTaskId,
            source: "local",
          });
        }

        items.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        set({
          runsArchive: items,
          runsArchiveLoading: false,
          runsArchiveLoadedAt: Date.now(),
        });
      } catch (err) {
        set({
          runsArchiveLoading: false,
          runsArchiveError: errorMessage(err),
        });
      }
    },

    openRunReplay: async (runId) => {
      const { settings, auth, connection, runsArchive } = get();
      let events: RunEvent[] | null = null;
      let meta: {
        goal: string;
        status: RunStatus;
        kind?: RunInfo["kind"];
        planTaskId?: string;
      } | null = null;

      if (connection.state === "connected") {
        try {
          const [{ run }, { events: rows }] = await Promise.all([
            apiGetRun(settings, auth.authEnabled, runId),
            apiGetRunEvents(settings, auth.authEnabled, runId, 0),
          ]);
          meta = {
            goal: run.goal,
            status: run.status as RunStatus,
            kind: run.kind,
            planTaskId: run.plan_task_id ?? undefined,
          };
          events = rows.map((row) => serverEventToRunEvent(row, runId));
        } catch {
          /* fallback to local */
        }
      }

      if (!events) {
        const local = await window.api.activity.getRun(runId);
        if (local) {
          meta = {
            goal: local.goal,
            status: local.status as RunStatus,
            kind: local.kind,
            planTaskId: local.summary_json.planTaskId,
          };
          events = local.events;
        } else {
          events = await window.api.activity.getRunEvents(runId);
          const item = runsArchive.find((r) => r.id === runId);
          if (item && events) {
            meta = {
              goal: item.goal,
              status: item.status as RunStatus,
              kind: item.kind,
              planTaskId: item.plan_task_id ?? undefined,
            };
          }
        }
      }

      if (!events?.length || !meta) {
        appendEvent({
          role: "system",
          kind: "error",
          text: "Could not load run replay.",
        });
        return;
      }

      let replay: RunInfo = {
        runId,
        serverRunId: runId,
        goal: meta.goal,
        status: meta.status,
        kind: meta.kind ?? "edit",
        readOnly: true,
        planTaskId: meta.planTaskId,
        events: [],
        lastSeq: 0,
        policy: DEFAULT_PERMISSION_POLICY,
        startedAt: Date.now(),
      };
      let canvasMode: CanvasMode = "run";
      for (const event of events) {
        const reduction = applyRunEvent(replay, event);
        replay = {
          ...reduction.run,
          readOnly: true,
          serverRunId: runId,
          kind: meta.kind ?? "edit",
          planTaskId: meta.planTaskId,
        };
        if (reduction.canvas) canvasMode = reduction.canvas;
      }

      if (meta.kind === "browse" || replay.frame) {
        canvasMode = "browser";
      }

      set({
        replayRun: replay,
        run: null,
        canvas: { mode: canvasMode },
        route: "workspace",
      });
    },

    clearReplayRun: () => set({ replayRun: null, canvas: { mode: "empty" } }),

    loadPlanHistory: async () => {
      const { activeProjectId, settings, auth } = get();
      if (!activeProjectId) return;
      try {
        const { plans } = await apiListPlans(settings, auth.authEnabled, activeProjectId);
        set({ planHistory: plans });
      } catch {
        set({ planHistory: [] });
      }
    },

    openPlanVersion: (plan, planRowId) => {
      const normalized = normalizePlan(plan) ?? plan;
      set({
        plan: normalized,
        activePlanRowId: planRowId,
        planPreviewMode: false,
        activePlaybookId: undefined,
        planCompareBaseline: null,
        canvas: { mode: "campaign-plan" },
        route: "workspace",
      });
      void get().loadPlanProgress(planRowId ?? normalized.id);
    },

    setPlanCompareBaseline: (row) => {
      const plan = normalizePlan(row.plan_json) ?? row.plan_json;
      set({ planCompareBaseline: { rowId: row.id, plan } });
    },

    clearPlanCompareBaseline: () => set({ planCompareBaseline: null }),

    loadPlanProgress: async (planRowId) => {
      const { plan, activeProjectId, settings, auth, runsArchive } = get();
      const rowId = planRowId ?? resolvePlanRowId();
      if (!plan || !rowId || !activeProjectId) {
        if (plan) applyProgressSnapshot(emptyProgressSnapshot(plan));
        return;
      }

      let byTaskId = emptyProgressSnapshot(plan).byTaskId;

      let localByTaskId: Record<string, import("@shared/planProgress").PlanTaskProgressRow> = {};
      try {
        const local = await window.api.planProgress.load(activeProjectId, rowId);
        if (local?.byTaskId) {
          localByTaskId = local.byTaskId;
        }
      } catch {
        /* ignore */
      }

      let serverByTaskId: Record<string, import("@shared/planProgress").PlanTaskProgressRow> = {};
      const serverTaskIds = new Set<string>();
      if (auth.authEnabled && settings.serverUrl) {
        try {
          await apiReconcilePlanProgress(settings, auth.authEnabled, activeProjectId, rowId, {
            validTaskIds: validPlanTaskIds(plan),
          });
          const { rows } = await apiGetPlanProgress(settings, auth.authEnabled, activeProjectId, rowId);
          for (const row of rows) {
            serverTaskIds.add(row.taskId);
            serverByTaskId[row.taskId] = row;
          }
          for (const [taskId, row] of Object.entries(localByTaskId)) {
            if (serverTaskIds.has(taskId)) continue;
            const task = plan.taskGraph.find((t) => t.id === taskId);
            void apiPatchPlanProgress(settings, auth.authEnabled, activeProjectId, {
              planId: rowId,
              taskId,
              status: row.status,
              lastRunId: row.lastRunId,
              playbookId: task?.playbookId ?? row.playbookId,
            }).catch((err) => reportBackgroundError("syncPlanProgress", err, "debug"));
          }
        } catch {
          /* offline */
        }
      }

      byTaskId = mergeProgressMaps(byTaskId, localByTaskId);
      byTaskId = mergeProgressMaps(byTaskId, serverByTaskId);

      const completedFromArchive = runsArchive
        .filter((r) => r.status === "completed" && r.plan_task_id)
        .map((r) => r.plan_task_id as string);
      const runIdByTask: Record<string, string> = {};
      for (const r of runsArchive) {
        if (r.plan_task_id && r.status === "completed") runIdByTask[r.plan_task_id] = r.id;
      }
      byTaskId = mergeReconciledRuns(plan, byTaskId, completedFromArchive, runIdByTask);

      const snapshot: PlanProgressSnapshot = {
        planId: rowId,
        byTaskId,
        computed: computePlanProgress(plan, byTaskId),
      };
      applyProgressSnapshot(snapshot);
      void persistProgressSnapshot(snapshot);
    },

    patchPlanTaskStatus: async (taskId, status, opts) => {
      const { plan, activeProjectId, settings, auth } = get();
      const rowId = resolvePlanRowId();
      if (!plan || !rowId) return;

      const prev = get().planProgress?.byTaskId[taskId];
      const now = new Date().toISOString();
      const task = plan.taskGraph.find((t) => t.id === taskId);
      const row = {
        taskId,
        status,
        lastRunId: opts?.lastRunId ?? prev?.lastRunId,
        startedAt: status === "running" ? now : prev?.startedAt,
        completedAt:
          status === "done" ? now : status === "pending" ? undefined : prev?.completedAt,
        playbookId: task?.playbookId ?? prev?.playbookId,
        updatedAt: now,
      };

      const prevSnapshot = get().planProgress;
      const prevComputed = prevSnapshot?.computed;
      const byTaskId = { ...(prevSnapshot?.byTaskId ?? emptyProgressSnapshot(plan).byTaskId), [taskId]: row };
      const launchAnchorAt =
        prevSnapshot?.launchAnchorAt ??
        (status === "running" || status === "done" ? now : undefined);
      const snapshot: PlanProgressSnapshot = {
        planId: rowId,
        byTaskId,
        launchAnchorAt,
        computed: computePlanProgress(plan, byTaskId),
      };
      const nextComputed = snapshot.computed;

      const milestones = { ...get().planMilestones };
      if (status === "done" && prev?.status !== "done" && prev?.status !== "skipped") {
        milestones.lastTaskId = taskId;
      }
      if (task?.playbookId) {
        const pbProg = nextComputed.byPlaybookId[task.playbookId];
        const prevPb = prevComputed?.byPlaybookId[task.playbookId];
        if (pbProg && pbProg.total > 0 && pbProg.done >= pbProg.total) {
          if (!prevPb || prevPb.done < prevPb.total) {
            milestones.lastPlaybookId = task.playbookId;
          }
        }
      }
      if (task?.day) {
        const w = weekForDay(task.day, Math.ceil(Math.max(...plan.taskGraph.map((t) => t.day)) / 7));
        const wt = nextComputed.weekTotal[w] ?? 0;
        const wd = nextComputed.weekDone[w] ?? 0;
        const prevWd = prevComputed?.weekDone[w] ?? 0;
        if (wt > 0 && wd >= wt && prevWd < wt) milestones.lastWeek = w;
      }
      const wasPlanComplete =
        !!prevComputed && prevComputed.total > 0 && prevComputed.terminal >= prevComputed.total;
      const isPlanComplete =
        nextComputed.total > 0 && nextComputed.terminal >= nextComputed.total;
      if (isPlanComplete && !wasPlanComplete) {
        milestones.planJustCompleted = true;
        appendEvent({
          role: "system",
          kind: "plan_complete",
          text: "All launch plan tasks are complete.",
        });
      }

      applyProgressSnapshot(snapshot);
      set({ planMilestones: milestones });
      void persistProgressSnapshot(snapshot);

      if (activeProjectId && auth.authEnabled) {
        try {
          await apiPatchPlanProgress(settings, auth.authEnabled, activeProjectId, {
            planId: rowId,
            taskId,
            status,
            lastRunId: opts?.lastRunId,
            playbookId: task?.playbookId,
          });
        } catch {
          /* local snapshot already saved */
        }
      }
    },

    confirmPlanTaskWithoutApply: (taskId) => {
      const id = taskId ?? get().activePlanTaskId;
      if (!id) return;
      const status = get().planProgress?.byTaskId[id]?.status;
      if (status !== "awaiting_review") return;
      set({ activePlanTaskId: id });
      finalizeActivePlanTask("done");
    },

    markPlanTaskComplete: (taskId) => {
      const id = taskId ?? get().activePlanTaskId;
      if (!id) return;
      const status = get().planProgress?.byTaskId[id]?.status;
      if (status !== "partial") return;
      set({ activePlanTaskId: id });
      finalizeActivePlanTask("done");
    },

    setHighlightPlanTaskId: (taskId) => set({ highlightPlanTaskId: taskId }),

    resolvePlanDeepLink: (opts) => {
      const { plan, planProgress, activePlaybookId } = get();
      if (!plan) return null;
      const suite = normalizePlan(plan);
      if (!suite) return null;
      return resolvePlanDeepLink({
        plan: suite,
        planProgress,
        playbookId: opts.playbookId,
        taskId: opts.taskId,
        activePlaybookId: opts.playbookId ? undefined : activePlaybookId,
      });
    },

    focusPlanTask: (opts) => {
      const { plan } = get();
      if (!plan) return;
      const suite = normalizePlan(plan);
      if (!suite) return;
      const resolved = get().resolvePlanDeepLink({
        playbookId: opts.playbookId,
        taskId: opts.taskId,
      });
      const taskId = resolved?.taskId ?? opts.taskId;
      const task = suite.taskGraph.find((t) => t.id === taskId);
      const playbookId = opts.playbookId ?? resolved?.playbookId ?? task?.playbookId ?? suite.playbooks[0]?.id;
      if (!taskId) return;
      set({
        activePlaybookId: playbookId,
        highlightPlanTaskId: taskId,
        route: "workspace",
        canvas: {
          mode:
            opts.startRun && task && isConnectorReadPlanTask(task)
              ? "performance"
              : opts.startRun && task && isBrowserPlanTask(task)
                ? "browser"
                : opts.startRun
                  ? "run"
                  : "campaign-plan",
        },
      });
      get().setWorkSurface("campaign-plan");
      if (opts.startRun && task) {
        void get().startRun(planTaskGoal(task), task.id);
      }
    },

    openKpiLog: (presetId) => {
      get().advanceCampaignPhase({ type: "log_kpi" });
      set({
        kpiLogDefaultPresetId: presetId,
        route: "workspace",
        canvas: { mode: "campaign-plan" },
      });
      get().setWorkSurface("campaign-plan");
    },

    clearKpiLogDefaultPreset: () => set({ kpiLogDefaultPresetId: undefined }),

    setActivePlaybook: (playbookId) =>
      set((s) => ({
        activePlaybookId: playbookId,
        canvas: { mode: "campaign-plan" },
        planDetailScrollNonce:
          playbookId && playbookId !== s.activePlaybookId
            ? s.planDetailScrollNonce + 1
            : s.planDetailScrollNonce,
      })),

    clearPlanMilestone: (key) =>
      set((s) => ({
        planMilestones: { ...s.planMilestones, [key]: undefined },
      })),

    startPlaybook: (playbookId) => {
      const { plan, planProgress } = get();
      if (!plan) return;
      const suite = normalizePlan(plan);
      if (!suite) return;
      const next = planProgress
        ? nextActionableTaskInPlaybook(suite, playbookId, planProgress.byTaskId)
        : getPlaybook(suite, playbookId)?.tasks.sort((a, b) => a.day - b.day)[0] ?? null;
      if (!next) return;
      get().focusPlanTask({ playbookId, taskId: next.id, startRun: true });
    },

    openPlanTaskFromArchive: (planTaskId) => {
      get().focusPlanTask({ taskId: planTaskId });
      set({ activePlanTaskId: planTaskId });
    },

    applyAsset: async (asset) => get().applyMarketingAsset(asset),

    applyMarketingAsset: async (assetOrId) => {
      const asset = findThreadAsset(assetOrId);
      if (!asset) {
        appendEvent({ role: "system", kind: "error", text: "Asset not found in this session." });
        return;
      }
      const { project, settings, auth, activeProjectId } = get();
      const root = projectFolderPath(project);
      const actions = resolveAssetActions({
        asset,
        project,
        title: asset.targetFile,
      });
      if (!actions.canApplyToRepo) {
        appendEvent({
          role: "system",
          kind: "error",
          text: actions.applyBlockReason ?? "Cannot apply this asset to the project.",
        });
        return;
      }
      const targetFile = actions.targetFile ?? asset.targetFile;
      if (!targetFile || !root) {
        appendEvent({
          role: "system",
          kind: "error",
          text: "Open a local folder project with a target file to apply.",
        });
        return;
      }
      const toApply: MarketingAsset = {
        ...asset,
        targetFile,
        applyMode: "sidecar",
      };
      try {
        const result = await window.api.project.applyAsset(toApply, root);
        if (result.applied && result.commit && activeProjectId) {
          void apiMarkAssetApplied(
            settings,
            auth.authEnabled,
            asset.id,
            result.commit,
            result.path,
          )
            .then(({ asset: row }) =>
              set((s) => ({
                serverAssets: s.serverAssets.some((a) => a.id === row.id)
                  ? s.serverAssets.map((a) => (a.id === row.id ? row : a))
                  : [...s.serverAssets, row],
              })),
            )
            .catch((err) => reportBackgroundError("markAssetApplied", err, "user"));
        }
        if (result.applied) {
          patchThreadAsset(asset.id, {
            targetFile,
            appliedCommit: result.commit,
            appliedPath: result.path,
            applyMode: "sidecar",
          });
          if (activeProjectId && !get().firstShipAt) markFirstShip(activeProjectId);
          get().recordSessionOutcome({
            kind: "asset",
            label: `Applied ${targetFile}${result.commit ? ` (${result.commit.slice(0, 7)})` : ""}`,
            channel: asset.type,
          });
          get().registerCampaignAsset(asset.id);
        }
        appendEvent({
          role: "system",
          kind: result.applied ? "status" : "error",
          text: result.applied
            ? result.commit
              ? `Applied to ${targetFile} on branch ${result.branch} (${result.commit.slice(0, 7)})`
              : `Applied to ${result.path ?? targetFile}${result.commit ? "" : " (no git commit — not a repo)"}`
            : `Could not apply: ${result.reason ?? "unknown reason"}.`,
        });
        if (result.applied) {
          set({ canvas: { mode: "diff", activeAssetId: asset.id } });
          const activeTaskId = get().activePlanTaskId;
          const activeTask = activeTaskId
            ? get().plan?.taskGraph.find((t) => t.id === activeTaskId)
            : undefined;
          if (activeTask && resolveTaskExecutionMode(activeTask) === "asset") {
            finalizeActivePlanTask("done");
          }
        }
      } catch (err) {
        appendEvent({
          role: "system",
          kind: "error",
          text: `Apply failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    },

    rollbackAsset: async (assetId, commit) => {
      const { project } = get();
      const root = project?.source.kind === "folder" ? project.source.path : undefined;
      if (!root) {
        appendEvent({ role: "system", kind: "error", text: "Rollback requires a local git folder project." });
        return;
      }
      try {
        await window.api.git.rollback(root, commit);
        appendEvent({ role: "system", kind: "status", text: `Reverted commit ${commit.slice(0, 7)}.` });
        set((s) => ({
          serverAssets: s.serverAssets.map((a) =>
            a.id === assetId ? { ...a, applied_at: null, applied_commit: null } : a,
          ),
        }));
      } catch (err) {
        appendEvent({
          role: "system",
          kind: "error",
          text: `Rollback failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    },

    focusArtifact: ({ mode, assetId }) => {
      const normalized = normalizeCanvasMode(mode);
      if (normalized === "marketing-diff" || mode === "diff") {
        set((s) => ({
          canvas: { ...s.canvas, mode: "marketing-diff", activeAssetId: assetId },
        }));
        return;
      }
      if (normalized === "ad-preview") {
        set((s) => ({
          canvas: {
            ...s.canvas,
            mode: "ad-preview",
            adPreviewAssetId: assetId,
            activeAssetId: assetId,
          },
        }));
        return;
      }
      if (normalized === "content-set" || mode === "assets") {
        set((s) => ({
          canvas: { ...s.canvas, mode: "content-set", activeAssetId: assetId },
        }));
        return;
      }
      if (normalized === "campaign-plan" || mode === "plan") {
        set((s) => ({ canvas: { ...s.canvas, mode: "campaign-plan" } }));
        return;
      }
      set((s) => ({ canvas: { ...s.canvas, mode: normalized, activeAssetId: assetId } }));
    },

    setActiveCanvas: (mode) => {
      set((s) => ({ canvas: { ...s.canvas, mode: normalizeCanvasMode(mode) } }));
    },

    setWorkSurface: (surface, opts) => {
      set((s) => ({
        canvas: {
          ...s.canvas,
          mode: workSurfaceToCanvasMode(surface),
          ...(opts?.experimentId !== undefined ? { experimentId: opts.experimentId } : {}),
          ...(opts?.adPreviewAssetId !== undefined
            ? { adPreviewAssetId: opts.adPreviewAssetId }
            : {}),
          ...(opts?.assetId !== undefined ? { activeAssetId: opts.assetId } : {}),
        },
      }));
    },

    appendFeedItem: (item) => {
      set((s) => {
        if (s.feedItems.some((f) => f.id === item.id)) return s;
        return { feedItems: [...s.feedItems, item].sort((a, b) => a.ts - b.ts) };
      });
    },

    openFeedItem: (id) => {
      const item = get().feedItems.find((f) => f.id === id);
      if (!item) return;
      set({ activeFeedItemId: id, feedCollapsed: false });
      try {
        localStorage.setItem(FEED_COLLAPSED_KEY, "0");
      } catch {
        // ignore
      }

      if (isConnectorFeedPlaceholder(item)) {
        get().setWorkSurface("performance");
        get().openConnectFlow();
        return;
      }

      if (item.isDemo) {
        appendEvent({
          role: "system",
          kind: "status",
          text: "Sample connector data — analytics connectors are not connected yet. Connect ad accounts when available.",
        });
        get().selectRailSection("connections");
        return;
      }

      // Feed is telemetry + navigation — gate items focus the stage, never inject
      // a second approval card into chat.
      if (item.category === "gate" && item.approvalId) {
        get().navigate("workspace");
        if (item.source === "browser" || get().browser.pendingApprovalId === item.approvalId) {
          get().setActiveCanvas("browser");
          get().setExecutionRecordDetailTab("browser");
          return;
        }
        if (item.source === "run" || get().run?.pendingApproval?.approvalId === item.approvalId) {
          get().setActiveCanvas("run");
          get().setExecutionRecordDetailTab("diff");
          return;
        }
        get().setExecutionRecordDetailTab("proof");
      }

      const target = item.canvasTarget;
      if (!target) return;

      // Verify-in-browser gate: orchestrator verify intent (same run timeline as browse).
      if (
        item.category === "gate" &&
        target.mode === "browser" &&
        (item.id.startsWith("browser-verify-") || target.payload?.verify === "1")
      ) {
        const previewUrl =
          get().run?.events
            .slice()
            .reverse()
            .find((ev) => ev.type === "preview.ready")?.payload as { url?: string } | undefined;
        const url = previewUrl?.url ?? "";
        get().navigate("workspace");
        void get().startVerifyAfterApply(url, [
          "Page loads without obvious errors",
          "Hero and primary CTA visible",
          "No broken layout above the fold",
        ]);
        return;
      }

      const ws = normalizeToWorkSurface(target.mode);
      if (ws) {
        get().setWorkSurface(ws, {
          assetId: target.payload?.assetId,
          experimentId: target.payload?.experimentId,
          adPreviewAssetId: target.payload?.adPreviewAssetId,
        });
        return;
      }

      if (target.mode === "marketing-diff") {
        const assetId = get().canvas.activeAssetId ?? get().thread.find((e) => e.asset)?.asset?.id;
        get().focusArtifact({ mode: "diff", assetId });
        return;
      }

      get().focusArtifact({ mode: target.mode });
    },

    setFeedFilter: (filter) => set({ feedFilter: filter }),

    toggleFeedCollapsed: (collapsed) =>
      set((s) => {
        const next = collapsed ?? !s.feedCollapsed;
        try {
          localStorage.setItem(FEED_COLLAPSED_KEY, next ? "1" : "0");
        } catch {
          // ignore
        }
        return { feedCollapsed: next };
      }),

    setExecutionRecordDetailTab: (tab) => set({ executionRecordDetailTab: tab }),

    toggleExecutionHistoryExpanded: () =>
      set((s) => ({ executionHistoryExpanded: !s.executionHistoryExpanded })),

    setCommandDockCollapsed: (collapsed) => set({ commandDockCollapsed: collapsed }),

    toggleCommandDockCollapsed: () =>
      set((s) => ({ commandDockCollapsed: !s.commandDockCollapsed })),

    toggleExecutionHeroExpanded: () =>
      set((s) => ({ executionHeroExpanded: !s.executionHeroExpanded })),

    setExecutionHeroExpanded: (expanded) => set({ executionHeroExpanded: expanded }),

    selectRailSection: (section, entityId) => {
      let surface = railSectionToWorkSurface(section);
      const { plan, marketingProfile } = get();

      if (section === "campaigns" && plan && (plan.taskGraph.length ?? 0) >= 3) {
        surface = "funnel";
      }
      if (section === "connections") {
        get().refreshConnectorFeed();
      }

      const opts: Parameters<AppState["setWorkSurface"]>[1] = {};
      if (section === "experiments" && entityId) {
        opts.experimentId = entityId;
      } else if (section === "experiments" && marketingProfile?.previous_experiments[0]) {
        opts.experimentId = marketingProfile.previous_experiments[0].id;
      }

      set({ selectedRailSection: section, selectedRailEntityId: entityId });
      get().setWorkSurface(surface, opts);
    },

    seedConnectorFeedPlaceholder: () => {
      const { feedItems } = get();
      if (hasConnectorFeedPlaceholder(feedItems)) return;
      if (feedItems.some((f) => f.source === "connector" && !f.isDemo)) return;
      get().appendFeedItem(connectorFeedPlaceholderItem());
    },

    seedMockConnectorFeed: () => {
      if (!isDemoConnectorsAllowed()) return;
      const { activeProjectId, feedItems } = get();
      if (!activeProjectId) return;
      const key = `${DEMO_CONNECTOR_FEED_PREFIX}.${activeProjectId}`;
      try {
        if (localStorage.getItem(key)) return;
        if (feedItems.some((f) => f.isDemo || f.source === "connector")) return;
      } catch {
        // ignore
      }
      for (const item of mockConnectorFeedItems()) {
        get().appendFeedItem(item);
      }
      try {
        localStorage.setItem(key, "1");
      } catch {
        // ignore
      }
    },

    togglePalette: (open) => set((s) => ({ paletteOpen: open ?? !s.paletteOpen })),
    toggleSettings: (open) => set((s) => ({ settingsOpen: open ?? !s.settingsOpen })),

    toggleFocusMode: (on) =>
      set((s) => {
        const next = on ?? !s.focusMode;
        return next
          ? {
              focusMode: true,
              commandDockCollapsed: true,
              executionHeroExpanded: false,
            }
          : { focusMode: false };
      }),
    toggleSidebar: (collapsed) =>
      set((s) => {
        const next = collapsed ?? !s.sidebarCollapsed;
        try {
          localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
        } catch {
          // ignore persistence failures
        }
        return { sidebarCollapsed: next };
      }),

    setComposerMode: (mode) => {
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(COMPOSER_MODE_KEY, mode);
        } catch {
          /* ignore */
        }
      }
      set({ composerMode: mode, suggestedComposerMode: undefined });
    },

    clearSuggestedComposerMode: () => set({ suggestedComposerMode: undefined }),

    dismissMissingInfo: (eventId) =>
      set((s) => ({
        thread: s.thread.map((e) =>
          e.id === eventId ? { ...e, missingInfoState: "dismissed" as const } : e,
        ),
        dismissedBrainQuestionIds: s.dismissedBrainQuestionIds.includes(eventId)
          ? s.dismissedBrainQuestionIds
          : [...s.dismissedBrainQuestionIds, eventId],
      })),

    markMissingInfoAnswered: (eventId) =>
      set((s) => ({
        thread: s.thread.map((e) =>
          e.id === eventId ? { ...e, missingInfoState: "answered" as const } : e,
        ),
        dismissedBrainQuestionIds: s.dismissedBrainQuestionIds.includes(eventId)
          ? s.dismissedBrainQuestionIds
          : [...s.dismissedBrainQuestionIds, eventId],
      })),

    previewMarketingAsset: async (decision) => {
      const { project } = get();
      const existing = get().thread.find(
        (e) => e.kind === "asset" && e.asset && e.asset.after === decision.content,
      )?.asset;
      const targetFile = resolveSidecarTarget(
        decision.title,
        decision.suggested_target_file,
      );
      let before: string | undefined;
      const root = projectFolderPath(project);
      if (root) {
        try {
          before = await window.api.fs.read(root, targetFile);
        } catch {
          before = "";
        }
      }
      const asset = prepareMarketingAssetFromDecision(decision, {
        id: existing?.id ?? makeEventId(),
        targetFile,
        before,
      });
      if (existing) {
        patchThreadAsset(existing.id, {
          targetFile: asset.targetFile,
          before: asset.before,
          after: asset.after,
          type: asset.type,
        });
      } else {
        appendEvent({ role: "agent", kind: "asset", asset });
      }
      const actions = resolveAssetActions({
        asset,
        project,
        title: decision.title,
        decisionKind: decision.kind,
      });
      if (actions.previewSurface === "ad-preview") {
        get().focusArtifact({ mode: "ad-preview", assetId: asset.id });
        get().setWorkSurface("ad-preview", { adPreviewAssetId: asset.id });
      } else if (actions.previewSurface === "content-set") {
        get().focusArtifact({ mode: "marketing-diff", assetId: asset.id });
        get().setWorkSurface("content-set");
      } else {
        get().focusArtifact({ mode: "marketing-diff", assetId: asset.id });
        get().setWorkSurface("marketing-diff");
      }
      set({ route: "workspace" });
    },

    integrateCopyIntoSite: (assetOrId, route, opts) => {
      const asset = findThreadAsset(assetOrId);
      const { project } = get();
      if (!asset) {
        appendEvent({ role: "system", kind: "error", text: "Asset not found in this session." });
        return;
      }
      if (!hasLocalFolder(project)) {
        appendEvent({
          role: "system",
          kind: "error",
          text: "Open a local folder project to integrate copy into site files.",
        });
        return;
      }
      const integrateRoute =
        route ?? inferIntegrateRoute(project?.routes ?? []) ?? undefined;
      if (!integrateRoute) {
        appendEvent({
          role: "system",
          kind: "error",
          text: "No landing page route found — scan the project or pick a file manually.",
        });
        return;
      }
      if (!opts?.skipConfirm) {
        get().executeIntent({ kind: "integrate_asset", assetId: asset.id, route: integrateRoute });
        return;
      }
      set({ route: "workspace", canvas: { mode: "run" } });
      void get().startRun(buildIntegrateAssetGoal(asset.after, integrateRoute));
    },

    updateAssetTargetFile: async (assetId, targetFile) => {
      const { project } = get();
      const asset = findThreadAsset(assetId);
      if (!asset) return;
      let before: string | undefined;
      const root = projectFolderPath(project);
      if (root) {
        try {
          before = await window.api.fs.read(root, targetFile);
        } catch {
          before = "";
        }
      }
      patchThreadAsset(assetId, { targetFile, before });
    },

    applyDecisionAsset: (asset) => {
      void get().previewMarketingAsset(asset);
    },

    setComposerDraft: (draft) => set({ composerDraft: draft }),

    launchComposerAction: (opts) => {
      set((s) => ({
        composerMode: opts.mode,
        composerDraft: opts.draft ?? "",
        composerFocusTick: s.composerFocusTick + 1,
        editingMessageId: undefined,
        route: "workspace",
      }));
    },

    startEditMessage: (eventId) => {
      const event = get().thread.find((e) => e.id === eventId);
      if (!event || event.kind !== "text" || event.role !== "user" || !event.text?.trim()) return;
      set((s) => ({
        editingMessageId: eventId,
        composerDraft: event.text ?? "",
        composerFocusTick: s.composerFocusTick + 1,
        route: "workspace",
      }));
    },

    cancelEditMessage: () => set({ editingMessageId: undefined, composerDraft: "" }),

    editUserMessage: async (eventId, newText) => {
      const trimmed = newText.trim();
      if (!trimmed || get().agentStreaming) return;
      const idx = get().thread.findIndex((e) => e.id === eventId);
      if (idx < 0) return;
      const truncated = get().thread.slice(0, idx);
      const mode = get().composerMode;
      set({
        thread: truncated,
        editingMessageId: undefined,
        composerDraft: "",
        suggestedComposerMode: undefined,
      });
      if (mode === "browse") get().runBrowserTask(trimmed);
      else if (mode === "edit") await get().startRun(trimmed);
      else if (mode === "auto") await get().submitComposerText(trimmed);
      else await get().sendMessage(trimmed);
    },

    submitComposerText: async (text) => {
      const trimmed = text.trim();
      if (!trimmed || get().agentStreaming) return;

      const mode = get().composerMode;
      if (mode === "browse") {
        const msgId = appendEvent({ role: "user", kind: "text", text: trimmed });
        get().runBrowserTask(trimmed, { sourceMessageId: msgId });
        return;
      }
      if (mode === "edit") {
        const msgId = appendEvent({ role: "user", kind: "text", text: trimmed });
        await get().startRun(trimmed, undefined, { sourceMessageId: msgId });
        return;
      }
      if (mode === "ask") {
        await get().sendMessage(trimmed);
        return;
      }

      const { plan, planProgress, run, activePlanTaskId } = get();
      const suite = plan ? normalizePlan(plan) : null;
      const resolved = resolveIntent({
        message: trimmed,
        plan: suite,
        planProgress,
        activeRunId: run?.runId,
        planTaskId: activePlanTaskId,
      });
      if (!resolved || resolved.intent.kind === "ask_only") {
        await get().sendMessage(trimmed);
        return;
      }
      const msgId = appendEvent({ role: "user", kind: "text", text: trimmed });
      get().executeIntent(resolved.intent, { sourceMessageId: msgId });
    },

    prefillComposerForPlanTask: (opts) => {
      const draft = `Day ${opts.day}: ${opts.title}\n\n${opts.goal}`;
      set((s) => ({
        composerMode: "auto",
        composerDraft: draft,
        composerFocusTick: s.composerFocusTick + 1,
        route: "workspace",
      }));
    },

    runQuickAction: (id) => {
      const action = resolveQuickAction(id);
      const { project, runtime } = get();
      const connected = canRunAgent(runtime);
      const hasFolder = project?.source.kind === "folder";
      const blocked = isQuickActionDisabled(action, { connected, hasFolder });
      if (blocked) {
        appendEvent({ role: "system", kind: "error", text: blocked });
        set({ route: "workspace" });
        return;
      }
      const resolved = resolveIntent({ quickActionId: id });
      if (resolved) {
        get().executeIntent(resolved.intent);
        return;
      }
      set({ route: "workspace" });
    },

    executeIntent: (intent, opts) => {
      const state = get();
      const { plan, planProgress, project } = state;

      if (!opts?.skipConfirm && !state.firstHourActive && intentRequiresConfirm(intent)) {
        const suite = plan ? normalizePlan(plan) : null;
        const task =
          intent.kind === "start_edit_run" && intent.planTaskId
            ? suite?.taskGraph.find((t) => t.id === intent.planTaskId)
            : undefined;
        set({
          pendingHandoffConfirm: {
            intent,
            title: intent.kind === "integrate_asset" ? "Apply to site" : "Run in project",
            detail:
              intent.kind === "start_edit_run"
                ? intent.goal.slice(0, 280)
                : intent.kind === "integrate_asset" && intent.route
                  ? `Integrate copy into ${intent.route} via an isolated edit run.`
                  : "Apply this asset to your project files.",
            mode: intent.kind === "integrate_asset" ? "integrate" : "edit",
            planTaskLabel: task ? `Day ${task.day} · ${task.title}` : undefined,
            sourceMessageId: opts?.sourceMessageId,
          },
        });
        return;
      }

      set({ route: "workspace", pendingHandoffConfirm: undefined });

      switch (intent.kind) {
        case "start_edit_run":
          void get().startRun(intent.goal, intent.planTaskId, {
            sourceMessageId: opts?.sourceMessageId,
          });
          break;
        case "start_browser_task":
          set({ canvas: { mode: "browser" } });
          get().runBrowserTask(intent.goal, { sourceMessageId: opts?.sourceMessageId });
          break;
        case "apply_pending": {
          const active = state.run?.runId === intent.runId ? state.run : null;
          if (active) {
            set({
              canvas: { mode: "run" },
              ...(intent.taskId
                ? { activePlanTaskId: intent.taskId, highlightPlanTaskId: intent.taskId }
                : {}),
            });
          } else {
            void get().openRunReplay(intent.runId).then(() => {
              set({
                canvas: { mode: "run" },
                ...(intent.taskId
                  ? { activePlanTaskId: intent.taskId, highlightPlanTaskId: intent.taskId }
                  : {}),
              });
            });
          }
          break;
        }
        case "run_plan_task": {
          const suite = plan ? normalizePlan(plan) : null;
          const task = suite?.taskGraph.find((t) => t.id === intent.taskId);
          if (task) {
            void get().startRun(planTaskGoal(task), task.id, {
              sourceMessageId: opts?.sourceMessageId,
            });
          }
          break;
        }
        case "run_next_plan_task": {
          const suite = plan ? normalizePlan(plan) : null;
          if (!suite || !planProgress) break;
          const next = nextActionableTask(suite, planProgress.byTaskId);
          if (next) {
            void get().startRun(planTaskGoal(next), next.id, {
              sourceMessageId: opts?.sourceMessageId,
            });
          }
          break;
        }
        case "generate_plan":
          get().setWorkSurface("campaign-plan");
          get().setActiveCanvas("campaign-plan");
          void get().generatePlan();
          break;
        case "preview_plan":
          get().setWorkSurface("campaign-plan");
          get().setActiveCanvas("campaign-plan");
          get().previewPlanOutline();
          break;
        case "revise_plan":
          get().setWorkSurface("campaign-plan");
          void get().sendMessage(intent.instruction);
          break;
        case "integrate_asset":
          get().integrateCopyIntoSite(intent.assetId, intent.route, { skipConfirm: true });
          break;
        case "log_kpi":
          get().openKpiLog(intent.presetId);
          break;
        case "record_experiment":
          void get().recordExperimentFromConversation(intent.experimentId);
          break;
        case "ask_only":
          get().launchComposerAction({ mode: "ask", draft: intent.message });
          break;
        default:
          break;
      }

      if (intent.kind !== "ask_only" && project) {
        set((s) => ({ composerFocusTick: s.composerFocusTick + 1 }));
      }
    },

    confirmPendingHandoff: () => {
      const pending = get().pendingHandoffConfirm;
      if (!pending) return;
      set({ pendingHandoffConfirm: undefined });
      get().executeIntent(pending.intent, {
        skipConfirm: true,
        sourceMessageId: pending.sourceMessageId,
      });
    },

    cancelPendingHandoff: () => set({ pendingHandoffConfirm: undefined }),

    dispatchOutreachWebhook: async () => {
      const e2eMock = (window as Window & {
        __e2eMockOutreachDispatch?: () => Promise<{
          ok: boolean;
          message: string;
          detail?: string;
        }>;
      }).__e2eMockOutreachDispatch;
      if (e2eMock) return e2eMock();

      const {
        settings,
        auth,
        activeProjectId,
        marketingProfile,
        thread,
        browser,
        project,
      } = get();
      const webhookUrl =
        marketingProfile?.outreach_integrations?.webhook_url ?? settings.outreachWebhookUrl;
      const webhookProvider =
        marketingProfile?.outreach_integrations?.webhook_provider ??
        settings.outreachWebhookProvider ??
        "generic";

      if (!webhookUrl) {
        return { ok: false, message: "Configure a webhook URL in Settings first." };
      }
      if (!activeProjectId) {
        return { ok: false, message: "Open a project before dispatching outreach." };
      }

      const emailAssets = thread
        .filter((e) => e.kind === "asset" && e.asset?.type === "email")
        .map((e) => e.asset!)
        .filter(Boolean);
      const pack = buildOutreachPack({
        projectName: project?.name ?? "Project",
        thread,
        findings: browser.findings,
        emailAssets,
      });

      try {
        const res = await authedFetch(
          `${settings.serverUrl}/projects/${encodeURIComponent(activeProjectId)}/outreach/dispatch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...packToWebhookPayload(pack, webhookProvider),
              webhook_url: webhookUrl,
            }),
          },
          { authEnabled: auth.authEnabled, apiToken: settings.apiToken },
        );
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          hint?: string;
          detail?: string;
          lead_count?: number;
          message_count?: number;
          provider?: string;
          dispatched_at?: string;
        };
        if (res.ok && data.ok) {
          return {
            ok: true,
            message: `Sent to ${data.provider ?? webhookProvider} — ${data.lead_count ?? pack.leads.length} leads, ${data.message_count ?? pack.messages.length} drafts.`,
            detail: data.dispatched_at
              ? `Dispatched ${new Date(data.dispatched_at).toLocaleString()}`
              : undefined,
          };
        }
        return {
          ok: false,
          message: data.error ?? `Webhook failed (${res.status}).`,
          detail: data.hint ?? data.detail,
        };
      } catch {
        return { ok: false, message: "Could not reach server." };
      }
    },
  };
});

void (async () => {
  try {
    const e2e = await window.api.app.e2e();
    if (e2e.fixturePath && typeof window !== "undefined") {
      (window as Window & { __useApp?: typeof useApp }).__useApp = useApp;
      (window as Window & { __e2eDrainQueue?: () => void }).__e2eDrainQueue = () => {
        queueMicrotask(() => {
          const snap = useApp.getState();
          if (
            !canDrainExecutionQueue({
              runStatus: snap.run?.status,
              browserRunning: snap.browser.running,
            })
          ) {
            return;
          }
          useApp.getState().processExecutionQueue();
        });
      };
    }
  } catch {
    /* optional e2e hook */
  }
})();
