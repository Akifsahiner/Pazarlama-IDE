/**
 * Shared types used across main, preload and renderer.
 * Keep this file free of runtime/node imports so it is safe everywhere.
 */

/** Composer motor — includes Auto (Faz 5 natural language routing). */
export type { ComposerMode } from "./quickActions";

export type ProjectSource =
  | { kind: "folder"; path: string }
  | { kind: "repo"; url: string }
  | { kind: "url"; url: string };

export interface ProjectProfile {
  id: string;
  source: ProjectSource;
  /** Local clone path for repo projects (file search, editor links). */
  localPath?: string;
  name: string;
  productType?: string;
  framework?: string;
  readmeSummary?: string;
  routes: string[];
  hasAnalytics: boolean;
  excludedPaths: string[];
  scannedFileCount: number;
}

export interface ReadinessScore {
  label: string;
  score: number;
}

export interface PlanTask {
  id: string;
  title: string;
  dependsOn: string[];
  metric?: string;
  day: number;
  /** What the agent should produce (file, copy, config change). */
  deliverable?: string;
  /** How to verify the step is done. */
  acceptance_criteria?: string;
  /** Suggested execution mode. */
  action_type?: "edit_files" | "browser_research" | "draft_copy" | "analyze";
  /** GTM v3 — professional tactic id (e.g. ph_supporter_dm). */
  tactic?: string;
  /** Channel key (product_hunt, linkedin, waitlist, paid_meta, …). */
  channel?: string;
  /** How to execute this task in the product. */
  execution_mode?: "repo" | "browser" | "asset" | "run" | "connector_read";
  /** Step-by-step founder checklist (markdown). */
  instructions_md?: string;
  /** Success KPI for this task. */
  kpi?: { name: string; target: string };
  /** Parent playbook (Plan Studio v2). */
  playbookId?: string;
  phaseLabel?: string;
}

/** Feed / next-action gate when a plan task awaits user closure (mirror: planTaskCompletion.ts). */
export type PlanTaskCompletionGate =
  | "apply-pending"
  | "review-pending"
  | "research-pending"
  | "partial-apply";

export type InitPhase =
  | "boot"
  | "settings"
  | "resuming"
  | "connecting"
  | "done"
  | "error";

export interface ContentItem {
  day: number;
  channel: string;
  title: string;
  type: "post" | "email" | "article" | "ad";
}

export interface SessionOutcome {
  id: string;
  at: number;
  kind: "asset" | "run" | "plan" | "research" | "copy";
  label: string;
  channel?: string;
  /** Dedupe key (e.g. finding id). */
  ref?: string;
  detail?: string;
}

export interface MarketingPlan {
  id: string;
  positioning: string;
  icp: string;
  readiness: ReadinessScore[];
  taskGraph: PlanTask[];
  contentCalendar: ContentItem[];
  strategyNote: string;
  /** Plan Studio v2 fields (optional on legacy plans). */
  schemaVersion?: 1 | 2;
  thesis?: string;
  narrativeHook?: string;
  primaryBottleneck?: import("./bottleneck").GtmBottleneck;
  primaryPlaybookId?: string;
  bottleneckWhy?: string;
  playbooks?: import("./planPlaybooks").PlanPlaybook[];
  antiPatterns?: string[];
  /** True when plan is a local scan outline preview (no LLM). */
  preview?: boolean;
}

export interface MarketingAsset {
  id: string;
  type: "landing-copy" | "tweet" | "email" | "ad";
  targetFile?: string;
  before?: string;
  after: string;
  appliedCommit?: string;
  appliedPath?: string;
  applyMode?: "sidecar" | "direct";
}

