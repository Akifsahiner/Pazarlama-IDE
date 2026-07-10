import type { MarketingAsset, MarketingPlan, ProjectProfile } from "../schemas/index.js";

export interface PlanCallbacks {
  onStatus: (message: string) => void;
}

export interface ChatCallbacks {
  onToken: (text: string) => void;
  onAsset: (asset: MarketingAsset) => void;
  onTool: (name: string, status: "start" | "done", detail?: string) => void;
}

export interface ChatArgs {
  profile?: ProjectProfile;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  signal?: AbortSignal;
}

export interface LLMProvider {
  id: "anthropic" | "openai";
  generatePlan(profile: ProjectProfile, cb: PlanCallbacks, signal?: AbortSignal): Promise<MarketingPlan>;
  chat(args: ChatArgs, cb: ChatCallbacks): Promise<void>;
}

/** JSON Schema describing a MarketingPlan, used for forced structured output. */
export const PLAN_JSON_SCHEMA = {
  type: "object",
  required: ["positioning", "icp", "readiness", "taskGraph", "contentCalendar", "strategyNote"],
  properties: {
    positioning: { type: "string", description: "One-paragraph positioning statement." },
    icp: { type: "string", description: "Ideal customer profile, concise." },
    readiness: {
      type: "array",
      description: "6-8 launch readiness dimensions with 0-100 scores.",
      items: {
        type: "object",
        required: ["label", "score"],
        properties: {
          label: { type: "string" },
          score: { type: "number" },
        },
      },
    },
    taskGraph: {
      type: "array",
      description: "A 30-day launch plan as ordered tasks with dependencies.",
      items: {
        type: "object",
        required: ["id", "title", "dependsOn", "day"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          dependsOn: { type: "array", items: { type: "string" } },
          metric: { type: "string" },
          day: { type: "number" },
          deliverable: { type: "string", description: "Concrete output (file path, asset, metric)." },
          acceptance_criteria: { type: "string", description: "How to know this task is done." },
          action_type: {
            type: "string",
            enum: ["edit_files", "browser_research", "draft_copy", "analyze"],
          },
        },
      },
    },
    contentCalendar: {
      type: "array",
      description: "First 2 weeks of content across channels.",
      items: {
        type: "object",
        required: ["day", "channel", "title", "type"],
        properties: {
          day: { type: "number" },
          channel: { type: "string" },
          title: { type: "string" },
          type: { type: "string", enum: ["post", "email", "article", "ad"] },
        },
      },
    },
    strategyNote: {
      type: "string",
      description: "Candid strategic guidance on what to do first and what to avoid.",
    },
  },
} as const;

/** Tool that proposes a single marketing asset (used during chat/execute). */
export const ASSET_TOOL_SCHEMA = {
  type: "object",
  required: ["type", "after"],
  properties: {
    type: { type: "string", enum: ["landing-copy", "tweet", "email", "ad"] },
    targetFile: { type: "string", description: "Optional relative file path to patch." },
    before: { type: "string", description: "Existing text being replaced, if any." },
    after: { type: "string", description: "The new asset content." },
  },
} as const;

export function planSystemPrompt(profile: ProjectProfile): string {
  return [
    "You are Marketing IDE, a senior product marketer for founders.",
    "Given a product profile, produce a concrete, executable 30-day launch plan.",
    "Each taskGraph item must be runnable by an agent: include deliverable and acceptance_criteria when possible.",
    "Be specific and honest. Prioritize ruthlessly for a solo founder with limited time.",
    "Readiness scores must reflect real gaps (e.g. weak social proof, missing tracking).",
    "",
    "PRODUCT PROFILE:",
    JSON.stringify(profile, null, 2),
  ].join("\n");
}

export function chatSystemPrompt(_profile?: import("../schemas/index.js").ProjectProfile): string {
  return [
    "You are Marketing IDE's execution agent.",
    "This path is deprecated — use /agent runTurn instead.",
  ].join("\n");
}
