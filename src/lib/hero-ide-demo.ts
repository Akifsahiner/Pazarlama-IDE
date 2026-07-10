import { heroAgentCopy } from "@/lib/tokens";

export type HeroDemoPhase = "idle" | "approving" | "approved";

export type HeroDemoMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
};

export const HERO_DEMO_WEEKS_INITIAL = [100, 70, 35, 10] as const;
export const HERO_DEMO_WEEKS_APPROVED = [100, 88, 52, 28] as const;

export const heroDemoFollowUp = [
  "Plan approved. Queuing 12 launch tasks across 4 weeks.",
  "Starting with: Clarify ICP → rewrite landing hero → install conversion events.",
] as const;

export function buildInitialDemoMessages(): HeroDemoMessage[] {
  return [
    { id: "user-1", role: "user", text: heroAgentCopy.command },
    { id: "agent-1", role: "agent", text: heroAgentCopy.response },
  ];
}

export const heroDemoStatus = {
  idle: "Waiting for approval",
  approving: "Reviewing plan…",
  approved: "Executing Week 1 · 3 tasks in progress",
} as const;

export const heroDemoActivity = {
  idle: ["Scanned 847 project files", "Compared 8 competitors"],
  approved: [
    "Scanned 847 project files",
    "Compared 8 competitors",
    "Plan approved · 12 tasks queued",
  ],
} as const;
