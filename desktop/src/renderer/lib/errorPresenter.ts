export interface PresentedError {
  /** User-facing message — never a raw stack/JSON blob. */
  message: string;
  /** Recovery affordance shown next to the message. */
  action?: { label: string; kind: "settings" | "retry" | "signin" };
}

const RULES: { test: RegExp; present: (raw: string) => PresentedError }[] = [
  {
    test: /quota|429|rate.?limit/i,
    present: (raw) =>
      /quota/i.test(raw)
        ? {
            message: "Monthly quota reached — usage resets next period.",
            action: { label: "View usage in Settings", kind: "settings" },
          }
        : {
            message: "The model is rate-limited right now. Wait a few seconds and try again.",
            action: { label: "Try again", kind: "retry" },
          },
  },
  {
    test: /unauthorized|401|sign.?in|session expired|jwt/i,
    present: () => ({
      message: "Your session expired. Sign in again to continue.",
      action: { label: "Sign in", kind: "signin" },
    }),
  },
  {
    test: /not connected|backend|fetch failed|ECONNREFUSED|NetworkError|Failed to fetch|connection lost|unreachable/i,
    present: () =>
      import.meta.env.DEV
        ? {
            message: "Can't reach the backend. Check that the server is running and the URL is right.",
            action: { label: "Check Settings", kind: "settings" },
          }
        : {
            message: "Can't connect right now. Sign in or check your network connection.",
            action: { label: "Connect", kind: "settings" },
          },
  },
  {
    test: /tier_required|requires a paid plan|Upgrade to/i,
    present: () => ({
      message: "This feature needs a higher plan. Upgrade in Settings → Account.",
      action: { label: "View plans", kind: "settings" },
    }),
  },
  {
    test: /tier_free_scan_preview/i,
    present: () => ({
      message: "Free plan includes project scan and plan preview only — upgrade for AI plan and agent runs.",
      action: { label: "Upgrade", kind: "settings" },
    }),
  },
  {
    test: /ANTHROPIC_API_KEY|not configured|anthropic_not_configured/i,
    present: () =>
      import.meta.env.DEV
        ? {
            message: "Claude isn't configured on the server yet (missing API key).",
            action: { label: "Open Settings", kind: "settings" },
          }
        : {
            message: "AI features aren't available yet. Check your connection or try again later.",
            action: { label: "Open Settings", kind: "settings" },
          },
  },
  {
    test: /timeout|timed out/i,
    present: () => ({
      message: "The request timed out — the model may be busy. Try again.",
      action: { label: "Try again", kind: "retry" },
    }),
  },
];

/** Truncate raw payloads so a stack trace never becomes the message. */
function tidy(raw: string): string {
  const firstLine = raw.split("\n")[0].trim();
  return firstLine.length > 220 ? `${firstLine.slice(0, 217)}…` : firstLine;
}

/**
 * Present a raw error to the user (Kurtarma principle: every error carries a
 * next step). Unknown errors keep their first line but gain no fake certainty.
 */
export function presentError(raw: string): PresentedError {
  for (const rule of RULES) {
    if (rule.test.test(raw)) return rule.present(raw);
  }
  return { message: tidy(raw) };
}
