/** One-line value proposition per persona — keep in sync with NextActionBar and Help. */

export type Persona = "marketing" | "sales";

export interface PersonaValueProp {
  /** Short label for eyebrows / badges */
  eyebrow: string;
  /** Primary promise (one sentence) */
  promise: string;
  /** One-line honesty boundary — what we do not auto-do */
  honestyNote: string;
  /** Expanded reason for next-action bar */
  reason: string;
  /** Offline / preview plan title on Home */
  offlinePlanTitle: string;
  /** Connected first-move title on Home */
  firstMoveTitle: string;
  /** No-plan CTA when connected */
  planTitle: string;
  /** Assets empty state primary */
  assetDraftLabel: string;
}

export const PERSONA_VALUE: Record<Persona, PersonaValueProp> = {
  marketing: {
    eyebrow: "Marketing",
    promise: "Scan your repo, build a 30-day launch plan, and ship copy and diffs you can apply.",
    honestyNote: "You approve every repo change; outreach and ads are drafts — you publish.",
    reason: "Audit landing, plan tasks, and marketing assets end-to-end in your repo.",
    offlinePlanTitle: "Preview launch outline",
    firstMoveTitle: "Prepare for launch",
    planTitle: "Generate your 30-day launch plan",
    assetDraftLabel: "Draft landing copy",
  },
  sales: {
    eyebrow: "Sales",
    promise: "Build your ICP and outreach drafts — you review and send.",
    honestyNote: "No bulk send from the app — export CSV and send from your email tool.",
    reason: "Research targets, draft sequences, export CSV — no bulk send from the app.",
    offlinePlanTitle: "Preview outbound outline",
    firstMoveTitle: "Build your ICP",
    planTitle: "Generate your outbound plan",
    assetDraftLabel: "Draft outreach email",
  },
};

export function personaValue(persona: Persona): PersonaValueProp {
  return PERSONA_VALUE[persona];
}
