import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildClaimsFromScan,
  extractProductCategoryClaim,
} from "./productUnderstandingFromScan";
import { buildClaimsFromProfile, computeStrategicGaps } from "./productUnderstandingFromProfile";
import { buildClaimsFromUrlScan } from "./productUnderstandingFromUrl";
import { attachIntakeUnderstanding } from "./productUnderstandingIntakeBind";
import { buildCmoIntake } from "./cmoIntake";

const project = {
  id: "dev",
  source: { kind: "folder" as const, path: "/x" },
  name: "DevTool CLI",
  framework: "Node",
  readmeSummary: "Open source CLI and SDK for developers",
  routes: ["packages/cli/index.ts", "docs/page.md", "app/page.tsx"],
  hasAnalytics: false,
  excludedPaths: [],
  scannedFileCount: 100,
};

describe("productUnderstandingFromScan extended", () => {
  it("buildClaimsFromScan returns 6 claims", () => {
    assert.equal(buildClaimsFromScan(project).length, 6);
  });

  it("devtool readme elevates category", () => {
    const c = extractProductCategoryClaim(project);
    assert.equal(c.value, "Developer tool");
  });

  it("url scan produces live_url evidence", () => {
    const claims = buildClaimsFromUrlScan({
      url: "https://example.com",
      title: "Example",
      routes: ["/pricing"],
      hasAnalytics: true,
    });
    assert.equal(claims[0]!.evidence[0]!.kind, "live_url");
  });
});

describe("productUnderstandingFromProfile", () => {
  it("computeStrategicGaps lists empty fields", () => {
    const gaps = computeStrategicGaps({ product_name: "" } as never);
    assert.ok(gaps.includes("product_name"));
  });

  it("business_model measured from profile", () => {
    const claims = buildClaimsFromProfile({ business_model: "saas" } as never);
    const biz = claims.find((c) => c.dimension === "business_model");
    assert.equal(biz?.confidence, "measured");
  });
});

describe("intake matrix samples", () => {
  const cases = [
    { name: "b2b", readme: "B2B SaaS for sales teams", routes: ["app/pricing/page.tsx", "app/signup/page.tsx"] },
    { name: "consumer", readme: "Viral consumer app for creators", routes: ["app/page.tsx"] },
  ] as const;

  for (const c of cases) {
    it(`${c.name} thesis binds rationale_claim_ids`, () => {
      const thesis = buildCmoIntake({
        project: { ...project, readmeSummary: c.readme, routes: [...c.routes] },
        persona: "marketing",
        draft: true,
      });
      const bound = attachIntakeUnderstanding(thesis, { project, persona: "marketing" }, null);
      assert.ok(bound.rationale_claim_ids?.length);
    });
  }
});
