import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import {
  completeOpsTask,
  createOpsCadenceFromThesis,
  getFocusTasks,
  getNowTask,
  isOpsTaskUnlocked,
  opsQueueBlocksLaneWork,
  tryAutoCompleteSystemTask,
  attachBrowserEvidenceToSystemTask,
  validateOpsProof,
} from "./cmoOpsCadence";
import { toBrowserEvidenceProof } from "./browserVerify";
import type { ProjectProfile } from "./types";

function baseProject(): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS for teams.",
  };
}

describe("cmoOpsCadence", () => {
  it("createOpsCadenceFromThesis seeds sequential week1 with first in_progress", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
    });
    assert.equal(thesis.week1_priorities[0]?.id, `${thesis.id}.w1.0`);

    const cadence = createOpsCadenceFromThesis(thesis, { now: "2026-01-01T00:00:00.000Z" });
    assert.ok(cadence.tasks.length >= 3 && cadence.tasks.length <= 5);
    assert.equal(cadence.tasks[0]?.status, "in_progress");
    assert.equal(cadence.tasks[1]?.status, "pending");
    assert.equal(getNowTask(cadence)?.id, cadence.tasks[0]?.id);
    assert.equal(getFocusTasks(cadence, 3).length, 1);
    assert.equal(isOpsTaskUnlocked(cadence, cadence.tasks[1]!), false);
  });

  it("user task cannot complete without proof", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
    });
    let cadence = createOpsCadenceFromThesis(thesis);
    const systemIds = cadence.tasks.filter((t) => t.owner === "system").map((t) => t.id);
    for (const id of systemIds) {
      const r = completeOpsTask(cadence, id, { note: "shipped 2 files", metric_snapshot: "2" });
      cadence = r.cadence;
    }

    const userTask = cadence.tasks.find((t) => t.owner === "user");
    assert.ok(userTask);
    const bad = completeOpsTask(cadence, userTask.id, { note: "done" });
    assert.equal(bad.error?.ok, false);

    const good = completeOpsTask(cadence, userTask.id, {
      urls: ["https://tiktok.com/@me/video/1"],
      metric_snapshot: "3 posts",
      kpi_value: 1200,
      kpi_id: "short_form_views",
    });
    assert.equal(good.error, undefined);
    assert.equal(
      good.cadence.tasks.find((t) => t.id === userTask.id)?.status,
      "done",
    );
  });

  it("validateOpsProof requires URL when done_when mentions URL", () => {
    const v = validateOpsProof(
      { owner: "user", done_when: "3 live post URLs recorded" },
      { note: "posted stuff" },
    );
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => /URL/i.test(e)));
  });

  it("tryAutoCompleteSystemTask closes in_progress system task when proof is note", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    let cadence = createOpsCadenceFromThesis(thesis);
    cadence = {
      ...cadence,
      tasks: cadence.tasks.map((t, i) =>
        i === 0 ? { ...t, expected_proof_kind: "note" as const, required_proof: ["note"] } : t,
      ),
    };
    const before = cadence.tasks[0]!;
    assert.equal(before.owner, "system");

    const next = tryAutoCompleteSystemTask(cadence, {
      runId: "run-abc123",
      commitSha: "deadbeef",
      filesApplied: 2,
    });
    assert.equal(next.tasks[0]?.status, "done");
    assert.equal(next.tasks[0]?.proof?.commit_sha, "deadbeef");
    assert.equal(getNowTask(next)?.owner, "system");
  });

  it("tryAutoCompleteSystemTask skips browser_evidence tasks", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    let cadence = createOpsCadenceFromThesis(thesis);
    cadence = {
      ...cadence,
      tasks: cadence.tasks.map((t, i) =>
        i === 0 ? { ...t, expected_proof_kind: "browser_evidence" as const } : t,
      ),
    };
    const next = tryAutoCompleteSystemTask(cadence, { runId: "run-x", filesApplied: 1 });
    assert.equal(next.tasks[0]?.status, "in_progress");
  });

  it("attachBrowserEvidenceToSystemTask closes on pass", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = createOpsCadenceFromThesis(thesis);
    const evidence = toBrowserEvidenceProof(
      {
        url: "http://localhost:3000",
        validations: [
          { label: "Hero CTA visible", passed: true },
          { label: "Page title updated", passed: true },
        ],
        findings: [],
        run_id: "verify-1",
      },
      "/tmp/evidence.png",
    );
    const { cadence: next, closed } = attachBrowserEvidenceToSystemTask(cadence, evidence);
    assert.equal(closed, true);
    assert.equal(next.tasks[0]?.status, "done");
    assert.ok(next.tasks[0]?.proof?.browser_evidence);
  });

  it("opsQueueBlocksLaneWork hides Lane B/C while user task is active", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    let cadence = createOpsCadenceFromThesis(thesis);
    assert.equal(opsQueueBlocksLaneWork(cadence), true);

    for (const t of cadence.tasks.filter((x) => x.owner === "system")) {
      cadence = completeOpsTask(cadence, t.id, { metric_snapshot: "1" }).cadence;
    }
    const userTasks = cadence.tasks.filter((t) => t.owner === "user");
    assert.ok(userTasks.length > 0);
    assert.equal(opsQueueBlocksLaneWork(cadence), true);

    for (const userTask of userTasks) {
      cadence = completeOpsTask(cadence, userTask.id, {
        urls: ["https://example.com/e2e-post"],
        kpi_value: 42,
        note: "Logged measurable outcome for the week review gate.",
      }).cadence;
    }
    assert.equal(opsQueueBlocksLaneWork(cadence), false);
  });
});
