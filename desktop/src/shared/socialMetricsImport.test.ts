import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSocialMetricsImport } from "./socialMetricsImport";

describe("socialMetricsImport", () => {
  it("parseSocialMetricsImport parses generic CSV views", () => {
    const csv = "date,views,retention_3s_pct\n2026-07-01,400,55\n2026-07-02,447,62";
    const result = parseSocialMetricsImport(csv, "generic", 3);
    assert.equal(result.errors.length, 0);
    assert.ok(result.kpis.some((k) => k.id === "short_form_views"));
    assert.equal(result.kpis.find((k) => k.id === "short_form_views")?.value, 847);
    assert.ok(result.importNote.includes("Imported from platform analytics"));
    const viewsKpi = result.kpis.find((k) => k.id === "short_form_views");
    assert.ok(viewsKpi?.snapshots?.some((s) => s.day_index === 3 && s.source === "import"));
  });

  it("parseSocialMetricsImport parses Reels JSON", () => {
    const json = JSON.stringify({ views: 1200, reach: 900 });
    const result = parseSocialMetricsImport(json, "reels", 5);
    assert.equal(result.errors.length, 0);
    assert.equal(result.kpis[0]?.value, 1200);
    assert.ok(result.kpis[0]?.import_note);
  });

  it("parseSocialMetricsImport rejects empty paste", () => {
    const result = parseSocialMetricsImport("  ", "tiktok");
    assert.equal(result.kpis.length, 0);
    assert.ok(result.errors.length > 0);
  });
});
