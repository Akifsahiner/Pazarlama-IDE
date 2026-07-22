import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveProofRequirements, shouldRequireKpiProof } from "./proofRequirements";

describe("proofRequirements", () => {
  const postTask = {
    owner: "user" as const,
    done_when: "Live post URL pasted.",
    expected_proof_kind: "live_url" as const,
  };

  it("URL-only before Day 3 on post tasks", () => {
    const reqs = resolveProofRequirements({ day_index: 1, tasks: [] } as never, postTask);
    assert.equal(reqs.kpiRequired, false);
    assert.equal(reqs.measureDeferredAllowed, true);
    assert.equal(shouldRequireKpiProof({ day_index: 1 } as never, postTask, { measure_deferred: true }), false);
  });

  it("KPI required Day 3+ when done_when mentions retention", () => {
    const measureTask = {
      owner: "user" as const,
      done_when: "3s retention logged for hook #7.",
      expected_proof_kind: "kpi" as const,
    };
    const reqs = resolveProofRequirements({ day_index: 3, tasks: [] } as never, measureTask);
    assert.equal(reqs.kpiRequired, true);
    assert.equal(shouldRequireKpiProof({ day_index: 3 } as never, measureTask), true);
  });
});
