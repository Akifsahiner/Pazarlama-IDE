#!/usr/bin/env node
/**
 * GTM golden eval — catalog, skills, bottleneck, task v3 lint.
 * Run: node server/evals/gtm-golden.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..", "..");
const skillsRoot = join(root, "skills");

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  if (process.env.VERBOSE) console.log(`  ✓ ${label}`);
}

function fail(label, detail = "") {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function assert(cond, label, detail) {
  if (cond) ok(label);
  else fail(label, detail);
}

const REQUIRED_CATALOG_IDS = [
  "waitlist-hype",
  "ph-number-one",
  "linkedin-gtm",
  "influencer",
  "short-form-viral",
  "paid-ads-opt",
  "landing-conversion",
  "analytics-measurement",
  "sales-outbound",
  "content-engine",
];

const REQUIRED_SKILLS = [
  "waitlist-hype-engine",
  "linkedin-founder-gtm",
  "influencer-partnerships",
  "short-form-video",
  "paid-ads-optimization",
  "ph_launch",
  "launch-planning",
];

const GENERIC_TASK_PATTERNS = [
  /post on social/i,
  /improve seo/i,
  /engage audience/i,
  /be active on/i,
  /create content$/i,
];

console.log("GTM golden eval\n");

// --- Catalog IDs referenced in planSuitePrompts ---
const promptsPath = join(root, "server", "src", "brain", "planSuitePrompts.ts");
const promptsSrc = readFileSync(promptsPath, "utf8");
for (const id of REQUIRED_CATALOG_IDS) {
  assert(promptsSrc.includes(`id: "${id}"`), `PLAYBOOK_CATALOG includes ${id}`);
}

// --- Task v3 fields in schema ---
const schemaPath = join(root, "server", "src", "schemas", "planPlaybooks.ts");
const schemaSrc = readFileSync(schemaPath, "utf8");
for (const field of ["instructions_md", "execution_mode", "tactic", "channel", "kpi"]) {
  assert(schemaSrc.includes(field), `planPlaybooks schema has ${field}`);
}

// --- Decision bottleneck fields ---
const decisionPath = join(root, "server", "src", "schemas", "decision.ts");
const decisionSrc = readFileSync(decisionPath, "utf8");
assert(decisionSrc.includes("gtm_bottleneck"), "decision schema has gtm_bottleneck");
assert(decisionSrc.includes("primary_playbook_id"), "decision schema has primary_playbook_id");

// --- Bottleneck engine ---
const bottleneckPath = join(root, "server", "src", "brain", "bottleneck.ts");
const bottleneckSrc = readFileSync(bottleneckPath, "utf8");
for (const b of ["awareness", "conversion", "distribution", "revenue", "measurement"]) {
  assert(bottleneckSrc.includes(`"${b}"`), `bottleneck maps ${b}`);
}
assert(bottleneckSrc.includes("enrichDecision"), "enrichDecision helper exists");

// --- Skill packages ---
for (const skillId of REQUIRED_SKILLS) {
  const dir = join(skillsRoot, skillId);
  assert(existsSync(dir), `skill dir ${skillId}`);
  for (const file of ["manifest.json", "principles.md", "anti-patterns.md", "kpis.json", "SKILL.md"]) {
    assert(existsSync(join(dir, file)), `${skillId}/${file}`);
  }
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  assert(manifest.id, `${skillId} manifest.id`);
  assert(manifest.primary_metric, `${skillId} manifest.primary_metric`);
  const playbooksDir = join(dir, "playbooks");
  if (existsSync(playbooksDir)) {
    const pbs = readdirSync(playbooksDir).filter((f) => f.endsWith(".md"));
    assert(pbs.length >= 2, `${skillId} has ≥2 playbooks`, String(pbs.length));
  }
  const principles = readFileSync(join(dir, "principles.md"), "utf8");
  const principleLines = principles.split("\n").filter((l) => l.match(/^\d+\./));
  assert(principleLines.length >= 8, `${skillId} principles ≥8`, String(principleLines.length));
  const anti = readFileSync(join(dir, "anti-patterns.md"), "utf8");
  const antiLines = anti.split("\n").filter((l) => l.startsWith("- "));
  assert(antiLines.length >= 5, `${skillId} anti-patterns ≥5`, String(antiLines.length));
}

// --- CU templates ---
const cuPath = join(root, "desktop", "src", "shared", "cuTemplates.ts");
const cuSrc = readFileSync(cuPath, "utf8");
for (const tpl of ["meta-ad-library", "ph-listing-prep", "linkedin-profile-audit", "waitlist-teardown"]) {
  assert(cuSrc.includes(tpl), `CU template ${tpl}`);
}

// --- Desktop GTM UI ---
const uiFiles = [
  "desktop/src/renderer/features/workspace/canvas/planStudio/LaunchCommandCenter.tsx",
  "desktop/src/renderer/features/workspace/canvas/planStudio/SessionLaunchReport.tsx",
  "desktop/src/shared/bottleneck.ts",
  "desktop/scripts/dev-clean.ps1",
];
for (const rel of uiFiles) {
  assert(existsSync(join(root, rel)), `file ${rel}`);
}

// --- Generic tactic lint (synthetic) ---
const sampleBadTitles = ["Post on social media", "Improve SEO rankings", "Engage audience more"];
for (const title of sampleBadTitles) {
  const isGeneric = GENERIC_TASK_PATTERNS.some((re) => re.test(title));
  assert(isGeneric, `lint catches generic: ${title}`);
}

// --- Ethical PH policy strings ---
assert(
  promptsSrc.toLowerCase().includes("upvote") || promptsSrc.includes("supporter"),
  "PH guidance mentions ethical supporter flow",
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
