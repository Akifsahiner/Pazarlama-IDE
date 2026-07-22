import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import type { ProjectProfile } from "./types";
import { bootstrapExecutionKernel, weekReviewGovernanceId } from "./executionKernel";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import { kernelEventToRunEventType } from "./executionKernelRunEvents";

function baseProject(): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/console/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS for teams.",
  };
}

describe("executionKernelRunEvents", () => {
  it("maps kernel dispatched to task.dispatched", () => {
    assert.equal(kernelEventToRunEventType("dispatched"), "task.dispatched");
    assert.equal(kernelEventToRunEventType("retry_scheduled"), "task.retry_scheduled");
  });

  it("bootstraps governance week_review instance", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const kernel = bootstrapExecutionKernel({ cadence, projectId: "p1" });
    const govId = weekReviewGovernanceId(cadence.id);
    assert.ok(kernel.instances[govId]);
    assert.equal(kernel.instances[govId]?.execution_mode, "week_review");
    assert.equal(kernel.instances[govId]?.scope, "governance");
  });
});
