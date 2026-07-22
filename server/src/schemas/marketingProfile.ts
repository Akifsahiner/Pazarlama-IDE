import { z } from "zod";

/**
 * Marketing Brain's structured project memory. The agent reads this on every
 * turn so it never has to ask the user the same thing twice. Fields are mostly
 * optional so a fresh project can persist a partial profile and grow it over
 * time via `profileBuilder` (auto-inference) + inline questions.
 */

export const experimentRunSchema = z.object({
  id: z.string(),
  date: z.string(),
  hypothesis: z.string(),
  discipline: z.string(),
  outcome: z.enum(["pending", "success", "failure", "inconclusive"]),
  metric: z.object({ name: z.string(), value: z.number() }).optional(),
  learning: z.string().optional(),
  evidence_urls: z.array(z.string()).optional(),
});
export type ExperimentRun = z.infer<typeof experimentRunSchema>;

export const manualKpiSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  target: z.number().optional(),
  unit: z.string().optional(),
  channel: z.string().optional(),
  updated_at: z.string(),
  source: z.literal("manual"),
});
export type ManualKpi = z.infer<typeof manualKpiSchema>;

export const ga4ConnectorSnapshotSchema = z.object({
  fetched_at: z.string(),
  metrics: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      unit: z.string().optional(),
    }),
  ),
});
export type Ga4ConnectorSnapshot = z.infer<typeof ga4ConnectorSnapshotSchema>;

export const outreachIntegrationsSchema = z.object({
  webhook_url: z.string().optional(),
  webhook_provider: z.enum(["lemlist", "instantly", "generic"]).optional(),
});
export type OutreachIntegrations = z.infer<typeof outreachIntegrationsSchema>;

export const campaignMilestoneSchema = z.object({
  label: z.string(),
  at: z.string(),
  kind: z.enum(["phase", "plan", "run", "apply", "asset", "kpi", "complete"]),
});
export type CampaignMilestone = z.infer<typeof campaignMilestoneSchema>;

export const campaignSessionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  goal: z.string(),
  persona: z.enum(["marketing", "sales"]),
  startedAt: z.string(),
  planId: z.string().optional(),
  activeTaskId: z.string().optional(),
  phase: z.enum(["intake", "planning", "executing", "reviewing", "measuring"]),
  milestones: z.array(campaignMilestoneSchema).default([]),
  runIds: z.array(z.string()).default([]),
  assetIds: z.array(z.string()).default([]),
});
export type CampaignSession = z.infer<typeof campaignSessionSchema>;

export const cmoWeek1PrioritySchema = z.object({
  id: z.string().optional(),
  what: z.string(),
  why: z.string(),
  owner: z.enum(["system", "user", "delegate"]),
  done_when: z.string(),
});

export const marketingTaskMetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  target: z.number().optional(),
  unit: z.string().optional(),
  measurable: z.boolean(),
  ga4_metric_name: z.enum(["sessions", "activeUsers", "conversions"]).optional(),
});

export const marketingTaskInputSchema = z.object({
  label: z.string(),
  ref: z.string().optional(),
  value: z.string().optional(),
});

export const humanExecutionAssetSchema = z.object({
  copy_blocks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      text: z.string(),
      variant: z.string().optional(),
    }),
  ),
  brief_md: z.string().optional(),
  target_list: z
    .array(
      z.object({
        name: z.string(),
        handle: z.string().optional(),
        evidence: z.string().optional(),
      }),
    )
    .optional(),
  utm_template: z.string().optional(),
  follow_up: z.string().optional(),
});

export const opsExecutionPlanSchema = z.object({
  mode: z.enum(["repo_edit", "browser_research", "content_draft", "scout_then_edit"]),
  goal: z.string(),
  skills: z.array(z.string()),
  mentions: z.array(z.record(z.string(), z.unknown())).optional(),
  scout_prompt: z.string().optional(),
  start_url: z.string().optional(),
  lane_a_item_id: z.string().optional(),
});

export const humanExecutionRefSchema = z.object({
  source: z.enum(["lane_b", "distribution", "influencer", "delegate"]),
  item_id: z.string(),
  proof_surface: z.enum(["ops_modal", "lane_b_modal", "operator_modal"]),
  export_kind: z.enum(["outreach_csv", "issue", "brief"]).optional(),
  label: z.string().optional(),
});

export const cmoOpsProofSchema = z.object({
  urls: z.array(z.string()).optional(),
  note: z.string().optional(),
  commit_sha: z.string().optional(),
  metric_snapshot: z.string().optional(),
  completed_at: z.string(),
  kpi_id: z.string().optional(),
  kpi_name: z.string().optional(),
  kpi_value: z.number().optional(),
  kpi_target: z.number().optional(),
  kpi_source: z.enum(["manual", "ga4"]).optional(),
  kpi_unit: z.string().optional(),
  browser_evidence: z.record(z.string(), z.unknown()).optional(),
});

export const cmoPivotSuggestionSchema = z.object({
  verdict: z.enum(["flat", "promising", "insufficient_data"]),
  headline: z.string(),
  rationale: z.array(z.string()),
  suggested_thesis_ids: z.array(
    z.enum([
      "viral_short_form",
      "founder_social",
      "product_hunt_launch",
      "landing_conversion",
      "seo_content",
      "outbound_sales",
      "community_launch",
      "influencer_partnerships",
    ]),
  ),
  suggested_actions: z.array(z.string()),
  generated_at: z.string(),
  dismissed_at: z.string().optional(),
});

export const cmoOpsTaskSchema = z.object({
  id: z.string(),
  priority_index: z.number(),
  what: z.string(),
  why: z.string(),
  owner: z.enum(["system", "user", "delegate"]),
  done_when: z.string(),
  status: z.enum(["pending", "in_progress", "done", "skipped"]),
  day_slot: z.enum(["now", "today", "up_next", "later"]),
  proof: cmoOpsProofSchema.optional(),
  linked_run_id: z.string().optional(),
  skip_reason: z.string().optional(),
  unlocked_at: z.string().optional(),
  cost_estimate_usd: z.number().nonnegative().optional(),
  execution_plan: opsExecutionPlanSchema.optional(),
  expected_proof_kind: z.enum(["live_url", "kpi", "note", "browser_evidence"]).optional(),
  human_execution_ref: humanExecutionRefSchema.optional(),
  human_execution_asset: humanExecutionAssetSchema.optional(),
  deliverable: z.string().optional(),
  execution_mode: z
    .enum([
      "repo_edit",
      "browser_research",
      "content_draft",
      "scout_then_edit",
      "human_post",
      "human_outreach",
      "human_launch",
      "human_log",
      "delegate_rubric",
      "delegate_brief",
      "export_csv",
      "measurement_sync",
      "product_request",
      "week_review",
    ])
    .optional(),
  estimated_effort_minutes: z.number().positive().optional(),
  if_failed: z.string().optional(),
  day_offset: z.number().nonnegative().optional(),
  inputs: z.array(marketingTaskInputSchema).optional(),
  required_proof: z.array(z.enum(["live_url", "kpi", "note", "browser_evidence"])).optional(),
  metric: marketingTaskMetricSchema.optional(),
  measure_date: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
  when: z
    .object({
      day_offset: z.number(),
      slot: z.enum(["now", "today", "up_next", "later"]),
      due_at: z.string().optional(),
    })
    .optional(),
});

