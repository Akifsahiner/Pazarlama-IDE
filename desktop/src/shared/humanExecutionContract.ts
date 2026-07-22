/**
 * Lane B contract — we prepare, the founder publishes. Never auto-post.
 */
export const HUMAN_EXECUTION_CONTRACT = {
  headline: "You publish — we prepare",
  body:
    "Marketing IDE ships repo changes automatically (Lane A). Posts, DMs, ads, and outreach are prepared for you — you review and send. We never auto-post to social.",
  laneLabels: {
    system: "IDE ships in your repo",
    user: "You publish (script ready)",
    delegate: "Brief for hire",
  },
  expectation:
    "Expect drafts, scripts, and runbooks — not autopilot posting. That is how a real CMO works with a founder.",
} as const;

export function isHumanOwnedTask(owner?: string): boolean {
  return owner === "user" || owner === "delegate";
}

export function humanTaskHint(owner?: string): string | null {
  if (owner === "user") {
    return "Copy is ready — paste and send when it sounds like you.";
  }
  if (owner === "delegate") {
    return "Brief exported — hire or assign, then log proof when live.";
  }
  return null;
}
