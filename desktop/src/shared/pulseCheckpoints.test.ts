import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPulseRitualPending, recordPulseCheckpoint, resolvePendingPulseCheckpoint } from "./pulseCheckpoints";

describe("pulseCheckpoints", () => {
  it("pending at day 3 until answered", () => {
    const cadence = { day_index: 3, tasks: [] } as never;
    assert.equal(resolvePendingPulseCheckpoint(cadence), 3);
    assert.equal(isPulseRitualPending(cadence), true);
    const answered = recordPulseCheckpoint(cadence, 3, { answer: "yes", metric_value: 42 });
    assert.equal(resolvePendingPulseCheckpoint(answered), null);
  });
});
