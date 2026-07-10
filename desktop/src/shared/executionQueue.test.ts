import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enqueueExecution,
  dequeueExecution,
  removeQueuedExecution,
  makeQueueItem,
  EXECUTION_QUEUE_MAX,
  canDrainExecutionQueue,
} from "./executionQueue";

describe("executionQueue", () => {
  it("enqueues and dequeues in order", () => {
    let q: ReturnType<typeof enqueueExecution>["queue"] = [];
    const a = enqueueExecution(q, { kind: "edit", goal: "Fix hero", label: "Fix hero" });
    q = a.queue;
    const b = enqueueExecution(q, { kind: "browse", goal: "Research leads", label: "Research" });
    q = b.queue;
    assert.equal(q.length, 2);
    const { head, queue } = dequeueExecution(q);
    assert.equal(head?.kind, "edit");
    assert.equal(queue.length, 1);
  });

  it("drops oldest when over max", () => {
    let q = Array.from({ length: EXECUTION_QUEUE_MAX }, (_, i) =>
      makeQueueItem({ kind: "edit", goal: `task ${i}`, label: `t${i}` }),
    );
    const { queue, dropped } = enqueueExecution(q, { kind: "browse", goal: "new", label: "new" });
    assert.equal(queue.length, EXECUTION_QUEUE_MAX);
    assert.ok(dropped);
  });

  it("removes by id", () => {
    const item = makeQueueItem({ kind: "edit", goal: "x", label: "x" });
    const next = removeQueuedExecution([item], item.id);
    assert.equal(next.length, 0);
  });

  it("canDrainExecutionQueue blocks while run or browser active", () => {
    assert.equal(
      canDrainExecutionQueue({ runStatus: "running", browserRunning: false }),
      false,
    );
    assert.equal(
      canDrainExecutionQueue({ runStatus: "completed", browserRunning: true }),
      false,
    );
    assert.equal(
      canDrainExecutionQueue({ runStatus: "completed", browserRunning: false }),
      true,
    );
    assert.equal(canDrainExecutionQueue({ browserRunning: false }), true);
  });
});
