import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake, explainThesisPick } from "./cmoIntake";
import { buildProductUnderstanding } from "./productUnderstandingPolicy";
import { bindSignalsToClaims } from "./productUnderstandingSignalBind";
import type { ProjectProfile } from "./types";

const baseProject: ProjectProfile = {
  id: "matrix",
  source: { kind: "folder", path: "/fixture" },
  name: "Fixture",
  framework: "Next.js",
  routes: ["app/page.tsx"],
  hasAnalytics: false,
  excludedPaths: [],
  scannedFileCount: 50,
};

const MATRIX: Array<{
  class: string;
  readme: string;
  routes: string[];
  persona: "marketing" | "sales";
  profile?: Record<string, unknown>;
  expectThesis: RegExp;
}> = [
  {
    class: "b2b_saas",
    readme: "B2B SaaS revenue intelligence for sales teams and workspaces",
    routes: ["app/page.tsx", "app/pricing/page.tsx", "app/signup/page.tsx"],
    persona: "marketing" as const,
    expectThesis: /founder_social|landing_conversion|outbound/,
  },
  {
    class: "consumer_viral",
    readme: "Viral consumer AI assistant — cheat on everything, TikTok hooks",
    routes: ["app/page.tsx"],
    persona: "marketing" as const,
    expectThesis: /viral_short_form/,
  },
  {
    class: "devtools",
    readme: "Open source CLI and SDK for developers — API docs included",
    routes: ["app/page.tsx", "docs/api/page.tsx"],
    persona: "marketing" as const,
    expectThesis: /community_launch|founder_social|landing/,
  },
  {
    class: "sales_led",
    readme: "Enterprise sales enablement platform",
    routes: ["app/pricing/page.tsx"],
    persona: "sales" as const,
    profile: { sales_pipeline_empty: true, business_model: "saas" },
    expectThesis: /outbound_sales/,
  },
  {
    class: "launch_window",
    readme: "Launching our product next week on Product Hunt",
    routes: ["app/page.tsx", "app/pricing/page.tsx"],
    persona: "marketing" as const,
    profile: { days_until_launch: 14, company_stage: "prelaunch" },
    expectThesis: /product_hunt_launch/,
  },
];

describe("productUnderstandingMatrix — 5 product classes", () => {
  for (const row of MATRIX) {
    it(`${row.class} — thesis pick + signal bindings + matched_rules`, () => {
      const project: ProjectProfile = {
        ...baseProject,
        readmeSummary: row.readme,
        routes: [...row.routes],
        scanCitations: {
          readme: {
            path: "README.md",
            excerpt: row.readme,
            startLine: 1,
            endLine: 3,
          },
        },
      };
      const profile = {
        business_model: "saas",
        founder_fit: {
          completed_at: "2026-01-01",
          weekly_marketing_hours: "3_7",
          monthly_budget_band: "under_500",
          brand_face_readiness: "never",
          controversy_tolerance: "avoid",
          magic_moment: "First signup completes onboarding",
          thirty_day_win: "qualified_signups",
          scale_readiness: "probably",
        },
        target_audience: [{ persona: "Founder", pains: [] as string[], jobs: [] as string[] }],
        product_activation: {
          activation_event_label: "First signup completes onboarding",
          confidence: "measured" as const,
          metric_confidence: {} as Record<string, string>,
          updated_at: "2026-01-01",
        },
        ...(row.profile ?? {}),
      };

      const graph = buildProductUnderstanding({ project, profile: profile as never });
      assert.ok(graph && graph.claims.length >= 6, `${row.class} should build ≥6 claims`);

      const thesis = buildCmoIntake({
        project,
        persona: row.persona,
        profile: { ...(profile as object), product_understanding: graph ?? undefined } as never,
        draft: true,
      });

      assert.match(thesis.id, row.expectThesis);
      assert.ok(thesis.thesis_decision?.matched_rules.length, "matched_rules required");
      assert.ok(thesis.rationale_claim_ids?.length, "rationale_claim_ids required");

      const bindings = bindSignalsToClaims(thesis.signals, graph);
      assert.ok(bindings.length >= 4, `${row.class} should bind ≥4 signal→claim rows`);
      assert.ok(
        bindings.some((b) => b.claim_id.startsWith("claim.")),
        "bindings must reference claim ids",
      );
    });
  }

  it("explainThesisPick returns auditable rules for viral consumer", () => {
    const pick = explainThesisPick(
      { project: baseProject, persona: "marketing" },
      {
        heroPath: "app/page.tsx",
        hasBlog: false,
        hasPricing: false,
        hasSignup: false,
        isUrlOnly: false,
        isDevTool: false,
        isConsumer: true,
        isB2bSaas: false,
        readmeLower: "viral consumer tiktok",
        controversialOrViral: true,
        companyStage: "prelaunch",
        hasAnalytics: false,
        salesPipelineEmpty: false,
      },
      "awareness",
    );
    assert.equal(pick.id, "viral_short_form");
    assert.ok(pick.matched_rules.includes("signal.controversial_hook"));
  });
});
