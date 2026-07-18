import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../env.js";
import { GENERIC_TASK_TITLE_RE, PH_MANIPULATION_RE } from "./gtmCatalog.js";
import { modelFor } from "./modelTier.js";
import { addMessageUsage, type TokenUsageSink } from "./tokenUsage.js";

/** Hype / comfort language that erodes trust with dev founders. */
export const HYPE_ANSWER_RE =
  /guaranteed|overnight success|effortless|easy win|just post on|simply post|go viral in \d+ (?:days|weeks)|everyone will|no brainer|passive growth|set and forget/i;

export const answerCritiqueSchema = z.object({
  specificity: z.number().min(0).max(10),
  actionability: z.number().min(0).max(10),
  realism: z.number().min(0).max(10),
  generality_penalty: z.number().min(0).max(10),
  total: z.number().min(0).max(40),
  revisions: z.array(z.string()).max(3).default([]),
  approve: z.boolean(),
});
export type AnswerCritique = z.infer<typeof answerCritiqueSchema>;

export const ANSWER_QUALITY_REVISE_THRESHOLD = 24;
export const ANSWER_QUALITY_WARN_THRESHOLD = 28;
export const ANSWER_GENERALITY_REVISE = 7;

export interface StructuralAnswerLint {
  hardFail: string[];
  softWarn: string[];
}

