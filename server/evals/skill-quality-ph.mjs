#!/usr/bin/env node
/**
 * PH skill quality — structural golden checks (+ optional LLM judge).
 * Usage: npm run build && node evals/skill-quality-ph.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PH_MANIPULATION_RE } from "../dist/brain/gtmCatalog.js";
import { isRegisteredTactic, allTacticIds } from "../dist/brain/tacticRegistry.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..", "..");
const phDir = join(root, "skills", "ph_launch");

let passed = 0;
let failed = 0;
function ok(l) {
  passed += 1;
}
function fail(l, d = "") {
  failed += 1;
  console.error(`  ✗ ${l}${d ? ` — ${d}` : ""}`);
}
function assert(c, l, d) {
  if (c) ok(l);
  else fail(l, d);
}

console.log("PH skill quality\n");

assert(existsSync(join(phDir, "playbooks", "aggressive-top-1.md")), "aggressive-top-1 playbook");
assert(existsSync(join(phDir, "case-studies")), "case-studies dir");
const cases = readdirSync(join(phDir, "case-studies")).filter((f) => f.endsWith(".md"));
assert(cases.length >= 2, "≥2 case studies", String(cases.length));

const aggressive = readFileSync(join(phDir, "playbooks", "aggressive-top-1.md"), "utf8");
const requiredH2 = [
  "## Preconditions",
  "## Aggression dial",
  "## Timeline",
  "## Tactic stack",
  "## Orchestration",
  "## Realistic outcomes",
  "## Kill / pivot rules",
  "## Ethics line",
];
for (const h of requiredH2) {
  assert(aggressive.includes(h), `aggressive-top-1 has ${h}`);
}
assert(!PH_MANIPULATION_RE.test(aggressive), "aggressive playbook has no manipulation language");

const registryIds = allTacticIds().filter((id) => id.startsWith("ph_"));
assert(registryIds.length >= 10, "≥10 PH tactics in registry", String(registryIds.length));

const fixtureDecisions = [
  {
    name: "cold wants #1",
    recommended_aggression: "conservative",
    honest_ceiling: "Top 1 unlikely without warm list — expect #15–25 after 21-day runway",
    tactic_stack: [
      { id: "ph_citizen_mode_14d", phase: "T-30", action: "Citizen mode 14d" },
      { id: "ph_upcoming_page_7d", phase: "T-14", action: "Upcoming page" },
      { id: "ph_comment_squad_10", phase: "T-10", action: "Comment squad" },
      { id: "ph_submit_1201_pt", phase: "H0", action: "Submit 12:01 PT" },
      { id: "ph_teardown_post_d1", phase: "D+1", action: "Teardown" },
    ],
    profile_citations: ["product_name", "current_users", "available_channels"],
  },
  {
    name: "5k list aggressive",
    recommended_aggression: "aggressive",
    honest_ceiling: "Top 1–5 realistic with engaged 5k+ list and comment squad",
    tactic_stack: [
      { id: "ph_hunter_dm_14d", phase: "T-21", action: "Hunter DM" },
      { id: "ph_gallery_4_slides", phase: "T-7", action: "Gallery" },
      { id: "ph_submit_1201_pt", phase: "H0", action: "Submit" },
      { id: "ph_email_wave_1_6am", phase: "H+6", action: "Wave 1" },
      { id: "ph_email_wave_2_9am", phase: "H+9", action: "Wave 2" },
      { id: "ph_email_wave_3_12pm", phase: "H+12", action: "Wave 3" },
      { id: "ph_comment_reply_sla_30m", phase: "H0-H+18", action: "Reply SLA" },
    ],
    profile_citations: ["product_name", "email_list_size", "brand_voice"],
  },
];

for (const fx of fixtureDecisions) {
  assert(fx.tactic_stack.length >= 5, `${fx.name}: tactic_stack ≥5`);
  assert(Boolean(fx.recommended_aggression), `${fx.name}: aggression set`);
  assert(Boolean(fx.honest_ceiling), `${fx.name}: honest_ceiling`);
  assert(fx.profile_citations.length >= 3, `${fx.name}: ≥3 citations`);
  for (const t of fx.tactic_stack) {
    assert(isRegisteredTactic(t.id), `${fx.name}: registered ${t.id}`);
  }
  assert(!PH_MANIPULATION_RE.test(JSON.stringify(fx)), `${fx.name}: no manipulation`);
}

const manifest = JSON.parse(readFileSync(join(phDir, "manifest.json"), "utf8"));
assert(manifest.version, "manifest.version");
assert(
  Array.isArray(manifest.aggression_playbooks) &&
    manifest.aggression_playbooks.includes("aggressive-top-1"),
  "manifest.aggression_playbooks includes aggressive-top-1",
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("✓ PH skill quality structural gate");
