import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildVerifyChecklistFromTask,
  doneWhenRequiresBrowserVerify,
  parseValidationLine,
  verifyPassRate,
  verifyPassed,
} from "./browserVerify";

describe("browserVerify", () => {
  it("parseValidationLine accepts pass/fail", () => {
    const ok = parseValidationLine("VALIDATION: Hero CTA visible | pass | Button found above fold");
    assert.ok(ok?.passed);
    assert.equal(ok?.label, "Hero CTA visible");
    const bad = parseValidationLine("VALIDATION: Page title | fail | Still says Acme Beta");
    assert.equal(bad?.passed, false);
  });

  it("verifyPassRate and verifyPassed", () => {
    const rate = verifyPassRate({
      validations: [
        { label: "a", passed: true },
        { label: "b", passed: false },
      ],
    });
    assert.equal(rate, 0.5);
    assert.equal(verifyPassed({ validations: [{ label: "a", passed: true }] }), true);
  });

  it("buildVerifyChecklistFromTask derives CTA from done_when", () => {
    const list = buildVerifyChecklistFromTask(
      {
        id: "t1",
        owner: "system",
        what: "Ship hero",
        why: "Convert",
        done_when: "Hero CTA links to signup and title mentions product",
        status: "in_progress",
        priority_index: 0,
        day_slot: "now",
      },
      null,
    );
    assert.ok(list.some((i) => /cta/i.test(i)));
    assert.ok(list.some((i) => /title/i.test(i)));
  });

  it("doneWhenRequiresBrowserVerify respects system owner and live URL keywords", () => {
    const task = {
      id: "t1",
      owner: "system" as const,
      what: "Ship",
      why: "",
      done_when: "Live URL verified in browser",
      status: "in_progress" as const,
      priority_index: 0,
      day_slot: "now" as const,
    };
    assert.equal(doneWhenRequiresBrowserVerify(task.done_when, task), true);
    assert.equal(
      doneWhenRequiresBrowserVerify(task.done_when, { ...task, owner: "user" }),
      false,
    );
    assert.equal(
      doneWhenRequiresBrowserVerify("Hero diff applied", task),
      false,
    );
    assert.equal(
      doneWhenRequiresBrowserVerify("Hero diff applied", {
        ...task,
        expected_proof_kind: "browser_evidence",
      }),
      true,
    );
  });
});
