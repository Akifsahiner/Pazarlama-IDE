import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assessMeasurementBaseline } from "./measurementBaseline";
import type { MarketingProfile, ProjectProfile } from "./types";

function baseProject(overrides?: Partial<ProjectProfile>): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: [],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 10,
    ...overrides,
  };
}

describe("measurementBaseline", () => {
  it("ready when GA4 connected", () => {
    const profile = {
      ga4_oauth: { refresh_token: "x", connected_at: "2026-01-01" },
    } as MarketingProfile;
    const a = assessMeasurementBaseline(profile, baseProject());
    assert.equal(a.ready, true);
    assert.ok(a.sources.includes("ga4_connected"));
  });

  it("ready when manual KPI logged", () => {
    const profile = {
      manual_kpis: [{ id: "targeted_visitors", name: "Visitors", value: 42 }],
    } as MarketingProfile;
    const a = assessMeasurementBaseline(profile, baseProject());
    assert.equal(a.ready, true);
    assert.ok(a.sources.includes("manual_kpi"));
  });

  it("ready with measurement ack when snippet missing", () => {
    const profile = {
      product_activation: { activation_event_label: "signup" },
      measurement_ack: { acknowledged_at: "2026-01-01", note: "manual" },
    } as unknown as MarketingProfile;
    const a = assessMeasurementBaseline(profile, baseProject());
    assert.equal(a.ready, true);
    assert.ok(a.sources.includes("measurement_ack"));
  });

  it("not ready without any baseline path", () => {
    const a = assessMeasurementBaseline(null, baseProject());
    assert.equal(a.ready, false);
    assert.ok(a.missing.length > 0);
  });
});