export const cmoOpsCadenceSchema = z.object({
  id: z.string(),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  campaign_session_id: z.string().optional(),
  prior_ops_cadence_id: z.string().optional(),
  started_at: z.string(),
  week_index: z.number(),
  day_index: z.number(),
  tasks: z.array(cmoOpsTaskSchema),
  week_review: z.object({
    week_index: z.number(),
    due_at: z.string(),
    status: z.enum(["pending", "due", "completed"]),
    summary: z.string().optional(),
    completed_at: z.string().optional(),
  }),
  last_focus_reset_at: z.string(),
  pivot_suggestion: cmoPivotSuggestionSchema.optional(),
});

const executionProvenanceSchema = z.object({
  source: z.enum([
    "command_surface",
    "ops_board",
    "plan_studio",
    "brain_action",
    "auto_chain",
    "replay",
    "week_review",
  ]),
  at: z.string(),
  actor: z.enum(["system", "user"]).optional(),
});

const executionInstanceSchema = z.object({
  id: z.string(),
  scope: z.enum(["ops", "plan", "governance"]),
  execution_mode: z.enum([
    "repo_edit",
    "browser_research",
    "content_draft",
    "scout_then_edit",
    "human_post",
    "human_outreach",
    "human_launch",
    "human_log",
    "delegate_rubric",
    "delegate_brief",
    "export_csv",
    "measurement_sync",
    "product_request",
    "week_review",
  ]),
  status: z.enum([
    "proposed",
    "ready",
    "running",
    "awaiting_approval",
    "applied",
    "verifying",
    "completed",
    "measuring",
    "paused",
    "cancelled",
    "failed",
  ]),
  attempt: z.number().int().positive(),
  idempotency_key: z.string(),
  depends_on: z.array(z.string()).default([]),
  blocked_by: z.array(z.string()).optional(),
  run_id: z.string().optional(),
  linked_entity: humanExecutionRefSchema.optional(),
  proof: cmoOpsProofSchema.optional(),
  partial: z
    .object({
      applied_files: z.array(z.string()).optional(),
      remaining_gate: z.string().optional(),
    })
    .optional(),
  provenance: executionProvenanceSchema,
  ownership: z.object({
    contract: z.literal("ops_cadence"),
    lifecycle: z.literal("execution_kernel"),
    run: z.literal("run_event_bus").optional(),
    asset: z.literal("human_execution_asset").optional(),
  }),
  paused_at: z.string().optional(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  last_error: z.string().optional(),
});

export const executionKernelEventSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  type: z.enum([
    "dispatched",
    "status_changed",
    "proof_submitted",
    "partial_applied",
    "retry_scheduled",
    "paused",
    "resumed",
    "cancelled",
  ]),
  status: executionInstanceSchema.shape.status,
  attempt: z.number().int().positive(),
  provenance: executionProvenanceSchema,
  at: z.string(),
  detail: z.string().optional(),
});

export const executionKernelSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  ops_cadence_id: z.string().optional(),
  instances: z.record(z.string(), executionInstanceSchema),
  events: z.array(executionKernelEventSchema).default([]),
  updated_at: z.string(),
});

export const laneBProofSchema = z.object({
  url: z.string().optional(),
  note: z.string().optional(),
  metric: z.string().optional(),
  spend_usd: z.number().nonnegative().optional(),
  completed_at: z.string(),
});

export const laneBItemSchema = z.object({
  id: z.string(),
  mode: z.enum(["posting_calendar", "outreach_tracker", "launch_runbook", "distribution_log"]),
  title: z.string(),
  detail: z.string().optional(),
  channel: z.string().optional(),
  cost_estimate_usd: z.number().nonnegative().optional(),
  day: z.number().optional(),
  runbook_offset: z.string().optional(),
  status: z.enum(["pending", "scheduled", "done", "skipped"]),
  proof: laneBProofSchema.optional(),
  linked_ops_task_id: z.string().optional(),
  target_name: z.string().optional(),
  target_handle: z.string().optional(),
  sort_order: z.number(),
});

export const laneBWorkspaceSchema = z.object({
  id: z.string(),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  mode: z.enum(["posting_calendar", "outreach_tracker", "launch_runbook", "distribution_log"]),
  started_at: z.string(),
  ops_cadence_id: z.string().optional(),
  items: z.array(laneBItemSchema),
});

export const laneAItemSchema = z.object({
  id: z.string(),
  mode: z.enum(["repo_edit", "browser_research", "content_draft", "scout_then_edit"]),
  title: z.string(),
  detail: z.string().optional(),
  status: z.enum(["pending", "in_progress", "done", "skipped"]),
  linked_ops_task_id: z.string().optional(),
  linked_run_id: z.string().optional(),
  skills: z.array(z.string()),
  proof: z
    .object({
      commit_sha: z.string().optional(),
      files_applied: z.number().optional(),
      run_id: z.string().optional(),
      completed_at: z.string(),
    })
    .optional(),
  sort_order: z.number(),
});

export const laneAWorkspaceSchema = z.object({
  id: z.string(),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  started_at: z.string(),
  ops_cadence_id: z.string().optional(),
  items: z.array(laneAItemSchema),
});

const productMetricConfidenceSchema = z.enum(["measured", "assumption", "missing"]);

