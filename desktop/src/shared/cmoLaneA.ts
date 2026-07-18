/**
 * P6 — Lane A execution: thesis-aware IDE runs (repo edit, browser research, scout).
 * See CMO_LANE_A_SPEC.md and PRODUCT_NORTH_STAR.md §11 P6.
 */
import { inferIntegrateRoute } from "./assetTarget";
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import type { CmoOpsTask } from "./cmoOpsCadence";
import { resolveNarrativeContext, withNarrativePrefix } from "./cmoNarrativeContext";
import { resolveFirstShipTarget } from "./firstHourWow";
import type { Mention } from "./orchestration";
import type { GrowthNarrative, ProjectProfile } from "./types";

export type LaneAExecutionMode =
  | "repo_edit"
  | "browser_research"
  | "content_draft"
  | "scout_then_edit";

export type LaneAItemStatus = "pending" | "in_progress" | "done" | "skipped";

import type { BrowserEvidenceProof } from "./browserVerify";

export interface LaneAProof {
  commit_sha?: string;
  files_applied?: number;
  run_id?: string;
  completed_at: string;
  browser_evidence?: BrowserEvidenceProof;
}

export interface LaneAItem {
  id: string;
  mode: LaneAExecutionMode;
  title: string;
  detail?: string;
  status: LaneAItemStatus;
  linked_ops_task_id?: string;
  linked_run_id?: string;
  skills: string[];
  proof?: LaneAProof;
  sort_order: number;
}

export interface LaneAWorkspace {
  id: string;
  thesis_id: ChannelThesisId;
  ops_cadence_id?: string;
  started_at: string;
  items: LaneAItem[];
}

export interface LaneARunPlan {
  opsTaskId: string;
  laneAItemId?: string;
  mode: LaneAExecutionMode;
  goal: string;
  scoutPrompt?: string;
  skills: string[];
  mentions: Mention[];
  startUrl?: string;
}

const THESIS_SKILLS: Record<ChannelThesisId, string[]> = {
  viral_short_form: ["short-form-video", "launch-asset-generator", "landing-page-conversion"],
  founder_social: ["twitter-x-founder-gtm", "linkedin-founder-gtm", "landing-page-conversion"],
  product_hunt_launch: ["ph_launch", "launch-planning", "launch-asset-generator"],
  landing_conversion: ["landing-page-conversion", "analytics-measurement"],
  seo_content: ["seo-content-engine", "product-intelligence"],
  outbound_sales: ["lead-research", "outreach-drafting", "landing-page-conversion"],
  community_launch: ["community-launch", "devrel-open-source-launch"],
  influencer_partnerships: ["influencer-partnerships", "outreach-drafting"],
};

const BROWSER_RE =
  /\b(audit|competitor|serp|research|browse|scan site|homepage audit|live site|teardown)\b/i;
const DRAFT_RE =
  /\b(draft|script|copy pack|sequences|posts|marketing\/|hook scripts|thumbnail)\b/i;

export const FIRST_SHIP_SKILLS = ["landing-page-conversion", "seo-content-engine"] as const;

export function skillsForFirstShip(mode: LaneAExecutionMode): string[] {
  if (mode === "browser_research") {
    return ["product-intelligence", "landing-page-conversion"];
  }
  if (mode === "content_draft") {
    return ["launch-asset-generator", "landing-page-conversion"];
  }
  return [...FIRST_SHIP_SKILLS];
}

export function thesisSkillsForLaneA(
  thesisId: ChannelThesisId,
  mode: LaneAExecutionMode,
  opts?: { guaranteedShip?: boolean },
): string[] {
  if (opts?.guaranteedShip) return skillsForFirstShip(mode === "scout_then_edit" ? "repo_edit" : mode);
  const base = THESIS_SKILLS[thesisId] ?? ["product-intelligence", "landing-page-conversion"];
  if (mode === "browser_research") {
    return ["product-intelligence", ...base.filter((s) => s !== "landing-page-conversion")];
  }
  if (mode === "content_draft") {
    return [
      "launch-asset-generator",
      ...base.filter((s) => s !== "launch-asset-generator"),
    ].slice(0, 3);
  }
  return base.slice(0, 3);
}

