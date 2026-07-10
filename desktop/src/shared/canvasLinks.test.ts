import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCanvasLink } from "./canvasLinks";

describe("parseCanvasLink", () => {
  it("parses work surface links", () => {
    assert.deepEqual(parseCanvasLink("surface://funnel"), { type: "surface", surface: "funnel" });
  });

  it("parses plan-playbook nested surface link", () => {
    assert.deepEqual(parseCanvasLink("surface://plan-playbook/pb-landing"), {
      type: "plan-playbook",
      playbookId: "pb-landing",
    });
  });

  it("parses plan-task link", () => {
    assert.deepEqual(parseCanvasLink("plan-task://task-1"), { type: "plan-task", taskId: "task-1" });
  });

  it("returns null for unknown surface", () => {
    assert.equal(parseCanvasLink("surface://unknown"), null);
  });
});
