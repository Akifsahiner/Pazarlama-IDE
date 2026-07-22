#!/usr/bin/env node
/**
 * P18 thesis quality matrix — ≥100 scenario benchmark (Phase A, no API).
 * Run: node --import tsx evals/thesis-quality-matrix.mjs
 */
import { assertThesisQualityEvidence, evaluateThesisQuality } from "../../desktop/src/shared/cmoThesisQualityEngine.ts";
import { THESIS_SCENARIO_CORPUS, corpusCount } from "../../desktop/src/shared/eval/thesisScenarioCorpus.ts";

const tagFilter = process.argv.find((a) => a.startsWith("--tag="))?.slice(6);

let passed = 0;
let failed = 0;
let wrongPrimary = 0;

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

console.log(`Thesis quality matrix (${corpusCount()} scenarios)\n`);

const scenarios = tagFilter
  ? THESIS_SCENARIO_CORPUS.filter((s) => s.tags.includes(tagFilter))
  : THESIS_SCENARIO_CORPUS;

assert(scenarios.length >= 100, "corpus has ≥100 scenarios", `got ${scenarios.length}`);

for (const scenario of scenarios) {
  const project = {
    id: scenario.project.id ?? "p",
    source: scenario.project.source ?? { kind: "folder", path: "/p" },
    name: scenario.project.name ?? "Product",
    framework: scenario.project.framework ?? "Next.js",
    routes: scenario.project.routes ?? ["app/page.tsx"],
    hasAnalytics: scenario.project.hasAnalytics ?? false,
    excludedPaths: scenario.project.excludedPaths ?? [],
    scannedFileCount: scenario.project.scannedFileCount ?? 50,
    readmeSummary: scenario.project.readmeSummary ?? "",
  };

  const report = evaluateThesisQuality({
    project,
    persona: scenario.persona ?? "marketing",
    profile: scenario.profile,
    founder_fit: scenario.founder_fit,
  });

  if (report.primary_thesis_id !== scenario.expect.primary_thesis_id) {
    wrongPrimary += 1;
    fail(
      `${scenario.id} primary thesis`,
      `expected ${scenario.expect.primary_thesis_id}, got ${report.primary_thesis_id}`,
    );
  } else {
    ok(`${scenario.id} primary thesis`);
  }

  for (const banned of scenario.expect.must_not_primary ?? []) {
    assert(
      report.primary_thesis_id !== banned,
      `${scenario.id} must not primary ${banned}`,
      `got ${report.primary_thesis_id}`,
    );
  }

  const evidenceErrors = assertThesisQualityEvidence(report);
  assert(
    evidenceErrors.length === 0,
    `${scenario.id} evidence quality`,
    evidenceErrors.join("; "),
  );

  if (scenario.expect.why_now_must_match) {
    const re = new RegExp(scenario.expect.why_now_must_match, "i");
    assert(
      report.why_now.some((line) => re.test(line)),
      `${scenario.id} product-specific why_now`,
      scenario.expect.why_now_must_match,
    );
  }
}

const wrongRate = wrongPrimary / scenarios.length;
console.log(`\nWrong primary: ${wrongPrimary}/${scenarios.length} (${(wrongRate * 100).toFixed(1)}%)`);
console.log(`Passed: ${passed}, Failed: ${failed}`);

if (wrongRate > 0.03) {
  fail("wrong channel rate ≤ 3%", `${(wrongRate * 100).toFixed(1)}%`);
}

process.exit(failed > 0 ? 1 : 0);
