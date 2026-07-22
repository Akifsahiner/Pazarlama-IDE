import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSocialMetricsImport, mergeDistributionImportHints } from "./socialMetricsImport";
import { buildCmoIntake } from "./cmoIntake";
import { createDistributionOperatorFromThesis } from "./cmoDistributionOperator";

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

  it("parseSocialMetricsImport derives TikTok retention from watch time", () => {
    const csv = "video views,avg watch time,video duration\n1000,4.2,15\n800,2.1,12";
    const result = parseSocialMetricsImport(csv, "tiktok", 3);
    assert.ok(result.kpis.some((k) => k.id === "short_form_views"));
    assert.ok(result.kpis.some((k) => k.id === "hook_retention_3s_pct"));
    assert.ok((result.distributionHints?.[0]?.retention_3s_pct ?? 0) > 0);
  });

  it("mergeDistributionImportHints backfills slot metrics", () => {
    const thesis = buildCmoIntake({
      project: {
        id: "p1",
        source: { kind: "folder", path: "/p" },
        name: "Co",
        framework: "Next",
        routes: [],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 10,
      },
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const ws = createDistributionOperatorFromThesis(thesis, { week_index: 1 });
    assert.ok(ws);
    const merged = mergeDistributionImportHints(
      ws,
      [{ views_24h: 847, retention_3s_pct: 62 }],
      3,
    );
    const slot = merged.slots.find((s) => s.slot_kind === "post" && s.day_index <= 3);
    assert.ok(slot?.proof?.views_24h === 847);
    assert.ok(slot?.proof?.retention_3s_pct === 62);
  });

  it("parseSocialMetricsImport rejects empty paste", () => {
    const result = parseSocialMetricsImport("  ", "tiktok");
    assert.equal(result.kpis.length, 0);
    assert.ok(result.errors.length > 0);
  });
});
