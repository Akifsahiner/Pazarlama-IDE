import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";
import type { ProjectProfile } from "../schemas/index.js";
import type { MarketingProfile } from "../schemas/marketingProfile.js";
import type { PlanStreamEvent } from "../schemas/index.js";
import {
  marketingPlanSuiteSchema,
  planPlaybookSchema,
  playbookStubSchema,
  readinessWithRationaleSchema,
  PLAN_OUTLINE_TOOL,
  PLAN_PLAYBOOK_TOOL,
  PLAN_READINESS_TOOL,
  PLAN_REVIEW_TOOL,
  PLAN_REVISION_TOOL,
  type MarketingPlanSuite,
  type PlanPlaybook,
  type PlaybookStub,
} from "../schemas/planPlaybooks.js";
import { withRetry } from "../llm/retry.js";
import { modelFor } from "./modelTier.js";
import { retrieveSkills, retrieveSkillsForPlaybook, renderSkillContext } from "./skillRetrieval.js";
import { isRegisteredTactic } from "./tacticRegistry.js";
import {
  outlineSystemPrompt,
  playbookDetailSystemPrompt,
  profileFromScan,
  readinessSystemPrompt,
  PLAYBOOK_CATALOG,
  type PlanContext,
} from "./planSuitePrompts.js";
import {
  applyPlanRevision,
  compactPlanForRevision,
  type PlanRevisionOps,
} from "./planRevision.js";
import { diffPlanVersions } from "./planDiff.js";
import {
  enrichReadinessRow,
  inferPrimaryPlaybookFromBottleneck,
  GENERIC_TASK_TITLE_RE,
  PH_MANIPULATION_RE,
  TACTIC_SNAKE_CASE_RE,
} from "./gtmCatalog.js";
import { inferBottleneckFromDecision } from "./bottleneck.js";
import { addMessageUsage, type TokenUsageSink } from "./tokenUsage.js";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

