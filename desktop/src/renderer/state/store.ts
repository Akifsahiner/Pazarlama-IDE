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
  canRunAgent,
  resolveRuntimeCapability,
  type RuntimeCapability,
} from "@shared/runtimeCapability";
import { presentError } from "@renderer/lib/errorPresenter";
import { reportBackgroundError, swallowBackground } from "@renderer/lib/backgroundError";
import {
  apiCreateProject,
  apiCreateSession,
  apiDeleteSession,
  apiGetMe,
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
  streamAgent,
  streamPlan,
  StreamHttpError,
  type ServerPlanRow,
} from "@renderer/lib/api";
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
let runEventsBound = false;
let activeRunResumed = false;
let authCallbackBound = false;

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
  /** Edit / integrate run confirmation gate (Faz 4). */
  pendingHandoffConfirm?: HandoffConfirmState;

  feedItems: FeedItem[];
  feedFilter: FeedFilter;
  feedCollapsed: boolean;
  activeFeedItemId?: string;
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

  init: () => Promise<void>;
  navigate: (route: Route, settingsSection?: string) => void;
  setWorkspaceHandoff: (handoff: import("@shared/workspaceHandoff").WorkspaceHandoff) => void;
  dismissWorkspaceHandoff: () => void;
  checkConnection: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  continueOffline: () => void;
  syncRuntimeCapability: () => void;
  openConnectFlow: () => void;
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
    opts?: { sourceMessageId?: string; skipQueue?: boolean },
  ) => Promise<void>;
  interruptRun: () => void;
  approveRun: (approvalId: string) => void;
  rejectRun: (approvalId: string) => void;
  applyRunChanges: (files: string[]) => Promise<void>;
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

