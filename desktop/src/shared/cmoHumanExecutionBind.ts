/**
 * Faz 3 — bind user/delegate ops tasks to Lane B / operator execution refs.
 * See CMO_HUMAN_EXECUTION_BIND_SPEC.md
 */
import type { ChannelThesis } from "./cmoIntake";
import type { DelegateOperatorWorkspace } from "./cmoDelegateOperator";
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import { inferExpectedProofKind } from "./cmoExecutionBind";
import type { LaneBWorkspace } from "./cmoLaneB";
import type { CmoOpsCadence, CmoOpsTask } from "./cmoOpsCadence";
import { opsQueueBlocksLaneWork } from "./cmoOpsCadence";
import type { HumanExecutionRef } from "./humanExecutionPlan";
import type { HumanExecutionAsset } from "./marketingTaskContract";
import { isMeasurableForReview } from "./marketingTaskContract";

export type { HumanExecutionRef, HumanExportKind, HumanExecutionSource, HumanProofSurface } from "./humanExecutionPlan";

export function humanTasksFromCadence(cadence: CmoOpsCadence): CmoOpsTask[] {
  return cadence.tasks.filter((t) => t.owner === "user" || t.owner === "delegate");
}

/** Primary user ops task id from cadence (capped), not thesis index. */
export function primaryUserOpsTaskId(cadence: CmoOpsCadence): string | undefined {
  return humanTasksFromCadence(cadence)[0]?.id;
}

/** KPI/measure user task — contract metric.measurable first. */
export function measureUserOpsTaskId(cadence: CmoOpsCadence): string | undefined {
  const human = humanTasksFromCadence(cadence);
  const measure = human.find((t) => isMeasurableForReview(t));
  if (measure) return measure.id;
  const legacy = human.find((t) =>
    /\bkpi\b|\bmetric\b|snapshot|log|recorded|views|signups/i.test(t.done_when),
  );
  return legacy?.id ?? human.at(-1)?.id;
}

export function shouldBlockHumanWork(cadence: CmoOpsCadence): boolean {
  const inProgressSystem = cadence.tasks.some(
    (t) => t.owner === "system" && t.status === "in_progress",
  );
  return inProgressSystem || opsQueueBlocksLaneWork(cadence);
}

export function resolveHumanProofAction(ref: HumanExecutionRef): {
  testId: string;
  label: string;
} {
  if (ref.export_kind === "outreach_csv") {
    return { testId: "command-surface-export-outreach", label: "Export outreach CSV" };
  }
  switch (ref.proof_surface) {
    case "lane_b_modal":
      return { testId: "command-surface-lane-b-proof", label: "Submit Lane B proof" };
    case "operator_modal":
      return {
        testId: `command-surface-${ref.source}-proof`,
        label:
          ref.source === "distribution"
            ? "Log distribution proof"
            : ref.source === "influencer"
              ? "Log outreach proof"
              : "Submit delegate rubric",
      };
    default:
      return {
        testId: "command-surface-submit-proof",
        label: ref.export_kind ? "Submit proof" : "Submit proof",
      };
  }
}

function isMeasureLaneBItem(title: string, channel?: string): boolean {
  return channel === "measure" || /\blog\b|\bmeasure\b|\bsnapshot\b/i.test(title);
}

function isMeasureOpsTask(task: CmoOpsTask): boolean {
  if (task.metric?.measurable === true) return true;
  if (task.metric?.measurable === false) return false;
  return (
    task.expected_proof_kind === "kpi" ||
    inferExpectedProofKind(task.done_when) === "kpi" ||
    /\bkpi\b|\bmetric\b|snapshot|log|recorded/i.test(task.done_when)
  );
}

