import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT_UNDERSTANDING_DIMENSIONS,
  createEvidenceRef,
} from "./productUnderstandingInput";
import {
  CRITICAL_SEAL_DIMENSIONS,
  DIMENSION_REGISTRY,
  confirmationPromptFor,
} from "./productUnderstandingRegistry";
import {
  assertClaimSourced,
  buildProductUnderstanding,
  claimForDimension,
  mergeClaimLists,
  productUnderstandingCompact,
} from "./productUnderstandingPolicy";
import {
  extractActivationClaim,
  extractPricingClaim,
  extractProductCategoryClaim,
  extractScanGaps,
  extractSiteStructureClaim,
} from "./productUnderstandingFromScan";
import {
  auditClaimFabrication,
  hasBlockingFabrication,
} from "./productUnderstandingFabrication";
import { buildCmoIntake } from "./cmoIntake";

const sampleProject = {
  id: "p1",
  source: { kind: "folder" as const, path: "/tmp/app" },
  name: "Sample SaaS",
  framework: "Next.js",
  readmeSummary: "B2B revenue intelligence for sales teams",
  routes: ["app/page.tsx", "app/pricing/page.tsx", "app/signup/page.tsx"],
  hasAnalytics: true,
  excludedPaths: [],
  scannedFileCount: 42,
};

describe("PRODUCT_UNDERSTANDING_DIMENSIONS", () => {
  it("defines 11 dimensions", () => {
    assert.equal(PRODUCT_UNDERSTANDING_DIMENSIONS.length, 11);
  });

  for (const dim of PRODUCT_UNDERSTANDING_DIMENSIONS) {
    it(`${dim} has registry entry`, () => {
      assert.ok(DIMENSION_REGISTRY[dim].label);
    });
  }
});

describe("buildProductUnderstanding", () => {
  it("builds graph from scan", () => {
    const g = buildProductUnderstanding({ project: sampleProject });
    assert.ok(g);
    assert.equal(g!.claims.length >= 5, true);
    const site = claimForDimension(g, "site_structure");
    assert.equal(site?.confidence, "measured");
    assert.ok(site!.evidence.length >= 1);
  });

  it("pricing measured when route exists", () => {
    const g = buildProductUnderstanding({ project: sampleProject });
    const pricing = claimForDimension(g, "pricing");
    assert.equal(pricing?.confidence, "measured");
  });

  it("mergeClaimLists prefers measured", () => {
    const merged = mergeClaimLists([
      { dimension: "business_model", value: null, confidence: "missing", evidence: [], updated_at: "" },
      {
        dimension: "business_model",
        value: "saas",
        confidence: "measured",
        evidence: [createEvidenceRef({ kind: "user_answer", label: "x", ref: "y" })],
        updated_at: "",
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]!.value, "saas");
  });

  it("compact JSON is non-empty", () => {
    const g = buildProductUnderstanding({ project: sampleProject });
    assert.ok(productUnderstandingCompact(g).includes("site_structure"));
  });
});

describe("assertClaimSourced", () => {
  it("throws on measured without evidence", () => {
    assert.throws(() =>
      assertClaimSourced({
        dimension: "pricing",
        value: "x",
        confidence: "measured",
        evidence: [],
        updated_at: "",
      }),
    );
  });
});

describe("productUnderstandingFromScan", () => {
  it("site structure detects pricing", () => {
    const c = extractSiteStructureClaim(sampleProject);
    assert.match(String(c.value), /pricing/);
  });

  it("category from framework", () => {
    const c = extractProductCategoryClaim(sampleProject);
    assert.ok(c.value);
    assert.ok(c.evidence.length >= 1);
  });

  it("activation needs_confirmation without onboarding", () => {
    const c = extractActivationClaim(sampleProject);
    assert.equal(c.confidence, "needs_confirmation");
  });

  it("extractScanGaps includes ga4 when missing", () => {
    const gaps = extractScanGaps({ ...sampleProject, hasAnalytics: false });
    assert.ok(gaps.includes("tracking.ga4"));
  });

  it("pricing missing without route", () => {
    const c = extractPricingClaim({ ...sampleProject, routes: ["app/page.tsx"] });
    assert.equal(c.confidence, "missing");
  });
});

describe("auditClaimFabrication", () => {
  it("FAB-01 blocks seal when business_model missing", () => {
    const g = buildProductUnderstanding({ project: sampleProject });
    const audits = auditClaimFabrication(g, { action: "seal" });
    assert.ok(hasBlockingFabrication(audits));
    assert.ok(audits.some((a) => a.gate_id === "FAB-01"));
  });

  it("FAB-MEASURED blocks empty evidence", () => {
    const audits = auditClaimFabrication({
      version: 1,
      project_id: "p",
      computed_at: "",
      claims: [
        {
          dimension: "pricing",
          value: "99",
          confidence: "measured",
          evidence: [],
          updated_at: "",
        },
      ],
    });
    assert.ok(audits.some((a) => a.gate_id === "FAB-MEASURED"));
  });

  it("clean scan path passes non-block for week1 activation only soft", () => {
    const g = buildProductUnderstanding({
      project: sampleProject,
      profile: {
        business_model: "saas",
        founder_fit: {
          completed_at: "2026-01-01",
          weekly_marketing_hours: "3_7",
          monthly_budget_band: "under_500",
          brand_face_readiness: "never",
          controversy_tolerance: "avoid",
          magic_moment: "First qualified signup",
          thirty_day_win: "qualified_signups",
          scale_readiness: "probably",
        },
      } as never,
    });
    const audits = auditClaimFabrication(g, { action: "week1" });
    assert.equal(
      hasBlockingFabrication(audits.filter((a) => a.dimension === "founder_constraints")),
      false,
    );
  });
});

describe("intake bind", () => {
  it("attachIntakeUnderstanding adds rationale_claim_ids", () => {
    const thesis = buildCmoIntake({
      project: sampleProject,
      persona: "marketing",
      draft: true,
    });
    assert.ok(thesis.rationale_claim_ids?.length);
    assert.ok(thesis.thesis_decision?.thesis_id);
  });

  it("CRITICAL_SEAL includes business_model and activation", () => {
    assert.ok(CRITICAL_SEAL_DIMENSIONS.includes("business_model"));
    assert.ok(CRITICAL_SEAL_DIMENSIONS.includes("activation_event"));
  });

  it("confirmation prompt exists", () => {
    const p = confirmationPromptFor("activation_event");
    assert.ok(p.cta_label);
  });
});

describe("migrateEvidenceStringsToRefs", () => {
  it("converts legacy strings", async () => {
    const { migrateEvidenceStringsToRefs } = await import("./migrateEvidenceStringsToRefs");
    const refs = migrateEvidenceStringsToRefs(["Scan: pricing route"]);
    assert.equal(refs.length, 1);
    assert.equal(refs[0]!.kind, "scan_heuristic");
  });
});