function syncRuntimeFromState(
  connection: ConnectionInfo,
  auth: AuthInfo,
  localOnlyMode: boolean,
): RuntimeCapability {
  return resolveRuntimeCapability({
    connectionState: connection.state,
    providers: connection.providers,
    authEnabled: auth.authEnabled,
    authState: auth.state,
    localOnly: localOnlyMode,
  }).capability;
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

  /** Fold a RunEvent from the Local Agent Host into run + canvas + thread. */
  const ingestRunEvent = (event: RunEvent) => {
    const current = get().run;
    if (!current) return;
    // Ignore stale/out-of-run events.
    if (current.runId && event.runId && current.runId !== event.runId) return;

    const { run, canvas } = applyRunEvent(current, event);
    set((s) => ({
      run,
      canvas: canvas ? { ...s.canvas, mode: canvas } : s.canvas,
    }));

    appendFeedFromRunEvent(event);

    // Mirror narration into conversation — tool/file steps live in execution feed.
    if (event.type === "agent.message" && event.summary) {
      appendEvent({ role: "agent", kind: "text", text: event.summary });
    } else if (event.type === "run.failed") {
      appendEvent({ role: "agent", kind: "error", text: event.summary ?? "Run failed." });
      const taskId = get().activePlanTaskId ?? current.planTaskId;
      if (taskId) {
        set({ activePlanTaskId: taskId });
        finalizeActivePlanTask("failed", { lastRunId: get().run?.serverRunId });
      }
      void get().loadRunsArchive();
      drainExecutionQueueWhenIdle();
    } else if (event.type === "run.completed") {
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
            summary: "Local preview is ready — run a browser check on the live page.",
            status: "waiting",
            canvasTarget: { mode: "browser" },
          });
        }
      }
      drainExecutionQueueWhenIdle();
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
  const pushFrameHistory = (entry: FrameHistoryEntry) =>
    set((s) => {
      const next = [...s.browser.frameHistory, entry];
      while (next.length > FRAME_CAP) next.shift();
      for (let i = 0; i < next.length - FRAME_KEEP_BASE64; i++) {
        if (next[i].pngBase64) next[i] = { ...next[i], pngBase64: undefined };
      }
      return { browser: { ...s.browser, frameHistory: next } };
    });

  const browserSocket = new BrowserSocket((e) => {
    if (e.type === "frame") {
      pushFrameHistory({ pngBase64: e.pngBase64, url: e.url, action: e.action, ts: e.timestamp });
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
      }));
      if (e.action) {
        foldBrowserIntoRun({
          type: "browser.frame",
          title: e.action ?? "Browser frame",
          payload: { pngBase64: e.pngBase64, action: e.action, cursor: e.cursor },
        });
      }
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
      if (get().browser.findings.length >= 2) hintWorkSurface("research-map");
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
      archiveBrowseRun("completed");
      drainExecutionQueueWhenIdle();
    } else if (e.type === "error") {
      // Single story: the Operator surface owns browser errors (with Retry);
      // the feed records it — no duplicate red row in chat.
      set((s) => ({
        browser: { ...s.browser, running: false, lastError: e.message },
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
    lastAgentUserMessage: undefined,
    pendingHandoffConfirm: undefined,

    feedItems: [],
    feedFilter: "all",
    feedCollapsed:
      typeof localStorage !== "undefined" && localStorage.getItem(FEED_COLLAPSED_KEY) === "1",
    activeFeedItemId: undefined,
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
        return { sessionOutcomes: [...s.sessionOutcomes, row].slice(-24) };
      });
    },

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
            runtime: syncRuntimeFromState(connection, auth, false),
          };
        });
        return;
      }
      setAuthConfig(config);

      if (!config.authEnabled) {
        const signedIn = connection.state === "connected";
        set((s) => ({
          auth: { ...s.auth, state: signedIn ? "signed-in" : "signed-out", authEnabled: false },
          localOnlyMode: !signedIn,
          runtime: syncRuntimeFromState(
            connection,
            { ...s.auth, state: signedIn ? "signed-in" : "signed-out", authEnabled: false },
            !signedIn,
          ),
        }));
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
        set((s) => ({
          auth: { ...s.auth, user: me.user, usage: me.usage, quota: me.quota },
          tierFeatures: me.features,
          tierLabel: me.tierLabel,
        }));
        void window.api.cache.set("me", me);
      } catch (err) {
        reportBackgroundError("loadMe", err, "warn");
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
          return;
        }
        const profile = (await res.json()) as MarketingProfile;
        set({ marketingProfile: profile });
        if (profile.campaign_session) {
          persistCampaignSessionLocal(projectId, profile.campaign_session);
        } else {
          hydrateCampaignSessionLocal(projectId);
        }
        const oi = profile.outreach_integrations;
        if (oi && (oi.webhook_url || oi.webhook_provider)) {
          const { settings } = get();
          void get().updateSettings({
            outreachWebhookUrl: oi.webhook_url ?? settings.outreachWebhookUrl,
            outreachWebhookProvider: oi.webhook_provider ?? settings.outreachWebhookProvider,
          });
        }
        get().refreshConnectorFeed();
      } catch {
        hydrateCampaignSessionLocal(projectId);
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
          set({ marketingProfile: profile });
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
      set({
        runtime: syncRuntimeFromState(connection, auth, localOnlyMode),
      });
    },

    openConnectFlow: () => {
      const { auth, phase, settingsOpen } = get();
      if (settingsOpen) get().toggleSettings(false);

      if (phase !== "workspace") {
        set({ phase: "onboarding" });
        return;
      }

      if (auth.authEnabled && auth.state !== "signed-in") {
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
      set({
        plan: outline,
        planPreviewMode: true,
        planError: null,
        canvas: { mode: "campaign-plan" },
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
          marketingProfile: get().marketingProfile ?? emptyMarketingProfile(),
        });
        get().refreshConnectorFeed();
        void get().loadMarketingProfile(project.id);
        hydrateCampaignSessionLocal(project.id);
        void get().loadRunsArchive();
        void get().refreshRecents();
        if (!canRunAgent(get().runtime)) {
          get().previewPlanOutline();
        }
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
      agentAbort?.abort();
      agentAbort = null;
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
              get().recordSessionOutcome({
                kind: "plan",
                label: "Launch plan generated",
                channel: "plan studio",
              });
              const planId = normalized?.id ?? e.plan.id;
              get().advanceCampaignPhase({ type: "plan_generate_success", planId });
              set({
                plan: normalized ?? e.plan,
                planGenerationPhase: "idle",
                planLoadingPlaybookIds: [],
                planOutlinePlaybooks: [],
                planStreamingPlaybooks: [],
                planStreamingReadiness: [],
                planJustGenerated: true,
                planStatusLog: [],
              });
            } else if (e.type === "error") {
              // Plan SSE errors are now surfaced in BOTH the canvas AND the chat thread,
              // so users never wonder why "nothing happened" after a long wait.
              const presented = presentError(e.message);
              inlineError = presented.message;
              set({ planError: presented.message });
              appendEvent({ role: "agent", kind: "error", text: presented.message });
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

      const history = buildAgentHistory(get().thread.slice(0, -1));

      const thinkingEventId = appendEvent({
        role: "agent",
        kind: "thinking",
        thinkingPhase: "Thinking",
        thinkingText: "Understanding your request…",
      });
      let agentTextEventId: string | null = null;
      let useTextBubble = true;

      const removeThinking = () => {
        set((s) => ({ thread: s.thread.filter((e) => e.id !== thinkingEventId) }));
      };

      set({
        agentStreaming: true,
        suggestedComposerMode: undefined,
        lastAgentUserMessage: trimmed || undefined,
      });
      agentAbort?.abort();
      agentAbort = new AbortController();

      const { planProgress, settings: st, canvas, activePlaybookId, plan } = get();
      const activeSurface = normalizeToWorkSurface(canvas.mode) ?? undefined;
      const planProgressSummary = buildPlanProgressSummaryForAgent({
        plan: get().plan,
        planProgress,
        activePlaybookId,
      });
      const planSnapshot = plan ? normalizePlan(plan) ?? plan : undefined;
      const agentContext =
        opts?.context ??
        buildAgentTurnContext({
          run: get().run,
          plan: get().plan,
          planProgress,
          campaignSession: get().marketingProfile?.campaign_session ?? null,
        });

      let streamBuffer = "";
      let streamFlushTimer: ReturnType<typeof setTimeout> | null = null;
      let capturedBrainSkills: string[] | undefined;
      const flushStreamText = () => {
        if (!agentTextEventId || !streamBuffer) return;
        const current = get().thread.find((x) => x.id === agentTextEventId);
        patchEvent(agentTextEventId, { text: (current?.text ?? "") + streamBuffer });
        streamBuffer = "";
      };

      try {
        await streamAgent(
          settings,
          {
            sessionId,
            profile: project ?? undefined,
            message: trimmed,
            history,
            persona: st.persona,
            planProgressSummary,
            activeSurface,
            context: agentContext,
            planSnapshot,
          },
          auth.authEnabled,
          (e) => {
            if (e.type === "brain.status") {
              if (e.skills?.length) capturedBrainSkills = e.skills;
              patchEvent(thinkingEventId, {
                thinkingPhase: e.phase,
                thinkingText: e.text,
                thinkingSkills: e.skills,
              });
            } else if (e.type === "brain.intent") {
              patchEvent(thinkingEventId, {
                thinkingText: `Working on ${e.discipline.replace(/_/g, " ")}…`,
              });
            } else if (e.type === "brain.retrieved") {
              capturedBrainSkills = e.skills;
              patchEvent(thinkingEventId, {
                thinkingText: `Pulling ${e.skills.length} playbook sections…`,
                thinkingSkills: e.skills,
              });
            } else if (e.type === "brain.profile") {
              patchEvent(thinkingEventId, {
                thinkingText: "Reading product profile…",
              });
            } else if (e.type === "brain.critique") {
              patchEvent(thinkingEventId, {
                thinkingText: "Reviewing decision quality…",
              });
            } else if (e.type === "decision") {
              removeThinking();
              useTextBubble = false;
              appendEvent({
                role: "agent",
                kind: "decision",
                decision: e.decision,
                critique: e.critique,
                summary: e.summary,
                text: e.summary,
              });
            } else if (e.type === "draft") {
              removeThinking();
              useTextBubble = false;
              appendEvent({
                role: "agent",
                kind: "draft",
                draftSummary: e.summary,
                draftAssets: e.assets,
                draftCritique: e.draft_critique,
                draftQualityWarn: e.quality_warn,
                text: e.summary,
              });
              if (e.assets.length) hintWorkSurface("content-set");
            } else if (e.type === "proactive_suggestion") {
              removeThinking();
              useTextBubble = false;
              appendEvent({
                role: "agent",
                kind: "proactive_suggestion",
                proactiveTitle: e.title,
                proactiveAction: e.action,
                text: e.body,
              });
            } else if (e.type === "plan_revision") {
              removeThinking();
              useTextBubble = false;
              const currentPlan = get().plan;
              const prevProgress = get().planProgress?.byTaskId;
              const revised = normalizePlan(e.plan) ?? e.plan;
              const diff =
                e.diff ??
                (currentPlan
                  ? diffPlanVersions(currentPlan, revised, e.summary)
                  : e.diff);
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
                text: e.summary,
                planRevisionSummary: e.summary,
                planRevisionDiff: diff,
                sourcePlanId: e.sourcePlanId,
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
            } else if (e.type === "missing_info") {
              removeThinking();
              useTextBubble = false;
              appendEvent({
                role: "agent",
                kind: "missing_info",
                missingQuestions: e.questions,
                missingInfoState: "open",
              });
            } else if (e.type === "suggested_mode") {
              const snap = get();
              const suite = snap.plan ? normalizePlan(snap.plan) : null;
              const resolved = resolveIntent({
                suggestedMode: e.mode,
                suggestedModeReason: e.reason,
                message: snap.lastAgentUserMessage,
                plan: suite,
                planProgress: snap.planProgress,
                activeRunId: snap.run?.runId,
                planTaskId: snap.activePlanTaskId,
              });
              const handoff = resolved ? handoffFromResolved(resolved) : null;
              set({
                suggestedComposerMode: {
                  mode: e.mode,
                  reason: e.reason,
                },
                ...(handoff ? { workspaceHandoff: handoff } : {}),
              });
            } else if (e.type === "token") {
              if (!useTextBubble) return;
              if (!agentTextEventId) {
                removeThinking();
                agentTextEventId = appendEvent({ role: "agent", kind: "text", text: "" });
              }
              streamBuffer += e.text;
              if (!streamFlushTimer) {
                streamFlushTimer = setTimeout(() => {
                  flushStreamText();
                  streamFlushTimer = null;
                }, 50);
              }
            } else if (e.type === "tool") {
              if (e.name.startsWith("brain.")) return;
              appendEvent({
                role: "agent",
                kind: "tool",
                tool: e.name,
                text: e.detail ?? e.status,
              });
            } else if (e.type === "asset") {
              appendEvent({ role: "agent", kind: "asset", asset: e.asset });
              get().recordSessionOutcome({
                kind: "asset",
                label: `${e.asset.type} draft ready`,
                channel: e.asset.type,
              });
              if (e.asset.type === "ad" || e.asset.type === "tweet") {
                hintWorkSurface("ad-preview");
              } else {
                hintWorkSurface("content-set");
              }
            } else if (e.type === "error") {
              removeThinking();
              appendPresentedError(e.message);
            }
          },
          agentAbort.signal,
        );
        if (streamFlushTimer) {
          clearTimeout(streamFlushTimer);
          flushStreamText();
        }
        if (capturedBrainSkills?.length) {
          appendEvent({
            role: "agent",
            kind: "status",
            text: strategyContextSummary(capturedBrainSkills),
          });
        }
        swallowBackground("loadMe", get().loadMe());
        if (activeProjectId) {
          void apiListAssets(settings, auth.authEnabled, activeProjectId)
            .then(({ assets }) => set({ serverAssets: assets }))
            .catch((err) => reportBackgroundError("apiListAssets", err, "debug"));
        }
      } catch (err) {
        if (agentAbort?.signal.aborted) {
          set((s) => ({
            thread: s.thread.filter(
              (e) =>
                e.id !== thinkingEventId && (agentTextEventId ? e.id !== agentTextEventId : true),
            ),
          }));
          appendEvent({ role: "system", kind: "status", text: "Stopped." });
          return;
        }
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
      } finally {
        agentAbort = null;
        set((s) => ({
          thread: s.thread.filter((e) => e.id !== thinkingEventId),
        }));
        if (agentTextEventId) {
          const current = get().thread.find((x) => x.id === agentTextEventId);
          if (current && !current.text?.trim()) {
            set((s) => ({ thread: s.thread.filter((e) => e.id !== agentTextEventId) }));
          }
        }
        set({ agentStreaming: false });
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
      const { settings, browser, auth, connection } = get();
      const planTask = taskId ? plan?.taskGraph.find((t) => t.id === taskId) : undefined;
      const resolvedGoal = resolveBrowserGoal({
        rawGoal: trimmed,
        playbookId: planTask?.playbookId ?? activePlaybookId,
        task: planTask,
      });

      if (!canRunAgent(get().runtime)) {
        appendPresentedError(
          get().runtime === "degraded"
            ? "anthropic_not_configured"
            : "not connected to backend",
        );
        return;
      }
      if (!connection.providers?.anthropic) {
        appendPresentedError("anthropic_not_configured");
        return;
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
        canvas: { mode: "browser" },
        browser: {
          ...browser,
          running: true,
          currentGoal: resolvedGoal.slice(0, 200),
          frame: undefined,
          prevFrame: undefined,
          pendingApprovalId: undefined,
          lastError: undefined,
          lastStatus: "Starting browser…",
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
      track("browser_task");
      void (async () => {
        const token = await resolveBackendToken(settings, auth.authEnabled);
        browserSocket.start(settings.serverUrl, token, resolvedGoal, browser.autoApprove, settings.persona);
      })();
    },

    stopBrowser: () => {
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
      browserSocket.pause();
      set((s) => ({ browser: { ...s.browser, paused: true } }));
    },

    resumeBrowser: () => {
      browserSocket.resume();
      set((s) => ({ browser: { ...s.browser, paused: false } }));
    },

    steerBrowser: (text) => {
      const t = text.trim();
      if (!t) return;
      browserSocket.steer(t);
      appendEvent({ role: "user", kind: "text", text: `↪ ${t}` });
      browserSocket.resume();
      set((s) => ({ browser: { ...s.browser, paused: false } }));
    },

    approve: (id) => {
      const { pendingSummary } = get().browser;
      browserSocket.approve(id);
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
      browserSocket.reject(id);
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
        const { runId } = await window.api.agent.startRun({
          cwd,
          goal: trimmed,
          serverUrl: settings.serverUrl,
          sessionToken: token,
          projectId: get().activeProjectId,
          sessionId: get().activeSessionId,
          planTaskId,
          kind: "edit",
        });
        set((s) => (s.run ? { run: { ...s.run, runId } } : {}));
        linkMessageToRun(sourceMessageId, runId);
        get().registerCampaignRun(runId, planTaskId);
      } catch (err) {
        appendEvent({ role: "agent", kind: "error", text: errorMessage(err) });
        set((s) => (s.run ? { run: { ...s.run, status: "failed" } } : {}));
      }
    },

    interruptRun: () => {
      const { run } = get();
      if (!run?.runId) return;
      void window.api.agent.interrupt(run.runId);
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
        appendEvent({
          role: "system",
          kind: "status",
          text: result.applied.length
            ? `Applied ${result.applied.length} file(s)${result.branch ? ` to ${result.branch}` : ""}.`
            : "No files applied.",
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
          set({ run: null, replayRun: null, runApplySelection: [], canvas: { mode: "empty" } });
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
          return;
        }
        if (item.source === "run" || get().run?.pendingApproval?.approvalId === item.approvalId) {
          get().setActiveCanvas("run");
          return;
        }
      }

      const target = item.canvasTarget;
      if (!target) return;

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

    toggleFocusMode: (on) => set((s) => ({ focusMode: on ?? !s.focusMode })),
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

      if (!opts?.skipConfirm && intentRequiresConfirm(intent)) {
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
