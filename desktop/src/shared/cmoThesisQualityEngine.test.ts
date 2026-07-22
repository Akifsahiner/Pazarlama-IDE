import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cluelyLikeReadme } from "./cmoIntake";
import {
  assertThesisQualityEvidence,
  evaluateThesisQuality,
  GENERIC_THESIS_RATIONALE_RE,
} from "./cmoThesisQualityEngine";
import { THESIS_SCENARIO_CORPUS, corpusCount } from "./eval/thesisScenarioCorpus";
import type { FounderFitProfile, MarketingProfile, ProjectProfile } from "./types";

const NOW = "2026-07-16T00:00:00.000Z";

function founderFit(overrides: Partial<FounderFitProfile> = {}): FounderFitProfile {
  return {
    brand_face_readiness: "primary_channel",
    controversy_tolerance: "lean_in",
    monthly_budget_band: "500_2000",
    scale_readiness: "probably",
    magic_moment: "Gets value in under two minutes",
    weekly_marketing_hours: "7_15",
    thirty_day_win: "brand_awareness",
    completed_at: NOW,
    ...overrides,
  };
}

function project(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Cluely",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: cluelyLikeReadme(),
    ...overrides,
  };
}

describe("cmoThesisQualityEngine", () => {
  it("Cluely-like → viral_short_form not seo_content", () => {
    const report = evaluateThesisQuality({
      project: project(),
      profile: { product_name: "Cluely", company_stage: "prelaunch", business_model: "consumer" } as MarketingProfile,
      founder_fit: founderFit(),
    });
    assert.equal(report.primary_thesis_id, "viral_short_form");
    assert.notEqual(report.primary_thesis_id, "seo_content");
    assert.ok(report.why_now.some((line) => /Cluely/i.test(line)));
    assert.equal(assertThesisQualityEvidence(report).length, 0);
  });

  it("B2B sales empty pipeline → outbound_sales", () => {
    const report = evaluateThesisQuality({
      project: project({
        name: "RevSignal",
        readmeSummary: "B2B SaaS revenue intelligence for sales teams.",
      }),
      persona: "sales",
      profile: {
        product_name: "RevSignal",
        company_stage: "launched",
        business_model: "saas",
        sales_pipeline_empty: true,
      } as MarketingProfile,
      founder_fit: founderFit({ thirty_day_win: "pipeline_meetings" }),
    });
    assert.equal(report.primary_thesis_id, "outbound_sales");
  });

  it("why_now rejects generic copy pattern", () => {
    assert.ok(GENERIC_THESIS_RATIONALE_RE.test("post on social"));
  });

  it("corpus has at least 100 scenarios", () => {
    assert.ok(corpusCount() >= 100);
  });

  it("corpus wrong-primary rate ≤ 3%", () => {
    let wrong = 0;
    for (const scenario of THESIS_SCENARIO_CORPUS) {
      const p = {
        id: scenario.project.id ?? "p",
        source: scenario.project.source ?? { kind: "folder" as const, path: "/p" },
        name: scenario.project.name ?? "Product",
        framework: scenario.project.framework ?? "Next.js",
        routes: scenario.project.routes ?? ["app/page.tsx"],
        hasAnalytics: scenario.project.hasAnalytics ?? false,
        excludedPaths: scenario.project.excludedPaths ?? [],
        scannedFileCount: scenario.project.scannedFileCount ?? 50,
        readmeSummary: scenario.project.readmeSummary ?? "",
      } satisfies ProjectProfile;
      const report = evaluateThesisQuality({
        project: p,
        persona: scenario.persona ?? "marketing",
        profile: scenario.profile as MarketingProfile,
        founder_fit: scenario.founder_fit as FounderFitProfile | undefined,
      });
      if (report.primary_thesis_id !== scenario.expect.primary_thesis_id) wrong += 1;
      if (scenario.expect.must_not_primary?.includes(report.primary_thesis_id)) wrong += 1;
      const evidenceErrors = assertThesisQualityEvidence(report);
      assert.equal(evidenceErrors.length, 0, `${scenario.id} evidence: ${evidenceErrors.join("; ")}`);
      if (scenario.expect.why_now_must_match) {
        assert.ok(
          report.why_now.some((line) => new RegExp(scenario.expect.why_now_must_match!, "i").test(line)),
          `${scenario.id} why_now missing ${scenario.expect.why_now_must_match}`,
        );
      }
    }
    const rate = wrong / THESIS_SCENARIO_CORPUS.length;
    assert.ok(rate <= 0.03, `Wrong primary rate ${(rate * 100).toFixed(1)}% (${wrong}/${THESIS_SCENARIO_CORPUS.length})`);
  });
});