export function inferLaneAExecutionMode(
  taskWhat: string,
  thesisId: ChannelThesisId,
): LaneAExecutionMode {
  if (BROWSER_RE.test(taskWhat)) return "browser_research";
  if (DRAFT_RE.test(taskWhat)) return "content_draft";
  if (thesisId === "seo_content" && /cluster|keyword|gsc/i.test(taskWhat)) {
    return "browser_research";
  }
  return "repo_edit";
}

function heroPath(project: ProjectProfile): string | undefined {
  return inferIntegrateRoute((project.routes ?? []).map((r) => r.replace(/\\/g, "/")));
}

function mentionsFromTask(taskWhat: string, project: ProjectProfile): Mention[] {
  const mentions: Mention[] = [];
  const atRe = /@([\w./-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = atRe.exec(taskWhat)) !== null) {
    mentions.push({ type: "file", path: m[1] });
  }
  const hp = heroPath(project);
  if (hp && !mentions.some((x) => x.path === hp)) {
    if (taskWhat.includes("@") || /landing|hero|cta|tracking|repo/i.test(taskWhat)) {
      mentions.push({ type: "file", path: hp });
    }
  }
  return mentions;
}

function enrichGoalForMode(
  task: Pick<CmoOpsTask, "what" | "why" | "done_when">,
  mode: LaneAExecutionMode,
  thesis: ChannelThesis,
): string {
  const parts = [task.what.trim()];
  if (mode === "content_draft") {
    parts.push(
      "Save deliverables under marketing/ with clear filenames. Do not auto-commit — propose files in worktree.",
    );
  }
  if (mode === "browser_research") {
    parts.push(
      "Use browser research; return structured findings with URLs and evidence — no fabricated metrics.",
    );
  }
  parts.push(`Done when: ${task.done_when}`);
  parts.push(`Channel thesis: ${thesis.title} — ${thesis.headline}`);
  return parts.join("\n\n");
}

/** Resolve how a system ops task should execute in Lane A. */
export function resolveLaneARunPlan(input: {
  task: Pick<CmoOpsTask, "id" | "what" | "why" | "done_when" | "owner" | "priority_index">;
  thesis: ChannelThesis;
  project: ProjectProfile;
  /** First system task on Week 1 — prefer scout→edit when hero exists. */
  preferScout?: boolean;
  /** Quick Start wedge — skip scout, cap skills, repo_edit only. */
  guaranteedShip?: boolean;
  laneAItemId?: string;
}): LaneARunPlan | null {
  if (input.task.owner !== "system") return null;

  let mode = inferLaneAExecutionMode(input.task.what, input.thesis.id);
  const hp = heroPath(input.project);
  const target = resolveFirstShipTarget(input.project);

  if (
    !input.guaranteedShip &&
    input.preferScout &&
    hp &&
    (mode === "repo_edit" || input.task.what.includes("@"))
  ) {
    mode = "scout_then_edit";
  }
  if (input.guaranteedShip) {
    mode = "repo_edit";
  }

  const skills = thesisSkillsForLaneA(input.thesis.id, mode, {
    guaranteedShip: input.guaranteedShip,
  });
  const mentions = mentionsFromTask(input.task.what, input.project);
  const goal = enrichGoalForMode(input.task, mode, input.thesis);

  return {
    opsTaskId: input.task.id,
    laneAItemId: input.laneAItemId,
    mode,
    goal,
    scoutPrompt: mode === "scout_then_edit" ? target.scoutPrompt : undefined,
    skills,
    mentions,
  };
}

export function createLaneAWorkspaceFromThesis(
  thesis: ChannelThesis,
  opts?: {
    opsCadence?: { id: string; tasks: CmoOpsTask[] };
    narrative?: GrowthNarrative;
    now?: string;
  },
): LaneAWorkspace {
  const systemTasks = (opts?.opsCadence?.tasks ?? []).filter((t) => t.owner === "system");
  const narrative = resolveNarrativeContext(opts?.narrative);
  const items: LaneAItem[] = [];

  thesis.lane_a.forEach((title, i) => {
    const linked = systemTasks[i];
    const mode = linked
      ? linked.execution_plan?.mode ?? inferLaneAExecutionMode(linked.what, thesis.id)
      : inferLaneAExecutionMode(title, thesis.id);
    items.push({
      id: `${thesis.id}.lanea.${i}`,
      mode,
      title,
      detail: withNarrativePrefix(linked?.what ?? title, narrative),
      status: "pending",
      linked_ops_task_id: linked?.id,
      skills: linked?.execution_plan?.skills ?? thesisSkillsForLaneA(thesis.id, mode),
      sort_order: i,
    });
  });

  for (const task of systemTasks) {
    if (items.some((it) => it.linked_ops_task_id === task.id)) continue;
    const mode =
      task.execution_plan?.mode ?? inferLaneAExecutionMode(task.what, thesis.id);
    items.push({
      id: `${thesis.id}.lanea.ops.${task.id}`,
      mode,
      title: task.what.slice(0, 120),
      detail: withNarrativePrefix(task.what, narrative),
      status: "pending",
      linked_ops_task_id: task.id,
      skills: task.execution_plan?.skills ?? thesisSkillsForLaneA(thesis.id, mode),
      sort_order: items.length,
    });
  }

  return {
    id: `lanea.${thesis.id}.${Date.now()}`,
    thesis_id: thesis.id,
    ops_cadence_id: opts?.opsCadence?.id,
    started_at: opts?.now ?? new Date().toISOString(),
    items,
  };
}

