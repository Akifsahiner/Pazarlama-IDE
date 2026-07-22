import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import type { ProjectProfile } from "./types";
import {
  bootstrapExecutionKernel,
  hydrateExecutionKernelFromJson,
} from "./executionKernel";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";

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

describe("executionPersistence", () => {
  it("hydrate round-trip preserves lifecycle and attempt", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    let kernel = bootstrapExecutionKernel({ cadence, projectId: "proj-1" });
    const task = cadence.tasks[0]!;
    kernel.instances[task.id] = {
      ...kernel.instances[task.id]!,
      status: "running",
      attempt: 2,
      run_id: "run-abc",
    };
    const raw = JSON.parse(JSON.stringify(kernel));
    const hydrated = hydrateExecutionKernelFromJson(raw);
    assert.ok(hydrated);
    assert.equal(hydrated!.instances[task.id]?.status, "running");
    assert.equal(hydrated!.instances[task.id]?.attempt, 2);
    assert.equal(hydrated!.instances[task.id]?.run_id, "run-abc");
  });
});
