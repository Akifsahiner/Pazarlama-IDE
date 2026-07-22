import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCmoIntake } from "./cmoIntake";
import type { ProjectProfile } from "./types";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import { resolvePulseCommandAction } from "./measurementPulse";

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

describe("measurementPulse command actions", () => {
  it("returns log KPI when pulse has no numeric read", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = createOpsCadenceFromThesis(thesis);
    const action = resolvePulseCommandAction({
      cadence: { ...cadence, day_index: 3 },
      thesis,
    });
    assert.equal(action?.kind, "submit_proof");
    assert.match(action?.testId ?? "", /pulse-log-kpi/);
  });
});
