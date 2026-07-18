/**
 * Unified run intents — renderer calls runs.start; main RunOrchestrator routes.
 */
import type { MarketingProfile } from "./types";

export type MentionType = "file" | "folder" | "symbol" | "url" | "fact";

export interface Mention {
  type: MentionType;
  path?: string;
  name?: string;
}

export type RunIntent =
  | { kind: "ask"; prompt: string; mentions?: Mention[] }
  | {
      kind: "edit";
      goal: string;
      mentions?: Mention[];
      skills?: string[];
      guaranteedShip?: boolean;
    }
  | { kind: "browse"; goal: string; startUrl?: string; maxSteps?: number }
  | { kind: "plan"; horizon: 14 | 30; mode: "ai" | "preview" }
  | { kind: "verify"; afterApply: true; url: string; checklist: string[] };

export interface StartOrchestratedRun {
  projectId: string;
  cwd: string;
  intent: RunIntent;
  sessionId?: string;
  planTaskId?: string;
  serverUrl: string;
  sessionToken: string;
  /** Capability snapshot from renderer (main re-checks where possible). */
  autoApproveBrowser?: boolean;
  persona?: "marketing" | "sales";
  /** Ask / Brain turn extras (renderer packs history + plan context). */
  ask?: {
    history?: Array<{ role: string; content: string }>;
    profile?: unknown;
    planSnapshot?: unknown;
    planProgressSummary?: unknown;
    context?: unknown;
    activeSurface?: string;
    provider?: string;
    turnReceipt?: import("./turnReceipt").TurnReceipt;
    lastAssets?: import("./types").MarketingAsset[];
    lastAnswerText?: string;
  };
  marketingProfile?: MarketingProfile;
}

export interface ContextPack {
  profile: MarketingProfile;
  mentions: Array<{ path: string; excerpt: string }>;
  retrieved: Array<{
    path: string;
    start: number;
    end: number;
    text: string;
    score: number;
  }>;
  facts: Array<{ key: string; value: string }>;
  budget: { tokensEst: number; maxTokens: number; truncated: boolean };
}

export interface IdeNotification {
  id: string;
  severity: "info" | "action" | "warning";
  title: string;
  body: string;
  createdAt: number;
  actions?: Array<{ id: string; label: string; intent?: RunIntent }>;
  dedupeKey: string;
}

export type BgJob =
  | { type: "index.full"; projectId: string; cwd: string }
  | { type: "index.incremental"; projectId: string; cwd: string; paths?: string[] }
  | { type: "facts.refresh"; projectId: string; cwd: string }
  | { type: "health.probe" };
