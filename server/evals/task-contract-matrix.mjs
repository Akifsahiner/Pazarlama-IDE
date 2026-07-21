#!/usr/bin/env node
/**
 * P19 task contract matrix — thesis + mechanism template benchmark (Phase A, no API).
 */
import { assertCadenceContractComplete, assertTaskContractComplete } from "../../desktop/src/shared/marketingTaskContract.ts";
import { buildCmoIntake } from "../../desktop/src/shared/cmoIntake.ts";
import { createOpsCadenceFromThesis } from "../../desktop/src/shared/cmoOpsCadence.ts";
import { GROWTH_MECHANISM_IDS } from "../../desktop/src/shared/cmoGrowthMechanismKnowledge.ts";
import { buildMechanismWeek1Tasks } from "../../desktop/src/shared/cmoGrowthEngine.ts";

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

const project = {
  id: "p",
  source: { kind: "folder", path: "/p" },
  name: "Product",
  framework: "Next.js",
  routes: ["app/page.tsx"],
  hasAnalytics: false,
  excludedPaths: [],
  scannedFileCount: 50,
  readmeSummary: "SaaS product",
};

let passed = 0;
let failed = 0;
let incomplete = 0;

function ok() {
  passed += 1;
}
function fail(label, detail = "") {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log("Task contract matrix\n");

for (const thesisId of THESIS_IDS) {
  const thesis = buildCmoIntake({
    project,
    persona: "marketing",
    profile: { company_stage: "prelaunch" },
    context: { force_thesis_id: thesisId },
  });
  const cadence = createOpsCadenceFromThesis(thesis);
  const cadenceErrors = assertCadenceContractComplete(cadence);
  if (cadenceErrors.length === 0) ok();
  else {
    incomplete += 1;
    fail(`${thesisId} cadence`, cadenceErrors[0]);
  }
  for (const task of thesis.week1_priorities) {
    const errors = assertTaskContractComplete(task);
    if (errors.length === 0) ok();
    else {
      incomplete += 1;
      fail(`${thesisId}/${task.id}`, errors.join(", "));
    }
  }
}

for (const mechanismId of GROWTH_MECHANISM_IDS) {
  const tasks = buildMechanismWeek1Tasks(mechanismId, 1);
  for (const task of tasks) {
    const errors = assertTaskContractComplete(task);
    if (errors.length === 0) ok();
    else {
      incomplete += 1;
      fail(`mech/${mechanismId}`, errors.join(", "));
    }
  }
}

const total = passed + failed;
const rate = total > 0 ? incomplete / total : 0;
console.log(`\nIncomplete: ${incomplete}/${total} (${(rate * 100).toFixed(1)}%)`);
console.log(`Passed: ${passed}, Failed: ${failed}`);

if (rate > 0.01) {
  process.exit(1);
}
