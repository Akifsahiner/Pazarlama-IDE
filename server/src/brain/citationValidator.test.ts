import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateDecisionCitations } from "./citationValidator.js";

describe("citationValidator", () => {
  it("passes valid claim_citations", () => {
    const r = validateDecisionCitations(
      {
        diagnosis: "x",
        bottleneck: "y",
        options_compared: [{ name: "a", pros: [], cons: [], fit_score: 5 }],
        decision: "d",
        rationale: "because",
        next_steps: [{ step: "s" }],
        success_metric: { name: "m", target: "t" },
        when_to_reconsider: "",
        missing_info: [],
        claim_citations: [
          {
            dimension: "business_model",
            confidence: "measured",
            evidence_refs: [{ id: "1", kind: "user_answer", label: "saas", ref: "profile.business_model" }],
          },
        ],
      },
      [{ dimension: "business_model", value: "saas", confidence: "measured", evidence: [{ ref: "x" }] }],
    );
    assert.equal(r.ok, true);
  });

  it("rejects missing dimension cited as fact", () => {
    const r = validateDecisionCitations(
      {
        diagnosis: "x",
        bottleneck: "y",
        options_compared: [{ name: "a", pros: [], cons: [], fit_score: 5 }],
        decision: "d",
        rationale: "because",
        next_steps: [{ step: "s" }],
        success_metric: { name: "m", target: "t" },
        when_to_reconsider: "",
        missing_info: [],
        profile_citations: ["competitors_alternatives"],
      },
      [{ dimension: "competitors_alternatives", value: null, confidence: "missing" }],
    );
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("missing")));
  });
});