export const productActivationSchema = z.object({
  activation_event_label: z.string(),
  signup_count: z.number().nonnegative().optional(),
  activated_count: z.number().nonnegative().optional(),
  activation_rate_pct: z.number().nonnegative().optional(),
  activation_rate_target_pct: z.number().nonnegative().optional(),
  ttfv_hours: z.number().nonnegative().optional(),
  ttfv_target_hours: z.number().nonnegative().optional(),
  onboarding_path_exists: z.boolean().optional(),
  confidence: productMetricConfidenceSchema,
  metric_confidence: z.object({
    signup_count: productMetricConfidenceSchema,
    activated_count: productMetricConfidenceSchema,
    activation_rate_pct: productMetricConfidenceSchema,
    activation_rate_target_pct: productMetricConfidenceSchema,
    ttfv_hours: productMetricConfidenceSchema,
    ttfv_target_hours: productMetricConfidenceSchema,
  }),
  updated_at: z.string(),
});

const productBindingSchema = z.object({
  active: z.boolean(),
  stage_id: z.literal("activation"),
  headline: z.string(),
  rationale: z.array(z.string()),
  evidence: z.array(z.string()),
  confidence: productMetricConfidenceSchema,
  trigger: z
    .enum([
      "scale_not_ready",
      "growth_plane_activation",
      "activation_below_target",
      "activation_below_floor",
      "onboarding_missing",
    ])
    .optional(),
});

const productRequestSchema = z.object({
  id: z.string(),
  priority: z.enum(["P0", "P1"]),
  title: z.string(),
  problem: z.string(),
  acceptance_criteria: z.array(z.string()),
  growth_impact: z.string(),
  marketing_status: z.enum(["paused", "resumed"]),
  fix_scope: z.enum(["site_level", "core_product"]),
  status: z.enum(["pending", "in_progress", "shipped", "skipped"]),
  linked_ops_task_id: z.string().optional(),
  linked_lane_a_item_id: z.string().optional(),
  target_metric: z
    .object({
      name: z.string(),
      value: z.number().nonnegative(),
      unit: z.string(),
      confidence: productMetricConfidenceSchema,
    })
    .optional(),
  proof: z
    .object({
      pr_url: z.string().optional(),
      issue_url: z.string().optional(),
      note: z.string().optional(),
      metric_value: z.number().nonnegative().optional(),
      metric_name: z.string().optional(),
      completed_at: z.string(),
    })
    .optional(),
  skip_reason: z.string().optional(),
  sort_order: z.number(),
});

export const laneDWorkspaceSchema = z.object({
  id: z.string(),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  ops_cadence_id: z.string().optional(),
  started_at: z.string(),
  product_binding: productBindingSchema,
  marketing_paused: z.boolean(),
  paused_reason: z.string(),
  requests: z.array(productRequestSchema),
});

const revenueMetricConfidenceSchema = z.enum(["measured", "assumption", "missing"]);

const pricingThesisSchema = z.object({
  model: z.enum([
    "plg_self_serve",
    "sales_led",
    "hybrid",
    "usage_based",
    "freemium",
    "not_yet",
  ]),
  headline: z.string(),
  rationale: z.array(z.string()),
  evidence: z.array(z.string()),
  confidence: revenueMetricConfidenceSchema,
});

const paymentFunnelStageSchema = z.object({
  id: z.enum(["pricing_view", "checkout_start", "trial_start", "paid", "retained"]),
  label: z.string(),
  event_name: z.string(),
  count: z.number().nonnegative().optional(),
  count_confidence: revenueMetricConfidenceSchema,
  conversion_to_next_pct: z.number().nonnegative().optional(),
  conversion_confidence: z.enum(["measured", "insufficient_data"]),
});

const revenueTargetSchema = z.object({
  metric_id: z.enum(["paid_customers", "mrr_usd", "pipeline_meetings"]),
  label: z.string(),
  baseline: z.number().nonnegative().optional(),
  target: z.number().nonnegative(),
  current: z.number().nonnegative().optional(),
  confidence: z.enum(["measured", "assumption", "stretch"]),
  deadline_days: z.literal(30),
});

const revenueAttributionRowSchema = z.object({
  source_id: z.string(),
  source_label: z.string(),
  channel_kind: z.enum([
    "paid_ads",
    "influencer",
    "distribution",
    "outbound",
    "organic",
    "primary",
  ]),
  spend_usd: z.number().nonnegative().optional(),
  spend_confidence: z.enum(["measured", "missing"]),
  paid_customers: z.number().nonnegative().optional(),
  attribution_confidence: z.enum(["measured", "missing"]),
  cac_usd: z.number().nonnegative().optional(),
  cac_confidence: z.enum(["measured", "insufficient_data"]),
});

export const revenueProfileSchema = z.object({
  id: z.string(),
  pricing_thesis: pricingThesisSchema,
  payment_provider: z.enum([
    "stripe",
    "paddle",
    "lemon_squeezy",
    "manual_invoicing",
    "none_detected",
  ]),
  funnel_stages: z.array(paymentFunnelStageSchema),
  revenue_target: revenueTargetSchema,
  attributions: z.array(revenueAttributionRowSchema).default([]),
  mrr_usd: z.number().nonnegative().optional(),
  arpu_usd: z.number().nonnegative().optional(),
  ltv_usd: z.number().nonnegative().optional(),
  metric_confidence: z.record(z.string(), revenueMetricConfidenceSchema),
  configured_at: z.string(),
  updated_at: z.string(),
});

const revenueBindingSchema = z.object({
  active: z.boolean(),
  stage_id: z.literal("revenue"),
  headline: z.string(),
  rationale: z.array(z.string()),
  evidence: z.array(z.string()),
  confidence: revenueMetricConfidenceSchema,
  trigger: z
    .enum([
      "paying_customers_goal_no_infra",
      "growth_plane_revenue",
      "trial_to_paid_below_floor",
      "funnel_events_missing",
    ])
    .optional(),
});

const monetizationTaskSchema = z.object({
  id: z.string(),
  priority: z.enum(["P0", "P1"]),
  title: z.string(),
  problem: z.string(),
  acceptance_criteria: z.array(z.string()),
  growth_impact: z.string(),
  fix_scope: z.enum(["site_level", "core_billing"]),
  status: z.enum(["pending", "in_progress", "shipped", "skipped"]),
  linked_lane_a_item_id: z.string().optional(),
  proof: z
    .object({
      pr_url: z.string().optional(),
      issue_url: z.string().optional(),
      note: z.string().optional(),
      metric_value: z.number().nonnegative().optional(),
      metric_name: z.string().optional(),
      completed_at: z.string(),
    })
    .optional(),
  skip_reason: z.string().optional(),
  sort_order: z.number(),
});

export const monetizationWorkspaceSchema = z.object({
  id: z.string(),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  started_at: z.string(),
  revenue_binding: revenueBindingSchema,
  tasks: z.array(monetizationTaskSchema),
});

