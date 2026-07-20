import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateDecisionCitations } from "./citationValidator.js";

const baseDecision = {
  diagnosis: "x",
  bottleneck: "awareness",
  channel_priority: ["landing-conversion"],
  options_compared: [{ name: "a", pros: [] as string[], cons: [] as string[], fit_score: 5 }],
  decision: "d",
  rationale: "because",
  ready_to_use_assets: [{ kind: "checklist" as const, title: "Tactic: test", content: "Step 1\nStep 2\nStep 3\nStep 4" }],
  next_steps: [{ step: "s" }],
  success_metric: { name: "m", target: "t" },
  when_to_reconsider: "",
  missing_info: [] as string[],
};

describe("citationValidator", () => {
  it("passes valid claim_citations", () => {
    const r = validateDecisionCitations(
      {
        ...baseDecision,
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
        ...baseDecision,
        profile_citations: ["competitors_alternatives"],
      },
      [{ dimension: "competitors_alternatives", value: null, confidence: "missing" }],
    );
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("missing")));
  });
});
