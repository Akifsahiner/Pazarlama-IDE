import type { BrainProvider } from "./modelTier.js";
import type { TokenUsageSink } from "./tokenUsage.js";
import { forcedToolCall } from "./llmClient.js";
import {
  inferBottleneckFromDecision,
  primaryPlaybookFor,
  type GtmBottleneck,
} from "./bottleneck.js";

export type Discipline =
  | "positioning"
  | "icp"
  | "landing"
  | "ph_launch"
  | "launch_plan"
  | "email"
  | "content"
  | "seo"
  | "social"
  | "growth"
  | "ads"
  | "cro"
  | "analytics"
  | "pricing"
  | "lead_research"
  | "outreach"
  | "meta_question";

export type TaskKind = "diagnose" | "decide" | "draft" | "audit" | "research" | "answer";

export interface RoutedIntent {
  discipline: Discipline;
  task_kind: TaskKind;
  /** "deep" → critic eligible (strategic). "fast" → quick answer/draft. */
  urgency: "fast" | "deep";
  user_goal_summary: string;
  gtm_bottleneck?: import("./bottleneck.js").GtmBottleneck;
  primary_playbook_id?: string;
  bottleneck_why?: string;
}

const ROUTE_TOOL = {
  name: "route",
  description: "Classify the user's marketing request.",
  input_schema: {
    type: "object",
    required: ["discipline", "task_kind", "urgency", "user_goal_summary"],
    properties: {
      discipline: {
        type: "string",
        enum: [
          "positioning",
          "icp",
          "landing",
          "ph_launch",
          "launch_plan",
          "email",
          "content",
          "seo",
          "social",
          "growth",
          "ads",
          "cro",
          "analytics",
          "pricing",
          "lead_research",
          "outreach",
          "meta_question",
        ],
      },
      task_kind: {
        type: "string",
        enum: ["diagnose", "decide", "draft", "audit", "research", "answer"],
      },
      urgency: { type: "string", enum: ["fast", "deep"] },
      user_goal_summary: { type: "string" },
      gtm_bottleneck: {
        type: "string",
        enum: ["awareness", "conversion", "distribution", "revenue", "measurement"],
        description: "Primary GTM constraint — pick ONE.",
      },
      primary_playbook_id: {
        type: "string",
        description: "Single recommended playbook id (waitlist-hype, ph-number-one, etc.).",
      },
      bottleneck_why: {
        type: "string",
        description: "One sentence why this is the primary constraint right now.",
      },
    },
  },
} as const;

const SYSTEM = [
  "You are a router. Read the user's marketing/sales request and classify it.",
  "Choose ONE discipline (the closest match). 'meta_question' is for non-marketing chatter.",
  "task_kind: diagnose=analyze a problem; decide=pick a path; draft=write copy/asset;",
  "audit=review existing; research=external lookups; answer=quick Q&A.",
  "urgency=deep ONLY for strategic decisions (positioning, ICP, launch plan, PH launch).",
  "Everything else → urgency=fast.",
  "Also classify gtm_bottleneck (ONE of awareness|conversion|distribution|revenue|measurement).",
  "Set primary_playbook_id to the ONE playbook to focus on first — no channel spam.",
  "bottleneck_why: ≤20 words tied to the user's situation.",
  "user_goal_summary: ≤ 18 words, plain language.",
].join("\n");

interface CacheEntry {
  at: number;
  value: RoutedIntent;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function cacheKey(message: string, contextHint: string): string {
  // Cheap, stable enough for short messages; not crypto.
  return `${contextHint}::${message.trim().slice(0, 240)}`;
}

/**
 * Classify a user message. Always returns; on any failure falls back to a
 * sensible default so the rest of the pipeline still runs.
 *
 * @param contextHint short string (e.g. last assistant message head) to de-dupe
 *                    similar quick messages without leaking long history.
 */
export async function route(
  message: string,
  contextHint = "",
  signal?: AbortSignal,
  persona: "marketing" | "sales" = "marketing",
  usageSink?: TokenUsageSink,
  provider?: BrainProvider,
): Promise<RoutedIntent> {
  const key = cacheKey(`${persona}::${message}`, contextHint);
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    const raw = await forcedToolCall<RoutedIntent>({
      provider,
      tier: "fast",
      kind: "router",
      system: SYSTEM,
      userMessage: `Persona: ${persona}\n\n${message.slice(0, 1500)}`,
      tool: ROUTE_TOOL,
      signal,
      usageSink,
    });
    const value = enrichRoutedIntent(raw, persona);
    CACHE.set(key, { at: Date.now(), value });
    return value;
  } catch {
    /* fall through to heuristic */
  }
  return enrichRoutedIntent(heuristicRoute(message, persona), persona);
}

