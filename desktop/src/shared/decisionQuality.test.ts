import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decisionQualityTone, answerQualityTone } from "./decisionQuality";

describe("decisionQualityTone", () => {
  it("marks approved scores as ok", () => {
    assert.equal(decisionQualityTone(52, true), "ok");
    assert.equal(decisionQualityTone(45, false), "ok");
  });

  it("warns on low scores", () => {
    assert.equal(decisionQualityTone(30, false), "warn");
  });

  it("answer quality tone thresholds", () => {
    assert.equal(answerQualityTone(30, true), "ok");
    assert.equal(answerQualityTone(20, false), "warn");
  });
});
