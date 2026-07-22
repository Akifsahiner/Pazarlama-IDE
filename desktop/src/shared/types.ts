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
  /** Monorepo workspace root when detected (e.g. apps/console). */
  monorepoRoot?: string;
  /** Detected app package paths inside a monorepo. */
  appPackages?: string[];
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
  turnId?: string;
  commitSha?: string;
  filesApplied?: number;
  linesDelta?: string;
  costCents?: number;
}

/** Quick Start wedge — persisted first-ship proof (Faz 1). */
export interface FirstShipLedger {
  at: number;
  commitSha?: string;
  summary: string;
  files: string[];
  linesDelta?: { add: number; del: number };
  previewUrl?: string;
  before?: {
    metaTitle?: string;
    metaDesc?: string;
    heroHeadline?: string;
    heroPath?: string;
  };
  after?: {
    metaTitle?: string;
    metaDesc?: string;
    heroHeadline?: string;
  };
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
  import_note?: string;
  snapshots?: Array<{
    day_index: number;
    value: number;
    recorded_at: string;
    source: "manual" | "import" | "proof" | "ga4";
  }>;
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

export interface FounderFitProfile {
  brand_face_readiness: "never" | "sometimes" | "primary_channel";
  controversy_tolerance: "avoid" | "selective" | "lean_in";
  monthly_budget_band: "0" | "under_500" | "500_2000" | "over_2000";
  scale_readiness: "not_yet" | "probably" | "yes";
  magic_moment: string;
  weekly_marketing_hours: "under_3" | "3_7" | "7_15" | "15_plus";
  thirty_day_win:
    | "qualified_signups"
    | "paying_customers"
    | "waitlist"
    | "pipeline_meetings"
    | "brand_awareness";
  completed_at: string;
}

export interface GrowthNarrative {
  cultural_tension: string;
  one_liner: string;
  enemy_frame?: string;
  proof_angle: string;
  signals: Record<string, string>;
}

export type StrategicOptionId = "A" | "B" | "C";

export interface StrategicOption {
  id: StrategicOptionId;
  posture: "safe" | "balanced" | "category_attack";
  title: string;
  summary: string;
  thesis_id: import("./cmoIntake").ChannelThesisId;
  tradeoffs: Array<{ pro: string; con: string }>;
  thirty_day_target: {
    metric_label: string;
    target?: number;
    unit?: string;
    confidence: "measured" | "assumption" | "stretch";
    calibration_note: string;
  };
  cmo_commits: string[];
  founder_commits: string[];
  eligible: boolean;
  ineligible_reason?: string;
  /** P17 — growth mechanism driving this option. */
  primary_mechanism_id?: import("./cmoGrowthMechanismKnowledge").GrowthMechanismId;
  mechanism_label?: string;
  mechanism_summary?: string;
  mechanism_rationale?: string[];
  mechanism_anti_pattern?: string;
  /** P18 — evidence-backed quality rationale for this option. */
  quality_evidence?: string[];
  why_not_summary?: string;
}

export interface StrategicDecision {
  options: [StrategicOption, StrategicOption, StrategicOption];
  recommended_id: StrategicOptionId;
  recommendation_rationale: string[];
  decision_question: string;
  selected_id?: StrategicOptionId;
  sealed_at?: string;
  generated_at: string;
}

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
  /** Engaged email list — drives PH / waitlist playbook aggression. */
  email_list_size?: number;
  /** Days until planned public launch (PH, etc.). */
  days_until_launch?: number;
  /** Sales persona: empty pipeline → outbound playbooks. */
  sales_pipeline_empty?: boolean;
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
  /** Faz 5 — user acknowledged manual KPI logging before GA4 is connected. */
  measurement_ack?: { acknowledged_at: string; note?: string };
  connector_snapshots?: { ga4?: Ga4ConnectorSnapshot; meta?: Ga4ConnectorSnapshot };
  ga4_oauth?: { refresh_token: string; property_id?: string; connected_at: string };
  meta_oauth?: { access_token: string; ad_account_id?: string; connected_at: string };
  linkedin_oauth?: { access_token: string; connected_at: string };
  hubspot_oauth?: { access_token: string; refresh_token?: string; connected_at: string };
  outreach_integrations?: OutreachIntegrations;
  /** Active marketing campaign thread (Faz 6). */
  campaign_session?: CampaignSession;
  /** P0 CMO intake — channel thesis (see cmoIntake.ts). */
  channel_thesis?: import("./cmoIntake").ChannelThesis;
  /** P1 CMO operating cadence — daily ops table + user accountability. */
  ops_cadence?: import("./cmoOpsCadence").CmoOpsCadence;
  /** P3 Lane B workspace — posting calendar / outreach / runbook. */
  lane_b_workspace?: import("./cmoLaneB").LaneBWorkspace;
  /** P6 Lane A workspace — IDE ships (repo / browser / drafts). */
  lane_a_workspace?: import("./cmoLaneA").LaneAWorkspace;
  /** P7 Growth control plane — equation, binding, red list, today move. */
  growth_control_plane?: import("./cmoGrowthPlane").GrowthControlPlane;
  /** P8 Distribution operator — hook grid, volume targets, retention proof. */
  distribution_operator?: import("./cmoDistributionOperator").DistributionOperatorWorkspace;
  /** P9 Influencer operator — creator pipeline, pitch DMs, deal/UTM tracking. */
  influencer_operator?: import("./cmoInfluencerOperator").InfluencerOperatorWorkspace;
  /** P4 Continuous CMO — cycle history + measuring → intake delta. */
  cmo_continuous?: import("./cmoContinuous").CmoContinuousState;
  /** P5 Lane C workspace — delegate briefs (SDR / VA / writer). */
  lane_c_workspace?: import("./cmoLaneC").CmoDelegateWorkspace;
  /** P10 — Delegation operator (hire + rubrics + lane sync). */
  delegate_operator?: import("./cmoDelegateOperator").DelegateOperatorWorkspace;
  /** P11 — Experiment ledger, message winners/losers, and pending replan. */
  growth_memory?: import("./cmoGrowthMemory").GrowthMemoryState;
  /** P13 — seven-question founder operating fit. */
  founder_fit?: FounderFitProfile;
  /** P13 — cultural tension and the story inherited by every execution lane. */
  growth_narrative?: GrowthNarrative;
  /** P13 — A/B/C strategic options and the sealed human decision. */
  strategic_decision?: StrategicDecision;
  /** P14 — deterministic monthly allocation, action estimates, and spend closeout. */
  budget_plan?: import("./cmoBudgetPlane").BudgetPlan;
  /** P15 — activation/TTFV evidence used for deterministic product binding. */
  product_activation?: import("./cmoLaneD").ProductActivationProfile;
  /** P15 — Lane D P0 product requests and explicit marketing pause. */
  lane_d_workspace?: import("./cmoLaneD").LaneDWorkspace;
  /** P16 — pricing thesis, payment funnel, and revenue targets. */
  revenue_profile?: import("./cmoRevenuePlane").RevenueProfile;
  /** P16 — monetization P0 tasks when revenue binding is active. */
  monetization_workspace?: import("./cmoRevenuePlane").MonetizationWorkspace;
  /** P17 — growth mechanism assessment and primary mechanism selection. */
  growth_mechanism_profile?: import("./cmoGrowthEngine").GrowthMechanismProfile;
  /** P17 — who may represent the brand publicly. */
  public_presence_policy?: import("./cmoGrowthEngine").PublicPresencePolicy;
  /** P18 — thesis quality engine report (Part 7). */
  thesis_quality_report?: import("./cmoThesisQualityEngine").ThesisQualityReport;
  /** Part 10 — unified execution kernel lifecycle SoT. */
  execution_kernel?: import("./executionKernel").ExecutionKernelState;
  /** Profile v2 — local scan-derived site map (optional). */
  site_structure?: {
    routes: string[];
    framework?: string;
    scanned_files?: number;
    monorepo_root?: string;
    app_packages?: string[];
  };
  /** Profile v2 — tracking detection from scan. */
  tracking_flags?: {
    analytics_detected: boolean;
    ga4?: "detected" | "missing" | "unknown";
  };
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
  recommended_aggression?: "conservative" | "standard" | "aggressive";
  honest_ceiling?: string;
  tactic_stack?: Array<{
    id: string;
    phase?: string;
    action: string;
    metric?: string;
  }>;
  profile_citations?: string[];
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
  tactic_density?: number;
  ethics_compliance?: number;
  aggression_honesty?: number;
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

/** P1 answer path generality gate — max 40 points. */
export interface MarketingAnswerCritique {
  specificity: number;
  actionability: number;
  realism: number;
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
  kind: "continue_plan" | "log_kpi" | "focus_run" | "open_plan" | "generate_plan";
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
  | {
      type: "usage";
      tokens_in: number;
      tokens_out: number;
      cost_cents: number;
    }
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
  | { type: "brain.retrieved"; skills: string[]; playbookId?: string; tacticCount?: number; aggressionLevel?: string }
  | { type: "brain.profile"; gaps: string[] }
  | { type: "brain.critique"; critique: MarketingCritique }
  | { type: "brain.answer_critique"; critique: MarketingAnswerCritique; quality_warn?: boolean }
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
      buttonLabel?: string;
      source: "apply_complete" | "plan_task_done" | "measuring_phase" | "brain";
    }
  | { type: "missing_info"; questions: string[] }
  | { type: "suggested_mode"; mode: ComposerSuggestedMode; reason?: string }
  | {
      type: "executable_action";
      primary?: import("./executableAction").ExecutableAction;
      secondary?: import("./executableAction").ExecutableAction[];
      actions?: import("./executableAction").ExecutableAction[];
    }
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
  | {
      type: "usage";
      tokens_in: number;
      tokens_out: number;
      cost_cents: number;
    }
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
  | "agent.executable_action"
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
  | "verification.completed"
  | "task.dispatched"
  | "task.status_changed"
  | "task.proof_submitted"
  | "task.partial_applied"
  | "task.retry_scheduled"
  | "task.paused"
  | "task.resumed"
  | "task.cancelled";

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
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
}

