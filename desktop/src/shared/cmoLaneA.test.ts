import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import { bindExecutionPlansForCadence } from "./cmoExecutionBind";
import {
  completeLaneAItemOnApply,
  createLaneAWorkspaceFromThesis,
  inferLaneAExecutionMode,
  resolveLaneARunPlan,
  thesisSkillsForLaneA,
} from "./cmoLaneA";
import type { ProjectProfile } from "./types";

function baseProject(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    ...overrides,
  };
}

describe("cmoLaneA", () => {
  it("landing_conversion system task resolves repo_edit with hero mention", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "landing_conversion" },
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const system = cadence.tasks.find((t) => t.owner === "system");
    assert.ok(system);
    const plan = resolveLaneARunPlan({
      task: system!,
      thesis,
      project: baseProject(),
    });
    assert.ok(plan);
    assert.equal(plan!.mode, "repo_edit");
    assert.ok(plan!.mentions.some((m) => m.path?.includes("page.tsx")));
    assert.ok(plan!.skills.includes("landing-page-conversion"));
  });

  it("preferScout uses scout_then_edit for first hero task", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "landing_conversion" },
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const system = cadence.tasks[0]!;
    const plan = resolveLaneARunPlan({
      task: system,
      thesis,
      project: baseProject(),
      preferScout: true,
    });
    assert.equal(plan?.mode, "scout_then_edit");
    assert.ok(plan?.scoutPrompt?.includes("hero"));
  });

  it("seo competitor task routes to browser_research", () => {
    assert.equal(
      inferLaneAExecutionMode("Competitor SERP teardown for 3 rivals", "seo_content"),
      "browser_research",
    );
    const skills = thesisSkillsForLaneA("seo_content", "browser_research");
    assert.ok(skills.includes("product-intelligence"));
  });

  it("createLaneAWorkspace links lane_a items to system ops tasks", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const ws = createLaneAWorkspaceFromThesis(thesis, { opsCadence: cadence });
    assert.equal(ws.items.length, thesis.lane_a.length);
    const linked = ws.items.filter((i) => i.linked_ops_task_id);
    assert.ok(linked.length >= 2);
    const systemIds = cadence.tasks.filter((t) => t.owner === "system").map((t) => t.id);
    assert.ok(linked.every((i) => systemIds.includes(i.linked_ops_task_id!)));
  });

  it("bound cadence tasks carry execution_plan with skills", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "landing_conversion" },
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const ws = createLaneAWorkspaceFromThesis(thesis, { opsCadence: cadence });
    const { cadence: bound } = bindExecutionPlansForCadence({
      cadence,
      thesis,
      project: baseProject(),
      laneAWorkspace: ws,
    });
    const system = bound.tasks.find((t) => t.owner === "system");
    assert.ok(system?.execution_plan);
    assert.ok(system!.execution_plan!.skills.length > 0);
    assert.equal(system!.execution_plan!.mode, "repo_edit");
  });

  it("completeLaneAItemOnApply marks item done with proof", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "landing_conversion" },
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const ws = createLaneAWorkspaceFromThesis(thesis, { opsCadence: cadence });
    const opsId = cadence.tasks.find((t) => t.owner === "system")!.id;
    const next = completeLaneAItemOnApply(ws, opsId, {
      commit_sha: "abc123",
      files_applied: 2,
      run_id: "run-1",
    });
    const item = next.items.find((i) => i.linked_ops_task_id === opsId);
    assert.equal(item?.status, "done");
    assert.equal(item?.proof?.commit_sha, "abc123");
  });
});