export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool"; name: string; status: "start" | "done"; detail?: string }
  | { type: "asset"; asset: MarketingAsset }
  | { type: "browser_frame"; pngBase64: string; action?: string }
  | { type: "approval_request"; id: string; summary: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type LLMProviderId = "anthropic" | "openai";

export interface Settings {
  serverUrl: string;
  apiToken: string;
  provider: LLMProviderId;
  theme: "dark" | "light" | "system";
  reducedMotion: boolean;
  telemetry: boolean;
  /** Operator persona — drives onboarding, quick-actions, default skills. */
  persona: Persona;
  /** True once the user has picked a focus in onboarding (skip the step after). */
  personaChosen?: boolean;
  /** Launch plan horizon in days (Plan Studio generation). */
  planHorizon?: 14 | 30;
  /** Optional webhook for Lemlist/Instantly/generic outreach dispatch. */
  outreachWebhookUrl?: string;
  outreachWebhookProvider?: "lemlist" | "instantly" | "generic";
}

/* ------------------------------------------------------------------ */
/* Marketing Brain — structured project memory (mirror of             */
/* server/src/schemas/marketingProfile.ts). Keep structurally aligned. */
/* ------------------------------------------------------------------ */

export interface ExperimentRun {
  id: string;
  date: string;
  hypothesis: string;
  discipline: string;
  outcome: "pending" | "success" | "failure" | "inconclusive";
  metric?: { name: string; value: number };
  learning?: string;
  evidence_urls?: string[];
}

export interface ManualKpi {
  id: string;
  name: string;
  value: number;
  target?: number;
  unit?: string;
  channel?: string;
  updated_at: string;
  source: "manual";
}

export interface Ga4ConnectorSnapshot {
  fetched_at: string;
  metrics: Array<{ name: string; value: number; unit?: string }>;
}

export interface OutreachIntegrations {
  webhook_url?: string;
  webhook_provider?: "lemlist" | "instantly" | "generic";
}

export type CampaignPhase = "intake" | "planning" | "executing" | "reviewing" | "measuring";

export type CampaignMilestoneKind =
  | "phase"
  | "plan"
  | "run"
  | "apply"
  | "asset"
  | "kpi"
  | "complete";

export interface CampaignMilestone {
  label: string;
  at: string;
  kind: CampaignMilestoneKind;
}

export interface CampaignSession {
  id: string;
  projectId: string;
  goal: string;
  persona: "marketing" | "sales";
  startedAt: string;
  planId?: string;
  activeTaskId?: string;
  phase: CampaignPhase;
  milestones: CampaignMilestone[];
  runIds: string[];
  assetIds: string[];
}

export type CompanyStage = "" | "idea" | "prelaunch" | "launched" | "growing" | "scaling";
export type BusinessModel =
  | ""
  | "saas"
  | "freemium"
  | "marketplace"
  | "agency"
  | "tool"
  | "consumer";

export interface MarketingProfile {
  product_name: string;
  product_description: string;
  category: string;
  business_model: BusinessModel;
  price_range?: { low: number; high: number; currency: string };
  target_audience: Array<{ persona: string; pains: string[]; jobs: string[] }>;
  primary_problem: string;
  main_value_proposition: string;
  differentiators: string[];
  competitors: Array<{ name: string; url?: string; note?: string }>;
  company_stage: CompanyStage;
  current_users?: number;
  main_markets: string[];
  available_channels: string[];
  marketing_goals: string[];
  brand_voice: string;
  existing_proof: string[];
  available_assets: string[];
  constraints: string[];
  previous_experiments: ExperimentRun[];
  successful_experiments: string[];
  failed_experiments: string[];
  manual_kpis?: ManualKpi[];
  connector_snapshots?: { ga4?: Ga4ConnectorSnapshot; meta?: Ga4ConnectorSnapshot };
  ga4_oauth?: { refresh_token: string; property_id?: string; connected_at: string };
  meta_oauth?: { access_token: string; ad_account_id?: string; connected_at: string };
  linkedin_oauth?: { access_token: string; connected_at: string };
  hubspot_oauth?: { access_token: string; refresh_token?: string; connected_at: string };
  outreach_integrations?: OutreachIntegrations;
  /** Active marketing campaign thread (Faz 6). */
  campaign_session?: CampaignSession;
  last_updated: string;
  confidence_score: number;
  gaps: string[];
}

export interface MarketingDecisionAsset {
  kind: "copy" | "email" | "post" | "checklist" | "doc" | "ad";
  title: string;
  content: string;
  suggested_target_file?: string;
  apply_mode?: "sidecar" | "integrate" | "clipboard";
}

export interface MarketingDecisionOption {
  name: string;
  pros: string[];
  cons: string[];
  fit_score: number;
}

export type GtmBottleneck =
  | "awareness"
  | "conversion"
  | "distribution"
  | "revenue"
  | "measurement";

export interface MarketingDecision {
  diagnosis: string;
  bottleneck: string;
  gtm_bottleneck?: GtmBottleneck;
  primary_playbook_id?: string;
  bottleneck_why?: string;
  channel_priority?: string[];
  next_playbook?: string;
  tactic_you_may_not_know?: string;
  options_compared: MarketingDecisionOption[];
  decision: string;
  rationale: string;
  ready_to_use_assets: MarketingDecisionAsset[];
  next_steps: Array<{ step: string; owner?: string; eta?: string }>;
  success_metric: { name: string; target: string };
  when_to_reconsider: string;
  missing_info: string[];
}

export interface MarketingCritique {
  product_specificity: number;
  actionability: number;
  strategic_depth: number;
  realism: number;
  brand_voice_match: number;
  generality_penalty: number;
  total: number;
  revisions: string[];
  approve: boolean;
}

/** Shorter draft copy critique rubric (max 40). */
export interface MarketingDraftCritique {
  specificity: number;
  actionability: number;
  brand_voice: number;
  generality_penalty: number;
  total: number;
  revisions: string[];
  approve: boolean;
}

export interface AgentTurnContext {
  last_run_summary?: string;
  pending_files?: string[];
  campaign_phase?: string;
  plan_progress?: { done: number; total: number; next_task_title?: string };
  proactive_trigger?: "apply_complete" | "plan_task_done" | "measuring_phase";
}

export interface ProactiveSuggestionAction {
  kind: "continue_plan" | "log_kpi" | "focus_run" | "open_plan";
  taskId?: string;
  playbookId?: string;
  presetId?: string;
}

export type ComposerSuggestedMode = "edit" | "browse";

export type BrainDiscipline =
  | "positioning"
  | "icp"
  | "landing"
  | "ph_launch"
  | "launch_plan"
  | "email"
  | "content"
  | "seo"
  | "social"
  | "growth"
  | "ads"
  | "cro"
  | "analytics"
  | "pricing"
  | "lead_research"
  | "outreach"
  | "meta_question";

export type BrainTaskKind = "diagnose" | "decide" | "draft" | "audit" | "research" | "answer";

export type PlanProgressSummary = {
  done: number;
  total: number;
  nextTaskTitle?: string;
  nextTaskId?: string;
  nextPlaybookId?: string;
  activePlaybookId?: string;
  activePlaybookTitle?: string;
  byPlaybook?: Record<string, { done: number; total: number }>;
};

export type AgentTurnPersist = {
  kind: "decision" | "draft" | "answer" | "missing_info";
  text?: string;
  summary?: string;
  decision?: MarketingDecision;
  draftAssets?: MarketingDecisionAsset[];
  critique?: MarketingCritique;
  questions?: string[];
  suggested_mode?: ComposerSuggestedMode;
  assets?: MarketingAsset[];
};

/** Stable error codes from the server (UI translates to user-facing copy). */
export type StreamErrorCode =
  | "rate_limited"
  | "quota_exceeded"
  | "model_error"
  | "timeout"
  | "missing_info"
  | "internal";

export type PlanStreamEvent =
  | { type: "status"; message: string }
  | {
      type: "plan.outline";
      thesis: string;
      narrativeHook: string;
      playbooks: import("./planPlaybooks").PlaybookStub[];
      primaryBottleneck?: import("./bottleneck").GtmBottleneck;
      primaryPlaybookId?: string;
      bottleneckWhy?: string;
    }
  | {
      type: "plan.playbook";
      playbook: import("./planPlaybooks").PlanPlaybook;
      index: number;
      total: number;
    }
  | {
      type: "plan.readiness";
      readiness: import("./planPlaybooks").ReadinessScoreWithRationale[];
    }
  | {
      type: "plan.revision";
      summary: string;
      diff: import("./planDiff").PlanRevisionDiff;
      sourcePlanId: string;
      plan: MarketingPlan;
    }
  | { type: "plan"; plan: MarketingPlan }
  | { type: "error"; message: string; code?: StreamErrorCode }
  | { type: "done" };

export type AgentStreamEvent =
  | { type: "token"; text: string }
  | {
      type: "brain.intent";
      discipline: BrainDiscipline;
      task_kind: BrainTaskKind;
      urgency: "fast" | "deep";
    }
  | { type: "brain.status"; phase: string; text: string; skills?: string[] }
  | { type: "brain.retrieved"; skills: string[] }
  | { type: "brain.profile"; gaps: string[] }
  | { type: "brain.critique"; critique: MarketingCritique }
  | {
      type: "decision";
      decision: MarketingDecision;
      critique?: MarketingCritique;
      summary?: string;
    }
  | {
      type: "draft";
      summary: string;
      assets: MarketingDecisionAsset[];
      suggested_mode?: ComposerSuggestedMode;
      draft_critique?: MarketingDraftCritique;
      quality_warn?: boolean;
    }
  | {
      type: "proactive_suggestion";
      title: string;
      body: string;
      action?: ProactiveSuggestionAction;
      source: "apply_complete" | "plan_task_done" | "measuring_phase" | "brain";
    }
  | { type: "missing_info"; questions: string[] }
  | { type: "suggested_mode"; mode: ComposerSuggestedMode; reason?: string }
  | { type: "tool"; name: string; status: "start" | "done"; detail?: string }
  | { type: "asset"; asset: MarketingAsset }
  | {
      type: "plan_revision";
      summary: string;
      diff: import("./planDiff").PlanRevisionDiff;
      plan: MarketingPlan;
      sourcePlanId: string;
    }
  | { type: "error"; message: string; code?: StreamErrorCode }
  | { type: "done" };

/* ------------------------------------------------------------------ */
/* Run Event model — MIRROR of server/src/runs/types.ts.              */
/* Keep these two structurally identical. See that file for docs.     */
/* ------------------------------------------------------------------ */

export type RunEventType =
  | "run.created"
  | "run.planning"
  | "run.paused"
  | "run.completed"
  | "run.failed"
  | "agent.status"
  | "agent.message"
  | "tool.requested"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "browser.frame"
  | "browser.navigated"
  | "browser.clicked"
  | "browser.typed"
  | "browser.scrolled"
  | "browser.highlighted"
  | "file.patch_created"
  | "file.patch_updated"
  | "file.patch_applied"
  | "file.patch_discarded"
  | "file.validation_started"
  | "file.validation_completed"
  | "preview.started"
  | "preview.ready"
  | "preview.failed"
  | "evidence.captured"
  | "issue.detected"
  | "approval.required"
  | "verification.completed";

export type RunEventStatus = "pending" | "running" | "success" | "failed";

export interface RunEvent {
  id: string;
  runId: string;
  stepId?: string;
  seq: number;
  timestamp: string;
  type: RunEventType;
  status?: RunEventStatus;
  title: string;
  summary?: string;
  payload?: Record<string, unknown>;
}

export type RunStatus =
  | "created"
  | "planning"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export type PermissionScope =
  | "read_inspect"
  | "create_drafts"
  | "modify_local_files"
  | "submit_public_forms"
  | "publish_send"
  | "spend_money";

export type PermissionLevel = "auto" | "ask" | "always_ask" | "never";

export type PermissionPolicy = Record<PermissionScope, PermissionLevel>;

export const DEFAULT_PERMISSION_POLICY: PermissionPolicy = {
  read_inspect: "auto",
  create_drafts: "auto",
  modify_local_files: "ask",
  submit_public_forms: "always_ask",
  publish_send: "always_ask",
  spend_money: "never",
};

export const PERMISSION_SCOPE_LABELS: Record<PermissionScope, string> = {
  read_inspect: "Read and inspect",
  create_drafts: "Create drafts",
  modify_local_files: "Modify local files",
  submit_public_forms: "Submit public forms",
  publish_send: "Publish or send",
  spend_money: "Spend money",
};

export interface FilePatchPayload {
  file: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface ValidationPayload {
  checks: { label: string; status: RunEventStatus }[];
}

export interface BrowserFramePayload {
  pngBase64: string;
  action?: string;
  cursor?: { x: number; y: number };
  viewport?: { width: number; height: number };
}

/* ------------------------------------------------------------------ */
/* Computer Use "Operator" live-theater contract (mirror of           */
/* server/src/browser/types.ts). Keep structurally identical.         */
/* ------------------------------------------------------------------ */

export type Persona = "marketing" | "sales";

/** Permission scopes for browser actions that touch the public internet. */
export type BrowserScope =
  | "navigate"
  | "form_submit"
  | "public_post"
  | "credential"
  | "download";

export type OperatorPhase = "thinking" | "acting" | "waiting_approval" | "verifying";

export type ActionVerb =
  | "click"
  | "type"
  | "scroll"
  | "navigate"
  | "drag"
  | "key"
  | "wait"
  | "screenshot";

export interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rich metadata for a single browser frame. */
export interface FrameMeta {
  pngBase64: string;
  action?: string;
  actionVerb?: ActionVerb;
  cursor?: { x: number; y: number };
  bbox?: NormRect;
  url?: string;
  title?: string;
  step?: number;
  stepMax?: number;
  phase?: OperatorPhase;
  timestamp: string;
}

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  evidence: string;
  suggestion: string;
  url?: string;
  bbox?: NormRect;
  frameRef?: string;
  createdAt: string;
}

export interface RunReport {
  runId: string;
  goal: string;
  persona: Persona;
  startedAt: string;
  endedAt: string;
  outcome: "completed" | "stopped" | "error";
  changes: Array<{ file: string; summary: string; applied: boolean }>;
  evidence: Finding[];
  validations: Array<{ label: string; passed: boolean; detail?: string }>;
  visitedUrls: string[];
  skillsUsed: string[];
  nextSteps: string[];
}

/** A frame retained in the live filmstrip ring buffer (renderer-local). */
export interface FrameHistoryEntry {
  pngBase64?: string;
  url?: string;
  action?: string;
  ts: string;
}

export interface EvidencePayload {
  issueId?: string;
  evidence: string;
  suggestedAction?: string;
}

export interface ApprovalPayload {
  approvalId: string;
  scope: PermissionScope;
  intent: string;
}

export interface AssetApplyResult {
  applied: boolean;
  path?: string;
  reason?: string;
  commit?: string;
  branch?: string;
}

export interface AuthStatus {
  connected: boolean;
  serverUrl?: string;
  provider?: LLMProviderId;
}

/** Encrypted-at-rest token blob persisted by the main process. */
export interface AuthTokenBlob {
  access_token: string;
  refresh_token: string;
  /** Epoch milliseconds when the access token expires. */
  expires_at: number;
  email: string;
  userId: string;
}

/** Public backend config used to drive Supabase Auth directly from the client. */
export interface ServerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authEnabled: boolean;
}

