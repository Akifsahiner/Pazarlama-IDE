#!/usr/bin/env node
/**
 * Faz 6 — Day 3 Pulse: 8 thesis × verdict matrix + honest measurement gates.
 */
import assert from "node:assert/strict";
import { buildCmoIntake } from "../../desktop/src/shared/cmoIntake.ts";
import { createOpsCadenceFromThesis, completeOpsTask } from "../../desktop/src/shared/cmoOpsCadence.ts";
import { createDistributionOperatorFromThesis } from "../../desktop/src/shared/cmoDistributionOperator.ts";
import { createInfluencerOperatorFromThesis } from "../../desktop/src/shared/cmoInfluencerOperator.ts";
import {
  evaluateDayPulse,
  resolveActivePulseCheckpoint,
  resolveHonestEmptyKpiCopy,
} from "../../desktop/src/shared/measurementPulse.ts";
import { buildHookLeaderboard } from "../../desktop/src/shared/hookLeaderboard.ts";
import { parseSocialMetricsImport } from "../../desktop/src/shared/socialMetricsImport.ts";
import {
  evaluateWeek1MetricsWithGa4Priority,
  hasGa4Connected,
  readGa4MetricValue,
} from "../../desktop/src/shared/cmoProofLoop.ts";
import { formatExecutionResults } from "../../desktop/src/shared/executionRecord.ts";

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
  id: "eval-f6",
  source: { kind: "folder", path: "/p" },
  name: "EvalCo",
  framework: "Next",
  routes: ["app/page.tsx"],
  hasAnalytics: false,
  excludedPaths: [],
  scannedFileCount: 10,
};

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`  ok ${name}`);
}

function fail(name, err) {
  failed += 1;
  console.error(`  FAIL ${name}`, err);
}

for (const thesisId of THESIS_IDS) {
  try {
    const thesis = buildCmoIntake({
      project,
      persona: thesisId === "outbound_sales" ? "sales" : "marketing",
      context: { force_thesis_id: thesisId },
    });
    assert.equal(thesis.id, thesisId);

    const emptyCopy = resolveHonestEmptyKpiCopy(thesisId);
    assert.ok(emptyCopy.length > 10, `${thesisId}: honest empty`);
    assert.doesNotMatch(emptyCopy, /Not measured yet/i, `${thesisId}: no generic empty`);

    const chips = formatExecutionResults({
      thesisId,
      cadence: createOpsCadenceFromThesis(thesis),
    });
    const emptyChip = chips.find((c) => c.id === "results-empty");
    if (emptyChip) {
      assert.doesNotMatch(emptyChip.value ?? "", /Not measured yet/i);
    }

    let cadence = createOpsCadenceFromThesis(thesis);
    assert.equal(resolveActivePulseCheckpoint(2), null);
    cadence = { ...cadence, day_index: 3 };
    assert.equal(resolveActivePulseCheckpoint(3), 3);

    let distributionOperator;
    if (thesisId === "viral_short_form" || thesisId === "founder_social") {
      distributionOperator = createDistributionOperatorFromThesis(thesis, { week_index: 1 });
    }

    const pulseEmpty = evaluateDayPulse({
      cadence,
      thesis,
      profile: { manual_kpis: [] },
      distributionOperator,
    });
    assert.ok(pulseEmpty, `${thesisId}: pulse at day 3`);
    assert.equal(pulseEmpty.checkpoint, 3);
    assert.equal(pulseEmpty.verdict, "insufficient_data");

    if (distributionOperator) {
      const rows = buildHookLeaderboard(distributionOperator);
      assert.ok(rows.length > 0, `${thesisId}: hook leaderboard rows`);
    }

    ok(`${thesisId} honest empty + day 3 pulse`);
  } catch (err) {
    fail(`${thesisId} matrix`, err);
  }
}

try {
  const thesis = buildCmoIntake({
    project,
    persona: "marketing",
    context: { force_thesis_id: "viral_short_form" },
  });
  let cadence = createOpsCadenceFromThesis(thesis);
  for (const t of cadence.tasks.filter((x) => x.owner === "system")) {
    cadence = completeOpsTask(cadence, t.id, { metric_snapshot: "1" }).cadence;
  }
  for (const t of cadence.tasks.filter((x) => x.owner === "user")) {
    cadence = completeOpsTask(cadence, t.id, {
      urls: ["https://tiktok.com/v/1"],
      kpi_value: 847,
      metric_snapshot: "847",
      kpi_id: "short_form_views",
    }).cadence;
  }
  cadence = { ...cadence, day_index: 3 };
  const pulse = evaluateDayPulse({
    cadence,
    thesis,
    profile: {
      manual_kpis: [
        {
          id: "short_form_views",
          name: "Views",
          value: 847,
          target: 500,
          source: "manual",
          updated_at: new Date().toISOString(),
        },
      ],
    },
  });
  assert.equal(pulse?.verdict, "promising");
  ok("promising verdict at 169% of target");
} catch (err) {
  fail("promising verdict", err);
}

