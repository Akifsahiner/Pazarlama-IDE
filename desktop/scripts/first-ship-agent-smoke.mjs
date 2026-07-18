#!/usr/bin/env node
/**
 * Nightly real-agent smoke for Quick Start wedge.
 * Requires ANTHROPIC_API_KEY + connected backend — non-blocking on PR by default.
 *
 * Usage:
 *   MARKETING_IDE_AGENT_SMOKE=1 node scripts/first-ship-agent-smoke.mjs
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const needles = [
  "src/shared/quickStartWedge.ts",
  "src/shared/shipPipeline.ts",
  "src/shared/cmoLaneA.ts",
  "src/renderer/state/store.ts",
  "src/renderer/features/onboarding/ProjectReveal.tsx",
  "src/renderer/features/workspace/ShipPipelineBar.tsx",
  "src/renderer/features/workspace/ShipWinCard.tsx",
  "e2e/first-ship-wedge.spec.ts",
  "scripts/first-ship-dogfood.md",
];

for (const rel of needles) {
  await access(path.join(desktopRoot, rel));
}

const agentSmoke = process.env.MARKETING_IDE_AGENT_SMOKE === "1";
if (!agentSmoke) {
  console.log("first-ship-agent-smoke: structural check OK (set MARKETING_IDE_AGENT_SMOKE=1 for live agent run)");
  process.exit(0);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("first-ship-agent-smoke: ANTHROPIC_API_KEY required for live run");
  process.exit(1);
}

console.log("first-ship-agent-smoke: live agent path not wired in CI yet — run manual dogfood per scripts/first-ship-dogfood.md");
process.exit(0);
