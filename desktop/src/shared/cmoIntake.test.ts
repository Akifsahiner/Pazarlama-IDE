import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake, cluelyLikeReadme } from "./cmoIntake";
import type { ProjectProfile } from "./types";

function baseProject(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/console/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS for teams.",
    ...overrides,
  };
}

describe("buildCmoIntake", () => {
  it("Cluely-like consumer viral → viral_short_form not landing-only", () => {
    const thesis = buildCmoIntake({
      project: baseProject({
        name: "Cluely",
        readmeSummary: cluelyLikeReadme(),
        productType: "saas",
      }),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    assert.equal(thesis.id, "viral_short_form");
    assert.equal(thesis.primary_bottleneck, "awareness");
    assert.match(thesis.headline, /short-form/i);
    assert.ok(thesis.deprioritize.some((d) => /SEO/i.test(d)));
    assert.equal(thesis.week1_priorities.length, 4);
    assert.ok(thesis.week1_priorities.every((p) => p.id));
    assert.equal(thesis.week1_priorities[0]?.owner, "system");
    assert.equal(thesis.week1_priorities[2]?.owner, "user");
    assert.equal(thesis.week1_priorities[3]?.owner, "user");
  });

  it("B2B devtools prelaunch → founder_social", () => {
    const thesis = buildCmoIntake({
      project: baseProject({
        readmeSummary: "Developer API SDK for B2B teams. Open source CLI.",
        routes: ["apps/web/app/page.tsx", "apps/web/app/docs/page.tsx"],
      }),
      persona: "marketing",
      profile: { company_stage: "prelaunch", business_model: "saas" } as never,
    });
    assert.equal(thesis.id, "founder_social");
  });

  it("sales persona empty pipeline → outbound_sales", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "sales",
      profile: { sales_pipeline_empty: true } as never,
    });
    assert.equal(thesis.id, "outbound_sales");
    assert.equal(thesis.primary_bottleneck, "revenue");
  });

  it("launch in 14 days → product_hunt_launch", () => {
    const thesis = buildCmoIntake({
      project: baseProject({ hasAnalytics: true }),
      persona: "marketing",
      profile: { days_until_launch: 14, company_stage: "prelaunch" } as never,
    });
    assert.equal(thesis.id, "product_hunt_launch");
  });

  it("URL-only stub → not_ready", () => {
    const thesis = buildCmoIntake({
      project: baseProject({
        source: { kind: "url", url: "https://example.com" },
        scannedFileCount: 0,
        routes: ["/"],
      }),
      persona: "marketing",
    });
    assert.equal(thesis.verdict, "not_ready");
  });

  it("sets hero signal from monorepo route", () => {
    const thesis = buildCmoIntake({
      project: baseProject({
        monorepoRoot: "apps/console",
        routes: ["apps/console/app/page.tsx"],
      }),
      persona: "marketing",
    });
    assert.equal(thesis.signals.hero, "apps/console/app/page.tsx");
  });
});
