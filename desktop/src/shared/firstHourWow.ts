import { inferIntegrateRoute } from "./assetTarget";
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import { extractCodeCitations } from "./codeCitation";
import type { ConversationIntent } from "./conversationIntent";
import { executableActionToIntent } from "./executableAction";
import type { LaneAExecutionMode } from "./cmoLaneA";
import type { TurnReceipt } from "./turnReceipt";
import type { ProjectProfile } from "./types";

export interface FirstShipTarget {
  /** Best landing file for hero CTA / integrate edit. */
  heroPath?: string;
  /** Human label for monorepo app root, e.g. `apps/console`. */
  appRootLabel?: string;
  /** One-line stack summary for reveal. */
  stackLine: string;
  /** Edit goal with @mention for ContextPack pinning. */
  editGoal: string;
  /** Scout ask — grounded answer with path:line citations before edit. */
  scoutPrompt: string;
}

export type FirstHourActionMode = LaneAExecutionMode;

export interface ThesisFirstAction {
  thesisId: ChannelThesisId;
  mode: FirstHourActionMode;
  /** When true, Week 0 starts with scout ask → auto-handoff (landing/thesis paths). */
  useScoutFirst: boolean;
  primaryLabel: string;
  primaryDescription: string;
  estimatedMinutes: number;
  deliverable: string;
  runGoal: string;
  scoutPrompt: string;
  skills: string[];
  /** One-line anti-pattern the CMO rejects for this thesis. */
  antiPatternRed: string;
  /** Stable execution_mode for eval matrix. */
  executionMode: FirstHourActionMode;
}

const FIRST_HOUR_THESIS_SKILLS: Record<ChannelThesisId, string[]> = {
  viral_short_form: ["short-form-video", "launch-asset-generator", "landing-page-conversion"],
  founder_social: ["twitter-x-founder-gtm", "linkedin-founder-gtm", "landing-page-conversion"],
  product_hunt_launch: ["ph_launch", "launch-planning", "launch-asset-generator"],
  landing_conversion: ["landing-page-conversion", "seo-content-engine", "analytics-measurement"],
  seo_content: ["seo-content-engine", "product-intelligence", "analytics-measurement"],
  outbound_sales: ["lead-research", "outreach-drafting", "landing-page-conversion"],
  community_launch: ["community-launch", "devrel-open-source-launch", "launch-asset-generator"],
  influencer_partnerships: [
    "influencer-partnerships",
    "outreach-drafting",
    "launch-asset-generator",
  ],
};

const THESIS_ANTI_PATTERN: Record<ChannelThesisId, string> = {
  viral_short_form: "Not hero meta alone — distribution hooks and posting cadence first.",
  founder_social: "Not generic brand ads — founder posts with repo proof.",
  product_hunt_launch: "Not long SEO campaigns — coordinated launch runbook this week.",
  landing_conversion: "Not broad brand campaigns — one sharp hero CTA + tracking.",
  seo_content: "Not viral short-form as primary — technical SEO baseline first.",
  outbound_sales: "Not Product Hunt — ICP research and outbound sequences.",
  community_launch: "Not enterprise outbound — community launch post + setup guide.",
  influencer_partnerships: "Not mass market influencer spend — pitch templates first.",
};

function skillsForThesisFirstHour(thesisId: ChannelThesisId, mode: FirstHourActionMode): string[] {
  const base = FIRST_HOUR_THESIS_SKILLS[thesisId] ?? ["product-intelligence", "landing-page-conversion"];
  if (mode === "content_draft") {
    return ["launch-asset-generator", ...base.filter((s) => s !== "launch-asset-generator")].slice(
      0,
      3,
    );
  }
  if (mode === "browser_research") {
    return ["product-intelligence", ...base.filter((s) => s !== "landing-page-conversion")].slice(
      0,
      3,
    );
  }
  return ["landing-page-conversion", "seo-content-engine", ...base].slice(0, 3);
}

function productName(project: ProjectProfile): string {
  return project.name?.trim() || "this product";
}

function buildLandingGoals(_project: ProjectProfile, heroPath?: string): {
  editGoal: string;
  scoutPrompt: string;
} {
  const editGoal = heroPath
    ? `Improve hero CTA, meta title/description, and above-the-fold conversion copy in @${heroPath}. Propose one concrete patch.`
    : "Improve landing page hero CTA, meta tags, and primary conversion copy in the repo. Propose one concrete patch.";
  const scoutPrompt = heroPath
    ? `Review the hero CTA, meta title/description, and conversion copy in @${heroPath}. What is the single highest-impact change? Cite path:line from the repo and propose one executable edit.`
    : "Review the landing page hero CTA and conversion copy in this repo. What is the single highest-impact change? Cite path:line and propose one executable edit.";
  return { editGoal, scoutPrompt };
}

