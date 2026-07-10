import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOfflinePlanOutline } from "./offlinePlanOutline";

describe("buildOfflinePlanOutline", () => {
  it("builds preview plan from scan profile", () => {
    const plan = buildOfflinePlanOutline({
      id: "abc",
      source: { kind: "folder", path: "C:/app" },
      name: "Acme App",
      framework: "next",
      routes: ["app/page.tsx"],
      hasAnalytics: false,
      excludedPaths: [],
      scannedFileCount: 120,
    });
    assert.equal(plan.preview, true);
    assert.ok(plan.playbooks.length >= 3);
    assert.ok(plan.thesis?.includes("Acme App"));
    assert.ok(plan.taskGraph.length > 0);
  });

  it("prefers app/page.tsx in thesis when present", () => {
    const plan = buildOfflinePlanOutline({
      id: "x",
      source: { kind: "folder", path: "/p" },
      name: "P",
      routes: ["app/page.tsx", "app/about/page.tsx"],
      hasAnalytics: true,
      excludedPaths: [],
      scannedFileCount: 10,
    });
    assert.match(plan.thesis ?? "", /app\/page\.tsx/);
  });

  it("prioritizes sales outbound for sales persona", () => {
    const plan = buildOfflinePlanOutline(
      {
        id: "s",
        source: { kind: "folder", path: "/p" },
        name: "SalesCo",
        routes: ["app/page.tsx"],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 50,
      },
      { persona: "sales" },
    );
    assert.equal(plan.primaryPlaybookId, "sales-outbound");
    assert.ok(plan.readiness.some((r) => r.label.includes("Outbound")));
  });
});
