#!/usr/bin/env node
/**
 * Faz 2 — Launch readiness + seal → briefing flow eval.
 */
import assert from "node:assert/strict";
import { buildCmoIntake, buildFinalChannelThesis } from "../../desktop/src/shared/cmoIntake.ts";
import { synthesizeGrowthNarrative } from "../../desktop/src/shared/cmoGrowthNarrative.ts";
import {
  buildStrategicDecision,
  sealStrategicDecision,
} from "../../desktop/src/shared/cmoStrategicOptions.ts";
import {
  isWeek1Ready,
  needsRevenueStep,
  resolveLaunchReadinessSteps,
} from "../../desktop/src/shared/launchReadiness.ts";
import { resolveWeek1PreviewTasks } from "../../desktop/src/shared/week1Preview.ts";
import { buildContractView } from "../../desktop/src/shared/contractView.ts";

function project() {
  return {
    id: "p1",
    source: { kind: "folder", path: "/project" },
    name: "Acme",
    framework: "Next.js",
    readmeSummary: "B2B SaaS for teams",
    routes: ["app/page.tsx", "app/signup/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
  };
}

function fit(overrides = {}) {
  return {
    brand_face_readiness: "never",
    controversy_tolerance: "selective",
    monthly_budget_band: "under_500",
    scale_readiness: "probably",
    magic_moment: "creates a verified result in under two minutes",
    weekly_marketing_hours: "3_7",
    thirty_day_win: "qualified_signups",
    completed_at: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL ${name}`, err);
  }
}

console.log("faz2-launch-readiness");

test("P13 camera-shy blocks founder_social option", () => {
  const p = project();
  const founderFit = fit({ brand_face_readiness: "never" });
  const baseline = buildCmoIntake({ project: p, persona: "marketing", draft: true });
  const narrative = synthesizeGrowthNarrative({ project: p, founderFit });
  const decision = buildStrategicDecision({
    project: p,
    founderFit,
    narrative,
    baselineThesis: baseline,
  });
  const founder = decision.options.find((o) => o.thesis_id === "founder_social");
  if (founder) assert.equal(founder.eligible, false);
  assert.notEqual(decision.recommended_id, founder?.id);
});

test("seal → final thesis → mechanism week1 ids", () => {
  const p = project();
  const founderFit = fit();
  const baseline = buildCmoIntake({ project: p, persona: "marketing", draft: true });
  const narrative = synthesizeGrowthNarrative({ project: p, founderFit });
  const decision = buildStrategicDecision({
    project: p,
    founderFit,
    narrative,
    baselineThesis: baseline,
  });
  const selected = decision.options.find((o) => o.id === decision.recommended_id);
  const sealed = sealStrategicDecision(decision, selected.id, "2026-07-20T00:00:00.000Z");
  const finalThesis = buildFinalChannelThesis({
    project: p,
    persona: "marketing",
    founder_fit: founderFit,
    selected_option: selected,
    narrative,
  });
  assert.ok(finalThesis.week1_priorities.every((t) => t.id.includes(".w1.")));
  assert.ok(sealed.sealed_at);
});

test("generic preview before seal, personalized after", () => {
  const p = project();
  const thesis = buildCmoIntake({ project: p, persona: "marketing", draft: true });
  const generic = resolveWeek1PreviewTasks(thesis, false);
  assert.equal(generic.generic, true);
  const personalized = resolveWeek1PreviewTasks({ ...thesis, draft: false }, true);
  assert.equal(personalized.generic, false);
});

test("revenue step only for paying_customers win", () => {
  assert.equal(needsRevenueStep(fit()), false);
  assert.equal(needsRevenueStep(fit({ thirty_day_win: "paying_customers" })), true);
  const steps = resolveLaunchReadinessSteps({
    founderFit: fit({ thirty_day_win: "paying_customers" }),
    measurementReady: true,
  });
  assert.ok(steps.steps.some((s) => s.id === "revenue"));
});

test("week1 ready without activation for signup win", () => {
  assert.equal(
    isWeek1Ready({ founderFit: fit({ thirty_day_win: "qualified_signups" }) }),
    true,
  );
  assert.equal(
    isWeek1Ready({
      founderFit: fit({ thirty_day_win: "paying_customers" }),
      revenueProfile: undefined,
    }),
    false,
  );
});

test("contract view from sealed decision", () => {
  const p = project();
  const founderFit = fit();
  const baseline = buildCmoIntake({ project: p, persona: "marketing", draft: true });
  const narrative = synthesizeGrowthNarrative({ project: p, founderFit });
  const decision = buildStrategicDecision({
    project: p,
    founderFit,
    narrative,
    baselineThesis: baseline,
  });
  const sealed = sealStrategicDecision(decision, decision.recommended_id, "2026-07-20T00:00:00.000Z");
  const profile = { strategic_decision: sealed };
  const view = buildContractView(profile);
  assert.ok(view?.cmoCommits.length);
  assert.ok(view?.founderCommits.length);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