const revenueCloseoutSchema = z.object({
  funnel: z.object({
    stages: z.array(paymentFunnelStageSchema),
    leak_stage_id: z
      .enum(["pricing_view", "checkout_start", "trial_start", "paid", "retained"])
      .optional(),
    leak_label: z.string().optional(),
  }),
  target: revenueTargetSchema,
  attributions: z.array(revenueAttributionRowSchema),
  ltv_cac_ratio: z.number().nonnegative().optional(),
  ltv_cac_confidence: z.enum(["measured", "insufficient_data"]),
  headline: z.string(),
});

const revenueSnapshotSchema = z.object({
  profile: revenueProfileSchema,
  closeout: revenueCloseoutSchema,
  recorded_at: z.string(),
});

export const delegateProofSchema = z.object({
  url: z.string().optional(),
  note: z.string().optional(),
  actual_spend_usd: z.number().nonnegative().optional(),
  completed_at: z.string(),
});

export const delegateBriefSchema = z.object({
  id: z.string(),
  role: z.enum(["sdr", "va", "writer", "creator", "agency"]),
  title: z.string(),
  what: z.string(),
  why: z.string(),
  deliverables: z.array(z.string()),
  acceptance_criteria: z.array(z.string()),
  due_day: z.number(),
  status: z.enum(["draft", "handed_off", "in_progress", "done", "skipped"]),
  assignee_name: z.string().optional(),
  assignee_contact: z.string().optional(),
  handoff_note: z.string().optional(),
  handed_off_at: z.string().optional(),
  proof: delegateProofSchema.optional(),
  cost_estimate_usd: z.number().nonnegative().optional(),
  linked_lane_b_mode: z.enum(["outreach_tracker"]).optional(),
  hire_kind: z
    .enum([
      "va_research",
      "va_scheduler",
      "sdr_outbound",
      "creator_filmer",
      "writer_publish",
      "agency_wave",
    ])
    .optional(),
  lane_link_target: z
    .enum([
      "lane_b_outreach",
      "lane_b_calendar",
      "lane_b_runbook",
      "influencer_operator",
      "distribution_operator",
    ])
    .optional(),
  linked_lane_b_ids: z.array(z.string()).optional(),
  linked_operator_touch_ids: z.array(z.string()).optional(),
  rubric_days: z.number().optional(),
  sort_order: z.number(),
});

const delegateTrialKpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  target: z.number(),
  unit: z.string(),
});

const delegateHireBlockSchema = z.object({
  brief_id: z.string(),
  kind: z.enum([
    "va_research",
    "va_scheduler",
    "sdr_outbound",
    "creator_filmer",
    "writer_publish",
    "agency_wave",
  ]),
  job_title: z.string(),
  job_post_scaffold: z.string(),
  trial_kpis: z.array(delegateTrialKpiSchema),
  compensation_frame: z.string(),
  cost_estimate_usd: z.number().nonnegative().optional(),
  hours_per_week: z.number().optional(),
});

const rubricCheckItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  required: z.boolean(),
  checked: z.boolean().optional(),
});

const delegateDailyRubricSchema = z.object({
  id: z.string(),
  brief_id: z.string(),
  day_index: z.number(),
  title: z.string(),
  checklist: z.array(rubricCheckItemSchema),
  status: z.enum(["pending", "partial", "done", "skipped"]),
  proof_note: z.string().optional(),
  proof_url: z.string().optional(),
  actual_spend_usd: z.number().nonnegative().optional(),
  completed_at: z.string().optional(),
});

const delegateLaneLinkSchema = z.object({
  brief_id: z.string(),
  target: z.enum([
    "lane_b_outreach",
    "lane_b_calendar",
    "lane_b_runbook",
    "influencer_operator",
    "distribution_operator",
  ]),
  linked_ids: z.array(z.string()),
  export_on_handoff: z.boolean(),
  import_on_delivery: z.boolean(),
});

const delegateVerdictSchema = z.object({
  kind: z.enum(["on_track", "extend", "release", "promote"]),
  brief_id: z.string().optional(),
  headline: z.string(),
  rationale: z.array(z.string()),
  evidence: z.array(z.string()),
  computed_at: z.string(),
});

export const delegateOperatorSchema = z.object({
  id: z.string(),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  week_index: z.number(),
  started_at: z.string(),
  ops_cadence_id: z.string().optional(),
  briefs: z.array(delegateBriefSchema),
  hire_blocks: z.array(delegateHireBlockSchema).default([]),
  daily_rubrics: z.array(delegateDailyRubricSchema).default([]),
  lane_links: z.array(delegateLaneLinkSchema).default([]),
  verdict: delegateVerdictSchema.optional(),
});

const growthMessageSchema = z.object({
  id: z.string(),
  cycle_index: z.number(),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  kind: z.enum(["hook", "pitch", "outbound_opener", "post_copy", "ops_proof_note"]),
  label: z.string(),
  body: z.string(),
  source_ref: z.string(),
  metric_name: z.string().optional(),
  metric_value: z.number().optional(),
  metric_target: z.number().optional(),
  verdict: z.enum(["winner", "loser", "neutral", "unscored"]),
  evidence: z.array(z.string()),
  recorded_at: z.string(),
});

const growthExperimentSchema = z.object({
  id: z.string(),
  cycle_index: z.number(),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  source: z.enum([
    "ops_task",
    "lane_b",
    "distribution_slot",
    "influencer_touch",
    "delegate_rubric",
    "lane_a_run",
    "budget_bucket",
    "product_fix",
    "revenue_signal",
    "engine_signal",
  ]),
  source_id: z.string(),
  hypothesis: z.string(),
  primary_metric: z
    .object({ id: z.string(), value: z.number(), target: z.number().optional() })
    .optional(),
  outcome: z.enum(["won", "lost", "inconclusive", "running"]),
  learning: z.string(),
  message_ids: z.array(z.string()),
  evidence_urls: z.array(z.string()).optional(),
  spend_usd: z.number().nonnegative().optional(),
  outcomes: z.number().nonnegative().optional(),
  cpa_usd: z.number().nonnegative().optional(),
  cpa_confidence: z.enum(["measured", "insufficient_data"]).optional(),
  bucket_id: z
    .enum(["primary_channel", "paid_ads", "influencer", "delegate_labor", "tools", "reserve"])
    .optional(),
  recorded_at: z.string(),
});