export function laneAProgress(workspace: LaneAWorkspace): {
  done: number;
  total: number;
  percent: number;
} {
  const total = workspace.items.length;
  const done = workspace.items.filter((i) => i.status === "done" || i.status === "skipped").length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function getLaneAItemForOpsTask(
  workspace: LaneAWorkspace,
  opsTaskId: string,
): LaneAItem | undefined {
  return workspace.items.find((i) => i.linked_ops_task_id === opsTaskId);
}

export function markLaneAItemInProgress(
  workspace: LaneAWorkspace,
  opsTaskId: string,
  runId?: string,
): LaneAWorkspace {
  return {
    ...workspace,
    items: workspace.items.map((i) =>
      i.linked_ops_task_id === opsTaskId
        ? {
            ...i,
            status: "in_progress" as const,
            linked_run_id: runId ?? i.linked_run_id,
          }
        : i,
    ),
  };
}

export function completeLaneAItemOnApply(
  workspace: LaneAWorkspace,
  opsTaskId: string,
  proof: {
    commit_sha?: string;
    files_applied?: number;
    run_id?: string;
    browser_evidence?: BrowserEvidenceProof;
  },
): LaneAWorkspace {
  const now = new Date().toISOString();
  return {
    ...workspace,
    items: workspace.items.map((i) =>
      i.linked_ops_task_id === opsTaskId
        ? {
            ...i,
            status: "done" as const,
            linked_run_id: proof.run_id ?? i.linked_run_id,
            proof: {
              commit_sha: proof.commit_sha,
              files_applied: proof.files_applied,
              run_id: proof.run_id,
              browser_evidence: proof.browser_evidence,
              completed_at: now,
            },
          }
        : i,
    ),
  };
}

export function laneAModeLabel(mode: LaneAExecutionMode): string {
  switch (mode) {
    case "repo_edit":
      return "Repo ship";
    case "browser_research":
      return "Browser research";
    case "content_draft":
      return "Draft assets";
    case "scout_then_edit":
      return "Scout → ship";
    default:
      return "IDE";
  }
}

export function hydrateLaneAWorkspaceFromJson(raw: unknown): LaneAWorkspace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.thesis_id !== "string") return null;
  const items = Array.isArray(o.items) ? o.items : [];
  return {
    id: o.id,
    thesis_id: o.thesis_id as ChannelThesisId,
    ops_cadence_id: typeof o.ops_cadence_id === "string" ? o.ops_cadence_id : undefined,
    started_at: typeof o.started_at === "string" ? o.started_at : new Date().toISOString(),
    items: items
      .filter((x) => x && typeof x === "object")
      .map((x, i) => {
        const it = x as Record<string, unknown>;
        return {
          id: String(it.id ?? `lanea.item.${i}`),
          mode: (it.mode as LaneAExecutionMode) ?? "repo_edit",
          title: String(it.title ?? ""),
          detail: typeof it.detail === "string" ? it.detail : undefined,
          status: (it.status as LaneAItemStatus) ?? "pending",
          linked_ops_task_id:
            typeof it.linked_ops_task_id === "string" ? it.linked_ops_task_id : undefined,
          linked_run_id: typeof it.linked_run_id === "string" ? it.linked_run_id : undefined,
          skills: Array.isArray(it.skills) ? it.skills.map(String) : [],
          proof: it.proof as LaneAProof | undefined,
          sort_order: typeof it.sort_order === "number" ? it.sort_order : i,
        };
      }),
  };
}
