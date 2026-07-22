import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MarketingExecutionMode } from "./marketingTaskContract";
import { allRegisteredModes, resolveHandlerKind } from "./executionHandlers";

const REQUIRED_MODES: MarketingExecutionMode[] = [
  "repo_edit",
  "browser_research",
  "content_draft",
  "scout_then_edit",
  "human_post",
  "human_outreach",
  "human_launch",
  "human_log",
  "delegate_rubric",
  "delegate_brief",
  "export_csv",
  "measurement_sync",
  "product_request",
  "week_review",
];

describe("executionHandlerCoverage", () => {
  it("every execution mode resolves to a handler", () => {
    for (const mode of REQUIRED_MODES) {
      const kind = resolveHandlerKind(mode);
      assert.ok(kind, `missing handler for ${mode}`);
    }
    const registered = new Set(allRegisteredModes());
    for (const mode of REQUIRED_MODES) {
      assert.ok(registered.has(mode), `mode not in registry: ${mode}`);
    }
  });
});
