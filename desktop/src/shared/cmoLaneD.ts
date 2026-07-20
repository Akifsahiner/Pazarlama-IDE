/**
 * P15 — Product Loop (Lane D): activation evidence, product binding, and P0 requests.
 * All diagnosis and metric math in this module is deterministic.
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import type { LaneAItem, LaneAWorkspace } from "./cmoLaneA";
import type { CmoOpsCadence, CmoOpsTask } from "./cmoOpsCadence";
import type { BindingBottleneck } from "./cmoGrowthPlane";
import type { FounderFitProfile, ManualKpi, ProjectProfile } from "./types";
import type { ProductUnderstandingGraph } from "./productUnderstandingInput";
import { bindingEvidenceRefs } from "./productUnderstandingEvidenceBridge";

export type ProductMetricConfidence = "measured" | "assumption" | "missing";
export type ProductFixScope = "site_level" | "core_product";
export type ProductRequestPriority = "P0" | "P1";
export type ProductRequestStatus = "pending" | "in_progress" | "shipped" | "skipped";
export type ProductMarketingStatus = "paused" | "resumed";

export interface ProductActivationProfile {
  activation_event_label: string;
  signup_count?: number;
  activated_count?: number;
  activation_rate_pct?: number;
  activation_rate_target_pct?: number;
  ttfv_hours?: number;
  ttfv_target_hours?: number;
  onboarding_path_exists?: boolean;
  confidence: ProductMetricConfidence;
  metric_confidence: {
    signup_count: ProductMetricConfidence;
    activated_count: ProductMetricConfidence;
    activation_rate_pct: ProductMetricConfidence;
    activation_rate_target_pct: ProductMetricConfidence;
    ttfv_hours: ProductMetricConfidence;
    ttfv_target_hours: ProductMetricConfidence;
  };
  updated_at: string;
}

export interface ProductBinding {
  active: boolean;
  stage_id: "activation";
  headline: string;
  rationale: string[];
  evidence: string[];
  /** Part 6 — structured refs from product understanding graph when available. */
  evidence_refs?: import("./productUnderstandingInput").EvidenceRef[];
  confidence: ProductMetricConfidence;
  trigger?:
    | "scale_not_ready"
    | "growth_plane_activation"
    | "activation_below_target"
    | "activation_below_floor"
    | "onboarding_missing";
}

export interface ProductRequestProof {
  pr_url?: string;
  issue_url?: string;
  note?: string;
  metric_value?: number;
  metric_name?: string;
  completed_at: string;
}

export interface ProductRequest {
  id: string;
  priority: ProductRequestPriority;
  title: string;
  problem: string;
  acceptance_criteria: string[];
  growth_impact: string;
  marketing_status: ProductMarketingStatus;
  fix_scope: ProductFixScope;
  status: ProductRequestStatus;
  linked_ops_task_id?: string;
  linked_lane_a_item_id?: string;
  target_metric?: { name: string; value: number; unit: string; confidence: ProductMetricConfidence };
  proof?: ProductRequestProof;
  skip_reason?: string;
  sort_order: number;
}

export interface LaneDWorkspace {
  id: string;
  thesis_id: ChannelThesisId;
  ops_cadence_id?: string;
  started_at: string;
  product_binding: ProductBinding;
  marketing_paused: boolean;
  paused_reason: string;
  requests: ProductRequest[];
}

export interface ProductRequestProofInput {
  pr_url?: string;
  issue_url?: string;
  note?: string;
  metric_value?: number;
  metric_name?: string;
}

export interface ProductBindingInput {
  founderFit?: Pick<FounderFitProfile, "scale_readiness" | "magic_moment"> | null;
  activation?: ProductActivationProfile | null;
  growthBinding?: Pick<BindingBottleneck, "stage_id" | "headline" | "evidence"> | null;
  gaps?: string[];
  understandingGraph?: ProductUnderstandingGraph | null;
}

