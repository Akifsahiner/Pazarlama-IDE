/**
 * P12 — deterministic command-surface view model and ownership policy.
 * The primary surface owns daily CMO work; deeper operational context stays backstage.
 */
import type { CampaignPhase } from "./campaignSession";
import type { ChannelThesisId } from "./cmoIntake";
import type { CmoContinuousState } from "./cmoContinuous";
import { isContinuousReplanReady } from "./cmoContinuous";
import { resolveHumanProofAction } from "./cmoHumanExecutionBind";
import type { DelegateOperatorWorkspace } from "./cmoDelegateOperator";
import { delegateRubricSummary, getNextDelegateRubricDay } from "./cmoDelegateOperator";
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import {
  distributionVolumeSummary,
  getNextDistributionSlot,
} from "./cmoDistributionOperator";
import type { GrowthControlPlane, GrowthTodayMove } from "./cmoGrowthPlane";
import type { GrowthMemoryState } from "./cmoGrowthMemory";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import {
  getNextInfluencerTouch,
  influencerOutreachSummary,
} from "./cmoInfluencerOperator";
import type { LaneBWorkspace } from "./cmoLaneB";
import { getNextProductRequest, type LaneDWorkspace } from "./cmoLaneD";
import { getNextMonetizationTask, type MonetizationWorkspace } from "./cmoRevenuePlane";
import { withNarrativePrefix } from "./cmoNarrativeContext";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import { isWeekReviewDue } from "./cmoOpsCadence";
import { evaluateWeek1MetricsWithGa4Priority } from "./cmoProofLoop";

type TodayWithoutWhy = Omit<GrowthTodayMove, "why"> & { why?: string };

export interface ResolveTodayWhyInput {
  plane: Pick<GrowthControlPlane, "binding" | "primary_lever">;
  today: TodayWithoutWhy;
  cadence?: CmoOpsCadence | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
  narrativeOneLiner?: string;
}

export type CommandSurfaceGovernance =
  | {
      kind: "replan";
      title: string;
      reason: string;
      primaryLabel: string;
      thesisId?: ChannelThesisId;
      mode: "pivot" | "double_down";
    }
  | {
      kind: "week_review";
      title: string;
      reason: string;
      primaryLabel: string;
    }
  | {
      kind: "pivot";
      title: string;
      reason: string;
      primaryLabel: string;
    }
  | {
      kind: "measuring";
      title: string;
      reason: string;
      primaryLabel: string;
    }
  | {
      kind: "product_loop";
      title: string;
      reason: string;
      primaryLabel: string;
    }
  | {
      kind: "revenue_focus";
      title: string;
      reason: string;
      primaryLabel: string;
    };

export interface CommandSurfaceGovernanceInput {
  cadence?: CmoOpsCadence | null;
  continuous?: CmoContinuousState | null;
  campaignPhase?: CampaignPhase | null;
  growthMemory?: GrowthMemoryState | null;
  laneDWorkspace?: LaneDWorkspace | null;
  monetizationWorkspace?: MonetizationWorkspace | null;
  now?: number;
}

export interface CommandSurfaceModel {
  bottleneck: string;
  today: string;
  why: string;
  doneWhen: string;
  pendingOps: number;
  pendingLaneB: number;
  pendingLaneD: number;
  mechanismLabel?: string;
  mechanismAntiPattern?: string;
  operatorSummary?: string;
  governance?: CommandSurfaceGovernance;
}

export interface BuildCommandSurfaceModelInput extends CommandSurfaceGovernanceInput {
  plane: GrowthControlPlane;
  laneBWorkspace?: LaneBWorkspace | null;
  laneDWorkspace?: LaneDWorkspace | null;
  monetizationWorkspace?: MonetizationWorkspace | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
  narrativeOneLiner?: string;
}