try {
  const thesis = buildCmoIntake({
    project,
    persona: "marketing",
    context: { force_thesis_id: "viral_short_form" },
  });
  let cadence = createOpsCadenceFromThesis(thesis);
  for (const t of cadence.tasks.filter((x) => x.owner === "system")) {
    cadence = completeOpsTask(cadence, t.id, { metric_snapshot: "1" }).cadence;
  }
  for (const t of cadence.tasks.filter((x) => x.owner === "user")) {
    cadence = completeOpsTask(cadence, t.id, {
      urls: ["https://tiktok.com/v/1"],
      kpi_value: 0,
      metric_snapshot: "0",
      kpi_id: "short_form_views",
    }).cadence;
  }
  cadence = { ...cadence, day_index: 5 };
  const pulse = evaluateDayPulse({
    cadence,
    thesis,
    profile: {
      manual_kpis: [
        {
          id: "short_form_views",
          name: "Views",
          value: 0,
          target: 500,
          source: "manual",
          updated_at: new Date().toISOString(),
        },
      ],
    },
  });
  assert.equal(pulse?.verdict, "flat");
  ok("flat verdict for honest zero");
} catch (err) {
  fail("flat verdict", err);
}

try {
  const profile = {
    manual_kpis: [],
    connector_snapshots: {
      ga4: {
        fetched_at: new Date().toISOString(),
        metrics: [{ name: "sessions", value: 420 }],
      },
    },
    ga4_oauth: { refresh_token: "tok" },
  };
  assert.equal(hasGa4Connected(profile), true);
  assert.equal(readGa4MetricValue(profile, "sessions"), 420);

  const thesis = buildCmoIntake({
    project: { ...project, hasAnalytics: true },
    persona: "marketing",
    context: { force_thesis_id: "landing_conversion" },
  });
  let cadence = createOpsCadenceFromThesis(thesis);
  for (const t of cadence.tasks.filter((x) => x.owner === "system")) {
    cadence = completeOpsTask(cadence, t.id, { metric_snapshot: "1" }).cadence;
  }
  for (const t of cadence.tasks.filter((x) => x.owner === "user")) {
    cadence = completeOpsTask(cadence, t.id, {
      urls: ["https://example.com/landing"],
      kpi_value: 420,
      metric_snapshot: "420 sessions",
      kpi_id: "targeted_visitors",
      kpi_source: "ga4",
    }).cadence;
  }
  cadence = { ...cadence, day_index: 7 };
  const assessment = evaluateWeek1MetricsWithGa4Priority(cadence, profile, thesis);
  assert.equal(assessment.kpiSourceUsed, "ga4");
  const pulse = evaluateDayPulse({ cadence, thesis, profile });
  assert.equal(pulse?.sourceUsed, "ga4");
  ok("GA4 priority when connected");
} catch (err) {
  fail("GA4 priority", err);
}

try {
  const profileNoGa4 = { manual_kpis: [] };
  assert.equal(hasGa4Connected(profileNoGa4), false);
  assert.equal(readGa4MetricValue(profileNoGa4, "sessions"), null);
  const thesis = buildCmoIntake({
    project,
    persona: "marketing",
    context: { force_thesis_id: "landing_conversion" },
  });
  const cadence = { ...createOpsCadenceFromThesis(thesis), day_index: 3 };
  const assessment = evaluateWeek1MetricsWithGa4Priority(cadence, profileNoGa4, thesis);
  assert.notEqual(assessment.kpiSourceUsed, "ga4");
  ok("zero fake GA4 when not connected");
} catch (err) {
  fail("zero fake GA4", err);
}

try {
  const csv = "date,views\n2026-07-01,500\n";
  const result = parseSocialMetricsImport(csv, "tiktok", 3);
  assert.ok(result.kpis.length > 0);
  assert.ok(result.kpis[0].import_note?.includes("Imported from platform analytics"));
  ok("social import → manual_kpi + import_note");
} catch (err) {
  fail("social import", err);
}

console.log(`\nproof-loop-matrix: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