function slugify(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export interface GeneratePlanSuiteOpts {
  scanProfile: ProjectProfile;
  marketingProfile?: MarketingProfile | null;
  persona?: "marketing" | "sales";
  planHorizon?: 14 | 30;
  emit: (e: PlanStreamEvent) => void;
  signal?: AbortSignal;
  usageSink?: TokenUsageSink;
}

async function toolCall<T>(
  tier: "fast" | "main",
  system: string,
  userMessage: string,
  tool: Anthropic.Tool,
  signal?: AbortSignal,
  usageSink?: TokenUsageSink,
): Promise<T> {
  const choice = modelFor(tier, tier === "fast" ? "router" : "decision");
  return withRetry(
    async () => {
      const stream = client().messages.stream(
        {
          model: choice.model,
          max_tokens: choice.maxTokens,
          system,
          tools: [tool],
          tool_choice: { type: "tool", name: tool.name },
          messages: [{ role: "user", content: userMessage }],
        },
        { signal, timeout: env.LLM_TIMEOUT_MS },
      );
      const final = await stream.finalMessage();
      addMessageUsage(usageSink, final);
      const block = final.content.find((c) => c.type === "tool_use");
      if (!block || block.type !== "tool_use") throw new Error(`Missing tool: ${tool.name}`);
      return block.input as T;
    },
    { signal },
  );
}

function buildContentCalendar(playbooks: PlanPlaybook[]) {
  const items: MarketingPlanSuite["contentCalendar"] = [];
  for (const pb of playbooks) {
    for (const t of pb.tasks) {
      if (!/post|email|tweet|content|social|ad/i.test(`${t.title} ${t.deliverable ?? ""}`)) continue;
      const channel =
        pb.iconKey === "email"
          ? "Email"
          : pb.iconKey === "paid_ads"
            ? "Paid"
            : pb.iconKey === "content"
              ? "Social"
              : pb.iconKey === "product_hunt"
                ? "Product Hunt"
                : "Content";
      const type =
        channel === "Email"
          ? ("email" as const)
          : channel === "Paid"
            ? ("ad" as const)
            : channel === "Product Hunt"
              ? ("post" as const)
              : ("post" as const);
      items.push({ day: t.day, channel, title: t.title, type });
      if (items.length >= 20) return items;
    }
  }
  return items;
}

function attachPlaybookIds(playbook: PlanPlaybook, stub: PlaybookStub): PlanPlaybook {
  const tasks = playbook.tasks.map((t, i) => ({
    ...t,
    id: t.id.includes(stub.id) ? t.id : `${stub.id}-${i + 1}`,
    playbookId: stub.id,
  }));
  return {
    ...playbook,
    id: stub.id,
    slug: slugify(stub.id),
    title: stub.title,
    subtitle: stub.subtitle,
    phase: stub.phase,
    iconKey: stub.iconKey,
    sortOrder: stub.sortOrder,
    tasks,
  };
}

async function generatePlaybookDetail(
  ctx: PlanContext,
  stub: PlaybookStub,
  signal?: AbortSignal,
  revisionNotes?: string[],
  usageSink?: TokenUsageSink,
): Promise<PlanPlaybook> {
  const packs = await retrieveSkillsForPlaybook(stub.id, ctx.marketing);
  const skillContext = renderSkillContext(packs);
  const revision =
    revisionNotes?.length ? `\nFix these issues:\n${revisionNotes.map((n) => `- ${n}`).join("\n")}` : "";
  let raw = await toolCall<Record<string, unknown>>(
    "main",
    playbookDetailSystemPrompt(ctx, stub, skillContext) + revision,
    `Generate full detail for playbook "${stub.title}" (${stub.id}).`,
    {
      name: PLAN_PLAYBOOK_TOOL.name,
      description: PLAN_PLAYBOOK_TOOL.description,
      input_schema: PLAN_PLAYBOOK_TOOL.input_schema as unknown as Anthropic.Tool.InputSchema,
    },
    signal,
    usageSink,
  );
  for (let attempt = 0; attempt < 2; attempt++) {
    const tasks = raw.tasks;
    if (Array.isArray(tasks) && tasks.length >= 8) break;
    raw = await toolCall<Record<string, unknown>>(
      "main",
      playbookDetailSystemPrompt(ctx, stub, skillContext) + revision,
      `Return plan_playbook_detail with tasks: array of 8–15 items. Each task needs title, day, deliverable, acceptance_criteria, instructions_md (start with "Tactic: <id>"), execution_mode, tactic (registry id), phaseLabel.`,
      {
        name: PLAN_PLAYBOOK_TOOL.name,
        description: PLAN_PLAYBOOK_TOOL.description,
        input_schema: PLAN_PLAYBOOK_TOOL.input_schema as unknown as Anthropic.Tool.InputSchema,
      },
      signal,
      usageSink,
    );
  }
  const partial = planPlaybookSchema.parse({
    id: stub.id,
    slug: slugify(stub.id),
    title: stub.title,
    subtitle: stub.subtitle,
    phase: stub.phase,
    iconKey: stub.iconKey,
    sortOrder: stub.sortOrder,
    ...raw,
  });
  return attachPlaybookIds(partial, stub);
}

async function finalizePlaybookWithLint(
  ctx: PlanContext,
  stub: PlaybookStub,
  signal?: AbortSignal,
  usageSink?: TokenUsageSink,
  onStatus?: (msg: string) => void,
): Promise<PlanPlaybook> {
  let pb = await generatePlaybookDetail(ctx, stub, signal, undefined, usageSink);
  const productName = ctx.marketing.product_name || ctx.scan.name;
  let lintIssues = lintPlaybook(pb, productName);
  const reviewIssues =
    lintIssues.length === 0 ? await reviewPlaybook(ctx, pb, signal, usageSink) : [];
  lintIssues = [...lintIssues, ...reviewIssues];
  if (lintIssues.length > 0) {
    onStatus?.(`Strengthening ${stub.title}…`);
    pb = await generatePlaybookDetail(ctx, stub, signal, lintIssues, usageSink);
    const secondLint = lintPlaybook(pb, productName);
    if (secondLint.length > 0) {
      pb = await generatePlaybookDetail(ctx, stub, signal, secondLint, usageSink);
    }
  }
  return pb;
}

/** Generate full playbook detail for catalog stubs (skill injection + lint loop). */
export async function generatePlaybooksForStubIds(opts: {
  scanProfile: ProjectProfile;
  marketingProfile?: MarketingProfile | null;
  stubIds: string[];
  signal?: AbortSignal;
  usageSink?: TokenUsageSink;
  onStatus?: (msg: string) => void;
}): Promise<PlanPlaybook[]> {
  const ctx: PlanContext = {
    scan: opts.scanProfile,
    marketing: profileFromScan(opts.scanProfile, opts.marketingProfile),
    persona: "marketing",
    horizonDays: 14,
  };
  const playbooks: PlanPlaybook[] = [];
  for (let i = 0; i < opts.stubIds.length; i++) {
    const id = opts.stubIds[i]!;
    const entry = PLAYBOOK_CATALOG.find((p) => p.id === id);
    if (!entry) throw new Error(`Unknown playbook stub: ${id}`);
    const stub = playbookStubSchema.parse({
      id: entry.id,
      title: entry.title,
      subtitle: entry.subtitle,
      phase: entry.phase,
      iconKey: entry.iconKey,
      sortOrder: i,
      whyIncluded: `${entry.title} for ${ctx.marketing.product_name || ctx.scan.name} launch.`,
    });
    opts.onStatus?.(`Structuring ${stub.title}…`);
    playbooks.push(await finalizePlaybookWithLint(ctx, stub, opts.signal, opts.usageSink, opts.onStatus));
  }
  return playbooks;
}

export function lintPlaybook(pb: PlanPlaybook, productName: string): string[] {
  const issues: string[] = [];
  const blob = `${pb.executiveSummary} ${pb.tasks.map((t) => t.title).join(" ")}`.toLowerCase();
  const name = productName.trim().toLowerCase();
  if (name.length > 2 && !blob.includes(name)) {
    issues.push(`Must mention product name "${productName}"`);
  }
  if (pb.tasks.length < 8) issues.push(`Need 8–15 tasks (got ${pb.tasks.length}, minimum 8)`);
  if (pb.tasks.length > 15) issues.push(`Need 8–15 tasks (got ${pb.tasks.length}, maximum 15)`);
  const rich = pb.tasks.filter((t) => t.deliverable?.trim() && t.acceptance_criteria?.trim()).length;
  if (pb.tasks.length > 0 && rich / pb.tasks.length < 0.8) {
    issues.push("Add deliverable + acceptance_criteria to ≥80% of tasks");
  }
  if (/your product/i.test(pb.executiveSummary)) issues.push('Avoid generic "your product" phrasing');
  const withInstructions = pb.tasks.filter((t) => (t.instructions_md?.trim().length ?? 0) >= 80).length;
  if (pb.tasks.length > 0 && withInstructions / pb.tasks.length < 0.5) {
    issues.push("Add instructions_md (5–10 step checklist) to ≥50% of tasks");
  }
  const generic = pb.tasks.filter((t) => GENERIC_TASK_TITLE_RE.test(t.title));
  if (generic.length > 0) {
    issues.push("HARD: Replace generic task titles with channel-specific actions");
  }
  if (PH_MANIPULATION_RE.test(pb.executiveSummary)) {
    issues.push("Remove PH upvote manipulation language — ethical supporter comments only");
  }
  for (const t of pb.tasks) {
    if (PH_MANIPULATION_RE.test(`${t.title} ${t.instructions_md ?? ""}`)) {
      issues.push(`Task "${t.title}" must not suggest upvote farms or vote manipulation`);
    }
    if (t.tactic && !TACTIC_SNAKE_CASE_RE.test(t.tactic)) {
      issues.push(`Task "${t.title}" tactic must be snake_case (got "${t.tactic}")`);
    }
  }
  const withTactic = pb.tasks.filter((t) => t.tactic?.trim()).length;
  if (pb.id === "ph-number-one" || pb.id === "ph-launch") {
    const hasPhase = pb.tasks.some((t) => t.phaseLabel && /T-|H\+|D\+/i.test(t.phaseLabel));
    if (!hasPhase) issues.push("PH playbook needs launch timeline phaseLabel (T-7d, H+0, H+3)");
    const missingPhase = pb.tasks.filter((t) => !t.phaseLabel || !/T-|H\+|D\+/i.test(t.phaseLabel));
    if (missingPhase.length > 0) {
      issues.push("PH playbook: every task needs phaseLabel matching T-|H+|D+");
    }
    if (pb.tasks.length > 0 && withTactic / pb.tasks.length < 1) {
      issues.push("PH playbook requires tactic on 100% of tasks");
    }
  }
  if (pb.id === "community-launch") {
    const hasPhase = pb.tasks.some((t) => t.phaseLabel && /T-|H\+|D\+/i.test(t.phaseLabel));
    if (!hasPhase) issues.push("Community launch playbook needs phaseLabel (T-14, H0, H+48, D+1)");
    if (pb.tasks.length > 0 && withTactic / pb.tasks.length < 1) {
      issues.push("Community launch playbook requires tactic on 100% of tasks");
    }
  }
  if (pb.id === "seo-foundation" || pb.id === "seo-content-engine") {
    if (pb.tasks.length > 0 && withTactic / pb.tasks.length < 1) {
      issues.push("SEO content playbook requires tactic on 100% of tasks");
    }
  }
  if (pb.id === "email-nurture") {
    const hasPhase = pb.tasks.some((t) => t.phaseLabel && /T-|H\+|D\+/i.test(t.phaseLabel));
    if (!hasPhase) issues.push("Email nurture playbook needs phaseLabel (T-14, H+6, D+1)");
    if (pb.tasks.length > 0 && withTactic / pb.tasks.length < 1) {
      issues.push("Email nurture playbook requires tactic on 100% of tasks");
    }
  }
  const p1FullTactic = [
    "twitter-x-gtm",
    "newsletter-sponsorship",
    "press-pr-launch",
    "devrel-open-source-launch",
  ];
  if (p1FullTactic.includes(pb.id) && pb.tasks.length > 0 && withTactic / pb.tasks.length < 1) {
    issues.push(`${pb.id} requires tactic on 100% of tasks`);
  }
  // Skill Excellence: any declared tactic must be registered; instructions start with Tactic:
  for (const t of pb.tasks) {
    if (t.tactic?.trim()) {
      if (!isRegisteredTactic(t.tactic)) {
        issues.push(`Task "${t.title}" tactic "${t.tactic}" is not in tacticRegistry`);
      }
      const instr = t.instructions_md?.trim() ?? "";
      if (instr && !instr.toLowerCase().startsWith("tactic:")) {
        issues.push(`Task "${t.title}" instructions_md must start with "Tactic: ${t.tactic}"`);
      }
    }
  }
  const withMode = pb.tasks.filter((t) => t.execution_mode?.trim()).length;
  if (pb.tasks.length > 0 && withMode / pb.tasks.length < 0.8) {
    issues.push("Set execution_mode (repo|browser|asset|run|connector_read) on ≥80% of tasks");
  }
  if (pb.tasks.length > 0 && withTactic / pb.tasks.length < 0.7) {
    issues.push("Set tactic (snake_case) on ≥70% of tasks");
  }
  const browserPlaybooks = ["ph-number-one", "ph-launch", "community-launch", "seo-foundation", "twitter-x-gtm", "linkedin-gtm", "waitlist-hype", "newsletter-sponsorship", "press-pr-launch"];
  if (browserPlaybooks.includes(pb.id)) {
    const browserTasks = pb.tasks.filter((t) => t.execution_mode === "browser").length;
    if (browserTasks < 2) {
      issues.push(`${pb.id} needs ≥2 execution_mode:browser research tasks`);
    }
  }
  return issues;
}

async function reviewPlaybook(
  ctx: PlanContext,
  pb: PlanPlaybook,
  signal?: AbortSignal,
  usageSink?: TokenUsageSink,
): Promise<string[]> {
  const productName = ctx.marketing.product_name || ctx.scan.name;
  const summary = [
    `Product: ${productName}`,
    `Playbook: ${pb.title}`,
    `Summary: ${pb.executiveSummary.slice(0, 400)}`,
    `Tasks (${pb.tasks.length}): ${pb.tasks.map((t) => t.title).join("; ")}`,
  ].join("\n");
  try {
    const raw = await toolCall<{ approve?: boolean; mustFix?: string[] }>(
      "fast",
      `You review marketing playbooks for specificity. Flag generic copy and weak tasks.`,
      summary,
      {
        name: PLAN_REVIEW_TOOL.name,
        description: PLAN_REVIEW_TOOL.description,
        input_schema: PLAN_REVIEW_TOOL.input_schema as unknown as Anthropic.Tool.InputSchema,
      },
      signal,
      usageSink,
    );
    if (raw.approve) return [];
    return (raw.mustFix ?? []).filter((s) => s.length > 4);
  } catch {
    return [];
  }
}

function antiPatternsFromSkills(packs: Awaited<ReturnType<typeof retrieveSkills>>): string[] {
  const lines: string[] = [];
  for (const p of packs) {
    if (!p.antiPatterns.trim()) continue;
    for (const line of p.antiPatterns.split("\n")) {
      const t = line.replace(/^[-*•]\s*/, "").trim();
      if (t.length > 8) lines.push(t);
    }
  }
  return lines.slice(0, 10);
}

/** Multi-step plan generation: outline → playbooks → readiness → merge. */
export async function generatePlanSuite(opts: GeneratePlanSuiteOpts): Promise<MarketingPlanSuite> {
  const ctx: PlanContext = {
    scan: opts.scanProfile,
    marketing: profileFromScan(opts.scanProfile, opts.marketingProfile),
    persona: opts.persona ?? "marketing",
    horizonDays: opts.planHorizon ?? 30,
  };

  opts.emit({ type: "status", message: "Reading product profile" });

  const launchSkills = await retrieveSkills("launch_plan", ctx.marketing, 1);
  const skillAntiPatterns = antiPatternsFromSkills(launchSkills);

  let outlineRaw = await toolCall<Record<string, unknown>>(
    "fast",
    outlineSystemPrompt(ctx),
    "Produce the launch plan outline now.",
    {
      name: PLAN_OUTLINE_TOOL.name,
      description: PLAN_OUTLINE_TOOL.description,
      input_schema: PLAN_OUTLINE_TOOL.input_schema as unknown as Anthropic.Tool.InputSchema,
    },
    opts.signal,
    opts.usageSink,
  );

  for (let attempt = 0; attempt < 2; attempt++) {
    const pbs = outlineRaw.playbooks;
    if (Array.isArray(pbs) && pbs.length > 0) break;
    opts.emit({
      type: "status",
      message: "Revising outline — playbooks array required (4–7 catalog items)…",
    });
    outlineRaw = await toolCall<Record<string, unknown>>(
      "fast",
      outlineSystemPrompt(ctx),
      "Return plan_outline with a non-empty playbooks array (4–7 items). Each item needs id, title, subtitle, phase, iconKey, sortOrder, whyIncluded.",
      {
        name: PLAN_OUTLINE_TOOL.name,
        description: PLAN_OUTLINE_TOOL.description,
        input_schema: PLAN_OUTLINE_TOOL.input_schema as unknown as Anthropic.Tool.InputSchema,
      },
      opts.signal,
      opts.usageSink,
    );
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const stubTitles = ((outlineRaw.playbooks as unknown[]) ?? [])
      .map((s) => String((s as { title?: string }).title ?? ""))
      .filter((t) => GENERIC_TASK_TITLE_RE.test(t));
    if (stubTitles.length === 0) break;
    opts.emit({
      type: "status",
      message: `Revising outline — replace generic playbook titles (${stubTitles.length})…`,
    });
    outlineRaw = await toolCall<Record<string, unknown>>(
      "fast",
      `${outlineSystemPrompt(ctx)}\n\nANTI-PATTERNS (do not use generic titles):\n${skillAntiPatterns.join("\n")}`,
      `Revise outline. Replace generic titles: ${stubTitles.join("; ")}. Use channel-specific playbook names.`,
      {
        name: PLAN_OUTLINE_TOOL.name,
        description: PLAN_OUTLINE_TOOL.description,
        input_schema: PLAN_OUTLINE_TOOL.input_schema as unknown as Anthropic.Tool.InputSchema,
      },
      opts.signal,
      opts.usageSink,
    );
  }

  const thesis = String(outlineRaw.thesis ?? ctx.marketing.main_value_proposition);
  const narrativeHook = String(outlineRaw.narrativeHook ?? thesis);
  const positioning = String(outlineRaw.positioning ?? ctx.marketing.main_value_proposition);
  const icp =
    String(outlineRaw.icp ?? ctx.marketing.target_audience[0]?.persona ?? "Early adopters");
  const strategyNote = String(outlineRaw.strategyNote ?? narrativeHook);
  const antiPatterns = [
    ...new Set([
      ...(Array.isArray(outlineRaw.antiPatterns) ? (outlineRaw.antiPatterns as string[]) : []),
      ...skillAntiPatterns,
    ]),
  ];

  const stubs = ((outlineRaw.playbooks as unknown[]) ?? []).map((s, i) =>
    playbookStubSchema.parse({ sortOrder: i, ...(s as object) }),
  );
  if (stubs.length === 0) {
    throw new Error("Plan outline returned no playbooks after revision");
  }

  const stubIds = stubs.map((s) => s.id);
  const primaryBottleneckRaw = outlineRaw.primaryBottleneck as string | undefined;
  const primaryBottleneck =
    primaryBottleneckRaw &&
    ["awareness", "conversion", "distribution", "revenue", "measurement"].includes(primaryBottleneckRaw)
      ? (primaryBottleneckRaw as import("./bottleneck.js").GtmBottleneck)
      : inferBottleneckFromDecision(thesis);
  const primaryPlaybookId =
    (outlineRaw.primaryPlaybookId as string | undefined) ??
    inferPrimaryPlaybookFromBottleneck(primaryBottleneck, stubIds);
  const bottleneckWhy =
    (outlineRaw.bottleneckWhy as string | undefined) ??
    `Primary constraint is ${primaryBottleneck}. Focus ${primaryPlaybookId} before adding channels.`;

  opts.emit({
    type: "plan.outline",
    thesis,
    narrativeHook,
    playbooks: stubs,
    primaryBottleneck,
    primaryPlaybookId,
  });

  const playbooks: PlanPlaybook[] = [];
  const batchSize = 2;
  for (let i = 0; i < stubs.length; i += batchSize) {
    const batch = stubs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (stub, bi) => {
        const idx = i + bi;
        opts.emit({
          type: "status",
          message: `Structuring ${stub.title}…`,
        });
        let pb = await finalizePlaybookWithLint(ctx, stub, opts.signal, opts.usageSink, (msg) =>
          opts.emit({ type: "status", message: msg }),
        );
        opts.emit({ type: "plan.playbook", playbook: pb, index: idx, total: stubs.length });
        return pb;
      }),
    );
    playbooks.push(...results);
  }

  opts.emit({ type: "status", message: "Scoring launch readiness" });
  const readinessRaw = await toolCall<{ readiness: unknown[] }>(
    "fast",
    readinessSystemPrompt(ctx),
    "Score readiness dimensions.",
    {
      name: PLAN_READINESS_TOOL.name,
      description: PLAN_READINESS_TOOL.description,
      input_schema: PLAN_READINESS_TOOL.input_schema as unknown as Anthropic.Tool.InputSchema,
    },
    opts.signal,
    opts.usageSink,
  );
  const readiness = (readinessRaw.readiness ?? []).map((r) =>
    readinessWithRationaleSchema.parse(enrichReadinessRow(r as Parameters<typeof enrichReadinessRow>[0])),
  );
  opts.emit({ type: "plan.readiness", readiness });

  const taskGraph = playbooks.flatMap((pb) => pb.tasks);
  const suite = marketingPlanSuiteSchema.parse({
    schemaVersion: 2,
    id: randomUUID(),
    thesis,
    narrativeHook,
    primaryBottleneck,
    primaryPlaybookId,
    bottleneckWhy,
    positioning,
    icp,
    readiness,
    playbooks,
    taskGraph,
    contentCalendar: buildContentCalendar(playbooks),
    strategyNote,
    antiPatterns,
  });

  opts.emit({ type: "plan", plan: suite });
  return suite;
}