const growthReplanSchema = z.object({
  mode: z.enum(["double_down", "pivot"]),
  target_thesis_id: z.string().optional(),
  rationale: z.array(z.string()),
  winning_message_ids: z.array(z.string()),
  losing_message_ids: z.array(z.string()),
  ops_mutations: z.array(
    z.object({
      priority_index: z.number(),
      what: z.string(),
      why: z.string(),
      done_when: z.string(),
    }),
  ),
  operator_hints: z.object({
    winning_hook_id: z.string().optional(),
    winning_pitch_id: z.string().optional(),
    kill_hook_ids: z.array(z.string()).optional(),
    kill_pitch_ids: z.array(z.string()).optional(),
  }),
  budget_mutations: z
    .array(
      z.object({
        bucket_id: z.enum([
          "primary_channel",
          "paid_ads",
          "influencer",
          "delegate_labor",
          "tools",
          "reserve",
        ]),
        from_pct: z.number(),
        to_pct: z.number(),
        reason: z.string(),
      }),
    )
    .optional(),
  budget_hints: z
    .object({
      scale_bucket_id: z
        .enum(["primary_channel", "paid_ads", "influencer", "delegate_labor", "tools", "reserve"])
        .optional(),
      cut_bucket_ids: z
        .array(
          z.enum([
            "primary_channel",
            "paid_ads",
            "influencer",
            "delegate_labor",
            "tools",
            "reserve",
          ]),
        )
        .optional(),
      weekly_cap_overrides: z.record(z.string(), z.number()).optional(),
      confidence: z.enum(["measured", "assumption", "stretch"]).optional(),
    })
    .optional(),
  product_hints: z
    .object({
      marketing_status: z.enum(["paused", "resume_ready"]),
      open_request_count: z.number().nonnegative(),
      confidence: z.enum(["measured", "assumption", "missing"]),
      reason: z.string(),
    })
    .optional(),
  engine_hints: z
    .array(
      z.object({
        headline: z.string(),
        rationale: z.string(),
      }),
    )
    .optional(),
  headline: z.string(),
  computed_at: z.string(),
});

export const growthMemorySchema = z.object({
  id: z.string(),
  project_id: z.string().optional(),
  messages: z.array(growthMessageSchema).default([]),
  experiments: z.array(growthExperimentSchema).default([]),
  pending_replan: growthReplanSchema.optional(),
  last_harvest_cycle_index: z.number().optional(),
  updated_at: z.string(),
});

export const laneCWorkspaceSchema = z.object({
  id: z.string(),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  week_index: z.number(),
  started_at: z.string(),
  ops_cadence_id: z.string().optional(),
  briefs: z.array(delegateBriefSchema),
  hire_blocks: z.array(delegateHireBlockSchema).optional(),
  daily_rubrics: z.array(delegateDailyRubricSchema).optional(),
  lane_links: z.array(delegateLaneLinkSchema).optional(),
  verdict: delegateVerdictSchema.optional(),
});

export const channelThesisSchema = z.object({
  id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  title: z.string(),
  headline: z.string(),
  verdict: z.enum(["marketable", "needs_work", "not_ready"]),
  verdict_reason: z.string(),
  primary_bottleneck: z.enum([
    "awareness",
    "conversion",
    "distribution",
    "revenue",
    "measurement",
  ]),
  rationale: z.array(z.string()),
  week1_priorities: z.array(cmoWeek1PrioritySchema),
  primary_playbook_ids: z.array(z.string()),
  lane_a: z.array(z.string()),
  lane_b: z.array(z.string()),
  deprioritize: z.array(z.string()),
  signals: z.record(z.string(), z.string()),
  generated_at: z.string(),
  draft: z.boolean().optional(),
  strategic_option_id: z.enum(["A", "B", "C"]).optional(),
  narrative_one_liner: z.string().optional(),
});
export type ChannelThesis = z.infer<typeof channelThesisSchema>;

const founderFitSchema = z.object({
  brand_face_readiness: z.enum(["never", "sometimes", "primary_channel"]),
  controversy_tolerance: z.enum(["avoid", "selective", "lean_in"]),
  monthly_budget_band: z.enum(["0", "under_500", "500_2000", "over_2000"]),
  scale_readiness: z.enum(["not_yet", "probably", "yes"]),
  magic_moment: z.string().min(12),
  weekly_marketing_hours: z.enum(["under_3", "3_7", "7_15", "15_plus"]),
  thirty_day_win: z.enum([
    "qualified_signups",
    "paying_customers",
    "waitlist",
    "pipeline_meetings",
    "brand_awareness",
  ]),
  completed_at: z.string(),
});

const growthNarrativeSchema = z.object({
  cultural_tension: z.string(),
  one_liner: z.string(),
  enemy_frame: z.string().optional(),
  proof_angle: z.string(),
  signals: z.record(z.string(), z.string()),
});

const strategicOptionSchema = z.object({
  id: z.enum(["A", "B", "C"]),
  posture: z.enum(["safe", "balanced", "category_attack"]),
  title: z.string(),
  summary: z.string(),
  thesis_id: channelThesisSchema.shape.id,
  tradeoffs: z.array(z.object({ pro: z.string(), con: z.string() })),
  thirty_day_target: z.object({
    metric_label: z.string(),
    target: z.number().optional(),
    unit: z.string().optional(),
    confidence: z.enum(["measured", "assumption", "stretch"]),
    calibration_note: z.string(),
  }),
  cmo_commits: z.array(z.string()),
  founder_commits: z.array(z.string()),
  eligible: z.boolean(),
  ineligible_reason: z.string().optional(),
  primary_mechanism_id: z.string().optional(),
  mechanism_label: z.string().optional(),
  mechanism_summary: z.string().optional(),
  mechanism_rationale: z.array(z.string()).optional(),
  mechanism_anti_pattern: z.string().optional(),
  quality_evidence: z.array(z.string()).optional(),
  why_not_summary: z.string().optional(),
});

const budgetBucketIdSchema = z.enum([
  "primary_channel",
  "paid_ads",
  "influencer",
  "delegate_labor",
  "tools",
  "reserve",
]);