export function resolveTodayWhy(input: ResolveTodayWhyInput): string {
  const linkedTask = input.today.ops_task_id
    ? input.cadence?.tasks.find((task) => task.id === input.today.ops_task_id)
    : undefined;
  if (linkedTask?.why.trim()) return linkedTask.why.trim();

  if (input.distributionOperator) {
    const next = getNextDistributionSlot(input.distributionOperator);
    if (next) {
      const hook = input.distributionOperator.hooks.find((item) => item.id === next.hook_id);
      const hookLabel = hook?.label ?? next.hook_id;
      return next.slot_kind === "measure"
        ? `Measure ${hookLabel} against this week's retention gate.`
        : next.slot_kind === "engage"
          ? "Turn distribution into conversation while the post is still fresh."
          : `Test ${hookLabel} against this week's retention gate.`;
    }
  }

  if (input.influencerOperator) {
    const next = getNextInfluencerTouch(input.influencerOperator);
    if (next) {
      const pitch = input.influencerOperator.pitches.find((item) => item.id === next.pitch_id);
      const pitchLabel = pitch?.label ?? next.pitch_id;
      return next.pipeline_stage === "replied"
        ? `Convert the ${pitchLabel} reply into trackable deal terms.`
        : `Test ${pitchLabel} against the warm-reply target.`;
    }
  }

  if (input.delegateOperator) {
    const next = getNextDelegateRubricDay(input.delegateOperator, input.cadence?.day_index);
    if (next) return `Hold the delegate accountable to the Day ${next.day_index} delivery rubric.`;
  }

  const fallback =
    input.today.why?.trim() ||
    input.plane.binding.rationale.find((line) => line.trim())?.trim() ||
    input.plane.primary_lever.trim() ||
    "Advance the binding growth lever with proof.";
  return withNarrativePrefix(fallback, { one_liner: input.narrativeOneLiner }, 280);
}

export function isCommandSurfaceActive(input: {
  growthControlPlane?: GrowthControlPlane | null;
  opsCadence?: CmoOpsCadence | null;
}): boolean {
  return Boolean(input.opsCadence && input.growthControlPlane?.today);
}

export function isCommandSurfaceOwnedAction(actionId: string): boolean {
  return (
    actionId.startsWith("ops-user-") ||
    actionId.startsWith("ops-system-") ||
    actionId === "ops-week-review" ||
    actionId === "ops-pivot" ||
    actionId === "cmo-start-next-cycle" ||
    actionId.startsWith("lane-b-") ||
    actionId.startsWith("lane-c-") ||
    actionId.startsWith("lane-d-")
  );
}

export function resolveCommandSurfaceGovernance(
  input: CommandSurfaceGovernanceInput,
): CommandSurfaceGovernance | undefined {
  const cadence = input.cadence;
  if (!cadence) return undefined;

  if (isContinuousReplanReady(input.continuous, cadence, input.campaignPhase)) {
    const pivot = cadence.pivot_suggestion;
    const suggested = pivot?.suggested_thesis_ids[0];
    const mode = suggested && pivot && !pivot.dismissed_at ? "pivot" : "double_down";
    return {
      kind: "replan",
      title: `Start Week ${cadence.week_index + 1} from evidence`,
      reason:
        input.growthMemory?.pending_replan?.rationale[0] ??
        pivot?.rationale[0] ??
        "Replan from KPI truth, message memory, and the latest scan.",
      primaryLabel: `Start Week ${cadence.week_index + 1}`,
      thesisId: mode === "pivot" ? suggested : undefined,
      mode,
    };
  }

  if (isWeekReviewDue(cadence, input.now) && cadence.week_review.status !== "completed") {
    return {
      kind: "week_review",
      title: `Close Week ${cadence.week_index} with KPI truth`,
      reason: "Log outcomes before the next growth decision.",
      primaryLabel: "Complete review",
    };
  }

  if (input.continuous?.marketing_paused && input.laneDWorkspace?.marketing_paused) {
    const next = getNextProductRequest(input.laneDWorkspace);
    return {
      kind: "product_loop",
      title: next ? `P0 PRODUCT REQUEST — ${next.title}` : "Product loop requires review",
      reason: input.laneDWorkspace.paused_reason,
      primaryLabel: "Open product loop",
    };
  }

  if (input.monetizationWorkspace?.revenue_binding.active) {
    const next = getNextMonetizationTask(input.monetizationWorkspace);
    return {
      kind: "revenue_focus",
      title: next ? `Monetization P0 — ${next.title}` : input.monetizationWorkspace.revenue_binding.headline,
      reason: input.monetizationWorkspace.revenue_binding.rationale[0] ?? "Revenue infra is the binding gap.",
      primaryLabel: "Open revenue plane",
    };
  }

  const pivot = cadence.pivot_suggestion;
  if (pivot && !pivot.dismissed_at && cadence.week_review.status === "completed") {
    return {
      kind: "pivot",
      title: pivot.headline,
      reason: pivot.rationale[0] ?? "Week metrics require a channel decision.",
      primaryLabel: "Review pivot",
    };
  }

  if (input.continuous?.phase === "measuring") {
    return {
      kind: "measuring",
      title: `Week ${cadence.week_index} is measuring`,
      reason: "Keep KPI gaps explicit until evidence is ready.",
      primaryLabel: "View cycle",
    };
  }

  return undefined;
}

