import type { MarketingProfile } from "../schemas/marketingProfile.js";
import type { PlanProgressSummary } from "../schemas/index.js";
import type { ProactiveSuggestionAction } from "../schemas/index.js";
import type { RoutedIntent } from "./router.js";

/** Broad “how do I market/grow/launch?” — must not land on chatty answer path. */
export function isBroadMarketingStrategy(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /how (?:do|can|should|would) i (?:market|grow|launch|promote|sell|get users|get traction|acquire|distribute)/i.test(
      m,
    ) ||
    /how to (?:market|grow|launch|promote|sell|get (?:users|customers|signups|traction))/i.test(m) ||
    /(?:nasıl|nasil) (?:pazarlar|pazarlayabilir|pazarlarım|pazarlarim)/i.test(m) ||
    /pazarlama stratej/i.test(m) ||
    /market my (?:product|app|saas|project|startup|tool)/i.test(m) ||
    /(?:launch|gtm|go.?to.?market) strateg/i.test(m) ||
    /get (?:my )?(?:first )?(?:\d+\s+)?(?:users|customers|signups|paying)/i.test(m) ||
    /what(?:'s| is) the best way to (?:market|launch|grow)/i.test(m) ||
    /projemi nasıl/i.test(m)
  );
}

/** Force strategic decision path for broad GTM questions (LLM router often picks answer). */
export function normalizeBroadStrategy(message: string, intent: RoutedIntent): RoutedIntent {
  if (!isBroadMarketingStrategy(message)) return intent;
  if (intent.task_kind === "draft") return intent;
  if (intent.task_kind === "research" && /research|competitor|find leads/i.test(message)) return intent;

  return {
    ...intent,
    discipline: intent.discipline === "outreach" || intent.discipline === "lead_research" ? intent.discipline : "launch_plan",
    task_kind: "decide",
    urgency: "deep",
    user_goal_summary: intent.user_goal_summary || message.trim().slice(0, 100),
  };
}

export function buildHonestCeilingHint(
  profile: MarketingProfile,
  intent: RoutedIntent,
): string {
  const list = profile.email_list_size ?? 0;
  const stage = profile.company_stage ?? "unknown";
  const product = profile.product_name || "this product";

  if (intent.discipline === "ph_launch" || /ph|product hunt/i.test(intent.user_goal_summary)) {
    if (list < 500) {
      return `**Honest ceiling:** PH top-5 is unlikely for ${product} with <500 engaged subscribers — plan for #15–30 and owned-list conversion first.`;
    }
    return `**Honest ceiling:** PH visibility depends on warm supporters and live demo quality — not a single tweet.`;
  }

  if (stage === "prelaunch" && list < 1000) {
    return `**Honest ceiling:** ${product} is pre-launch with a small list — expect weeks of daily execution before meaningful signup velocity, not overnight traction.`;
  }

  if (intent.discipline === "social" || intent.discipline === "growth") {
    return `**Honest ceiling:** Founder channels compound over 14–21 days of consistent posts + replies — one viral thread is not the plan.`;
  }

  return `**Honest ceiling:** Marketing for ${product} is a multi-week coordination problem — one tactic won't carry the launch alone.`;
}

export function buildAnswerCta(opts: {
  intent: RoutedIntent;
  profile: MarketingProfile;
  planProgress?: PlanProgressSummary | null;
}): { title: string; body: string; action: ProactiveSuggestionAction; buttonLabel: string } | null {
  if (opts.intent.discipline === "meta_question") return null;

  const ceiling = buildHonestCeilingHint(opts.profile, opts.intent);
  const pp = opts.planProgress;

  if (pp?.nextTaskId && pp.nextTaskTitle) {
    return {
      title: "Run this task",
      body: `${ceiling}\n\nNext in your plan: **${pp.nextTaskTitle}**`,
      action: {
        kind: "continue_plan",
        taskId: pp.nextTaskId,
        playbookId: pp.nextPlaybookId,
      },
      buttonLabel: pp.nextTaskTitle.startsWith("Day") ? pp.nextTaskTitle : `Run · ${pp.nextTaskTitle.slice(0, 48)}`,
    };
  }

  if (pp && pp.total > 0) {
    return {
      title: "Open your launch plan",
      body: `${ceiling}\n\nYour plan has ${pp.total} tasks — open Plan Studio and run Day 1.`,
      action: { kind: "open_plan" },
      buttonLabel: "Open Plan Studio",
    };
  }

  return {
    title: "Build an executable plan",
    body: `${ceiling}\n\nStrategy talk won't ship. Generate a 30-day plan with daily tasks, deliverables, and acceptance criteria.`,
    action: { kind: "generate_plan" },
    buttonLabel: "Generate launch plan",
  };
}
