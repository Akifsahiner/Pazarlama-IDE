import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { createDistributionOperatorFromThesis } from "./cmoDistributionOperator";
import { createInfluencerOperatorFromThesis } from "./cmoInfluencerOperator";
import {
  buildDelegateHandoffBundle,
  buildDelegateHireScaffold,
  completeRubricDay,
  createDailyRubricsForBrief,
  createDelegateOperatorFromThesis,
  evaluateDelegatePerformance,
  getNextDelegateRubricDay,
  hydrateDelegateOperatorFromJson,
  importDelegateDelivery,
  isDelegateOperatorGate,
  migrateToOperatorWorkspace,
  parseOutboundImportLines,
  parseCreatorFilmLines,
  prepareDelegateHandoff,
  syncLaneBFromDelegateBrief,
  validateRubricProof,
} from "./cmoDelegateOperator";
import { createDelegateWorkspaceFromThesis } from "./cmoLaneC";
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
    readmeSummary: "Consumer lifestyle app for creators",
    ...overrides,
  };
}

function outboundThesis() {
  return buildCmoIntake({
    project: baseProject(),
    persona: "sales",
    profile: { sales_pipeline_empty: true } as never,
  });
}

describe("cmoDelegateOperator", () => {
  it("outbound Week 1 → hire blocks + lane links for VA brief", () => {
    const thesis = outboundThesis();
    const ws = createDelegateOperatorFromThesis(thesis)!;
    assert.ok(ws);
    assert.equal(ws.briefs.length, 2);
    assert.equal(ws.hire_blocks.length, 2);
    assert.equal(ws.lane_links.length, 2);
    assert.ok(ws.hire_blocks[0]!.job_post_scaffold.includes("VA"));
  });

  it("creator hire scaffold contains hook variant language (viral thesis)", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const ws = createDelegateOperatorFromThesis(thesis)!;
    const creatorBrief = ws.briefs.find((b) => b.role === "creator")!;
    const hire = buildDelegateHireScaffold(thesis, creatorBrief);
    assert.match(hire.job_post_scaffold, /Hook A\/B\/C|hook variants/i);
  });

  it("createDailyRubricsForBrief → checklist count matches role template", () => {
    const thesis = outboundThesis();
    let ws = createDelegateOperatorFromThesis(thesis)!;
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    const rubrics = createDailyRubricsForBrief(ws, vaBrief.id, thesis);
    assert.equal(rubrics.length, 7);
    assert.ok(rubrics[0]!.checklist.length >= 2);
  });

  it("rubric proof validation — missing required item → error", () => {
    const thesis = outboundThesis();
    const ws = createDelegateOperatorFromThesis(thesis)!;
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    const rubrics = createDailyRubricsForBrief(ws, vaBrief.id, thesis);
    const err = validateRubricProof(rubrics[0]!, { checked_ids: [] });
    assert.ok(err);
  });

  it("completeRubricDay → partial vs done thresholds", () => {
    const thesis = outboundThesis();
    let ws = createDelegateOperatorFromThesis(thesis)!;
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    ws = {
      ...ws,
      daily_rubrics: createDailyRubricsForBrief(ws, vaBrief.id, thesis),
    };
    const rubric = ws.daily_rubrics[0]!;
    const required = rubric.checklist.filter((c) => c.required).map((c) => c.id);
    const partial = completeRubricDay(ws, rubric.id, {
      checked_ids: [required[0]!],
      proof_note: "Partial day logged today",
    }, thesis);
    assert.equal(partial.error, undefined);
    assert.equal(partial.workspace.daily_rubrics[0]?.status, "partial");

    const done = completeRubricDay(partial.workspace, rubric.id, {
      checked_ids: required,
      proof_note: "All five contacts enriched with notes",
    }, thesis);
    assert.equal(done.workspace.daily_rubrics[0]?.status, "done");
  });

  it("syncLaneBFromDelegateBrief → reserves outreach rows with linked IDs", () => {
    const thesis = outboundThesis();
    const ws = createDelegateOperatorFromThesis(thesis)!;
    const laneB = createLaneBWorkspaceFromThesis(thesis);
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    const synced = syncLaneBFromDelegateBrief(ws, vaBrief.id, laneB, thesis, 10);
    assert.ok(synced.workspace.briefs[0]?.linked_lane_b_ids?.length);
    assert.ok(synced.workspace.briefs[0]!.linked_lane_b_ids!.length <= 10);
  });

  it("parseOutboundImportLines + import → fills Lane B targets", () => {
    const thesis = outboundThesis();
    const ws = createDelegateOperatorFromThesis(thesis)!;
    let laneB = createLaneBWorkspaceFromThesis(thesis);
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    const synced = syncLaneBFromDelegateBrief(ws, vaBrief.id, laneB, thesis, 5);
    const note = "Jane Doe | jane@co.com | LinkedIn | strong ICP fit note here";
    assert.equal(parseOutboundImportLines(note).length, 1);
    const result = importDelegateDelivery(
      synced.workspace,
      synced.workspace.briefs.find((b) => b.id === vaBrief.id)!,
      { note },
      { thesis, laneB: synced.laneB },
    );
    assert.ok(result.imported >= 1);
    assert.ok(result.laneB!.items.some((i) => i.target_name === "Jane Doe"));
  });

  it("influencer thesis → import routes to influencer_operator when active", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "influencer_partnerships" },
    });
    const ws = createDelegateOperatorFromThesis(thesis)!;
    const infOp = createInfluencerOperatorFromThesis(thesis)!;
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    const note = "@creator1 | tiktok | Fit 4 | niche lifestyle audience";
    const result = importDelegateDelivery(
      ws,
      { ...vaBrief, lane_link_target: "influencer_operator" },
      { note },
      { thesis, influencerOperator: infOp },
    );
    assert.ok(result.imported >= 1);
    assert.ok(result.influencerOperator!.touches.some((t) => t.target_handle.includes("creator1")));
  });

  it("parseCreatorFilmLines → distribution operator slot URLs when P8 active", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const distOp = createDistributionOperatorFromThesis(thesis)!;
    const films = parseCreatorFilmLines("Hook A | https://tiktok.com/@x/video/1");
    assert.equal(films.length, 1);
    const ws = createDelegateOperatorFromThesis(thesis)!;
    const creatorBrief = ws.briefs.find((b) => b.role === "creator")!;
    const result = importDelegateDelivery(
      ws,
      { ...creatorBrief, lane_link_target: "distribution_operator" },
      { note: "Hook A | https://tiktok.com/@x/video/1" },
      { thesis, distributionOperator: distOp },
    );
    assert.ok(result.imported >= 1);
    assert.ok(result.distributionOperator!.slots.some((s) => s.proof?.post_url?.includes("tiktok")));
  });

  it("handoff bundle includes CSV + hire markdown sections", () => {
    const thesis = outboundThesis();
    const ws = createDelegateOperatorFromThesis(thesis)!;
    const laneB = createLaneBWorkspaceFromThesis(thesis);
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    const prep = prepareDelegateHandoff(
      ws,
      vaBrief.id,
      { assignee_name: "Alex VA" },
      thesis,
      laneB,
    );
    const bundle = buildDelegateHandoffBundle(prep.workspace, thesis, vaBrief.id, prep.laneB)!;
    assert.match(bundle.markdown, /Delegate brief/);
    assert.ok(bundle.hire_markdown);
    assert.ok(bundle.csv);
    assert.match(bundle.rubric_schedule, /D1/);
  });

  it("verdict promote when rubrics + brief done", () => {
    const thesis = outboundThesis();
    let ws = createDelegateOperatorFromThesis(thesis)!;
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    const rubrics = createDailyRubricsForBrief(ws, vaBrief.id, thesis).map((r) => ({
      ...r,
      status: "done" as const,
    }));
    ws = {
      ...ws,
      daily_rubrics: rubrics,
      briefs: ws.briefs.map((b) =>
        b.id === vaBrief.id ? { ...b, status: "done" as const } : b,
      ),
    };
    const verdict = evaluateDelegatePerformance(ws, thesis, { pctOfTarget: 85 });
    assert.equal(verdict.kind, "promote");
  });

  it("verdict release when 3+ rubric days missed", () => {
    const thesis = outboundThesis();
    let ws = createDelegateOperatorFromThesis(thesis)!;
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    ws = {
      ...ws,
      daily_rubrics: createDailyRubricsForBrief(ws, vaBrief.id, thesis),
      briefs: ws.briefs.map((b) =>
        b.id === vaBrief.id ? { ...b, status: "handed_off" as const } : b,
      ),
    };
    const verdict = evaluateDelegatePerformance(ws, thesis, { pctOfTarget: 10 });
    assert.equal(verdict.kind, "release");
  });

  it("getNextDelegateRubricDay respects ops day_index", () => {
    const thesis = outboundThesis();
    let ws = createDelegateOperatorFromThesis(thesis)!;
    const vaBrief = ws.briefs.find((b) => b.role === "va")!;
    ws = {
      ...ws,
      daily_rubrics: createDailyRubricsForBrief(ws, vaBrief.id, thesis),
      briefs: ws.briefs.map((b) =>
        b.id === vaBrief.id ? { ...b, status: "in_progress" as const } : b,
      ),
    };
    const d3 = getNextDelegateRubricDay(ws, 3);
    assert.equal(d3?.day_index, 3);
  });

  it("legacy lane_c_workspace hydrates into operator shape", () => {
    const thesis = outboundThesis();
    const legacy = createDelegateWorkspaceFromThesis(thesis)!;
    const migrated = migrateToOperatorWorkspace(legacy, thesis);
    assert.ok(migrated.hire_blocks.length);
    const hydrated = hydrateDelegateOperatorFromJson(legacy, thesis)!;
    assert.ok(hydrated.hire_blocks.length);
  });

  it("gate off — landing_conversion → not active", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "landing_conversion" },
    });
    assert.equal(isDelegateOperatorGate({ thesis, opsCadence: { week_index: 1 } as never }), false);
    assert.equal(createDelegateOperatorFromThesis(thesis), null);
  });
});
