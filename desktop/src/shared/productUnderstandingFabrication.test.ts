import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createEvidenceRef } from "./productUnderstandingInput";
import {
  auditClaimFabrication,
  hasBlockingFabrication,
} from "./productUnderstandingFabrication";
import { buildProductUnderstanding } from "./productUnderstandingPolicy";

const sealedProfile = {
  business_model: "saas",
  target_audience: [{ persona: "Founder", pains: [], jobs: [] }],
  founder_fit: {
    completed_at: "2026-01-01",
    weekly_marketing_hours: "3_7",
    monthly_budget_band: "under_500",
    brand_face_readiness: "never",
    controversy_tolerance: "avoid",
    magic_moment: "First value",
    thirty_day_win: "qualified_signups",
    scale_readiness: "probably",
  },
  product_activation: {
    activation_event_label: "First value moment",
    confidence: "measured",
    metric_confidence: {} as never,
    updated_at: "2026-01-01",
  },
} as never;

const project = {
  id: "fab",
  source: { kind: "folder" as const, path: "/x" },
  name: "App",
  framework: "Next.js",
  readmeSummary: "B2B SaaS",
  routes: ["app/page.tsx", "app/pricing/page.tsx", "app/signup/page.tsx"],
  hasAnalytics: true,
  excludedPaths: [],
  scannedFileCount: 20,
};

describe("productUnderstandingFabrication — FAB gates", () => {
  it("FAB-01 blocks seal when business_model missing", () => {
    const g = buildProductUnderstanding({ project });
    const audits = auditClaimFabrication(g, { action: "seal" });
    assert.ok(hasBlockingFabrication(audits));
  });

  it("FAB-01 passes seal with complete profile", () => {
    const g = buildProductUnderstanding({ project, profile: sealedProfile });
    const audits = auditClaimFabrication(g, { action: "seal" });
    assert.equal(hasBlockingFabrication(audits), false);
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
    assert.ok(audits.some((a) => a.gate_id === "FAB-MEASURED" && a.blocked));
  });

  it("FAB-02 blocks brain citing missing dimension", () => {
    const g = buildProductUnderstanding({
      project: {
        ...project,
        routes: ["app/page.tsx"],
        readmeSummary: undefined,
        framework: undefined,
        scanCitations: undefined,
      },
    });
    const audits = auditClaimFabrication(g, {
      action: "brain_decision",
      cited_dimensions: ["business_model"],
    });
    assert.ok(audits.some((a) => a.gate_id === "FAB-02" && a.blocked));
  });

  it("FAB-04 blocks competitor without URL/user ref", () => {
    const audits = auditClaimFabrication({
      version: 1,
      project_id: "p",
      computed_at: "",
      claims: [
        {
          dimension: "competitors_alternatives",
          value: "Acme",
          confidence: "measured",
          evidence: [
            createEvidenceRef({
              kind: "scan_heuristic",
              label: "guess",
              ref: "legacy:0",
            }),
          ],
          updated_at: "",
        },
      ],
    });
    assert.ok(audits.some((a) => a.gate_id === "FAB-04" && a.blocked));
  });

  it("FAB-05 blocks repo_path on url-only project", () => {
    const g = buildProductUnderstanding({
      project: { ...project, source: { kind: "url", url: "https://example.com" } },
      profile: sealedProfile,
    });
    const audits = auditClaimFabrication(g, {
      action: "seal",
      url_only: true,
    });
    assert.ok(audits.some((a) => a.gate_id === "FAB-05" && a.blocked));
  });

  it("FAB-01-WEEK1 blocks business_model when missing", () => {
    const g = buildProductUnderstanding({
      project: {
        ...project,
        readmeSummary: undefined,
        routes: ["app/page.tsx"],
        scanCitations: undefined,
      },
      profile: {
        founder_fit: (sealedProfile as { founder_fit: unknown }).founder_fit,
      } as never,
    });
    const audits = auditClaimFabrication(g, { action: "week1" });
    assert.ok(
      audits.some(
        (a) => a.gate_id === "FAB-01-WEEK1" && a.dimension === "business_model" && a.blocked,
      ),
    );
  });

  it("FAB-RATIONALE warns when rationale_claim_ids empty", () => {
    const audits = auditClaimFabrication(
      buildProductUnderstanding({ project, profile: sealedProfile }),
      {
        thesis: {
          id: "landing_conversion",
          title: "",
          headline: "",
          verdict: "marketable",
          verdict_reason: "",
          primary_bottleneck: "conversion",
          rationale: ["x"],
          week1_priorities: [],
          primary_playbook_ids: [],
          lane_a: [],
          lane_b: [],
          deprioritize: [],
          signals: {},
          generated_at: "",
        },
      },
    );
    assert.ok(audits.some((a) => a.gate_id === "FAB-RATIONALE"));
  });
});
