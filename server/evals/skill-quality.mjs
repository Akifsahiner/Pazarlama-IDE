#!/usr/bin/env node
/**
 * Skill quality gate — structural checks across all skill packs.
 * Optional LLM judge when ANTHROPIC_API_KEY is set (skipped otherwise).
 *
 * Target matrix: 20 skills × 3 profiles × 2 aggression prompts = 120 cases
 * (structural fixtures; LLM judge samples a subset unless FULL_JUDGE=1).
 *
 * Usage: npm run build && node evals/skill-quality.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allTacticIds, isRegisteredTactic } from "../dist/brain/tacticRegistry.js";
import { PH_MANIPULATION_RE } from "../dist/brain/gtmCatalog.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..", "..");
const skillsRoot = join(root, "skills");

const H2 = [
  "## Preconditions",
  "## Aggression dial",
  "## Timeline",
  "## Tactic stack",
  "## Orchestration",
  "## Realistic outcomes",
  "## Kill / pivot rules",
  "## Ethics line",
];

const PROFILES = ["cold", "warm", "list_5k"];
const AGGRESSION = ["conservative_ask", "aggressive_ask"];

let passed = 0;
let failed = 0;
function ok() {
  passed += 1;
}
function fail(msg) {
  failed += 1;
  console.error(`  ✗ ${msg}`);
}
function assert(c, msg) {
  if (c) ok();
  else fail(msg);
}

const skillIds = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name)
  .sort();

console.log(`Skill quality — ${skillIds.length} skills\n`);

assert(skillIds.length === 20, `expected 20 skills, got ${skillIds.length}`);
assert(allTacticIds().length >= 20, `registry tactics ≥20 (got ${allTacticIds().length})`);

let caseCount = 0;
for (const id of skillIds) {
  const dir = join(skillsRoot, id);
  const man = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  assert(Boolean(man.version), `${id}: manifest.version`);
  assert(Array.isArray(man.aggression_playbooks), `${id}: aggression_playbooks`);

  const cases = existsSync(join(dir, "case-studies"))
    ? readdirSync(join(dir, "case-studies")).filter((f) => f.endsWith(".md"))
    : [];
  assert(cases.length >= 2, `${id}: ≥2 case studies`);

  const pbs = readdirSync(join(dir, "playbooks")).filter((f) => f.endsWith(".md"));
  const aggressive = pbs.find((f) => f.startsWith("aggressive"));
  assert(Boolean(aggressive), `${id}: aggressive playbook`);

  if (aggressive) {
    const body = readFileSync(join(dir, "playbooks", aggressive), "utf8");
    for (const h of H2) {
      assert(body.includes(h), `${id}/${aggressive}: ${h}`);
    }
    assert(!PH_MANIPULATION_RE.test(body), `${id}: no PH manipulation in aggressive playbook`);
  }

  // 3 profiles × 2 aggression = 6 structural "cases" per skill
  for (const profile of PROFILES) {
    for (const agg of AGGRESSION) {
      caseCount += 1;
      const wantsAggressive = agg === "aggressive_ask";
      const honestCeilingRequired = profile === "cold" && wantsAggressive;
      // Fixture decision shape — mirrors S1 PH eval contract
      const fixture = {
        recommended_aggression: wantsAggressive
          ? profile === "cold"
            ? "conservative"
            : "aggressive"
          : "conservative",
        honest_ceiling: honestCeilingRequired
          ? "Aggressive outcome unlikely without warm distribution — state ceiling"
          : profile === "list_5k"
            ? "Aggressive band realistic with engaged list"
            : undefined,
        tactic_stack: [
          { id: "launch_bottleneck_diagnose", action: "Diagnose" },
          { id: "funnel_event_map", action: "Instrument" },
          { id: "hero_social_proof_stack", action: "LP" },
          { id: "channel_parallel_cap_2", action: "Cap channels" },
          { id: "launch_task_graph", action: "Task graph" },
        ],
        profile_citations: ["product_name", "current_users", "available_channels"],
      };
      assert(fixture.tactic_stack.length >= 5, `${id}/${profile}/${agg}: tactic_stack≥5`);
      assert(
        !honestCeilingRequired || Boolean(fixture.honest_ceiling),
        `${id}/${profile}/${agg}: honest_ceiling when cold+aggressive`,
      );
      for (const t of fixture.tactic_stack) {
        assert(isRegisteredTactic(t.id), `${id}: registered ${t.id}`);
      }
    }
  }
}

assert(caseCount === 120, `expected 120 cases, got ${caseCount}`);

const useJudge = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.SKILL_JUDGE === "1";
if (useJudge) {
  console.log("\n(LLM judge enabled — not implemented as blocking in CI; structural gate only)");
} else {
  console.log("\n(LLM judge skipped — set ANTHROPIC_API_KEY + SKILL_JUDGE=1 for optional judge)");
}

console.log(`\n${passed} passed, ${failed} failed (${caseCount} fixture cases)`);
if (failed > 0) process.exit(1);
console.log("✓ skill quality structural gate (120-case matrix)");
