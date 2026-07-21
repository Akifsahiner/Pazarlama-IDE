import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isTaskGraphReady,
  computeBlockedBy,
  recomputeBlockedBy,
  resolveGraphStatus,
} from "./executionGraph";
import type { ExecutionInstance } from "./executionKernel";

function inst(id: string, status: ExecutionInstance["status"], depends: string[] = []): ExecutionInstance {
  return {
    id,
    scope: "ops",
    execution_mode: "repo_edit",
    status,
    attempt: 1,
    idempotency_key: `p:${id}:1`,
    depends_on: depends,
    provenance: { source: "auto_chain", at: new Date().toISOString() },
    ownership: { contract: "ops_cadence", lifecycle: "execution_kernel" },
  };
}

describe("executionGraph", () => {
  it("empty depends_on is ready", () => {
    assert.equal(isTaskGraphReady({}, []), true);
  });

  it("waits for completed deps", () => {
    const instances = {
      a: inst("a", "completed"),
      b: inst("b", "proposed", ["a"]),
    };
    assert.equal(isTaskGraphReady(instances, ["a"]), true);
    assert.equal(resolveGraphStatus(instances, instances.b!), "ready");
  });

  it("parallel branch blocked until both deps done", () => {
    const instances = {
      a: inst("a", "completed"),
      b: inst("b", "running"),
      c: inst("c", "proposed", ["a", "b"]),
    };
    assert.equal(isTaskGraphReady(instances, ["a", "b"]), false);
    assert.deepEqual(computeBlockedBy(instances, "c", ["a", "b"]), ["b"]);
  });

  it("recomputeBlockedBy updates cache", () => {
    const instances = {
      a: inst("a", "completed"),
      b: inst("b", "proposed", ["a"]),
    };
    const next = recomputeBlockedBy(instances);
    assert.equal(next.b?.blocked_by, undefined);
  });
});