function finalizeProductBinding(
  binding: ProductBinding,
  input: ProductBindingInput,
): ProductBinding {
  return {
    ...binding,
    evidence_refs: bindingEvidenceRefs(input.understandingGraph, binding.evidence, [
      "activation_event",
      "site_structure",
      "traffic_analytics",
    ]),
  };
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function kpiValue(kpis: ManualKpi[] | undefined, id: string): number | undefined {
  return finiteNonNegative(kpis?.find((kpi) => kpi.id === id)?.value);
}

function kpiTarget(kpis: ManualKpi[] | undefined, id: string): number | undefined {
  return finiteNonNegative(kpis?.find((kpi) => kpi.id === id)?.target);
}

export function buildProductActivationProfile(input: {
  founderFit?: Pick<FounderFitProfile, "magic_moment"> | null;
  manualKpis?: ManualKpi[];
  scan?: Pick<ProjectProfile, "routes"> | null;
  existing?: Partial<ProductActivationProfile> | null;
  now?: string;
}): ProductActivationProfile {
  const existing = input.existing ?? {};
  const signups = finiteNonNegative(existing.signup_count) ?? kpiValue(input.manualKpis, "signups");
  const activated =
    finiteNonNegative(existing.activated_count) ?? kpiValue(input.manualKpis, "activated_users");
  const explicitRate =
    finiteNonNegative(existing.activation_rate_pct) ??
    kpiValue(input.manualKpis, "activation_rate_pct");
  const computedRate =
    signups != null && signups > 0 && activated != null
      ? Math.round((activated / signups) * 1000) / 10
      : undefined;
  const rate = explicitRate ?? computedRate;
  const explicitTarget =
    finiteNonNegative(existing.activation_rate_target_pct) ??
    kpiTarget(input.manualKpis, "activation_rate_pct");
  const rateTarget = explicitTarget ?? 40;
  const ttfv =
    finiteNonNegative(existing.ttfv_hours) ??
    kpiValue(input.manualKpis, "time_to_first_value_hours");
  const explicitTtfvTarget =
    finiteNonNegative(existing.ttfv_target_hours) ??
    kpiTarget(input.manualKpis, "time_to_first_value_hours");
  const routes = input.scan?.routes ?? [];
  const inferredOnboarding = routes.some((route) => /(onboard|welcome|setup|getting-started)/i.test(route));
  const hasMeasuredMetric = [signups, activated, rate, ttfv].some((value) => value != null);

  return {
    activation_event_label:
      existing.activation_event_label?.trim() ||
      input.founderFit?.magic_moment?.trim() ||
      "Completes the first value action",
    signup_count: signups,
    activated_count: activated,
    activation_rate_pct: rate,
    activation_rate_target_pct: rateTarget,
    ttfv_hours: ttfv,
    ttfv_target_hours: explicitTtfvTarget,
    onboarding_path_exists: existing.onboarding_path_exists ?? inferredOnboarding,
    confidence: hasMeasuredMetric ? "measured" : "assumption",
    metric_confidence: {
      signup_count: signups != null ? "measured" : "missing",
      activated_count: activated != null ? "measured" : "missing",
      activation_rate_pct: rate != null ? "measured" : "missing",
      activation_rate_target_pct: explicitTarget != null ? "measured" : "assumption",
      ttfv_hours: ttfv != null ? "measured" : "missing",
      ttfv_target_hours: explicitTtfvTarget != null ? "measured" : "missing",
    },
    updated_at: input.now ?? new Date().toISOString(),
  };
}

function inactiveBinding(input: ProductBindingInput): ProductBinding {
  return finalizeProductBinding(
    {
      active: false,
      stage_id: "activation",
      headline: "Product loop is not the binding constraint",
      rationale: ["Continue the current marketing thesis while activation evidence is healthy or missing."],
      evidence: [],
      confidence: "missing",
    },
    input,
  );
}

export function detectProductBinding(input: ProductBindingInput): ProductBinding {
  if (input.founderFit?.scale_readiness === "not_yet") {
    return finalizeProductBinding(
      {
        active: true,
        stage_id: "activation",
        headline: "Product readiness — do not scale acquisition yet",
        rationale: ["The founder marked the product unable to handle a traffic spike."],
        evidence: ["Scale readiness: not yet"],
        confidence: "measured",
        trigger: "scale_not_ready",
      },
      input,
    );
  }

  if (input.growthBinding?.stage_id === "activation") {
    return finalizeProductBinding(
      {
        active: true,
        stage_id: "activation",
        headline: input.growthBinding.headline,
        rationale: ["Users exist, but the growth plane identifies first value as the constraint."],
        evidence: input.growthBinding.evidence,
        confidence: "measured",
        trigger: "growth_plane_activation",
      },
      input,
    );
  }

  const activation = input.activation;
  if (
    activation?.activation_rate_pct != null &&
    activation.activation_rate_target_pct != null &&
    activation.activation_rate_pct < activation.activation_rate_target_pct
  ) {
    return finalizeProductBinding(
      {
        active: true,
        stage_id: "activation",
        headline: "Activation — measured rate is below the founder's target",
        rationale: ["Scaling reach would send more users into a product path that is under target."],
        evidence: [
          `Activation ${activation.activation_rate_pct}% vs target ${activation.activation_rate_target_pct}%`,
        ],
        confidence: "measured",
        trigger: "activation_below_target",
      },
      input,
    );
  }

  if (
    activation?.signup_count != null &&
    activation.signup_count >= 10 &&
    activation.activated_count != null &&
    activation.signup_count > 0 &&
    (activation.activated_count / activation.signup_count) * 100 < 20
  ) {
    const rate = Math.round((activation.activated_count / activation.signup_count) * 1000) / 10;
    return finalizeProductBinding(
      {
        active: true,
        stage_id: "activation",
        headline: "Activation — signup-to-value is below the conservative floor",
        rationale: ["The deterministic 20% floor is an assumption, not an industry benchmark."],
        evidence: [`${activation.activated_count}/${activation.signup_count} activated (${rate}%)`],
        confidence: "assumption",
        trigger: "activation_below_floor",
      },
      input,
    );
  }

  if (
    input.gaps?.includes("product.onboarding_missing") &&
    (input.founderFit?.magic_moment?.trim().length ?? 0) >= 3
  ) {
    return finalizeProductBinding(
      {
        active: true,
        stage_id: "activation",
        headline: "Onboarding — the path to first value is missing",
        rationale: ["The product has a defined magic moment but no detected onboarding path."],
        evidence: ["Scan gap: product.onboarding_missing"],
        confidence: "assumption",
        trigger: "onboarding_missing",
      },
      input,
    );
  }

  return inactiveBinding(input);
}

function request(
  input: Omit<ProductRequest, "priority" | "marketing_status" | "status" | "sort_order">,
  sortOrder: number,
): ProductRequest {
  return {
    ...input,
    priority: "P0",
    marketing_status: "paused",
    status: "pending",
    sort_order: sortOrder,
  };
}

export function createLaneDWorkspaceFromBinding(input: {
  thesis: Pick<ChannelThesis, "id">;
  binding: ProductBinding;
  activation: ProductActivationProfile;
  gaps?: string[];
  hasAnalytics?: boolean;
  opsCadence?: Pick<CmoOpsCadence, "id" | "tasks">;
  now?: string;
}): LaneDWorkspace | null {
  if (!input.binding.active) return null;
  const requests: ProductRequest[] = [];
  const event = input.activation.activation_event_label;
  const tasks = input.opsCadence?.tasks ?? [];

  if (!input.hasAnalytics || input.gaps?.includes("product.activation_event_missing")) {
    requests.push(
      request(
        {
          id: `${input.thesis.id}.laned.instrument`,
          title: `Instrument activation: ${event}`,
          problem: "The first-value event is not reliably measured.",
          acceptance_criteria: [
            `A single event records when a user ${event}.`,
            "The event fires once per completed activation.",
            "A manual or analytics-backed activation count can be logged.",
          ],
          growth_impact: "Makes the product bottleneck measurable before acquisition resumes.",
          fix_scope: "site_level",
          linked_ops_task_id: tasks[0]?.id,
        },
        requests.length,
      ),
    );
  }

  if (
    input.gaps?.includes("product.onboarding_missing") ||
    input.activation.onboarding_path_exists === false
  ) {
    requests.push(
      request(
        {
          id: `${input.thesis.id}.laned.onboarding`,
          title: "Ship the shortest path to first value",
          problem: `New users do not have a clear path to: ${event}.`,
          acceptance_criteria: [
            "A new user sees one primary onboarding action.",
            `The path ends when the user ${event}.`,
            "Empty, error, and success states explain the next step.",
            "Activation instrumentation covers the completed path.",
          ],
          growth_impact: "Reduces signup-to-activation drop-off before more traffic is acquired.",
          fix_scope: "site_level",
          linked_ops_task_id: tasks[1]?.id,
        },
        requests.length,
      ),
    );
  }

  const target = input.activation.activation_rate_target_pct;
  if (
    input.activation.activation_rate_pct != null &&
    target != null &&
    input.activation.activation_rate_pct < target
  ) {
    requests.push(
      request(
        {
          id: `${input.thesis.id}.laned.activation`,
          title: "Reduce signup-to-activation drop-off",
          problem: `Measured activation is ${input.activation.activation_rate_pct}% against ${target}%.`,
          acceptance_criteria: [
            "The largest activation-path drop-off is identified with evidence.",
            "The core workflow removes or resolves that blocker.",
            `Activation is re-measured against the ${target}% target.`,
          ],
          growth_impact: `Unblocks marketing scale when activation reaches ${target}%.`,
          fix_scope: "core_product",
          linked_ops_task_id: tasks[2]?.id,
          target_metric: {
            name: "Activation rate",
            value: target,
            unit: "%",
            confidence: input.activation.metric_confidence.activation_rate_target_pct,
          },
        },
        requests.length,
      ),
    );
  }

  if (
    input.activation.ttfv_hours != null &&
    input.activation.ttfv_target_hours != null &&
    input.activation.ttfv_hours > input.activation.ttfv_target_hours
  ) {
    requests.push(
      request(
        {
          id: `${input.thesis.id}.laned.ttfv`,
          title: `Reduce time-to-first-value below ${input.activation.ttfv_target_hours}h`,
          problem: `Measured TTFV is ${input.activation.ttfv_hours}h.`,
          acceptance_criteria: [
            "The slowest required activation step is identified.",
            "The step is removed, automated, or clearly guided.",
            "TTFV is re-measured from signup to the activation event.",
          ],
          growth_impact: "Shortens the delay between acquired signup and experienced value.",
          fix_scope: "core_product",
          linked_ops_task_id: tasks[2]?.id,
          target_metric: {
            name: "Time to first value",
            value: input.activation.ttfv_target_hours,
            unit: "hours",
            confidence: input.activation.metric_confidence.ttfv_target_hours,
          },
        },
        requests.length,
      ),
    );
  }

  if (input.binding.trigger === "scale_not_ready") {
    requests.push(
      request(
        {
          id: `${input.thesis.id}.laned.readiness`,
          title: "Harden the product for a traffic spike",
          problem: "The product is explicitly not ready for acquisition volume.",
          acceptance_criteria: [
            "The expected traffic-spike failure mode is documented.",
            "Critical signup and first-value paths pass a repeatable smoke test.",
            "Monitoring or rollback exists for the identified risk.",
          ],
          growth_impact: "Prevents a distribution win from becoming a product failure.",
          fix_scope: "core_product",
          linked_ops_task_id: tasks[2]?.id,
        },
        requests.length,
      ),
    );
  }

  if (requests.length === 0) {
    requests.push(
      request(
        {
          id: `${input.thesis.id}.laned.diagnose`,
          title: "Verify the first-value path with activation evidence",
          problem: input.binding.headline,
          acceptance_criteria: [
            `The activation event is defined as: ${event}.`,
            "Signup and activated-user counts use the same cohort window.",
            "The next product change is supported by observed drop-off evidence.",
          ],
          growth_impact: "Turns the product-binding diagnosis into measurable product work.",
          fix_scope: "core_product",
          linked_ops_task_id: tasks[0]?.id,
        },
        0,
      ),
    );
  }

  return {
    id: `laned.${input.thesis.id}.${Date.now()}`,
    thesis_id: input.thesis.id,
    ops_cadence_id: input.opsCadence?.id,
    started_at: input.now ?? new Date().toISOString(),
    product_binding: input.binding,
    marketing_paused: true,
    paused_reason: input.binding.headline,
    requests: requests.slice(0, 3),
  };
}

export function createProductLoopOpsCadence(input: {
  thesis: Pick<ChannelThesis, "id">;
  activation: ProductActivationProfile;
  campaignSessionId?: string;
  priorOpsCadenceId?: string;
  weekIndex?: number;
  now?: string;
}): CmoOpsCadence {
  const now = input.now ?? new Date().toISOString();
  const weekIndex = Math.max(1, input.weekIndex ?? 1);
  const tasks: CmoOpsTask[] = [
    {
      id: `${input.thesis.id}.product.w${weekIndex}.0`,
      priority_index: 0,
      what: `Instrument the activation event: ${input.activation.activation_event_label}`,
      why: "Product work cannot be prioritized honestly without first-value evidence.",
      owner: "system",
      done_when: "Activation event is implemented or a measured manual baseline is logged.",
      status: "in_progress",
      day_slot: "now",
      unlocked_at: now,
    },
    {
      id: `${input.thesis.id}.product.w${weekIndex}.1`,
      priority_index: 1,
      what: "Ship the site-level onboarding path to first value",
      why: "Acquisition stays paused while new users cannot reach the magic moment.",
      owner: "system",
      done_when: "The shortest onboarding path ships in the repo with activation tracking.",
      status: "pending",
      day_slot: "up_next",
    },
    {
      id: `${input.thesis.id}.product.w${weekIndex}.2`,
      priority_index: 2,
      what: "File and track the core PRODUCT REQUEST, then log activation evidence",
      why: "Core workflow changes need a developer-owned issue and a measurable unblock gate.",
      owner: "user",
      done_when: "Issue or PR URL is logged with acceptance criteria and the activation metric.",
      status: "pending",
      day_slot: "later",
    },
  ];
  const due = new Date(now);
  due.setDate(due.getDate() + 7);
  return {
    id: `ops.${input.thesis.id}.product.w${weekIndex}.${Date.now()}`,
    thesis_id: input.thesis.id,
    campaign_session_id: input.campaignSessionId,
    prior_ops_cadence_id: input.priorOpsCadenceId,
    started_at: now,
    week_index: weekIndex,
    day_index: 1,
    tasks,
    week_review: { week_index: weekIndex, due_at: due.toISOString(), status: "pending" },
    last_focus_reset_at: now,
  };
}

export function linkSiteLevelToLaneA(
  workspace: LaneAWorkspace,
  productWorkspace: LaneDWorkspace,
): { laneA: LaneAWorkspace; laneD: LaneDWorkspace } {
  let items = [...workspace.items];
  const requests = productWorkspace.requests.map((productRequest) => {
    if (productRequest.fix_scope !== "site_level") return productRequest;
    const existing = items.find((item) => item.id === productRequest.linked_lane_a_item_id);
    if (existing) return productRequest;
    const laneItem: LaneAItem = {
      id: `${productRequest.id}.lanea`,
      mode: "repo_edit",
      title: productRequest.title,
      detail: `${productRequest.problem}\n\nDone when: ${productRequest.acceptance_criteria.join("; ")}`,
      status: "pending",
      linked_ops_task_id: productRequest.linked_ops_task_id,
      skills: ["analytics-measurement", "landing-page-conversion", "product-intelligence"],
      sort_order: items.length,
    };
    items = [...items, laneItem];
    return { ...productRequest, linked_lane_a_item_id: laneItem.id };
  });
  return {
    laneA: { ...workspace, items },
    laneD: { ...productWorkspace, requests },
  };
}

export function validateProductRequestProof(
  productRequest: ProductRequest,
  proof: ProductRequestProofInput,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const prUrl = proof.pr_url?.trim();
  const issueUrl = proof.issue_url?.trim();
  if (prUrl && !URL_RE.test(prUrl)) errors.push("PR URL must start with http:// or https://.");
  if (issueUrl && !URL_RE.test(issueUrl)) errors.push("Issue URL must start with http:// or https://.");
  if (
    proof.metric_value != null &&
    (!Number.isFinite(proof.metric_value) || proof.metric_value < 0)
  ) {
    errors.push("Metric value must be a non-negative number.");
  }
  if (productRequest.fix_scope === "site_level" && !prUrl && (proof.note?.trim().length ?? 0) < 12) {
    errors.push("Add a PR URL or a substantive shipped note (12+ chars).");
  }
  if (productRequest.fix_scope === "core_product" && !issueUrl && !prUrl) {
    errors.push("Core product work requires an issue or PR URL.");
  }
  if (
    productRequest.target_metric &&
    proof.metric_value == null &&
    (proof.note?.trim().length ?? 0) < 12
  ) {
    errors.push("Log the target metric or explain why it is not yet measurable.");
  }
  return { ok: errors.length === 0, errors };
}

export function completeProductRequest(
  workspace: LaneDWorkspace,
  requestId: string,
  proof: ProductRequestProofInput,
): { workspace: LaneDWorkspace; error?: string } {
  const target = workspace.requests.find((item) => item.id === requestId);
  if (!target || target.status === "shipped") return { workspace };
  const validation = validateProductRequestProof(target, proof);
  if (!validation.ok) return { workspace, error: validation.errors.join(" ") };
  const requests = workspace.requests.map((item) =>
    item.id === requestId
      ? {
          ...item,
          status: "shipped" as const,
          proof: {
            pr_url: proof.pr_url?.trim(),
            issue_url: proof.issue_url?.trim(),
            note: proof.note?.trim(),
            metric_value: proof.metric_value,
            metric_name: proof.metric_name?.trim(),
            completed_at: new Date().toISOString(),
          },
        }
      : item,
  );
  return { workspace: { ...workspace, requests } };
}

export function skipProductRequest(
  workspace: LaneDWorkspace,
  requestId: string,
  reason: string,
): LaneDWorkspace {
  return {
    ...workspace,
    requests: workspace.requests.map((item) =>
      item.id === requestId
        ? { ...item, status: "skipped" as const, skip_reason: reason.trim() || "Skipped by founder" }
        : item,
    ),
  };
}

export function completeLinkedProductRequestOnApply(
  workspace: LaneDWorkspace,
  laneAItemId: string,
  proof: { pr_url?: string; note?: string },
): LaneDWorkspace {
  const target = workspace.requests.find((item) => item.linked_lane_a_item_id === laneAItemId);
  if (!target) return workspace;
  const result = completeProductRequest(workspace, target.id, {
    pr_url: proof.pr_url,
    note: proof.note ?? "Site-level product request shipped through Lane A.",
  });
  return result.workspace;
}

export function isMarketingPaused(workspace?: LaneDWorkspace | null): boolean {
  return workspace?.marketing_paused === true;
}

export function canResumeMarketing(workspace?: LaneDWorkspace | null): boolean {
  return Boolean(
    workspace &&
      workspace.requests.length > 0 &&
      workspace.requests.every((item) => item.status === "shipped" || item.status === "skipped"),
  );
}

export function resumeMarketing(workspace: LaneDWorkspace, now?: string): LaneDWorkspace {
  if (!canResumeMarketing(workspace)) return workspace;
  return {
    ...workspace,
    marketing_paused: false,
    paused_reason: `Product loop completed ${now ?? new Date().toISOString()}`,
    requests: workspace.requests.map((item) => ({ ...item, marketing_status: "resumed" as const })),
  };
}

export function laneDProgress(workspace: LaneDWorkspace): {
  done: number;
  total: number;
  percent: number;
} {
  const total = workspace.requests.length;
  const done = workspace.requests.filter(
    (item) => item.status === "shipped" || item.status === "skipped",
  ).length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function getNextProductRequest(workspace: LaneDWorkspace): ProductRequest | null {
  return (
    [...workspace.requests]
      .sort((a, b) => a.sort_order - b.sort_order)
      .find((item) => item.status === "pending" || item.status === "in_progress") ?? null
  );
}

export function buildProductIssueMarkdown(productRequest: ProductRequest): string {
  const criteria = productRequest.acceptance_criteria.map((item) => `- [ ] ${item}`).join("\n");
  const metric = productRequest.target_metric
    ? `\n## Success metric\n${productRequest.target_metric.name}: ${productRequest.target_metric.value}${productRequest.target_metric.unit} (${productRequest.target_metric.confidence})\n`
    : "";
  return `# P0 PRODUCT REQUEST — ${productRequest.title}

## Problem
${productRequest.problem}

## Growth impact
${productRequest.growth_impact}

## Acceptance criteria
${criteria}
${metric}
## Marketing status
Paused until this P0 is shipped and activation evidence is reviewed.
`;
}

export function hydrateLaneDWorkspaceFromJson(raw: unknown): LaneDWorkspace | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.thesis_id !== "string" ||
    !Array.isArray(value.requests)
  ) {
    return null;
  }
  const requests: ProductRequest[] = value.requests
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, index): ProductRequest => {
      const status: ProductRequestStatus =
        item.status === "in_progress" || item.status === "shipped" || item.status === "skipped"
          ? item.status
          : "pending";
      return {
        ...(item as unknown as ProductRequest),
        id: String(item.id ?? `laned.request.${index}`),
        priority: item.priority === "P1" ? "P1" : "P0",
        status,
        marketing_status: item.marketing_status === "resumed" ? "resumed" : "paused",
        fix_scope: item.fix_scope === "site_level" ? "site_level" : "core_product",
        acceptance_criteria: Array.isArray(item.acceptance_criteria)
          ? item.acceptance_criteria.map(String)
          : [],
        sort_order: Number(item.sort_order ?? index),
      };
    });
  return {
    id: value.id,
    thesis_id: value.thesis_id as ChannelThesisId,
    ops_cadence_id: typeof value.ops_cadence_id === "string" ? value.ops_cadence_id : undefined,
    started_at:
      typeof value.started_at === "string" ? value.started_at : new Date().toISOString(),
    product_binding: value.product_binding as unknown as ProductBinding,
    marketing_paused: value.marketing_paused === true,
    paused_reason: String(value.paused_reason ?? "Product is the binding constraint."),
    requests,
  };
}