/** Faz 1 — thesis-aware Week 0 first action (single recommended path per channel). */
export function resolveThesisFirstAction(
  thesisId: ChannelThesisId,
  project: ProjectProfile,
): ThesisFirstAction {
  const heroPath = inferIntegrateRoute((project.routes ?? []).map((r) => r.replace(/\\/g, "/")));
  const name = productName(project);
  const landing = buildLandingGoals(project, heroPath);
  const antiPatternRed = THESIS_ANTI_PATTERN[thesisId];

  switch (thesisId) {
    case "viral_short_form": {
      const runGoal = `Create 5 short-form hook scripts for ${name} in marketing/hooks/ (3 angles × variants). Each hook: opening line, tension, product tie-in, CTA. Save as markdown files — do not auto-commit.`;
      return {
        thesisId,
        mode: "content_draft",
        useScoutFirst: false,
        primaryLabel: "Prepare hook scripts + posting cadence",
        primaryDescription: "20 hook scripts and Week 1 posting rhythm — not hero meta alone.",
        estimatedMinutes: 20,
        deliverable: "5 hook scripts in marketing/hooks/",
        runGoal,
        scoutPrompt: runGoal,
        skills: skillsForThesisFirstHour(thesisId, "content_draft"),
        antiPatternRed,
        executionMode: "content_draft",
      };
    }
    case "founder_social": {
      const runGoal = `Draft 3 founder LinkedIn posts + 1 X thread for ${name} under marketing/founder-social/. Problem → insight → product tie-in. Include hooks and CTAs. Save files in worktree — do not auto-commit.`;
      return {
        thesisId,
        mode: "content_draft",
        useScoutFirst: false,
        primaryLabel: "Draft founder posts + thread",
        primaryDescription: "3 LinkedIn posts + 1 thread ready to publish — dev credibility first.",
        estimatedMinutes: 25,
        deliverable: "3 LinkedIn posts + 1 thread in marketing/",
        runGoal,
        scoutPrompt: runGoal,
        skills: skillsForThesisFirstHour(thesisId, "content_draft"),
        antiPatternRed,
        executionMode: "content_draft",
      };
    }
    case "product_hunt_launch": {
      const runGoal = `Create Product Hunt launch assets for ${name}: gallery copy, maker comment draft, supporter DM templates, and T-7 checklist in marketing/ph-launch/. Save structured markdown — do not auto-commit.`;
      return {
        thesisId,
        mode: "content_draft",
        useScoutFirst: false,
        primaryLabel: "Build PH launch pack + T-7 checklist",
        primaryDescription: "Gallery, maker comment, supporter DMs — hour-by-hour launch prep.",
        estimatedMinutes: 35,
        deliverable: "PH assets + launch checklist in marketing/",
        runGoal,
        scoutPrompt: runGoal,
        skills: skillsForThesisFirstHour(thesisId, "content_draft"),
        antiPatternRed,
        executionMode: "content_draft",
      };
    }
    case "landing_conversion": {
      return {
        thesisId,
        mode: heroPath ? "scout_then_edit" : "repo_edit",
        useScoutFirst: Boolean(heroPath),
        primaryLabel: heroPath ? "Ship hero CTA + tracking" : "Ship landing conversion patch",
        primaryDescription: "Hero CTA, meta, and conversion events — measurable destination first.",
        estimatedMinutes: 15,
        deliverable: heroPath ? `Hero + meta patch in @${heroPath}` : "Landing conversion patch in repo",
        runGoal: landing.editGoal,
        scoutPrompt: landing.scoutPrompt,
        skills: skillsForThesisFirstHour(thesisId, "repo_edit"),
        antiPatternRed,
        executionMode: heroPath ? "scout_then_edit" : "repo_edit",
      };
    }
    case "seo_content": {
      const runGoal = heroPath
        ? `Ship technical SEO baseline for ${name} in @${heroPath} and layout: meta, canonical hints, sitemap note if applicable. One concrete patch.`
        : `Ship technical SEO baseline for ${name}: meta tags, schema hints, internal link note. One concrete patch.`;
      return {
        thesisId,
        mode: "repo_edit",
        useScoutFirst: Boolean(heroPath),
        primaryLabel: "Ship technical SEO baseline",
        primaryDescription: "Meta, schema, sitemap foundation — not viral plays this week.",
        estimatedMinutes: 20,
        deliverable: "Technical SEO patch in repo",
        runGoal,
        scoutPrompt: heroPath
          ? `Audit technical SEO for @${heroPath}. Cite path:line and propose one patch for meta/schema.`
          : runGoal,
        skills: skillsForThesisFirstHour(thesisId, "repo_edit"),
        antiPatternRed,
        executionMode: "repo_edit",
      };
    }
    case "outbound_sales": {
      const runGoal = `For ${name}: define ICP criteria, draft 3 personalized cold outreach emails, and create marketing/outreach/icp-export.csv template with 10 example rows (name, company, role, email placeholder). Save under marketing/outreach/ — do not auto-commit.`;
      return {
        thesisId,
        mode: "content_draft",
        useScoutFirst: false,
        primaryLabel: "Build ICP list + outreach drafts",
        primaryDescription: "ICP CSV template + 3 emails — you send from your email tool.",
        estimatedMinutes: 30,
        deliverable: "ICP CSV + 3 outreach emails in marketing/outreach/",
        runGoal,
        scoutPrompt: runGoal,
        skills: skillsForThesisFirstHour(thesisId, "content_draft"),
        antiPatternRed,
        executionMode: "content_draft",
      };
    }
    case "community_launch": {
      const runGoal = `Create community launch pack for ${name}: launch announcement post, Discord/setup guide, and 3 engagement prompts in marketing/community/. Save markdown files — do not auto-commit.`;
      return {
        thesisId,
        mode: "content_draft",
        useScoutFirst: false,
        primaryLabel: "Prepare community launch post + guide",
        primaryDescription: "Launch post + Discord/setup guide — community-first distribution.",
        estimatedMinutes: 25,
        deliverable: "Launch post + setup guide in marketing/community/",
        runGoal,
        scoutPrompt: runGoal,
        skills: skillsForThesisFirstHour(thesisId, "content_draft"),
        antiPatternRed,
        executionMode: "content_draft",
      };
    }
    case "influencer_partnerships": {
      const runGoal = `Create 5 influencer pitch templates for ${name} in marketing/influencer/pitches.md — personalized openers, value prop, tracking link placeholder, and follow-up. Save in worktree — do not auto-commit.`;
      return {
        thesisId,
        mode: "content_draft",
        useScoutFirst: false,
        primaryLabel: "Draft 5 influencer pitch templates",
        primaryDescription: "Pitch scaffolds with tracking placeholders — reply-first outreach.",
        estimatedMinutes: 20,
        deliverable: "5 pitch templates in marketing/influencer/",
        runGoal,
        scoutPrompt: runGoal,
        skills: skillsForThesisFirstHour(thesisId, "content_draft"),
        antiPatternRed,
        executionMode: "content_draft",
      };
    }
    default: {
      const id = thesisId as ChannelThesisId;
      return {
        thesisId: id,
        mode: "repo_edit",
        useScoutFirst: Boolean(heroPath),
        primaryLabel: "Ship first marketing change",
        primaryDescription: landing.editGoal,
        estimatedMinutes: 15,
        deliverable: "One marketing patch in repo",
        runGoal: landing.editGoal,
        scoutPrompt: landing.scoutPrompt,
        skills: skillsForThesisFirstHour(id, "repo_edit"),
        antiPatternRed: THESIS_ANTI_PATTERN.landing_conversion,
        executionMode: "repo_edit",
      };
    }
  }
}

