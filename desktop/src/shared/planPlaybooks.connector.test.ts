import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isBrowserPlanTask, isConnectorReadPlanTask } from "./planPlaybooks";
import type { PlanTask } from "./types";

const baseTask = (mode?: PlanTask["execution_mode"]): PlanTask => ({
  id: "t1",
  day: 1,
  title: "Check metrics",
  dependsOn: [],
  instructions_md: "",
  execution_mode: mode,
});

describe("connector_read plan routing", () => {
  it("isConnectorReadPlanTask detects connector_read only", () => {
    assert.equal(isConnectorReadPlanTask(baseTask("connector_read")), true);
    assert.equal(isConnectorReadPlanTask(baseTask("browser")), false);
    assert.equal(isConnectorReadPlanTask(baseTask("repo")), false);
  });

  it("isBrowserPlanTask excludes connector_read", () => {
    assert.equal(isBrowserPlanTask(baseTask("connector_read")), false);
    assert.equal(isBrowserPlanTask(baseTask("browser")), true);
  });
});
