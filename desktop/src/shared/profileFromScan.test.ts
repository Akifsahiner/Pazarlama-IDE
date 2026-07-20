import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { profileFromProjectScan, inferChannelsFromScan } from "./profileFromScan";
import { parseMentionsFromText } from "./mentionParse";
import type { ProjectProfile } from "./types";

const sample: ProjectProfile = {
  id: "p1",
  source: { kind: "folder", path: "/tmp/app" },
  name: "Acme",
  framework: "Next.js 15",
  routes: ["/", "/pricing", "apps/console/app/blog/page.tsx"],
  hasAnalytics: true,
  excludedPaths: [],
  scannedFileCount: 2856,
  readmeSummary: "Launch SaaS",
  monorepoRoot: "apps/console",
  appPackages: ["apps/console"],
};

describe("profileFromProjectScan", () => {
  it("fills site_structure, channels, and tracking", () => {
    const p = profileFromProjectScan(sample);
    assert.equal(p.product_name, "Acme");
    assert.equal(p.site_structure?.framework, "Next.js 15");
    assert.equal(p.site_structure?.monorepo_root, "apps/console");
    assert.equal(p.tracking_flags?.ga4, "detected");
    assert.ok(p.available_channels?.includes("analytics"));
    assert.ok(p.available_channels?.includes("content"));
    assert.ok(p.confidence_score >= 0.5);
  });

  it("adds P17 growth scan gaps for missing share/template surfaces", () => {
    const p = profileFromProjectScan(
      {
        ...sample,
        routes: ["/signup", "/pricing"],
        readmeSummary: "Horizontal SaaS workspace platform",
      },
      {
        business_model: "saas",
        category: "SaaS",
      } as import("./types").MarketingProfile,
    );
    assert.ok(p.gaps?.includes("growth.share_surface_missing"));
    assert.ok(p.gaps?.includes("growth.template_surface_missing"));
    assert.ok(p.scan_gaps?.includes("growth.share_surface_missing"));
  });

  it("Part 6 — builds product_understanding graph", () => {
    const p = profileFromProjectScan(sample);
    assert.ok(p.product_understanding?.claims.length);
    assert.ok((p.scan_gaps?.length ?? 0) >= 0);
  });
});

describe("inferChannelsFromScan", () => {
  it("detects seo for Next apps", () => {
    const ch = inferChannelsFromScan(sample);
    assert.ok(ch.channels.includes("seo"));
    assert.equal(ch.category, "Web app");
  });
});

describe("parseMentionsFromText", () => {
  it("extracts file paths from @syntax", () => {
    const m = parseMentionsFromText("Fix @apps/console/page.tsx and @README.md");
    assert.equal(m.length, 2);
    assert.equal(m[0]?.path, "apps/console/page.tsx");
  });
});