function inferBottleneckFromMessage(message: string): GtmBottleneck {
  return inferBottleneckFromDecision(message);
}

function enrichRoutedIntent(
  intent: RoutedIntent,
  persona: "marketing" | "sales",
): RoutedIntent {
  const gtm_bottleneck =
    intent.gtm_bottleneck ?? inferBottleneckFromMessage(intent.user_goal_summary);
  const primary_playbook_id =
    intent.primary_playbook_id ?? primaryPlaybookFor(gtm_bottleneck, persona);
  const bottleneck_why =
    intent.bottleneck_why ??
    `Primary constraint is ${gtm_bottleneck}; focus ${primary_playbook_id} before adding channels.`;
  return { ...intent, gtm_bottleneck, primary_playbook_id, bottleneck_why };
}

/** Cheap keyword classifier so the Brain still routes when the LLM call fails. */
function heuristicRoute(message: string, persona: "marketing" | "sales" = "marketing"): RoutedIntent {
  const m = message.toLowerCase();
  const summary = message.trim().slice(0, 100);
  const matches: Array<[RegExp, Discipline]> = [
    [/positioning|value\s*prop|what.+does.+do/i, "positioning"],
    [/icp|ideal customer|target audience|buyer persona/i, "icp"],
    [/landing|home\s*page|hero|cta|conversion/i, "landing"],
    [/product\s*hunt|\bph\b/i, "ph_launch"],
    [/launch plan|30[-\s]?day|launch strategy/i, "launch_plan"],
    [/email|newsletter|drip/i, "email"],
    [/blog|content marketing|article/i, "content"],
    [/seo|search rank|google search/i, "seo"],
    [/twitter|x post|linkedin|social/i, "social"],
    [/growth|growth experiment|loop/i, "growth"],
    [/ads|advertising|google ads|meta ads/i, "ads"],
    [/cro|conversion rate/i, "cro"],
    [/analytics|funnel|metric/i, "analytics"],
    [/pricing|price/i, "pricing"],
    [/lead|prospect|outbound research/i, "lead_research"],
    [/outreach|cold email|cold dm/i, "outreach"],
  ];
  for (const [re, d] of matches) {
    if (re.test(m)) {
      const kind: TaskKind = /audit|review|check/.test(m)
        ? "audit"
        : /draft|write|create|generate/.test(m)
          ? "draft"
          : /decide|should we|which|choose/.test(m)
            ? "decide"
            : /research|find|look up|competitor|lead/.test(m)
              ? "research"
              : "decide";
      const STRATEGIC: Discipline[] = ["positioning", "icp", "launch_plan", "ph_launch", "landing"];
      let discipline = d;
      if (persona === "sales" && (d === "content" || d === "social")) {
        discipline = /outreach|email|dm/.test(m) ? "outreach" : "lead_research";
      }
      return {
        discipline,
        task_kind: kind,
        urgency: STRATEGIC.includes(discipline) ? "deep" : "fast",
        user_goal_summary: summary,
      };
    }
  }
  if (persona === "sales" && /sales|pipeline|prospect|demo/.test(m)) {
    return {
      discipline: "outreach",
      task_kind: /research|find/.test(m) ? "research" : "answer",
      urgency: "fast",
      user_goal_summary: summary,
    };
  }
  return {
    discipline: "meta_question",
    task_kind: "answer",
    urgency: "fast",
    user_goal_summary: summary,
  };
}