export interface RevisePlanSuiteOpts {
  currentPlan: MarketingPlanSuite;
  instruction: string;
  persona?: "marketing" | "sales";
  emit: (e: PlanStreamEvent) => void;
  signal?: AbortSignal;
  usageSink?: TokenUsageSink;
}

/** Chat-driven plan revision — append-only new version with diff (Faz 11). Anthropic only. */
export async function revisePlanSuite(opts: RevisePlanSuiteOpts): Promise<{
  plan: MarketingPlanSuite;
  diff: ReturnType<typeof diffPlanVersions>;
  sourcePlanId: string;
}> {
  const sourcePlanId = opts.currentPlan.id;
  opts.emit({ type: "status", message: "Revising launch plan…" });

  const system = `You revise an existing GTM launch plan based on user feedback.
Return concrete tasks and playbooks — do not regenerate the whole plan.
Keep existing playbooks unless the user asks to remove them.
New task ids must be unique snake_case. Days must fit the plan horizon.
Persona: ${opts.persona ?? "marketing"}.`;

  const userMessage = `${compactPlanForRevision(opts.currentPlan)}

USER REQUEST:
${opts.instruction}

Apply the smallest change set that satisfies the request. Prefer adding tasks to an existing social/content playbook when adding a channel.`;

  const raw = await toolCall<PlanRevisionOps>(
    "main",
    system,
    userMessage,
    {
      name: PLAN_REVISION_TOOL.name,
      description: PLAN_REVISION_TOOL.description,
      input_schema: PLAN_REVISION_TOOL.input_schema as unknown as Anthropic.Tool.InputSchema,
    },
    opts.signal,
    opts.usageSink,
  );

  const ops: PlanRevisionOps = {
    summary: String(raw.summary ?? "Plan updated"),
    strategyNoteAppend: raw.strategyNoteAppend,
    taskIdsToRemove: Array.isArray(raw.taskIdsToRemove) ? raw.taskIdsToRemove.map(String) : [],
    tasksToAdd: Array.isArray(raw.tasksToAdd) ? raw.tasksToAdd : [],
    newPlaybooks: Array.isArray(raw.newPlaybooks) ? raw.newPlaybooks : [],
    calendarItems: Array.isArray(raw.calendarItems) ? raw.calendarItems : undefined,
  };

  const revised = applyPlanRevision(opts.currentPlan, ops);
  const suite = marketingPlanSuiteSchema.parse(revised);
  const diff = diffPlanVersions(opts.currentPlan, suite, ops.summary);

  opts.emit({
    type: "plan.revision",
    summary: diff.summary,
    diff,
    sourcePlanId,
    plan: suite,
  });
  opts.emit({ type: "plan", plan: suite });
  return { plan: suite, diff, sourcePlanId };
}
