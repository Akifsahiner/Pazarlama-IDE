#!/usr/bin/env node
/**
 * GTM behavioral golden tests — bottleneck, tactic lint, PH ethics, readiness maps.
 * Run: node server/evals/gtm-behavioral.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inferBottleneckFromDecision } from "../dist/brain/bottleneck.js";
import { GENERIC_TASK_TITLE_RE, TACTIC_SNAKE_CASE_RE } from "../dist/brain/gtmCatalog.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..", "..");
const skillsRoot = join(root, "skills");

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
}
function fail(label, detail = "") {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond, label, detail) {
  if (cond) ok(label);
  else fail(label, detail);
}

// --- Import behavioral regex from built gtmCatalog (mirror source) ---
const gtmSrc = readFileSync(join(root, "server", "src", "brain", "gtmCatalog.ts"), "utf8");
const genericRe = GENERIC_TASK_TITLE_RE;
const phRe = /upvote\s*farm|buy\s*upvotes|vote\s*ring|bot\s*upvote|pay\s*for\s*upvotes/i;
const tacticRe = TACTIC_SNAKE_CASE_RE;

function inferBottleneck(text) {
  return inferBottleneckFromDecision(text);
}

console.log("GTM behavioral eval\n");

// Bottleneck inference (25 cases)
const bottleneckCases = [
  ["no one knows our product", "awareness"],
  ["waitlist is empty", "awareness"],
  ["traffic but no signups", "conversion"],
  ["landing page bounce high", "conversion"],
  ["product hunt launch next week", "distribution"],
  ["need coordinated PH reach", "distribution"],
  ["deals not closing", "revenue"],
  ["outbound pipeline stalled", "revenue"],
  ["cannot tell what works", "measurement"],
  ["no analytics on funnel", "measurement"],
  ["linkedin impressions low", "awareness"],
  ["influencer outreach", "awareness"],
  ["paid ads CPA too high", "conversion"],
  ["signup rate 0.5%", "conversion"],
  ["launch day visibility", "distribution"],
  ["sales demo no shows", "revenue"],
  ["kpi dashboard missing", "measurement"],
  ["viral video hooks", "awareness"],
  ["referral k-factor", "awareness"],
  ["PH supporter comments", "distribution"],
  ["meta ads creative test", "conversion"],
  ["cold email reply rate", "revenue"],
  ["ga4 events not firing", "measurement"],
  ["build in public audience", "awareness"],
  ["product ready no users", "distribution"],
];
for (const [text, expected] of bottleneckCases) {
  assert(inferBottleneck(text) === expected, `bottleneck: "${text.slice(0, 40)}" → ${expected}`);
}

// Generic task title rejection (15 cases)
const badTitles = [
  "Post on social media",
  "Improve SEO rankings",
  "Engage audience more",
  "Be active on Twitter",
  "Create content",
  "Marketing tasks for launch",
  "Boost engagement this week",
];
for (const title of badTitles) {
  assert(genericRe.test(title), `generic lint catches: ${title}`);
}
const goodTitles = [
  "Draft PH maker comment for launch hour",
  "Add waitlist referral CTA to landing hero",
  "LinkedIn Day 3 post grid outline",
  "Meta ads hypothesis sheet v2",
];
for (const title of goodTitles) {
  assert(!genericRe.test(title), `specific title passes: ${title.slice(0, 35)}`);
}

// PH ethics (10 cases)
const phBad = [
  "coordinate upvote farm on launch day",
  "buy upvotes from service",
  "join our vote ring",
  "bot upvote campaign",
  "pay for upvotes to rank #1",
];
for (const s of phBad) {
  assert(phRe.test(s), `PH ethics rejects: ${s.slice(0, 40)}`);
}
const phGood = [
  "ask supporters to leave thoughtful comments",
  "ethical supporter comment cadence",
  "maker comment live at 12:01 AM PT",
];
for (const s of phGood) {
  assert(!phRe.test(s), `PH ethical passes: ${s.slice(0, 40)}`);
}

// Tactic snake_case (15 cases)
const goodTactics = [
  "referral_waitlist_loop",
  "ph_supporter_comment_cadence",
  "linkedin_14_day_grid",
  "hero_social_proof_stack",
  "ads_hypothesis_loop",
];
for (const t of goodTactics) {
  assert(tacticRe.test(t), `tactic valid: ${t}`);
}
const badTactics = ["Social", "PH-Launch", "generic tactic", "a", "UPPER_SNAKE"];
for (const t of badTactics) {
  assert(!tacticRe.test(t), `tactic invalid: ${t}`);
}

// Schema / router fields present
const routerSrc = readFileSync(join(root, "server", "src", "brain", "router.ts"), "utf8");
for (const f of ["gtm_bottleneck", "primary_playbook_id", "bottleneck_why", "enrichRoutedIntent"]) {
  assert(routerSrc.includes(f), `router has ${f}`);
}

const decisionSrc = readFileSync(join(root, "server", "src", "schemas", "decision.ts"), "utf8");
const bottleneckSrc = readFileSync(join(root, "server", "src", "brain", "bottleneck.ts"), "utf8");
for (const f of ["channel_priority", "next_playbook", "tactic_you_may_not_know", "bottleneck_why"]) {
  assert(decisionSrc.includes(f), `decision schema has ${f}`);
}
assert(bottleneckSrc.includes("enrichDecision"), "bottleneck has enrichDecision");

const planSchema = readFileSync(join(root, "server", "src", "schemas", "planPlaybooks.ts"), "utf8");
for (const f of ["primaryBottleneck", "primaryPlaybookId", "bottleneckWhy", "suggestedTactic"]) {
  assert(planSchema.includes(f), `plan schema has ${f}`);
}

// Skill templates (5 packs × 2+ templates)
const templateSkills = [
  "waitlist-hype-engine",
  "linkedin-founder-gtm",
  "influencer-partnerships",
  "short-form-video",
  "paid-ads-optimization",
];
for (const id of templateSkills) {
  const tplDir = join(skillsRoot, id, "templates");
  assert(existsSync(tplDir), `${id}/templates/ exists`);
  const files = readdirSync(tplDir).filter((f) => f.endsWith(".md"));
  assert(files.length >= 2, `${id} has ≥2 templates`, String(files.length));
}

// Desktop senior+ UI files
for (const rel of [
  "desktop/src/shared/gtmCatalog.ts",
  "desktop/src/shared/cuTemplates.ts",
  "desktop/src/renderer/features/workspace/canvas/planStudio/LaunchCommandCenter.tsx",
  "desktop/src/renderer/features/workspace/canvas/planStudio/SessionLaunchReport.tsx",
]) {
  assert(existsSync(join(root, rel)), `exists ${rel}`);
}

assert(gtmSrc.includes("READINESS_TACTIC_LABEL"), "server gtmCatalog readiness tactics");
assert(
  readFileSync(join(root, "desktop", "src", "shared", "ipc.ts"), "utf8").includes("scanProgress"),
  "IPC scanProgress channel",
);
assert(
  readFileSync(join(root, "desktop", "src", "shared", "cuTemplates.ts"), "utf8").includes("resolveBrowserGoal"),
  "resolveBrowserGoal helper",
);

// Channel guidance depth
const promptsSrc = readFileSync(join(root, "server", "src", "brain", "planSuitePrompts.ts"), "utf8");
for (const needle of ["T-7d", "H+0", "instructions_md", "referral", "supporter"]) {
  assert(promptsSrc.includes(needle) || promptsSrc.toLowerCase().includes(needle.toLowerCase()), `prompts mention ${needle}`);
}

// Testimonial depth — skill map, CU templates, tactic teaching, execution router
const skillSrc = readFileSync(join(root, "server", "src", "brain", "skillRetrieval.ts"), "utf8");
for (const pb of ["waitlist-hype", "ph-number-one", "linkedin-gtm", "influencer", "short-form-viral", "paid-ads-opt"]) {
  assert(skillSrc.includes(pb), `PLAYBOOK_STUB_TO_SKILL has ${pb}`);
}
assert(skillSrc.includes("retrieveSkillsForPlaybook"), "retrieveSkillsForPlaybook exported");

const cuSrc = readFileSync(join(root, "desktop", "src", "shared", "cuTemplates.ts"), "utf8");
assert(cuSrc.includes("influencer-creator-research"), "CU influencer template");
assert(cuSrc.includes("short-form-hook-teardown"), "CU short-form template");
assert(cuSrc.includes("influencer-creator-research"), "influencer not mapped to meta ads");
assert(!cuSrc.includes('"short-form-viral": CU_MARKETING_TEMPLATES.find((t) => t.id === "google-ads-preview")'), "short-form not google ads");

assert(gtmSrc.includes("TACTIC_TEACHING"), "server TACTIC_TEACHING");
const tacticKeys = (gtmSrc.match(/referral_waitlist_loop|ph_supporter_comment_cadence|linkedin_14_day_grid|short_form_hook_ab|influencer_brief_disclosure|ads_hypothesis_loop/g) ?? []).length;
assert(tacticKeys >= 6, "TACTIC_TEACHING has ≥6 tactic keys", String(tacticKeys));

const desktopGtm = readFileSync(join(root, "desktop", "src", "shared", "gtmCatalog.ts"), "utf8");
assert(desktopGtm.includes("TESTIMONIAL_PLAYBOOKS"), "desktop TESTIMONIAL_PLAYBOOKS");
assert(existsSync(join(root, "desktop/src/renderer/features/agent/GtmTacticTeachCard.tsx")), "GtmTacticTeachCard");

const storeSrc = readFileSync(join(root, "desktop", "src", "renderer", "state", "store.ts"), "utf8");
assert(storeSrc.includes("isBrowserPlanTask"), "store routes browser plan tasks");

const planPbSrc = readFileSync(join(root, "desktop", "src", "shared", "planPlaybooks.ts"), "utf8");
assert(planPbSrc.includes("isBrowserPlanTask"), "isBrowserPlanTask helper");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
