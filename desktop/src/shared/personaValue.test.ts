import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { personaValue, PERSONA_VALUE } from "./personaValue";

describe("personaValue", () => {
  it("marketing promise mentions 30-day launch plan", () => {
    const pv = personaValue("marketing");
    assert.match(pv.promise, /30-day launch plan/i);
    assert.equal(pv.offlinePlanTitle, "Preview launch outline");
  });

  it("sales promise mentions ICP and outreach", () => {
    const pv = personaValue("sales");
    assert.match(pv.promise, /ICP/i);
    assert.match(pv.promise, /outreach/i);
    assert.equal(pv.firstMoveTitle, "Build your ICP");
  });

  it("exports stable eyebrow labels", () => {
    assert.equal(PERSONA_VALUE.marketing.eyebrow, "Marketing");
    assert.equal(PERSONA_VALUE.sales.eyebrow, "Sales");
  });

  it("includes honestyNote for both personas", () => {
    assert.ok(personaValue("marketing").honestyNote.length > 10);
    assert.ok(personaValue("sales").honestyNote.length > 10);
    assert.match(personaValue("marketing").honestyNote, /approve|publish/i);
    assert.match(personaValue("sales").honestyNote, /send|bulk/i);
  });
});
