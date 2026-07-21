#!/usr/bin/env node
/**
 * Faz 1 — First hour thesis matrix: Week 0 action mode per channel thesis.
 */
import { buildCmoIntake, cluelyLikeReadme } from "../../desktop/src/shared/cmoIntake.ts";
import {
  resolveThesisFirstAction,
  THESIS_FIRST_ACTION_MODE_EXPECTED,
} from "../../desktop/src/shared/firstHourWow.ts";

const THESIS_IDS = [
  "viral_short_form",
  "founder_social",
  "product_hunt_launch",
  "landing_conversion",
  "seo_content",
  "outbound_sales",
  "community_launch",
  "influencer_partnerships",
];

const projectWithHero = {
  id: "p",
  source: { kind: "folder", path: "/p" },
  name: "Acme Product",
  framework: "Next.js",
  routes: ["app/page.tsx", "app/layout.tsx"],
  hasAnalytics: false,
  excludedPaths: [],
  scannedFileCount: 50,
  readmeSummary: "SaaS product",
};

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
}

function fail(label, detail = "") {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log("First hour thesis matrix\n");

for (const thesisId of THESIS_IDS) {
  const thesis = buildCmoIntake({
    project: projectWithHero,
    persona: "marketing",
    profile: { company_stage: "prelaunch" },
    context: { force_thesis_id: thesisId },
  });
  const action = resolveThesisFirstAction(thesisId, projectWithHero);
  const expected = THESIS_FIRST_ACTION_MODE_EXPECTED[thesisId];

  if (thesis.id !== thesisId) {
    fail(`${thesisId} intake`, `got ${thesis.id}`);
  } else ok(`${thesisId} intake id`);

  if (action.mode !== expected && !(thesisId === "landing_conversion" && action.mode === "repo_edit")) {
    fail(`${thesisId} mode`, `expected ${expected}, got ${action.mode}`);
  } else ok(`${thesisId} mode=${action.mode}`);

  if (!action.primaryLabel || action.primaryLabel.length < 8) {
    fail(`${thesisId} label`, "primaryLabel too short");
  } else ok(`${thesisId} label`);

  if (action.estimatedMinutes < 10 || action.estimatedMinutes > 45) {
    fail(`${thesisId} estimate`, String(action.estimatedMinutes));
  } else ok(`${thesisId} estimate`);

  if (!action.runGoal || /improve marketing/i.test(action.runGoal)) {
    fail(`${thesisId} runGoal`, "generic deliverable");
  } else ok(`${thesisId} runGoal`);

  if (action.skills.length < 2) {
    fail(`${thesisId} skills`, "need 2+ skills");
  } else ok(`${thesisId} skills`);
}

// Cluely calibration — consumer viral, not SEO-first
const cluelyProject = {
  ...projectWithHero,
  name: "Cluely",
  readmeSummary: cluelyLikeReadme(),
  routes: ["app/page.tsx"],
};
const cluelyThesis = buildCmoIntake({
  project: cluelyProject,
  persona: "marketing",
  profile: { company_stage: "prelaunch" },
});
if (cluelyThesis.id !== "viral_short_form") {
  fail("Cluely thesis", `expected viral_short_form, got ${cluelyThesis.id}`);
} else ok("Cluely → viral_short_form");

const cluelyAction = resolveThesisFirstAction("viral_short_form", cluelyProject);
if (cluelyAction.mode !== "content_draft") {
  fail("Cluely first action", `expected content_draft, got ${cluelyAction.mode}`);
} else ok("Cluely hooks first (content_draft)");

if (!/hook/i.test(cluelyAction.runGoal)) {
  fail("Cluely runGoal", "should mention hooks");
} else ok("Cluely runGoal mentions hooks");

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