export function buildCommandSurfaceModel(
  input: BuildCommandSurfaceModelInput,
): CommandSurfaceModel | null {
  const today = input.plane.today;
  if (!today || !input.cadence) return null;

  const pendingOps = input.cadence.tasks.filter(
    (task) => task.status !== "done" && task.status !== "skipped",
  ).length;
  const pendingLaneB =
    input.laneBWorkspace?.items.filter(
      (item) => item.status !== "done" && item.status !== "skipped",
    ).length ?? 0;
  const pendingLaneD =
    input.laneDWorkspace?.requests.filter(
      (item) => item.status !== "shipped" && item.status !== "skipped",
    ).length ?? 0;
  const productNext = input.laneDWorkspace?.marketing_paused
    ? getNextProductRequest(input.laneDWorkspace)
    : null;
  const monetizationNext =
    !productNext && input.monetizationWorkspace?.revenue_binding.active
      ? getNextMonetizationTask(input.monetizationWorkspace)
      : null;
  const operatorSummary = input.distributionOperator
    ? distributionVolumeSummary(input.distributionOperator)
    : input.influencerOperator
      ? influencerOutreachSummary(input.influencerOperator)
      : input.delegateOperator
        ? delegateRubricSummary(input.delegateOperator, input.cadence.day_index) ?? undefined
        : undefined;

  const mechanismWhy = input.plane.mechanism_rationale
    ? `${input.plane.mechanism_label ?? "Growth mechanism"}: ${input.plane.mechanism_rationale}`
    : undefined;

  return {
    bottleneck: productNext
      ? input.laneDWorkspace!.product_binding.headline
      : monetizationNext
        ? input.monetizationWorkspace!.revenue_binding.headline
        : input.plane.binding.headline,
    today: productNext ? productNext.title : monetizationNext ? monetizationNext.title : today.what,
    why: productNext
      ? productNext.growth_impact
      : monetizationNext
        ? monetizationNext.growth_impact
        : mechanismWhy
          ? `${mechanismWhy} ${resolveTodayWhy({
              plane: input.plane,
              today,
              cadence: input.cadence,
              distributionOperator: input.distributionOperator,
              influencerOperator: input.influencerOperator,
              delegateOperator: input.delegateOperator,
              narrativeOneLiner: input.narrativeOneLiner,
            })}`.trim()
          : resolveTodayWhy({
              plane: input.plane,
              today,
              cadence: input.cadence,
              distributionOperator: input.distributionOperator,
              influencerOperator: input.influencerOperator,
              delegateOperator: input.delegateOperator,
              narrativeOneLiner: input.narrativeOneLiner,
            }),
    doneWhen: productNext
      ? productNext.acceptance_criteria.join(" · ")
      : monetizationNext
        ? monetizationNext.acceptance_criteria.join(" · ")
        : today.done_when,
    pendingOps,
    pendingLaneB,
    pendingLaneD,
    mechanismLabel: input.plane.mechanism_label,
    mechanismAntiPattern: input.plane.mechanism_anti_pattern,
    operatorSummary,
    governance: resolveCommandSurfaceGovernance(input),
  };
}

