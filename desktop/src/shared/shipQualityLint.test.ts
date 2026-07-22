import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runShipQualityLint, hasBlockingQualityFinding } from "./shipQualityLint";

describe("shipQualityLint", () => {
  it("warns on vague CTA", () => {
    const findings = runShipQualityLint({ after: { heroHeadline: "Go" } });
    assert.ok(findings.some((f) => f.id === "cta-vague" && f.severity === "warn"));
  });

  it("blocks landing_conversion without meta description", () => {
    const findings = runShipQualityLint({
      thesisId: "landing_conversion",
      after: { metaTitle: "Acme" },
    });
    assert.ok(hasBlockingQualityFinding(findings));
  });

  it("warns when tracking missing", () => {
    const findings = runShipQualityLint({
      after: { heroHeadline: "Start free trial" },
      diffText: '<a href="/signup">Start free trial</a>',
    });
    assert.ok(findings.some((f) => f.id === "tracking-missing"));
  });
});