/** Resolve Week 0 action — thesis-aware when channel thesis exists, else hero landing default. */
export function resolveWeek0FirstAction(
  project: ProjectProfile,
  thesis?: ChannelThesis | null,
): ThesisFirstAction {
  if (thesis?.id) return resolveThesisFirstAction(thesis.id, project);
  const target = resolveFirstShipTarget(project);
  return {
    thesisId: "landing_conversion",
    mode: target.heroPath ? "scout_then_edit" : "repo_edit",
    useScoutFirst: Boolean(target.heroPath),
    primaryLabel: "Ship hero CTA + meta",
    primaryDescription: "Improve landing hero, meta, and conversion copy in repo.",
    estimatedMinutes: 15,
    deliverable: target.heroPath ? `Patch in @${target.heroPath}` : "Landing patch in repo",
    runGoal: target.editGoal,
    scoutPrompt: target.scoutPrompt,
    skills: skillsForThesisFirstHour("landing_conversion", "repo_edit"),
    antiPatternRed: THESIS_ANTI_PATTERN.landing_conversion,
    executionMode: target.heroPath ? "scout_then_edit" : "repo_edit",
  };
}

export interface YourGameBeat {
  thesisLabel: string;
  whyLine: string;
  antiPatternRed: string;
  week0Label: string;
  week0Description: string;
  estimatedMinutes: number;
}