export interface UserInfo {
  id: string;
  email: string;
  tier?: string;
}

export interface UsageInfo {
  plan: number;
  agent: number;
  browser_min: number;
}

export interface QuotaInfo {
  plan_limit: number;
  agent_limit: number;
  browser_min_limit: number;
}

export interface MeResponse {
  user: UserInfo;
  features?: string[];
  tierLabel?: string;
  usage: UsageInfo;
  quota: QuotaInfo;
}

/** Shape of a project row returned by the backend. */
export interface ServerProject {
  id: string;
  user_id: string;
  name: string;
  source_kind: "folder" | "repo" | "url";
  source_ref: string;
  framework: string | null;
  product_type: string | null;
  profile_json: unknown;
  created_at: string;
  updated_at: string;
}

export interface ServerSession {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ServerMessage {
  id: string;
  session_id: string;
  role: "user" | "agent" | "system";
  kind: string | null;
  content_json: unknown;
  ts: string;
}

export interface ServerAsset {
  id: string;
  session_id: string | null;
  project_id: string;
  type: string | null;
  target_file: string | null;
  before_text: string | null;
  after_text: string;
  applied_at: string | null;
  applied_commit: string | null;
  created_at: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  kind: "file" | "dir";
  children?: FileTreeNode[];
}

export interface GitApplyInput {
  root: string;
  targetFile: string;
  content: string;
  branch?: string;
  message?: string;
}

export interface GitApplyResult {
  commit: string;
  branch: string;
}

export interface RepoStatus {
  isGit: boolean;
  branch?: string;
  headSha?: string;
}

export interface RecentProject {
  id: string;
  name: string;
  source: ProjectSource;
  openedAt: number;
}

export interface ScanProgress {
  message: string;
  pct?: number;
}

/** Surface exposed to the renderer via contextBridge (see preload). */
export interface DesktopApi {
  chrome: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (cb: (isMax: boolean) => void) => () => void;
  };
  dialog: {
    openProjectFolder: () => Promise<ProjectSource | null>;
  };
  project: {
    scan: (source: ProjectSource) => Promise<ProjectProfile>;
    onScanProgress: (cb: (progress: ScanProgress) => void) => () => void;
    recents: () => Promise<RecentProject[]>;
    applyAsset: (asset: MarketingAsset, root?: string) => Promise<AssetApplyResult>;
    cloneRepo: (url: string) => Promise<string>;
  };
  git: {
    applyAsset: (input: GitApplyInput) => Promise<GitApplyResult>;
    rollback: (root: string, commit: string) => Promise<void>;
    status: (root: string) => Promise<RepoStatus>;
  };
  fs: {
    tree: (root: string) => Promise<FileTreeNode[]>;
    read: (root: string, relPath: string) => Promise<string>;
  };
  settings: {
    get: () => Promise<Settings>;
    set: (patch: Partial<Settings>) => Promise<Settings>;
  };
  auth: {
    getTokens: () => Promise<AuthTokenBlob | null>;
    setTokens: (blob: AuthTokenBlob) => Promise<void>;
    clear: () => Promise<void>;
    onCallback: (cb: (url: string) => void) => () => void;
  };
  cache: {
    get: <T = unknown>(key: string) => Promise<T | null>;
    set: (key: string, value: unknown) => Promise<void>;
  };
  app: {
    version: () => Promise<string>;
    e2e: () => Promise<{ fixturePath?: string }>;
    platform: NodeJS.Platform;
  };
  updater: {
    install: () => void;
    onAvailable: (cb: (info: { version: string }) => void) => () => void;
    onDownloaded: (cb: (info: { version: string }) => void) => () => void;
  };
  agent: {
    startRun: (req: StartRunRequest) => Promise<{ runId: string }>;
    interrupt: (runId: string) => Promise<void>;
    approve: (approvalId: string, approved: boolean) => Promise<void>;
    apply: (runId: string, files: string[]) => Promise<RunApplyResult>;
    discard: (runId: string) => Promise<void>;
    discardFiles: (
      runId: string,
      files: string[],
    ) => Promise<{ discarded: string[]; remaining: string[] }>;
    preview: (runId: string) => Promise<void>;
    stopPreview: (runId: string) => Promise<void>;
    validate: (runId: string) => Promise<void>;
    since: (runId: string, afterSeq: number) => Promise<RunEvent[]>;
    activeRun: () => Promise<{ runId: string; events: RunEvent[] } | null>;
    onEvent: (cb: (event: RunEvent) => void) => () => void;
    onRunRegistered: (cb: (payload: RunRegisteredPayload) => void) => () => void;
  };
  activity: {
    listRuns: (projectId?: string) => Promise<import("./runs").LocalArchivedRun[]>;
    getRun: (runId: string) => Promise<import("./runs").LocalArchivedRun | null>;
    getRunEvents: (runId: string) => Promise<RunEvent[] | null>;
    appendBrowseRun: (input: {
      goal: string;
      status: "completed" | "failed";
      projectId?: string;
      steps?: number;
      url?: string;
      localRunId?: string;
      events?: RunEvent[];
      startedAt?: number;
      planTaskId?: string;
    }) => Promise<import("./runs").LocalArchivedRun>;
  };
  planProgress: {
    load: (projectId: string, planId: string) => Promise<import("./planProgress").PlanProgressSnapshot | null>;
    save: (projectId: string, snapshot: import("./planProgress").PlanProgressSnapshot) => Promise<void>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
    openInEditor: (input: {
      editor: "cursor" | "vscode";
      path: string;
      line?: number;
      folder?: boolean;
    }) => Promise<void>;
    revealInFolder: (absPath: string) => Promise<void>;
  };
  bundledServer: {
    available: () => Promise<boolean>;
    status: () => Promise<{ state: string; error?: string }>;
    start: () => Promise<{ ok: boolean; error?: string }>;
    stop: () => Promise<void>;
    hasApiKey: () => Promise<boolean>;
    setApiKey: (key: string) => Promise<void>;
  };
  export: {
    saveHtmlAsPdf: (input: {
      html: string;
      defaultFilename: string;
    }) => Promise<{ ok: boolean; path?: string; cancelled?: boolean; error?: string }>;
  };
}

export interface RunApplyResult {
  commit?: string;
  branch?: string;
  applied: string[];
}

/** Renderer → main request to start an agent run. */
export interface StartRunRequest {
  runId?: string;
  cwd: string;
  goal: string;
  serverUrl: string;
  sessionToken: string;
  skills?: string[];
  pluginPaths?: string[];
  projectId?: string;
  sessionId?: string;
  planTaskId?: string;
  kind?: "edit" | "browse" | "ask";
}

export interface RunRegisteredPayload {
  localRunId: string;
  serverRunId: string;
}