export interface QuotaInfo {
  plan_limit: number;
  agent_limit: number;
  browser_min_limit: number;
  cost_budget_cents?: number;
}

export interface UsageHistoryItem {
  id: number;
  kind: string | null;
  tokens_in: number;
  tokens_out: number;
  browser_ms: number;
  cost_cents: number;
  created_at: string;
}

export interface MeResponse {
  user: UserInfo;
  features?: string[];
  tierLabel?: string;
  billingConfigured?: boolean;
  billingProvider?: "paddle" | "stripe";
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
    applyHunks: (
      runId: string,
      file: string,
      patch: string,
      hunkIds: string[],
    ) => Promise<{ ok: boolean; reason?: string; applied: string[] }>;
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
  evidence: {
    saveScreenshot: (input: {
      projectId: string;
      runId: string;
      base64: string;
    }) => Promise<{ ok: boolean; path?: string; error?: string }>;
  };
  runs: {
    start: (
      req: import("./orchestration").StartOrchestratedRun,
    ) => Promise<{ runId: string; delegated?: "ask" | "plan" }>;
    interrupt: (runId: string) => Promise<void>;
    browserControl: (input: {
      runId: string;
      action: "pause" | "resume" | "steer" | "approve" | "reject" | "stop";
      text?: string;
      approvalId?: string;
    }) => Promise<{ ok: boolean }>;
  };
  context: {
    search: (input: {
      projectId: string;
      cwd: string;
      query: string;
      limit?: number;
    }) => Promise<
      Array<{ path: string; start: number; end: number; text: string; score: number }>
    >;
    suggest: (input: {
      projectId: string;
      cwd: string;
      prefix: string;
    }) => Promise<Array<{ type: "file"; path: string }>>;
  };
  notifications: {
    list: () => Promise<import("./orchestration").IdeNotification[]>;
    dismiss: (id: string) => Promise<void>;
    onUpdated: (cb: (items: import("./orchestration").IdeNotification[]) => void) => () => void;
  };
  index: {
    enqueue: (job: {
      type: "index.full" | "index.incremental" | "facts.refresh" | "health.probe";
      projectId?: string;
      cwd?: string;
    }) => Promise<void>;
  };
  traces: {
    list: () => Promise<Array<{ runId: string; bytes: number; mtime: number }>>;
    read: (runId: string) => Promise<RunEvent[]>;
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
  /** Quick Start wedge — fail run when agent produces zero patches. */
  guaranteedShip?: boolean;
}

export interface RunRegisteredPayload {
  localRunId: string;
  serverRunId: string;
}