/** Intelligence reveal — "Your growth game" beat copy. */
export function buildYourGameBeat(
  thesis: ChannelThesis,
  project: ProjectProfile,
): YourGameBeat {
  const action = resolveThesisFirstAction(thesis.id, project);
  return {
    thesisLabel: thesis.title,
    whyLine: thesis.headline,
    antiPatternRed: action.antiPatternRed,
    week0Label: action.primaryLabel,
    week0Description: action.primaryDescription,
    estimatedMinutes: action.estimatedMinutes,
  };
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Primary app package inside a monorepo (prefers `apps/*`). */
export function resolveAppRootLabel(project: ProjectProfile): string | undefined {
  if (project.monorepoRoot) return project.monorepoRoot;
  const apps = (project.appPackages ?? []).map(normalizePath);
  const preferred = apps.find((p) => /^apps\//i.test(p));
  return preferred ?? apps[0];
}

export function resolveFirstShipTarget(project: ProjectProfile): FirstShipTarget {
  const routes = (project.routes ?? []).map(normalizePath);
  const heroPath = inferIntegrateRoute(routes);
  const appRoot = resolveAppRootLabel(project);
  const framework = project.framework ?? "Web app";

  const stackParts: string[] = [framework];
  if (appRoot) stackParts.push(`${appRoot} ✓`);
  const stackLine = stackParts.join(" · ");

  const { editGoal, scoutPrompt } = buildLandingGoals(project, heroPath);

  return { heroPath, appRootLabel: appRoot, stackLine, editGoal, scoutPrompt };
}

/** Hero route first; remaining routes follow scan order. */
export function orderRevealRoutes(project: ProjectProfile): { hero?: string; rest: string[] } {
  const routes = (project.routes ?? []).map(normalizePath);
  const hero = inferIntegrateRoute(routes);
  if (!hero) return { rest: routes };
  return { hero, rest: routes.filter((r) => r !== hero) };
}

export function isFirstHourEligible(firstShipAt?: number): boolean {
  return firstShipAt == null;
}

/** Brief pause so scout answer (citations) renders before edit run starts. */
export const FIRST_HOUR_AUTO_HANDOFF_DELAY_MS = 450;

const AUTO_HANDOFF_ACTION_KINDS = new Set(["edit_run", "integrate_site"]);

/**
 * After first-hour scout ask completes, derive the edit/integrate intent to auto-start.
 * Falls back to scan-derived hero edit when the answer is grounded but no action was emitted.
 */
export function resolveFirstHourAutoHandoff(input: {
  project: ProjectProfile;
  receipt: TurnReceipt;
  answerText?: string;
  thesis?: ChannelThesis | null;
}): ConversationIntent | null {
  const { project, receipt, answerText, thesis } = input;
  const action = receipt.primaryAction;
  if (action && AUTO_HANDOFF_ACTION_KINDS.has(action.kind)) {
    const intent = executableActionToIntent(action);
    if (intent) return intent;
  }

  const week0 = resolveWeek0FirstAction(project, thesis);
  if (week0.mode === "content_draft") {
    const hasAnswer = Boolean(answerText?.trim());
    const citedInAnswer = answerText ? extractCodeCitations(answerText).length > 0 : false;
    const citedInReceipt = (receipt.deliverables.citations?.length ?? 0) > 0;
    if (hasAnswer || citedInAnswer || citedInReceipt) {
      return { kind: "start_edit_run", goal: week0.runGoal };
    }
    return null;
  }

  const target = resolveFirstShipTarget(project);
  if (!target.heroPath && week0.mode !== "repo_edit") return null;

  const citedInAnswer = answerText ? extractCodeCitations(answerText).length > 0 : false;
  const citedInReceipt = (receipt.deliverables.citations?.length ?? 0) > 0;
  const hasAnswer = Boolean(answerText?.trim());

  if (!hasAnswer && !citedInAnswer && !citedInReceipt) return null;

  return { kind: "start_edit_run", goal: week0.runGoal };
}

/** Expected eval matrix: first action mode per thesis id. */
export const THESIS_FIRST_ACTION_MODE_EXPECTED: Record<
  ChannelThesisId,
  FirstHourActionMode
> = {
  viral_short_form: "content_draft",
  founder_social: "content_draft",
  product_hunt_launch: "content_draft",
  landing_conversion: "scout_then_edit",
  seo_content: "repo_edit",
  outbound_sales: "content_draft",
  community_launch: "content_draft",
  influencer_partnerships: "content_draft",
};
