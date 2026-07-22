/**
 * Faz 5 — build frozen HumanExecutionAsset from bind ref + workspace state.
 */
import type { ChannelThesis } from "./cmoIntake";
import type { DelegateOperatorWorkspace } from "./cmoDelegateOperator";
import { getNextDelegateRubricDay } from "./cmoDelegateOperator";
import type { DistributionHook, DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import type { LaneBItem, LaneBWorkspace } from "./cmoLaneB";
import { getNextLaneBItem, resolveCurrentRunbookStep } from "./cmoLaneB";
import type { CmoOpsCadence, CmoOpsTask } from "./cmoOpsCadence";
import type {
  HumanCopyBlock,
  HumanExecutionAsset,
  HumanExecutionAssetKind,
  HumanPlatformChecklistItem,
} from "./humanExecutionAsset";
import type { HumanExecutionRef } from "./humanExecutionPlan";
import { RUNBOOK_COPY_BLOCKS } from "./humanExecutionRunbookCopy";

export interface BuildHumanExecutionAssetInput {
  ref: HumanExecutionRef;
  task: CmoOpsTask;
  thesis: ChannelThesis;
  cadence?: CmoOpsCadence | null;
  laneB?: LaneBWorkspace | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
  projectName?: string;
  now?: string;
}

function block(id: string, label: string, body: string, platform?: string): HumanCopyBlock {
  return { id, label, body, platform };
}

function postKitChecklist(channel?: string): HumanPlatformChecklistItem[] {
  if (channel === "linkedin") {
    return [
      { id: "hook", label: "Strong first line before fold" },
      { id: "cta", label: "Soft CTA at end — no hard pitch" },
      { id: "engage", label: "Reply to first 5 comments within 30 min" },
    ];
  }
  if (channel === "email" || channel === "dm") {
    return [
      { id: "personalize", label: "Personalize opener with ICP detail" },
      { id: "cta", label: "Single clear CTA (reply or book)" },
      { id: "honesty", label: "Send from your own email/DM account" },
    ];
  }
  return [
    { id: "format", label: "Film vertical 9:16 (short-form)" },
    { id: "hook", label: "Hook in first 2 seconds" },
    { id: "cta", label: "Primary CTA visible in caption or pin" },
  ];
}

function platformLinks(platform?: string): { label: string; url: string }[] {
  switch (platform) {
    case "short-form":
    case "tiktok":
      return [{ label: "Open TikTok upload", url: "https://www.tiktok.com/upload" }];
    case "linkedin":
      return [{ label: "Open LinkedIn compose", url: "https://www.linkedin.com/feed/" }];
    case "email":
      return [{ label: "Open email client", url: "mailto:" }];
    default:
      return [];
  }
}

function computeKillSuggestion(
  dist: DistributionOperatorWorkspace,
  hook: DistributionHook | undefined,
): HumanExecutionAsset["kill_suggestion"] {
  if (!hook) return undefined;
  const measured = dist.slots.filter(
    (s) =>
      s.hook_id === hook.id &&
      s.slot_kind === "post" &&
      s.proof?.retention_3s_pct != null,
  );
  if (measured.length < 3) return undefined;
  const allLow = measured.every((s) => (s.proof!.retention_3s_pct ?? 0) < 20);
  if (!allLow) return undefined;
  return {
    headline: `Kill ${hook.label} — rewrite hook`,
    detail: "3 posts all below 20% 3s retention. Write a new formula — don't tweak music only.",
  };
}

function buildFromDistributionSlot(input: BuildHumanExecutionAssetInput): HumanExecutionAsset {
  const dist = input.distributionOperator!;
  const slot = dist.slots.find((s) => s.id === input.ref.item_id);
  const hook = dist.hooks.find((h) => h.id === slot?.hook_id) ?? dist.hooks[0];
  const hookGridCount = dist.slots.filter((s) => s.slot_kind === "post").length;
  const copyBlocks: HumanCopyBlock[] = [];
  if (hook) {
    copyBlocks.push(
      block("script", "Hook script", hook.script_hint, slot?.platform ?? "short-form"),
    );
  }
  copyBlocks.push(
    block("pin", "Pin comment", `Pin: "${input.projectName ?? "Product"} — link in bio"`, slot?.platform),
  );
  return {
    id: `asset.${input.ref.item_id}`,
    kind: "distribution_slot",
    title: hook ? `Post Kit: ${hook.label} — ${slot?.platform ?? "short-form"}` : "Post Kit",
    copy_blocks: copyBlocks,
    success_criteria: {
      retention_3s_target: hook?.retention_target_3s ?? 40,
      views_24h_target: 500,
      utm: `?utm_source=${slot?.platform ?? "short_form"}&utm_campaign=w1`,
    },
    platform_checklist: postKitChecklist(slot?.platform ?? "short-form"),
    platform_deep_links: platformLinks(slot?.platform ?? "short-form"),
    honesty_note: "You post manually — we never auto-post to social.",
    frozen_at: input.now ?? new Date().toISOString(),
    source_ref: input.ref,
    hook_grid_count: hookGridCount,
    kill_suggestion: computeKillSuggestion(dist, hook),
  };
}

function buildFromInfluencerTouch(input: BuildHumanExecutionAssetInput): HumanExecutionAsset {
  const inf = input.influencerOperator!;
  const touch = inf.touches.find((t) => t.id === input.ref.item_id);
  const pitch = inf.pitches.find((p) => p.id === touch?.pitch_id) ?? inf.pitches[0];
  const copyBlocks: HumanCopyBlock[] = [];
  if (pitch) {
    copyBlocks.push(
      block(
        "pitch",
        `${pitch.label} DM`,
        pitch.script_scaffold.replace("[creator]", touch?.target_handle ?? "[handle]"),
        touch?.platform ?? "dm",
      ),
    );
  }
  return {
    id: `asset.${input.ref.item_id}`,
    kind: "outreach_pack",
    title: touch ? `Outreach: ${touch.target_name}` : "Influencer outreach kit",
    copy_blocks: copyBlocks,
    success_criteria: { utm: touch?.deal?.utm_link ?? "?utm_source=influencer&utm_campaign=w1" },
    platform_checklist: [
      { id: "research", label: "Confirm ICP fit" },
      { id: "send", label: "Send from your account — no auto-DM" },
      { id: "thread", label: "Save thread URL for proof" },
    ],
    honesty_note: "You send DMs from your account — we prepare copy only.",
    frozen_at: input.now ?? new Date().toISOString(),
    source_ref: input.ref,
  };
}

function buildFromDelegateRubric(input: BuildHumanExecutionAssetInput): HumanExecutionAsset {
  const del = input.delegateOperator!;
  const rubric =
    del.daily_rubrics.find((r) => r.id === input.ref.item_id) ??
    getNextDelegateRubricDay(del, input.cadence?.day_index ?? 1);
  const copyBlocks: HumanCopyBlock[] =
    rubric?.checklist.map((c) => block(`rubric-${c.id}`, c.label, c.required ? "(required)" : "")) ?? [];
  return {
    id: `asset.${input.ref.item_id}`,
    kind: "delegate_rubric",
    title: rubric ? `Delegate rubric — Day ${rubric.day_index}` : "Delegate rubric",
    copy_blocks: copyBlocks,
    platform_checklist: rubric?.checklist.map((c) => ({ id: c.id, label: c.label })) ?? [],
    honesty_note: "Delegate executes — you review rubric proof before promote/release.",
    frozen_at: input.now ?? new Date().toISOString(),
    source_ref: input.ref,
  };
}

function buildLaunchRunbookAsset(
  input: BuildHumanExecutionAssetInput,
  item: LaneBItem,
): HumanExecutionAsset {
  const offset = item.runbook_offset ?? "T-0";
  const current = resolveCurrentRunbookStep(input.laneB!);
  return {
    id: `asset.${input.ref.item_id}`,
    kind: "launch_runbook",
    title: current?.id === item.id ? `Launch now: ${item.title}` : `Runbook: ${offset}`,
    copy_blocks: [
      block("step", item.title, item.detail ?? item.title, "ph"),
      ...(RUNBOOK_COPY_BLOCKS[offset] ?? []),
    ],
    platform_checklist: [
      { id: "review", label: "Review copy before posting" },
      { id: "timing", label: `Execute at ${offset}` },
    ],
    platform_deep_links: [{ label: "Product Hunt maker page", url: "https://www.producthunt.com/posts/new" }],
    honesty_note: "You post manually on launch day.",
    frozen_at: input.now ?? new Date().toISOString(),
    source_ref: input.ref,
  };
}

function buildOutreachPackAsset(
  input: BuildHumanExecutionAssetInput,
  item: LaneBItem,
): HumanExecutionAsset {
  const copyBlocks: HumanCopyBlock[] = [
    block("icp", "ICP one-liner", input.thesis.headline ?? input.task.what),
    block(
      "email-1",
      "Email 1",
      `Hi {{first_name}},\n\nI noticed [signal]. We built ${input.projectName ?? "a tool"} that [value]. Worth a look?\n\n— [You]`,
      "email",
    ),
  ];
  return {
    id: `asset.${input.ref.item_id}`,
    kind: "outreach_pack",
    title: `Outreach pack — ${item.title}`,
    copy_blocks: copyBlocks,
    success_criteria: { utm: "?utm_source=outbound&utm_campaign=w1" },
    platform_checklist: postKitChecklist("email"),
    honesty_note: "You send from your email tool — we never auto-send.",
    frozen_at: input.now ?? new Date().toISOString(),
    source_ref: input.ref,
  };
}

function buildPostingCalendarAsset(
  input: BuildHumanExecutionAssetInput,
  item: LaneBItem,
): HumanExecutionAsset {
  return {
    id: `asset.${input.ref.item_id}`,
    kind: "post_kit",
    title: `Post Kit: ${item.title}`,
    copy_blocks: [block("task", item.title, item.detail ?? input.task.what, item.channel)],
    success_criteria: { views_24h_target: 500, utm: `?utm_source=${item.channel ?? "social"}&utm_campaign=w1` },
    platform_checklist: postKitChecklist(item.channel),
    platform_deep_links: platformLinks(item.channel),
    honesty_note: "You post manually — we never auto-post to social.",
    frozen_at: input.now ?? new Date().toISOString(),
    source_ref: input.ref,
  };
}

function fallbackAsset(
  input: BuildHumanExecutionAssetInput,
  kind: HumanExecutionAssetKind,
  title: string,
): HumanExecutionAsset {
  return {
    id: `asset.${input.ref.item_id}`,
    kind,
    title,
    copy_blocks: [block("task", input.task.what, input.task.why)],
    platform_checklist: [{ id: "proof", label: "Log URL or note when done" }],
    frozen_at: input.now ?? new Date().toISOString(),
    source_ref: input.ref,
  };
}

function buildFromLaneBItem(input: BuildHumanExecutionAssetInput): HumanExecutionAsset {
  const laneB = input.laneB!;
  const item = laneB.items.find((i) => i.id === input.ref.item_id) ?? getNextLaneBItem(laneB);
  if (!item) return fallbackAsset(input, "post_kit", "Lane B task");
  if (laneB.mode === "launch_runbook") return buildLaunchRunbookAsset(input, item);
  if (laneB.mode === "outreach_tracker") return buildOutreachPackAsset(input, item);
  return buildPostingCalendarAsset(input, item);
}

export function buildHumanExecutionAsset(input: BuildHumanExecutionAssetInput): HumanExecutionAsset {
  switch (input.ref.source) {
    case "distribution":
      if (input.distributionOperator) return buildFromDistributionSlot(input);
      break;
    case "influencer":
      if (input.influencerOperator) return buildFromInfluencerTouch(input);
      break;
    case "delegate":
      if (input.delegateOperator) return buildFromDelegateRubric(input);
      break;
    case "lane_b":
      if (input.laneB) return buildFromLaneBItem(input);
      break;
  }
  return fallbackAsset(input, "post_kit", input.ref.label ?? input.task.what);
}

export function assetCopyAllText(asset: HumanExecutionAsset): string {
  const parts: string[] = [asset.title, ""];
  for (const b of asset.copy_blocks) {
    parts.push(`## ${b.label}`, b.body, "");
  }
  if (asset.success_criteria?.utm) parts.push(`UTM: ${asset.success_criteria.utm}`);
  for (const c of asset.platform_checklist) parts.push(`☐ ${c.label}`);
  if (asset.honesty_note) parts.push("", asset.honesty_note);
  return parts.join("\n");
}

export function resolveHumanExecutionAssetForTask(
  task: CmoOpsTask,
  input: Omit<BuildHumanExecutionAssetInput, "task" | "ref"> & { ref: HumanExecutionRef },
): HumanExecutionAsset {
  if (task.human_execution_asset?.source_ref.item_id === input.ref.item_id) {
    return task.human_execution_asset;
  }
  return buildHumanExecutionAsset({ ...input, task, ref: input.ref });
}