export function freezeHumanExecutionAsset(input: {
  task: CmoOpsTask;
  ref: HumanExecutionRef;
  thesis: ChannelThesis;
  laneB?: LaneBWorkspace | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
}): HumanExecutionAsset {
  const { task, ref } = input;
  const copy_blocks: HumanExecutionAsset["copy_blocks"] = [];

  if (ref.source === "distribution" && input.distributionOperator) {
    const slot = input.distributionOperator.slots.find((s) => s.id === ref.item_id);
    const hook = slot?.hook_id
      ? input.distributionOperator.hooks.find((h) => h.id === slot.hook_id)
      : undefined;
    if (hook?.script_hint) {
      copy_blocks.push({ id: "script", label: "Hook script", text: hook.script_hint });
    }
    copy_blocks.push({
      id: "platform",
      label: "Platform",
      text: `${slot?.platform ?? "primary"} · Day ${slot?.day_index ?? 1}`,
    });
  }

  if (ref.source === "influencer" && input.influencerOperator) {
    const touch = input.influencerOperator.touches.find((t) => t.id === ref.item_id);
    const pitch = touch
      ? input.influencerOperator.pitches.find((p) => p.id === touch.pitch_id)
      : undefined;
    if (pitch?.script_scaffold) {
      copy_blocks.push({ id: "pitch", label: pitch.label, text: pitch.script_scaffold });
    }
    if (touch?.target_name) {
      copy_blocks.push({
        id: "target",
        label: "Target",
        text: [touch.target_name, touch.target_handle].filter(Boolean).join(" · "),
      });
    }
  }

  if (ref.source === "lane_b" && input.laneB) {
    const item = input.laneB.items.find((i) => i.id === ref.item_id);
    if (item?.detail) {
      copy_blocks.push({ id: "detail", label: item.title, text: item.detail });
    }
    if (item?.target_name) {
      copy_blocks.push({
        id: "outreach_target",
        label: "Outreach target",
        text: `${item.target_name}${item.target_handle ? ` (${item.target_handle})` : ""}`,
      });
    }
    const laneDraft = input.thesis.lane_b[0];
    if (copy_blocks.length === 0 && laneDraft) {
      copy_blocks.push({ id: "lane_b_guide", label: "Lane B guide", text: laneDraft });
    }
  }

  if (ref.source === "delegate" && input.delegateOperator) {
    const rubric = input.delegateOperator.daily_rubrics.find((r) => r.id === ref.item_id);
    const brief = input.delegateOperator.briefs[0];
    const brief_md = brief
      ? `# ${brief.title}\n\n${brief.what}\n\nWhy: ${brief.why}\n\n## Deliverables\n${brief.deliverables.map((d) => `- ${d}`).join("\n")}\n\n## Acceptance\n${brief.acceptance_criteria.map((a) => `- ${a}`).join("\n")}`
      : undefined;
    if (rubric?.checklist.length) {
      copy_blocks.push({
        id: "rubric",
        label: `Day ${rubric.day_index} checklist`,
        text: rubric.checklist.map((c) => `- ${c.label}`).join("\n"),
      });
    }
    return {
      copy_blocks: copy_blocks.length ? copy_blocks : [{ id: "delegate", label: "Delegate task", text: task.what }],
      brief_md,
      follow_up: task.if_failed,
    };
  }

  if (copy_blocks.length === 0) {
    copy_blocks.push({
      id: "task",
      label: "Your move",
      text: `${task.what}\n\nDone when: ${task.done_when}${task.deliverable ? `\n\nDeliverable: ${task.deliverable}` : ""}`,
    });
  }

  return {
    copy_blocks,
    utm_template: input.task.inputs?.find((i) => i.label.toLowerCase().includes("utm"))?.value,
    follow_up: task.if_failed,
  };
}

export function freezeHumanExecutionAssets(input: {
  cadence: CmoOpsCadence;
  thesis: ChannelThesis;
  laneB?: LaneBWorkspace | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
}): CmoOpsCadence {
  const tasks = input.cadence.tasks.map((task) => {
    if (!task.human_execution_ref) return task;
    const asset = freezeHumanExecutionAsset({
      task,
      ref: task.human_execution_ref,
      thesis: input.thesis,
      laneB: input.laneB,
      distributionOperator: input.distributionOperator,
      influencerOperator: input.influencerOperator,
      delegateOperator: input.delegateOperator,
    });
    return { ...task, human_execution_asset: asset };
  });
  return { ...input.cadence, tasks };
}

export function resolveHumanExecutionRef(input: {
  task: CmoOpsTask;
  thesis: ChannelThesis;
  laneB?: LaneBWorkspace | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
}): HumanExecutionRef | null {
  if (input.task.owner !== "user" && input.task.owner !== "delegate") return null;

  const measure = isMeasureOpsTask(input.task);

  if (input.distributionOperator) {
    const slot = input.distributionOperator.slots.find(
      (s) =>
        s.linked_ops_task_id === input.task.id ||
        (measure && s.slot_kind === "measure" && !s.linked_ops_task_id),
    );
    if (slot) {
      return {
        source: "distribution",
        item_id: slot.id,
        proof_surface: "operator_modal",
        label: slot.slot_kind === "measure" ? "Distribution measure" : "Distribution slot",
      };
    }
  }

  if (input.influencerOperator) {
    const touch = input.influencerOperator.touches.find(
      (t) =>
        t.linked_ops_task_id === input.task.id ||
        (measure && t.pipeline_stage === "reporting" && !t.linked_ops_task_id),
    );
    if (touch) {
      return {
        source: "influencer",
        item_id: touch.id,
        proof_surface: "operator_modal",
        label: touch.target_name ?? "Influencer touch",
      };
    }
    if (measure) {
      const reporting = input.influencerOperator.touches.find(
        (t) => t.pipeline_stage === "live" || t.pipeline_stage === "reporting",
      );
      if (reporting) {
        return {
          source: "influencer",
          item_id: reporting.id,
          proof_surface: "operator_modal",
          label: reporting.target_name ?? "Influencer reporting",
        };
      }
    }
  }

  if (input.delegateOperator && input.task.owner === "delegate") {
    const rubric = input.delegateOperator.daily_rubrics[0];
    if (rubric) {
      return {
        source: "delegate",
        item_id: rubric.id,
        proof_surface: "operator_modal",
        label: `Delegate Day ${rubric.day_index}`,
      };
    }
  }

  if (input.laneB) {
    const linked = input.laneB.items.find((i) => i.linked_ops_task_id === input.task.id);
    if (linked) {
      return {
        source: "lane_b",
        item_id: linked.id,
        proof_surface: "lane_b_modal",
        export_kind:
          input.laneB.mode === "outreach_tracker" && !measure ? "outreach_csv" : undefined,
        label: linked.title,
      };
    }
    const candidates = input.laneB.items.filter((i) => {
      const itemMeasure = isMeasureLaneBItem(i.title, i.channel);
      return measure ? itemMeasure : !itemMeasure;
    });
    const unlinked = candidates.find((i) => !i.linked_ops_task_id);
    if (unlinked) {
      return {
        source: "lane_b",
        item_id: unlinked.id,
        proof_surface: "lane_b_modal",
        export_kind:
          input.laneB.mode === "outreach_tracker" && !measure ? "outreach_csv" : undefined,
        label: unlinked.title,
      };
    }
  }

  return {
    source: "lane_b",
    item_id: input.task.id,
    proof_surface: "ops_modal",
    label: input.task.what,
  };
}

