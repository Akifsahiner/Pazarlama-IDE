/** User-facing labels for offline vs AI plan modes — keep copy consistent app-wide. */

export const PLAN_PREVIEW_LABEL = "Preview outline";
export const PLAN_AI_LABEL = "Generate plan";

export const PLAN_PREVIEW_BADGE = "Outline preview";
export const PLAN_AI_BADGE = "AI launch plan";

/** Plan Studio heading — preview must not read like a finished AI plan. */
export const PLAN_PREVIEW_HEADING = "Launch outline preview";
export const PLAN_AI_HEADING = "30-day plan reference";

export function planPrimaryLabel(connected: boolean): string {
  return connected ? PLAN_AI_LABEL : PLAN_PREVIEW_LABEL;
}

export function planModeBadge(previewMode: boolean): string {
  return previewMode ? PLAN_PREVIEW_BADGE : PLAN_AI_BADGE;
}

export function planStudioHeading(previewMode: boolean): string {
  return previewMode ? PLAN_PREVIEW_HEADING : PLAN_AI_HEADING;
}