export function resolvePreShipCommandSurface(input: {
  firstShipAt?: number | null;
  wedgePhase?: string | null;
  hasActiveRun?: boolean;
}): { primaryLabel: string; testId: string } | null {
  if (input.firstShipAt) return null;
  if (input.wedgePhase === "cmo_unlocked") return null;
  return {
    primaryLabel: input.hasActiveRun ? "Apply first change" : "Run and apply first change",
    testId: "command-surface-ship-first-win",
  };
}

export type CommandSurfaceAction =
  | { kind: "run_system"; taskId: string; label: string; testId: string }
  | { kind: "submit_proof"; taskId: string; label: string; testId: string }
  | { kind: "export"; exportKind: "outreach" | "issue" | "brief"; id: string; label: string; testId: string }
  | {
      kind: "operator_proof";
      operator: "distribution" | "influencer" | "delegate";
      touchId: string;
      label: string;
      testId: string;
      deal?: boolean;
    }
  | { kind: "week_review"; label: string; testId: string }
  | { kind: "ship_first"; label: string; testId: string }
  | { kind: "product_loop"; requestId: string; label: string; testId: string; siteLevel?: boolean }
  | { kind: "monetization"; taskId: string; label: string; testId: string; billingIssue?: boolean }
  | {
      kind: "start_next_cycle";
      label: string;
      testId: string;
      mode: "pivot" | "double_down";
      thesisId?: ChannelThesisId;
    }
  | { kind: "lane_b_proof"; itemId: string; label: string; testId: string }
  | { kind: "focus_war_room"; anchor: string; label: string; testId: string }
  | { kind: "focus_backstage"; anchor: string; label: string; testId: string }
  | { kind: "none"; reason: string };

export interface ResolveCommandSurfaceActionInput extends BuildCommandSurfaceModelInput {
  firstShipAt?: number | null;
  wedgePhase?: string | null;
  hasActiveRun?: boolean;
}

