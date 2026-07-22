import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appendKpiSnapshot, buildKpiTrendSeries, countFlatPulseCheckpoints, hasTrendData } from "./kpiTrendSeries";
import type { ManualKpi } from "./types";

describe("kpiTrendSeries", () => {
  it("appendKpiSnapshot dedupes by day_index", () => {
    const kpi: ManualKpi = {
      id: "short_form_views",
      name: "Views",
      value: 100,
      source: "manual",
      updated_at: new Date().toISOString(),
      snapshots: [{ day_index: 1, value: 50, recorded_at: "t1", source: "manual" }],
    };
    const next = appendKpiSnapshot(kpi, { day_index: 1, value: 100, source: "proof" });
    assert.equal(next.snapshots?.length, 1);
    assert.equal(next.snapshots![0]!.value, 100);
    assert.equal(next.snapshots![0]!.source, "proof");
  });

  it("buildKpiTrendSeries merges manual snapshots", () => {
    const points = buildKpiTrendSeries(
      { day_index: 5, thesis_id: "viral_short_form", tasks: [] } as never,
      {
        manual_kpis: [
          {
            id: "short_form_views",
            name: "Views",
            value: 500,
            source: "manual",
            updated_at: "t",
            snapshots: [
              { day_index: 1, value: 100, recorded_at: "t", source: "manual" },
              { day_index: 3, value: 300, recorded_at: "t", source: "import" },
            ],
          },
        ],
      } as never,
      "short_form_views",
    );
    assert.equal(points.length, 2);
    assert.ok(hasTrendData(points));
  });

  it("hasTrendData requires 2+ points", () => {
    assert.equal(hasTrendData([{ day_index: 1, value: 1, source: "manual" }]), false);
    assert.equal(
      hasTrendData([
        { day_index: 1, value: 1, source: "manual" },
        { day_index: 3, value: 2, source: "manual" },
      ]),
      true,
    );
  });

  it("manual snapshot wins over GA4 on same day", () => {
    const points = buildKpiTrendSeries(
      { day_index: 3, thesis_id: "landing_conversion", tasks: [] } as never,
      {
        manual_kpis: [
          {
            id: "targeted_visitors",
            name: "Sessions",
            value: 500,
            source: "manual",
            updated_at: "t",
            snapshots: [{ day_index: 3, value: 500, recorded_at: "t", source: "manual" }],
          },
        ],
        connector_snapshots: {
          ga4: { fetched_at: "t", metrics: [{ name: "sessions", value: 999 }] },
        },
      } as never,
      "targeted_visitors",
    );
    const day3 = points.find((p) => p.day_index === 3);
    assert.equal(day3?.value, 500);
    assert.equal(day3?.source, "manual");
  });

  it("countFlatPulseCheckpoints counts sub-50% days at Day 3+", () => {
    const flat = countFlatPulseCheckpoints(
      [
        { day_index: 3, value: 100, source: "manual" },
        { day_index: 5, value: 120, source: "manual" },
      ],
      500,
    );
    assert.equal(flat, 2);
  });
});
