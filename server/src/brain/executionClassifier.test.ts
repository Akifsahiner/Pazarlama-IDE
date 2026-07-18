import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyExecutionNeeds } from "../brain/executionClassifier.js";

describe("classifyExecutionNeeds", () => {
  it("suggests edit_run when repo context and landing intent", () => {
    const actions = classifyExecutionNeeds({
      message: "Rewrite the hero CTA on my landing page",
      localContextPack: "FILE apps/console/page.tsx\nhero section",
    });
    assert.equal(actions[0]?.kind, "edit_run");
  });

  it("suggests generate_plan for broad GTM without plan task", () => {
    const actions = classifyExecutionNeeds({
      message: "How do I market my SaaS and get users?",
    });
    assert.equal(actions[0]?.kind, "generate_plan");
  });
});
