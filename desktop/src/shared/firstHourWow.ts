import { inferIntegrateRoute } from "./assetTarget";
import { extractCodeCitations } from "./codeCitation";
import type { ConversationIntent } from "./conversationIntent";
import { executableActionToIntent } from "./executableAction";
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

  const editGoal = heroPath
    ? `Improve hero CTA, meta title/description, and above-the-fold conversion copy in @${heroPath}. Propose one concrete patch.`
    : "Improve landing page hero CTA, meta tags, and primary conversion copy in the repo. Propose one concrete patch.";

  const scoutPrompt = heroPath
    ? `Review the hero CTA, meta title/description, and conversion copy in @${heroPath}. What is the single highest-impact change? Cite path:line from the repo and propose one executable edit.`
    : "Review the landing page hero CTA and conversion copy in this repo. What is the single highest-impact change? Cite path:line and propose one executable edit.";

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
}): ConversationIntent | null {
  const { project, receipt, answerText } = input;
  const action = receipt.primaryAction;
  if (action && AUTO_HANDOFF_ACTION_KINDS.has(action.kind)) {
    const intent = executableActionToIntent(action);
    if (intent) return intent;
  }

  const target = resolveFirstShipTarget(project);
  if (!target.heroPath) return null;

  const citedInAnswer = answerText ? extractCodeCitations(answerText).length > 0 : false;
  const citedInReceipt = (receipt.deliverables.citations?.length ?? 0) > 0;
  const hasAnswer = Boolean(answerText?.trim());

  if (!hasAnswer && !citedInAnswer && !citedInReceipt) return null;

  return { kind: "start_edit_run", goal: target.editGoal };
}