const budgetPlanSchema = z.object({
  id: z.string(),
  monthly_amount_usd: z.number().nonnegative(),
  amount_confidence: z.enum(["measured", "assumption"]),
  amount_source: z.enum(["user_entry", "band_midpoint"]),
  currency: z.literal("USD"),
  thesis_id: channelThesisSchema.shape.id,
  allocations: z.array(
    z.object({
      bucket_id: budgetBucketIdSchema,
      pct: z.number().min(0).max(100),
      amount_usd: z.number().nonnegative(),
      weekly_cap_usd: z.number().nonnegative(),
    }),
  ),
  action_costs: z
    .array(
      z.object({
        action_id: z.string(),
        source: z.enum(["lane_b", "lane_c", "distribution", "influencer", "delegate", "ops"]),
        bucket_id: budgetBucketIdSchema,
        cost_estimate_usd: z.number().nonnegative().optional(),
        actual_spend_usd: z.number().nonnegative().optional(),
      }),
    )
    .default([]),
  cpa_ceiling_usd: z.number().positive().optional(),
  cpa_ceiling_confidence: z.enum(["measured", "assumption"]),
  configured_at: z.string(),
  updated_at: z.string(),
});

const budgetCloseoutSchema = z.object({
  bucket_id: budgetBucketIdSchema,
  allocated_usd: z.number().nonnegative(),
  actual_spend_usd: z.number().nonnegative(),
  outcomes: z.number().nonnegative().optional(),
  outcome_metric_id: z.string().optional(),
  cpa_usd: z.number().nonnegative().optional(),
  cpa_confidence: z.enum(["measured", "insufficient_data"]),
  burn_pct: z.number().nonnegative(),
});

const budgetSnapshotSchema = z.object({
  plan: budgetPlanSchema,
  closeout: z.array(budgetCloseoutSchema),
  total_spend_usd: z.number().nonnegative(),
  headline: z.string(),
});

const strategicDecisionSchema = z.object({
  options: z.tuple([strategicOptionSchema, strategicOptionSchema, strategicOptionSchema]),
  recommended_id: z.enum(["A", "B", "C"]),
  recommendation_rationale: z.array(z.string()),
  decision_question: z.string(),
  selected_id: z.enum(["A", "B", "C"]).optional(),
  sealed_at: z.string().optional(),
  generated_at: z.string(),
});

const growthStageMetricSchema = z.object({
  id: z.enum([
    "attention",
    "traffic",
    "signup",
    "activation",
    "conversion",
    "retention",
    "revenue",
  ]),
  label: z.string(),
  value: z.number().optional(),
  unit: z.string().optional(),
  benchmark: z.number().optional(),
  source: z.enum(["ga4", "manual_kpi", "profile", "inferred", "unknown"]),
  confidence: z.enum(["high", "low", "missing"]),
});

export const growthControlPlaneSchema = z.object({
  id: z.string(),
  computed_at: z.string(),
  equation: z.object({
    product_class: z.enum(["b2b_saas", "devtools", "consumer", "general"]),
    formula: z.string(),
    stages: z.array(growthStageMetricSchema),
  }),
  binding: z.object({
    stage_id: z.enum([
      "attention",
      "traffic",
      "signup",
      "activation",
      "conversion",
      "retention",
      "revenue",
    ]),
    gtm: z.enum(["awareness", "conversion", "distribution", "revenue", "measurement"]),
    headline: z.string(),
    rationale: z.array(z.string()),
    evidence: z.array(z.string()),
  }),
  red_list: z.array(
    z.object({
      id: z.string(),
      tactic: z.string(),
      reason: z.string(),
      evidence: z.array(z.string()),
    }),
  ),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  thesis_aligned: z.boolean(),
  alignment_note: z.string().optional(),
  memory_note: z.string().optional(),
  budget_note: z.string().optional(),
  mechanism_label: z.string().optional(),
  mechanism_rationale: z.string().optional(),
  mechanism_anti_pattern: z.string().optional(),
  primary_lever: z.string(),
  today: z
    .object({
      what: z.string(),
      // P12: optional on read for legacy profiles; desktop recomputes it immediately.
      why: z.string().optional(),
      done_when: z.string(),
      owner: z.enum(["system", "user", "delegate"]),
      ops_task_id: z.string().optional(),
    })
    .optional(),
});
export type GrowthControlPlane = z.infer<typeof growthControlPlaneSchema>;

const distributionHookSchema = z.object({
  id: z.string(),
  label: z.string(),
  formula: z.enum([
    "negative_outcome",
    "before_after",
    "contrarian",
    "pov_identity",
    "demo_first",
    "founder_story",
    "contrarian_take",
    "build_log",
  ]),
  script_hint: z.string(),
  retention_target_3s: z.number().optional(),
  completion_target: z.number().optional(),
});

export const distributionOperatorSchema = z.object({
  id: z.string(),
  mode: z.enum(["short_form_volume", "founder_grid", "character_volume"]),
  thesis_id: z.enum([
    "viral_short_form",
    "founder_social",
    "product_hunt_launch",
    "landing_conversion",
    "seo_content",
    "outbound_sales",
    "community_launch",
    "influencer_partnerships",
  ]),
  week_index: z.number(),
  ops_cadence_id: z.string().optional(),
  started_at: z.string(),
  hooks: z.array(distributionHookSchema),
  slots: z.array(
    z.object({
      id: z.string(),
      day_index: z.number(),
      hook_id: z.string(),
      slot_kind: z.enum(["post", "engage", "measure"]),
      platform: z.enum(["tiktok", "reels", "youtube_shorts", "linkedin", "x", "engage"]),
      status: z.enum(["pending", "posted", "measured", "skipped"]),
      linked_lane_b_id: z.string().optional(),
      linked_ops_task_id: z.string().optional(),
      cost_estimate_usd: z.number().nonnegative().optional(),
      proof: z
        .object({
          post_url: z.string().optional(),
          views_24h: z.number().optional(),
          retention_3s_pct: z.number().optional(),
          completion_pct: z.number().optional(),
          impressions: z.number().optional(),
          replies: z.number().optional(),
          note: z.string().optional(),
          completed_at: z.string(),
        })
        .optional(),
    }),
  ),
  daily_targets: z.array(
    z.object({
      day_index: z.number(),
      min_posts: z.number(),
      max_posts: z.number(),
      done_posts: z.number(),
    }),
  ),
  primary_kpi_id: z.enum(["short_form_views", "linkedin_impressions", "social_posts"]),
  verdict: z
    .object({
      kind: z.enum(["test_more", "scale", "kill", "double_down"]),
      hook_id: z.string().optional(),
      headline: z.string(),
      rationale: z.array(z.string()),
      evidence: z.array(z.string()),
      computed_at: z.string(),
    })
    .optional(),
});
export type DistributionOperatorWorkspace = z.infer<typeof distributionOperatorSchema>;

const influencerPitchSchema = z.object({
  id: z.string(),
  label: z.string(),
  template_id: z.enum(["micro_cold", "warm_intro", "podcast_newsletter"]),
  script_scaffold: z.string(),
  reply_target: z.number(),
});