export interface BindHumanCadenceResult {
  cadence: CmoOpsCadence;
  laneB?: LaneBWorkspace;
  distributionOperator?: DistributionOperatorWorkspace;
  influencerOperator?: InfluencerOperatorWorkspace;
  missingRefs: string[];
}

export function bindHumanExecutionForCadence(input: {
  cadence: CmoOpsCadence;
  thesis: ChannelThesis;
  laneB?: LaneBWorkspace | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
  strict?: boolean;
}): BindHumanCadenceResult {
  const missingRefs: string[] = [];
  let laneB = input.laneB ? { ...input.laneB, items: [...input.laneB.items] } : undefined;
  let distributionOperator = input.distributionOperator
    ? {
        ...input.distributionOperator,
        slots: input.distributionOperator.slots.map((s) => ({ ...s })),
      }
    : undefined;
  let influencerOperator = input.influencerOperator
    ? {
        ...input.influencerOperator,
        touches: input.influencerOperator.touches.map((t) => ({ ...t })),
      }
    : undefined;

  const tasks = input.cadence.tasks.map((task) => {
    if (task.owner !== "system") {
      const ref = resolveHumanExecutionRef({
        task,
        thesis: input.thesis,
        laneB,
        distributionOperator,
        influencerOperator,
        delegateOperator: input.delegateOperator,
      });
      if (!ref) {
        missingRefs.push(task.id);
        return task;
      }

      if (ref.source === "lane_b" && laneB && ref.item_id !== task.id) {
        laneB = {
          ...laneB,
          items: laneB.items.map((i) =>
            i.id === ref.item_id ? { ...i, linked_ops_task_id: task.id } : i,
          ),
        };
      }
      if (ref.source === "distribution" && distributionOperator) {
        distributionOperator = {
          ...distributionOperator,
          slots: distributionOperator.slots.map((s) =>
            s.id === ref.item_id ? { ...s, linked_ops_task_id: task.id } : s,
          ),
        };
      }
      if (ref.source === "influencer" && influencerOperator) {
        influencerOperator = {
          ...influencerOperator,
          touches: influencerOperator.touches.map((t) =>
            t.id === ref.item_id ? { ...t, linked_ops_task_id: task.id } : t,
          ),
        };
      }

      const kind = task.required_proof?.[0] ?? task.expected_proof_kind ?? inferExpectedProofKind(task.done_when);
      const asset = freezeHumanExecutionAsset({
        task,
        ref,
        thesis: input.thesis,
        laneB,
        distributionOperator,
        influencerOperator,
        delegateOperator: input.delegateOperator,
      });
      return {
        ...task,
        expected_proof_kind: kind,
        required_proof: task.required_proof ?? (kind ? [kind] : undefined),
        human_execution_ref: ref,
        human_execution_asset: asset,
      };
    }
    return task;
  });

  if (input.strict && missingRefs.length > 0) {
    throw new Error(`Human ops tasks missing execution ref: ${missingRefs.join(", ")}`);
  }

  return {
    cadence: { ...input.cadence, tasks },
    laneB,
    distributionOperator,
    influencerOperator,
    missingRefs,
  };
}

export function validateHumanTaskCoverage(cadence: CmoOpsCadence): {
  ok: boolean;
  missing: string[];
} {
  const missing = humanTasksFromCadence(cadence)
    .filter((t) => !t.human_execution_ref)
    .map((t) => t.id);
  return { ok: missing.length === 0, missing };
}

export function laneBLinkedOpsTaskIdsValid(
  cadence: CmoOpsCadence,
  laneB: LaneBWorkspace,
): { ok: boolean; invalid: string[] } {
  const taskIds = new Set(cadence.tasks.map((t) => t.id));
  const invalid = laneB.items
    .map((i) => i.linked_ops_task_id)
    .filter((id): id is string => Boolean(id))
    .filter((id) => !taskIds.has(id));
  return { ok: invalid.length === 0, invalid: [...new Set(invalid)] };
}