export function resolveCommandSurfaceAction(
  input: ResolveCommandSurfaceActionInput,
): CommandSurfaceAction {
  const preShip = resolvePreShipCommandSurface({
    firstShipAt: input.firstShipAt,
    wedgePhase: input.wedgePhase,
    hasActiveRun: input.hasActiveRun,
  });
  if (preShip) {
    return { kind: "ship_first", label: preShip.primaryLabel, testId: preShip.testId };
  }

  const governance = resolveCommandSurfaceGovernance(input);
  if (governance?.kind === "week_review") {
    return {
      kind: "week_review",
      label: governance.primaryLabel,
      testId: "command-surface-week-review",
    };
  }

  if (governance?.kind === "replan") {
    return {
      kind: "start_next_cycle",
      label: governance.primaryLabel,
      testId: "command-surface-start-next-cycle",
      mode: governance.mode,
      thesisId: governance.thesisId,
    };
  }

  const productNext = input.laneDWorkspace?.marketing_paused
    ? getNextProductRequest(input.laneDWorkspace)
    : null;
  if (productNext) {
    return {
      kind: "product_loop",
      requestId: productNext.id,
      label: productNext.fix_scope === "site_level" ? "Start P0 in IDE" : "Export P0 issue",
      testId: "command-surface-product-loop",
      siteLevel: productNext.fix_scope === "site_level",
    };
  }

  const monetizationNext =
    !productNext && input.monetizationWorkspace?.revenue_binding.active
      ? getNextMonetizationTask(input.monetizationWorkspace)
      : null;
  if (monetizationNext) {
    return {
      kind: "monetization",
      taskId: monetizationNext.id,
      label:
        monetizationNext.fix_scope === "core_billing"
          ? "Export billing issue"
          : "Complete monetization P0",
      testId: "command-surface-monetization",
      billingIssue: monetizationNext.fix_scope === "core_billing",
    };
  }

  const distNext = input.distributionOperator
    ? getNextDistributionSlot(input.distributionOperator)
    : null;
  if (distNext) {
    return {
      kind: "operator_proof",
      operator: "distribution",
      touchId: distNext.id,
      label: "Log distribution proof",
      testId: "command-surface-distribution-proof",
    };
  }

  const infNext = input.influencerOperator
    ? getNextInfluencerTouch(input.influencerOperator)
    : null;
  if (infNext) {
    const deal = infNext.pipeline_stage === "replied";
    return {
      kind: "operator_proof",
      operator: "influencer",
      touchId: infNext.id,
      label: deal ? "Log influencer deal" : "Log outreach proof",
      testId: deal ? "command-surface-influencer-deal" : "command-surface-influencer-proof",
      deal,
    };
  }

  const rubricNext = input.delegateOperator
    ? getNextDelegateRubricDay(input.delegateOperator, input.cadence?.day_index)
    : null;
  if (rubricNext) {
    return {
      kind: "operator_proof",
      operator: "delegate",
      touchId: rubricNext.id,
      label: "Submit delegate rubric",
      testId: "command-surface-delegate-rubric",
    };
  }

  const today = input.plane.today;
  if (today?.ops_task_id) {
    if (today.owner === "system") {
      return {
        kind: "run_system",
        taskId: today.ops_task_id,
        label: "Start in IDE",
        testId: "command-surface-start-move",
      };
    }
    const task = input.cadence?.tasks.find((t) => t.id === today.ops_task_id);
    if (task?.human_execution_ref) {
      const ref = task.human_execution_ref;
      const proofMeta = resolveHumanProofAction(ref);
      if (ref.export_kind === "outreach_csv") {
        return {
          kind: "export",
          exportKind: "outreach",
          id: ref.item_id,
          label: proofMeta.label,
          testId: proofMeta.testId,
        };
      }
      if (ref.proof_surface === "lane_b_modal") {
        return {
          kind: "lane_b_proof",
          itemId: ref.item_id,
          label: proofMeta.label,
          testId: proofMeta.testId,
        };
      }
      if (ref.proof_surface === "operator_modal") {
        const deal = ref.source === "influencer";
        return {
          kind: "operator_proof",
          operator: ref.source === "distribution" ? "distribution" : ref.source === "influencer" ? "influencer" : "delegate",
          touchId: ref.item_id,
          label: proofMeta.label,
          testId: proofMeta.testId,
          deal,
        };
      }
    }
    const proofLabel =
      task?.expected_proof_kind === "live_url" ? "Submit proof" : "Mark done";
    return {
      kind: "submit_proof",
      taskId: today.ops_task_id,
      label: proofLabel,
      testId: "command-surface-submit-proof",
    };
  }

  if (governance?.kind === "pivot") {
    const pivot = input.cadence?.pivot_suggestion;
    const suggested = pivot?.suggested_thesis_ids[0];
    const assessment = input.cadence
      ? evaluateWeek1MetricsWithGa4Priority(
          input.cadence,
          null,
          undefined,
          input.distributionOperator,
          input.influencerOperator,
          input.delegateOperator,
          input.growthMemory,
        )
      : null;
    if (
      suggested &&
      assessment &&
      (assessment.primaryValue == null || assessment.loggedCount <= 0)
    ) {
      return {
        kind: "week_review",
        label: "Log KPI in review",
        testId: "command-surface-log-kpi",
      };
    }
    return {
      kind: "start_next_cycle",
      label: governance.primaryLabel,
      testId: "command-surface-start-next-cycle",
      mode: suggested ? "pivot" : "double_down",
      thesisId: suggested,
    };
  }

  if (governance?.kind === "measuring") {
    return {
      kind: "focus_war_room",
      anchor: "cmo-cycle-panel",
      label: governance.primaryLabel,
      testId: "command-surface-view-cycle",
    };
  }

  if (governance?.kind === "revenue_focus") {
    return {
      kind: "focus_war_room",
      anchor: "revenue-plane-panel-wrap",
      label: governance.primaryLabel,
      testId: "command-surface-revenue-focus",
    };
  }

  if (governance?.kind === "product_loop") {
    return {
      kind: "focus_war_room",
      anchor: "lane-d-panel-wrap",
      label: governance.primaryLabel,
      testId: "command-surface-product-loop-focus",
    };
  }

  return { kind: "none", reason: "No actionable move" };
}
