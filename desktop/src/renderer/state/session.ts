import type {
  Finding,
  FrameHistoryEntry,
  MarketingAsset,
  MarketingCritique,
  MarketingDecision,
  MarketingDecisionAsset,
  NormRect,
  OperatorPhase,
  PermissionPolicy,
  PermissionScope,
  QuotaInfo,
  RunEvent,
  RunStatus,
  UsageInfo,
  UserInfo,
} from "@shared/types";

export type ConnectionState = "unknown" | "checking" | "connected" | "error";

export type AuthState = "unknown" | "signed-out" | "signing-in" | "signed-in";

export interface AuthInfo {
  state: AuthState;
  /** When false (local dev), sign-in is skipped and no Bearer is sent. */
  authEnabled: boolean;
  user?: UserInfo;
  usage?: UsageInfo;
  quota?: QuotaInfo;
  /** True when server has Stripe keys configured. */
  billingConfigured?: boolean;
  /** Email currently being signed in / signed in. */
  email?: string;
  /** True after a one-time code has been sent (verify step). */
  codeSent?: boolean;
  error?: string;
}
export type Phase = "onboarding" | "reveal" | "workspace";
/** Top-level destinations inside the app shell (post-onboarding). */
export type Route = "home" | "workspace" | "runs" | "assets" | "settings" | "help";
import type { CanvasMode as SharedCanvasMode } from "@shared/workSurfaces";

export type CanvasMode = SharedCanvasMode;

/** A pending tool approval surfaced by the Local Agent Host. */
export interface PendingApproval {
  approvalId: string;
  scope: PermissionScope;
  intent: string;
}

/** Live state for one agent run, driven by the unified RunEvent stream. */
export interface RunInfo {
  runId: string;
  /** Cloud canonical id when mirrored to server. */
  serverRunId?: string;
  goal: string;
  status: RunStatus;
  kind?: "edit" | "browse" | "ask";
  /** Archived replay — apply/discard disabled. */
  readOnly?: boolean;
  planTaskId?: string;
  /** User thread message that started this run (Faz 5). */
  sourceMessageId?: string;
  /** Ordered events (frames trimmed from older entries to bound memory). */
  events: RunEvent[];
  lastSeq: number;
  /** Latest one-line agent narration (intent strip). */
  intent?: string;
  /** Latest browser frame (base64) for the live stage. */
  frame?: string;
  /** Pending approval, if the run is blocked on the permission gate. */
  pendingApproval?: PendingApproval;
  policy: PermissionPolicy;
  startedAt: number;
}
export type EventKind =
  | "text"
  | "status"
  | "tool"
  | "asset"
  | "browser_frame"
  | "approval"
  | "error"
  | "feed_link"
  | "thinking"
  | "decision"
  | "draft"
  | "missing_info"
  | "proactive_suggestion"
  | "plan_task_complete"
  | "plan_complete"
  | "plan_revision"
  | "turn_receipt"
  | "executable_action";

export interface SessionEvent {
  id: string;
  role: "user" | "agent" | "system";
  kind: EventKind;
  text?: string;
  tool?: string;
  asset?: MarketingAsset;
  frame?: string;
  approvalId?: string;
  summary?: string;
  decision?: MarketingDecision;
  critique?: MarketingCritique;
  draftAssets?: MarketingDecisionAsset[];
  draftSummary?: string;
  draftCritique?: import("@shared/types").MarketingDraftCritique;
  draftQualityWarn?: boolean;
  proactiveTitle?: string;
  proactiveAction?: import("@shared/agentTurnContext").ProactiveSuggestionAction;
  proactiveButtonLabel?: string;
  answerCritique?: import("@shared/types").MarketingAnswerCritique;
  answerQualityWarn?: boolean;
  missingQuestions?: string[];
  missingInfoState?: "open" | "answered" | "dismissed";
  thinkingPhase?: string;
  thinkingText?: string;
  thinkingSkills?: string[];
  ts: number;
  feedItemId?: string;
  /** Run spawned from this user message (Faz 5 message ↔ run link). */
  linkedRunId?: string;
  completedTaskId?: string;
  completedTaskDay?: number;
  nextTaskId?: string;
  nextTaskDay?: number;
  nextTaskTitle?: string;
  nextPlaybookId?: string;
  planTaskFailed?: boolean;
  /** Non-terminal plan task outcomes (Faz 2 — Done = value). */
  planTaskVariant?: "done" | "failed" | "awaiting_apply" | "awaiting_review" | "partial";
  /** Why awaiting_review — drives PlanTaskCompleteCard CTAs. */
  planTaskReviewGate?: import("@shared/planTaskCompletion").PlanTaskCompletionGate;
  planRevisionDiff?: import("@shared/planDiff").PlanRevisionDiff;
  planRevisionSummary?: string;
  sourcePlanId?: string;
  turnReceipt?: import("@shared/turnReceipt").TurnReceipt;
  executableActions?: import("@shared/executableAction").ExecutableAction[];
}

export interface ProviderReadiness {
  anthropic: boolean;
  openai: boolean;
}

export interface ConnectorReadiness {
  ga4OAuth: boolean;
}

export interface ConnectionInfo {
  state: ConnectionState;
  providers?: ProviderReadiness;
  connectors?: ConnectorReadiness;
}

export interface CanvasState {
  mode: CanvasMode;
  activeAssetId?: string;
  adPreviewAssetId?: string;
  experimentId?: string;
  previewPath?: string;
  previewContent?: string;
}

export interface BrowserState {
  running: boolean;
  frame?: string;
  /** Previous frame, kept briefly for crossfade. */
  prevFrame?: string;
  pendingApprovalId?: string;
  pendingSummary?: string;
  autoApprove: boolean;
  lastError?: string;
  lastStatus?: string;
  lastAction?: string;
  /** Verb of the latest action — drives cursor click ripple / type caret. */
  actionVerb?: import("@shared/types").ActionVerb;
  /** Normalized cursor position (0..1) for the latest action, for overlay. */
  cursor?: { x: number; y: number };
  /** Normalized bounding box of the target element, for highlight. */
  bbox?: NormRect;
  /** Structured findings (issues/evidence) gathered during the session. */
  findings: Finding[];
  /** Live operator metadata. */
  url?: string;
  title?: string;
  step?: number;
  stepMax?: number;
  phase?: OperatorPhase;
  paused?: boolean;
  /** Filmstrip ring buffer (renderer-local; not persisted). */
  frameHistory: FrameHistoryEntry[];
  /** Active browser task goal snippet for Operator chrome. */
  currentGoal?: string;
}

let counter = 0;
export function makeEventId(): string {
  counter += 1;
  return `evt_${Date.now().toString(36)}_${counter}`;
}
