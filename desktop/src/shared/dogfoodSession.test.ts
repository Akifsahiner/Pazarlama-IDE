import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDogfoodIssueBody,
  buildDogfoodIssueTitle,
  DOGFOOD_BLOCKERS,
  evaluateDogfoodCohortExit,
  type DogfoodSessionReport,
} from "./dogfoodSession";

describe("dogfoodSession", () => {
  it("defines B1–B9 blocker taxonomy", () => {
    assert.equal(DOGFOOD_BLOCKERS.length, 9);
    assert.equal(DOGFOOD_BLOCKERS[0]!.code, "B1");
    assert.equal(DOGFOOD_BLOCKERS[8]!.code, "B9");
  });

  it("buildDogfoodIssueTitle uses blocker code format", () => {
    const session: DogfoodSessionReport = {
      sessionId: "A",
      founderIdAnon: "f1",
      date: "2026-07-22",
      exitScore: 2,
      primaryBlocker: "B7",
      trustGates: {},
    };
    const title = buildDogfoodIssueTitle(session);
    assert.match(title, /^\[dogfood\] B7 —/);
  });

  it("buildDogfoodIssueBody includes trust gates and exit score", () => {
    const body = buildDogfoodIssueBody({
      sessionId: "B",
      founderIdAnon: "f2",
      date: "2026-07-22",
      exitScore: 4,
      fstMinutes: 38,
      trustGates: { reload_execution_kernel_intact: true },
      notes: "Smooth reload",
    });
    assert.match(body, /Exit score \| 4\/5/);
    assert.match(body, /reload_execution_kernel_intact/);
    assert.match(body, /Smooth reload/);
  });

  it("evaluateDogfoodCohortExit — PASS when ≥3 score ≥4 and no B7/B5", () => {
    const sessions = [
      { exitScore: 5 as const, trustGates: {} },
      { exitScore: 4 as const, trustGates: {} },
      { exitScore: 4 as const, trustGates: {} },
    ];
    const result = evaluateDogfoodCohortExit(sessions);
    assert.equal(result.pass, true);
    assert.equal(result.foundersScoringGte4, 3);
    assert.equal(result.reloadDataLossCount, 0);
  });

  it("evaluateDogfoodCohortExit — FAIL on reload data loss", () => {
    const result = evaluateDogfoodCohortExit([
      { exitScore: 5, primaryBlocker: "B7", trustGates: {} },
      { exitScore: 4, trustGates: {} },
      { exitScore: 4, trustGates: {} },
    ]);
    assert.equal(result.pass, false);
    assert.equal(result.reloadDataLossCount, 1);
  });
});