export const influencerOperatorSchema = z.object({
  id: z.string(),
  mode: z.enum(["micro_influencer_dm"]),
  thesis_id: z.literal("influencer_partnerships"),
  week_index: z.number(),
  ops_cadence_id: z.string().optional(),
  started_at: z.string(),
  pitches: z.array(influencerPitchSchema),
  touches: z.array(
    z.object({
      id: z.string(),
      day_index: z.number(),
      pitch_id: z.string(),
      pipeline_stage: z.enum([
        "research",
        "pitched",
        "replied",
        "negotiating",
        "brief_sent",
        "live",
        "reporting",
        "skipped",
      ]),
      platform: z.enum([
        "instagram",
        "tiktok",
        "youtube",
        "linkedin",
        "x",
        "newsletter",
        "podcast",
      ]),
      target_name: z.string(),
      target_handle: z.string(),
      followers: z.number().optional(),
      engagement_rate_pct: z.number().optional(),
      icp_fit: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
      deal: z
        .object({
          structure: z
            .enum(["affiliate_only", "product_for_post", "base_plus_cpa", "flat_fee"])
            .optional(),
          base_comp_usd: z.number().optional(),
          affiliate_pct: z.number().optional(),
          promo_code: z.string().optional(),
          utm_campaign: z.string().optional(),
          utm_link: z.string().optional(),
          disclosure_ack: z.boolean().optional(),
          exclusivity_days: z.number().optional(),
          agreed_at: z.string().optional(),
        })
        .optional(),
      cost_estimate_usd: z.number().nonnegative().optional(),
      proof: z
        .object({
          dm_sent_at: z.string().optional(),
          thread_url: z.string().optional(),
          reply_received: z.boolean().optional(),
          reply_interest: z.enum(["cold", "warm", "hot"]).optional(),
          reply_note: z.string().optional(),
          live_post_url: z.string().optional(),
          clicks: z.number().optional(),
          signups: z.number().optional(),
          spend_usd: z.number().optional(),
          note: z.string().optional(),
          completed_at: z.string(),
        })
        .optional(),
      linked_lane_b_id: z.string().optional(),
      linked_ops_task_id: z.string().optional(),
      linked_delegate_brief_id: z.string().optional(),
      sort_order: z.number(),
    }),
  ),
  weekly_targets: z.array(
    z.object({
      day_index: z.number(),
      min_dms: z.number(),
      max_dms: z.number(),
      done_dms: z.number(),
    }),
  ),
  primary_kpi_id: z.enum(["influencer_replies", "influencer_cpa_qualified_signup"]),
  verdict: z
    .object({
      kind: z.enum(["test_more", "scale", "kill", "double_down"]),
      pitch_id: z.string().optional(),
      headline: z.string(),
      rationale: z.array(z.string()),
      evidence: z.array(z.string()),
      computed_at: z.string(),
    })
    .optional(),
});
export type InfluencerOperatorWorkspace = z.infer<typeof influencerOperatorSchema>;

