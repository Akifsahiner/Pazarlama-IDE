import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import { createOpsCadenceFromThesis, completeOpsTask } from "./cmoOpsCadence";
import {
  evaluateDayPulse,
  resolveActivePulseCheckpoint,
  resolveHonestEmptyKpiCopy,
} from "./measurementPulse";
import type { ProjectProfile } from "./types";

function baseProject(): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
  };
}

describe("measurementPulse", () => {
  it("resolveActivePulseCheckpoint returns null before day 3", () => {
    assert.equal(resolveActivePulseCheckpoint(1), null);
    assert.equal(resolveActivePulseCheckpoint(2), null);
  });

  it("resolveActivePulseCheckpoint picks highest passed checkpoint", () => {
    assert.equal(resolveActivePulseCheckpoint(3), 3);
    assert.equal(resolveActivePulseCheckpoint(5), 5);
    assert.equal(resolveActivePulseCheckpoint(7), 7);
    assert.equal(resolveActivePulseCheckpoint(10), 7);
  });

  it("resolveHonestEmptyKpiCopy is thesis-specific", () => {
    const copy = resolveHonestEmptyKpiCopy("viral_short_form");
    assert.match(copy, /24–72h/i);
    assert.doesNotMatch(copy, /Not measured yet/i);
  });

  it("evaluateDayPulse hidden before day 3", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = createOpsCadenceFromThesis(thesis);
    assert.equal(evaluateDayPulse({ cadence, thesis }), null);
  });

  it("evaluateDayPulse visible at day 3 with insufficient_data when no KPIs", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    let cadence = createOpsCadenceFromThesis(thesis);
    cadence = { ...cadence, day_index: 3 };
    const pulse = evaluateDayPulse({ cadence, thesis, profile: { manual_kpis: [] } as never });
    assert.ok(pulse);
    assert.equal(pulse!.checkpoint, 3);
    assert.equal(pulse!.verdict, "insufficient_data");
    assert.equal(pulse!.visible, true);
  });

  it("evaluateDayPulse includes Day 3 ritual question", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    let cadence = createOpsCadenceFromThesis(thesis);
    cadence = { ...cadence, day_index: 3 };
    const pulse = evaluateDayPulse({ cadence, thesis, profile: { manual_kpis: [] } as never });
    assert.ok(pulse);
    assert.equal(pulse!.checkpoint, 3);
    assert.match(pulse!.title, /Day 3 Pulse/i);
    assert.ok(pulse!.ritualQuestion);
    assert.match(pulse!.ritualQuestion!, /retention|KPI/i);
  });

  it("evaluateDayPulse promising when KPI exceeds target", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    let cadence = createOpsCadenceFromThesis(thesis);
  for (const t of cadence.tasks.filter((x) => x.owner === "system")) {
    cadence = completeOpsTask(cadence, t.id, { metric_snapshot: "1" }).cadence;
  }
  for (const t of cadence.tasks.filter((x) => x.owner === "user")) {
    cadence = completeOpsTask(cadence, t.id, {
      urls: ["https://tiktok.com/@u/v/1"],
      kpi_value: 847,
      metric_snapshot: "847 views",
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
      } as never,
    });
    assert.ok(pulse);
    assert.equal(pulse!.verdict, "promising");
    assert.match(pulse!.primaryKpi.display, /847/);
    assert.ok(pulse!.primaryKpi.pct != null && pulse!.primaryKpi.pct >= 100);
  });
});