export function structuralAnswerLint(
  text: string,
  productName?: string,
  opts?: {
    hasLocalContext?: boolean;
    hasAsset?: boolean;
    hasExecutableActions?: boolean;
    copyRequested?: boolean;
    editClassified?: boolean;
    localContextPack?: string;
  },
): StructuralAnswerLint {
  const hardFail: string[] = [];
  const softWarn: string[] = [];
  const t = text.trim();
  if (t.length < 80) {
    hardFail.push("Answer too short — include Honest ceiling, Do this next, and Why sections.");
  }
  if (!/###\s*Honest ceiling/i.test(t)) {
    hardFail.push('Missing "### Honest ceiling" heading — state realistic outcome and what will NOT happen.');
  }
  if (!/###\s*Do this next/i.test(t)) {
    hardFail.push('Missing "### Do this next" — one executable action with deliverable and acceptance test.');
  }
  if (!/###\s*Why/i.test(t)) {
    softWarn.push('Add "### Why (brief)" — max 3 sentences tied to profile.');
  }
  if (GENERIC_TASK_TITLE_RE.test(t)) {
    hardFail.push("Replace generic channel advice (post on social / improve SEO) with named platform, asset, and metric.");
  }
  if (PH_MANIPULATION_RE.test(t)) {
    hardFail.push("Remove unethical PH manipulation language.");
  }
  if (HYPE_ANSWER_RE.test(t)) {
    hardFail.push("Remove hype/comfort language — marketing is hard; state honest ceiling instead.");
  }
  if (/your product/i.test(t) && productName && !t.includes(productName)) {
    hardFail.push(`Use product name "${productName}" — never generic "your product".`);
  }
  const bullets = (t.match(/^[\s]*[-*]\s+/gm) ?? []).length;
  if (bullets >= 6) {
    softWarn.push("Too many bullets — collapse to ONE next action, not a strategy laundry list.");
  }
  if (/###\s*Do this next[\s\S]*?(?:###|$)/i.test(t)) {
    const nextSection = t.match(/###\s*Do this next([\s\S]*?)(?=###|$)/i)?.[1] ?? "";
    if (nextSection.trim().length < 40) {
      hardFail.push("Do this next section must name verb + deliverable + how to verify done.");
    }
  }
  if (opts?.copyRequested && !opts.hasAsset) {
    hardFail.push("Copy/landing request requires propose_asset — don't only describe what to write.");
  }
  if (opts?.editClassified && !opts.hasExecutableActions) {
    hardFail.push("Repo edit intent requires propose_executable_actions with edit_run.");
  }
  if (opts?.hasLocalContext && !/:\d+/.test(t) && !/`[^`]+\.(?:tsx?|jsx?|mdx?)`/.test(t)) {
    softWarn.push("LOCAL REPO CONTEXT present — cite path:line for codebase facts.");
  }
  if (opts?.hasLocalContext && opts.localContextPack) {
    const cites = t.match(/`?([a-zA-Z0-9_][\w./-]*\.(?:tsx?|jsx?|mdx?)):\d+/g) ?? [];
    for (const cite of cites) {
      const path = cite.replace(/`?([a-zA-Z0-9_][\w./-]*\.(?:tsx?|jsx?|mdx?)):\d+/, "$1");
      if (path && !opts.localContextPack.includes(path.replace(/\\/g, "/"))) {
        softWarn.push(`Citation ${path} not found in local context pack — verify path.`);
        break;
      }
    }
  }
  return { hardFail, softWarn };
}

export function shouldReviseAnswer(
  critique: AnswerCritique | null,
  structural?: StructuralAnswerLint,
): boolean {
  if (structural?.hardFail.length) return true;
  if (!critique) return false;
  if (critique.approve) return false;
  return (
    critique.total < ANSWER_QUALITY_REVISE_THRESHOLD ||
    critique.generality_penalty >= ANSWER_GENERALITY_REVISE
  );
}

export function shouldWarnAnswerQuality(critique: AnswerCritique): boolean {
  return !critique.approve && critique.total < ANSWER_QUALITY_WARN_THRESHOLD;
}

const ANSWER_CRITIC_TOOL = {
  name: "critique_answer",
  description: "Score a marketing Q&A answer for specificity, realism, and anti-generic gate.",
  input_schema: {
    type: "object",
    required: [
      "specificity",
      "actionability",
      "realism",
      "generality_penalty",
      "total",
      "approve",
    ],
    properties: {
      specificity: { type: "number", minimum: 0, maximum: 10 },
      actionability: { type: "number", minimum: 0, maximum: 10 },
      realism: { type: "number", minimum: 0, maximum: 10 },
      generality_penalty: {
        type: "number",
        minimum: 0,
        maximum: 10,
        description: "Higher = generic ChatGPT-style strategy filler.",
      },
      total: { type: "number", minimum: 0, maximum: 40 },
      revisions: { type: "array", items: { type: "string" }, maxItems: 3 },
      approve: {
        type: "boolean",
        description: "true iff total >= 28, realism >= 6, generality_penalty <= 4.",
      },
    },
  },
} as const;

const ANSWER_CRITIC_SYSTEM = [
  "You are a strict marketing answer critic for developer founders.",
  "Penalize: vague strategy essays, multiple parallel channels, comfortable timelines, missing honest ceiling.",
  "Reward: one executable next step, profile-specific names, realistic constraints.",
  "Use `critique_answer` tool.",
].join(" ");

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

/** Fast LLM critic for answer text; returns null on failure or missing API key. */
export async function critiqueAnswer(
  profileJson: string,
  answerText: string,
  signal?: AbortSignal,
  usageSink?: TokenUsageSink,
): Promise<AnswerCritique | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  const choice = modelFor("fast", "critique");
  try {
    const msg = await client().messages.create(
      {
        model: choice.model,
        max_tokens: choice.maxTokens,
        system: ANSWER_CRITIC_SYSTEM,
        tools: [ANSWER_CRITIC_TOOL as unknown as Anthropic.Tool],
        tool_choice: { type: "tool", name: "critique_answer" },
        messages: [
          {
            role: "user",
            content: `PRODUCT PROFILE:\n\`\`\`json\n${profileJson}\n\`\`\`\n\nANSWER TO CRITIQUE:\n${answerText.slice(0, 6000)}`,
          },
        ],
      },
      { signal, timeout: 15_000 },
    );
    addMessageUsage(usageSink, msg);
    const tool = msg.content.find((c) => c.type === "tool_use");
    if (!tool || tool.type !== "tool_use") return null;
    return answerCritiqueSchema.parse(tool.input as object);
  } catch {
    return null;
  }
}

export function chunkTextForStream(text: string, size = 48): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.length ? chunks : [text];
}