export const marketingProfileSchema = z.object({
  // Identity
  product_name: z.string().default(""),
  product_description: z.string().default(""),
  category: z.string().default(""),
  business_model: z
    .enum(["saas", "freemium", "marketplace", "agency", "tool", "consumer", ""])
    .default(""),
  price_range: z
    .object({ low: z.number(), high: z.number(), currency: z.string() })
    .optional(),

  // Audience
  target_audience: z
    .array(
      z.object({
        persona: z.string(),
        pains: z.array(z.string()).default([]),
        jobs: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  primary_problem: z.string().default(""),
  main_value_proposition: z.string().default(""),
  differentiators: z.array(z.string()).default([]),

  // Market
  competitors: z
    .array(z.object({ name: z.string(), url: z.string().optional(), note: z.string().optional() }))
    .default([]),
  company_stage: z
    .enum(["idea", "prelaunch", "launched", "growing", "scaling", ""])
    .default(""),
  current_users: z.number().optional(),
  /** Engaged email list size — drives PH aggression playbook selection. */
  email_list_size: z.number().optional(),
  /** Days until a planned public launch (PH, etc.). */
  days_until_launch: z.number().optional(),
  /** Sales persona: no qualified pipeline yet. */
  sales_pipeline_empty: z.boolean().optional(),
  main_markets: z.array(z.string()).default([]),

  // GTM
  available_channels: z.array(z.string()).default([]),
  marketing_goals: z.array(z.string()).default([]),
  brand_voice: z.string().default(""),
  existing_proof: z.array(z.string()).default([]),
  available_assets: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),

  // Memory
  previous_experiments: z.array(experimentRunSchema).default([]),
  successful_experiments: z.array(z.string()).default([]),
  failed_experiments: z.array(z.string()).default([]),
  manual_kpis: z.array(manualKpiSchema).default([]),
  connector_snapshots: z
    .object({
      ga4: ga4ConnectorSnapshotSchema.optional(),
      meta: ga4ConnectorSnapshotSchema.optional(),
    })
    .default({}),
  ga4_oauth: z
    .object({
      refresh_token: z.string(),
      property_id: z.string().optional(),
      connected_at: z.string(),
    })
    .optional(),
  meta_oauth: z
    .object({
      access_token: z.string(),
      ad_account_id: z.string().optional(),
      connected_at: z.string(),
      expires_at: z.string().optional(),
    })
    .optional(),
  linkedin_oauth: z
    .object({
      access_token: z.string(),
      connected_at: z.string(),
    })
    .optional(),
  hubspot_oauth: z
    .object({
      access_token: z.string(),
      refresh_token: z.string().optional(),
      connected_at: z.string(),
    })
    .optional(),
  outreach_integrations: outreachIntegrationsSchema.default({}),

  /** Active marketing campaign thread — plan, runs, assets in one loop (Faz 6). */
  campaign_session: campaignSessionSchema.optional(),

  /** P0 CMO intake — channel thesis (desktop/src/shared/cmoIntake.ts). */
  channel_thesis: channelThesisSchema.optional(),
  /** P13 — founder-fit answers, narrative, and sealed A/B/C decision. */
  founder_fit: founderFitSchema.optional(),
  growth_narrative: growthNarrativeSchema.optional(),
  strategic_decision: strategicDecisionSchema.optional(),
  /** P17 — public presence policy + growth mechanism assessment. */
  public_presence_policy: z.record(z.string(), z.unknown()).optional(),
  growth_mechanism_profile: z.record(z.string(), z.unknown()).optional(),
  /** P18 — thesis quality engine report (Part 7). */
  thesis_quality_report: z.record(z.string(), z.unknown()).optional(),
  /** P14 — deterministic budget allocation and action-cost ledger. */
  budget_plan: budgetPlanSchema.optional(),
  /** P15 — measured activation/TTFV intake and Lane D product loop. */
  product_activation: productActivationSchema.optional(),
  lane_d_workspace: laneDWorkspaceSchema.optional(),
  /** P16 — pricing thesis, funnel, and revenue targets. */
  revenue_profile: revenueProfileSchema.optional(),
  monetization_workspace: monetizationWorkspaceSchema.optional(),

  /** P1 CMO operating cadence — daily ops + accountability (desktop/src/shared/cmoOpsCadence.ts). */
  ops_cadence: cmoOpsCadenceSchema.optional(),

  /** Part 10 — unified execution kernel (desktop/src/shared/executionKernel.ts). */
  execution_kernel: executionKernelSchema.optional(),

  /** P3 Lane B workspace — posting calendar / outreach / runbook (desktop/src/shared/cmoLaneB.ts). */
  lane_b_workspace: laneBWorkspaceSchema.optional(),

  /** P6 Lane A workspace — IDE ships (desktop/src/shared/cmoLaneA.ts). */
  lane_a_workspace: laneAWorkspaceSchema.optional(),

  /** P7 Growth control plane — binding + red list (desktop/src/shared/cmoGrowthPlane.ts). */
  growth_control_plane: growthControlPlaneSchema.optional(),

  /** P8 Distribution operator — hook grid + volume (desktop/src/shared/cmoDistributionOperator.ts). */
  distribution_operator: distributionOperatorSchema.optional(),

  /** P9 Influencer operator — creator pipeline + DM/deal tracking. */
  influencer_operator: influencerOperatorSchema.optional(),

  /** P4 Continuous CMO — cycle archive + measuring replan (desktop/src/shared/cmoContinuous.ts). */
  cmo_continuous: z
    .object({
      current_cycle_index: z.number(),
      phase: z.enum(["executing", "measuring", "pivot_ready"]),
      cycles: z.array(
        z.object({
          cycle_index: z.number(),
          thesis_id: z.string(),
          thesis_title: z.string(),
          started_at: z.string(),
          completed_at: z.string().optional(),
          week_review_summary: z.string().optional(),
          pivot_verdict: z.enum(["flat", "promising", "insufficient_data"]).optional(),
          primary_kpi: z
            .object({
              kpi_id: z.string().optional(),
              kpi_name: z.string().optional(),
              value: z.number().optional(),
              target: z.number().optional(),
              verdict: z.enum(["flat", "promising", "insufficient_data"]).optional(),
            })
            .optional(),
          ops_cadence_id: z.string(),
          lane_b_workspace_id: z.string().optional(),
          hook_summary: z.string().optional(),
          delegate_summary: z.string().optional(),
          memory_summary: z.string().optional(),
          experiment_count: z.number().optional(),
          winning_message_labels: z.array(z.string()).optional(),
          budget_snapshot: budgetSnapshotSchema.optional(),
          revenue_snapshot: revenueSnapshotSchema.optional(),
        }),
      ),
      pending_delta: z
        .object({
          from_cycle_index: z.number(),
          to_cycle_index: z.number(),
          previous_thesis_id: z.string(),
          new_thesis_id: z.string(),
          thesis_changed: z.boolean(),
          pivot_verdict: z.enum(["flat", "promising", "insufficient_data"]).optional(),
          signal_changes: z.array(
            z.object({
              key: z.string(),
              before: z.string(),
              after: z.string(),
            }),
          ),
          headline: z.string(),
          rationale: z.array(z.string()),
          memory_rationale: z.array(z.string()).optional(),
          computed_at: z.string(),
          kpi_movement: z
            .object({
              kpi_id: z.string(),
              before: z.number().optional(),
              after: z.number().optional(),
              pct_of_target: z.number().optional(),
            })
            .optional(),
        })
        .optional(),
      accepted_pivot_thesis_id: z.string().optional(),
      campaign_session_id: z.string().optional(),
      marketing_paused: z.boolean().optional(),
      marketing_paused_reason: z.string().optional(),
      product_loop_started_at: z.string().optional(),
      marketing_resumed_at: z.string().optional(),
      updated_at: z.string(),
    })
    .optional(),

  /** P5 Lane C — delegate briefs (desktop/src/shared/cmoLaneC.ts). */
  lane_c_workspace: laneCWorkspaceSchema.optional(),

  /** P10 Delegation Operator — hire rubrics + lane links (desktop/src/shared/cmoDelegateOperator.ts). */
  delegate_operator: delegateOperatorSchema.optional(),

  /** P11 Growth Memory — experiment and message ledger + Week N+1 replan. */
  growth_memory: growthMemorySchema.optional(),

  /** Scan-derived site map (synced from desktop ContextGraph). */
  site_structure: z
    .object({
      routes: z.array(z.string()).default([]),
      framework: z.string().optional(),
      scanned_files: z.number().optional(),
      monorepo_root: z.string().optional(),
      app_packages: z.array(z.string()).optional(),
    })
    .optional(),
  tracking_flags: z
    .object({
      analytics_detected: z.boolean(),
      ga4: z.enum(["detected", "missing", "unknown"]).optional(),
    })
    .optional(),

  // Meta
  last_updated: z.string().default(() => new Date().toISOString()),
  confidence_score: z.number().min(0).max(1).default(0),
  gaps: z.array(z.string()).default([]),
});

export type MarketingProfile = z.infer<typeof marketingProfileSchema>;

/** Critical fields the Brain checks before answering a strategic question. */
export const STRATEGIC_FIELDS: Array<keyof MarketingProfile> = [
  "product_name",
  "main_value_proposition",
  "target_audience",
  "company_stage",
  "differentiators",
];

/** Recompute which strategic fields are still empty. */
export function computeGaps(profile: MarketingProfile): string[] {
  const out: string[] = [];
  for (const key of STRATEGIC_FIELDS) {
    const v = profile[key] as unknown;
    if (typeof v === "string" && v.trim().length === 0) out.push(String(key));
    else if (Array.isArray(v) && v.length === 0) out.push(String(key));
  }
  return out;
}

/** Coarse score: fraction of strategic fields filled. */
export function confidenceFromProfile(profile: MarketingProfile): number {
  const total = STRATEGIC_FIELDS.length;
  const filled = total - computeGaps(profile).length;
  return Math.round((filled / total) * 100) / 100;
}
