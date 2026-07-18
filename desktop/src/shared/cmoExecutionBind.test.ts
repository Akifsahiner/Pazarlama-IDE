import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import {
  bindExecutionPlansForCadence,
  capWeek1Priorities,
  inferExpectedProofKind,
  validateSystemTaskCoverage,
  WEEK1_MAX_SYSTEM,
  WEEK1_MAX_TASKS,
  WEEK1_MAX_USER,
} from "./cmoExecutionBind";
import { createLaneAWorkspaceFromThesis } from "./cmoLaneA";
import type { ProjectProfile } from "./types";

const THESIS_IDS = [
  "viral_short_form",
  "founder_social",
  "product_hunt_launch",
  "landing_conversion",
  "seo_content",
  "community_launch",
  "influencer_partnerships",
  "outbound_sales",
] as const;

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

describe("cmoExecutionBind", () => {
  it("capWeek1Priorities enforces 3 system + 2 user max", () => {
    const capped = capWeek1Priorities([
      { id: "a", what: "s1", why: "", owner: "system", done_when: "" },
      { id: "b", what: "s2", why: "", owner: "system", done_when: "" },
      { id: "c", what: "s3", why: "", owner: "system", done_when: "" },
      { id: "d", what: "s4", why: "", owner: "system", done_when: "" },
      { id: "e", what: "u1", why: "", owner: "user", done_when: "" },
      { id: "f", what: "u2", why: "", owner: "user", done_when: "" },
      { id: "g", what: "u3", why: "", owner: "user", done_when: "" },
    ]);
    assert.equal(capped.length, WEEK1_MAX_TASKS);
    assert.equal(capped.filter((p) => p.owner === "system").length, WEEK1_MAX_SYSTEM);
    assert.equal(
      capped.filter((p) => p.owner === "user" || p.owner === "delegate").length,
      WEEK1_MAX_USER,
    );
  });

  it("inferExpectedProofKind detects live URL tasks", () => {
    assert.equal(inferExpectedProofKind("3 live post URLs recorded"), "live_url");
    assert.equal(inferExpectedProofKind("Log signup KPI"), "kpi");
  });

  it("bindExecutionPlansForCadence covers all system tasks per thesis", () => {
    for (const thesisId of THESIS_IDS) {
      const thesis = buildCmoIntake({
        project: baseProject(),
        persona: "marketing",
        context: { force_thesis_id: thesisId },
      });
      const cadence = createOpsCadenceFromThesis(thesis);
      const laneA = createLaneAWorkspaceFromThesis(thesis, { opsCadence: cadence });
      const { cadence: bound, missingPlans } = bindExecutionPlansForCadence({
        cadence,
        thesis,
        project: baseProject(),
        laneAWorkspace: laneA,
      });
      assert.equal(missingPlans.length, 0, `${thesisId} missing plans: ${missingPlans.join(", ")}`);
      const coverage = validateSystemTaskCoverage(bound);
      assert.ok(coverage.ok, `${thesisId} coverage: ${coverage.missing.join(", ")}`);
    }
  });
});
