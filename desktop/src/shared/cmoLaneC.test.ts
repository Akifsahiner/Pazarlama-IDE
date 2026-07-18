import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import {
  buildDelegateHandoffMarkdown,
  completeDelegateBrief,
  createDelegateWorkspaceFromThesis,
  handOffDelegateBrief,
  thesisHasDelegateLane,
} from "./cmoLaneC";
import { outreachExportFilename, outreachTrackerToCsv, outreachTouchRows } from "./cmoOutreachExport";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { planGa4SyncOnCycleStart } from "./cmoMeasurement";
import type { ProjectProfile } from "./types";

function baseProject(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: true,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS for teams.",
    ...overrides,
  };
}

describe("cmoLaneC", () => {
  it("outbound_sales thesis has delegate briefs", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "sales",
      profile: { sales_pipeline_empty: true } as never,
    });
    assert.equal(thesisHasDelegateLane(thesis.id), true);
    const ws = createDelegateWorkspaceFromThesis(thesis);
    assert.ok(ws);
    assert.equal(ws!.briefs.length, 2);
    assert.ok(ws!.briefs.some((b) => b.role === "sdr"));
    assert.ok(ws!.briefs.some((b) => b.role === "va"));
  });

  it("landing_conversion has no Lane C", () => {
    assert.equal(thesisHasDelegateLane("landing_conversion"), false);
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "landing_conversion" },
    });
    assert.equal(thesis.id, "landing_conversion");
    assert.equal(createDelegateWorkspaceFromThesis(thesis), null);
  });

  it("handoff → complete delegate brief flow", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "sales",
      profile: { sales_pipeline_empty: true } as never,
    });
    const ws = createDelegateWorkspaceFromThesis(thesis)!;
    const briefId = ws.briefs[0]!.id;
    const handed = handOffDelegateBrief(ws, briefId, {
      assignee_name: "Alex VA",
      assignee_contact: "alex@agency.com",
    });
    assert.equal(handed.error, undefined);
    assert.equal(handed.workspace.briefs[0]?.status, "handed_off");

    const done = completeDelegateBrief(handed.workspace, briefId, {
      note: "30 targets enriched in tracker",
    });
    assert.equal(done.error, undefined);
    assert.equal(done.workspace.briefs[0]?.status, "done");
  });

  it("buildDelegateHandoffMarkdown includes acceptance criteria", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "sales",
      profile: { sales_pipeline_empty: true } as never,
    });
    const ws = createDelegateWorkspaceFromThesis(thesis)!;
    const md = buildDelegateHandoffMarkdown(ws, thesis, ws.briefs[0]!.id);
    assert.ok(md);
    assert.match(md!, /Done when/);
    assert.match(md!, /Week 1/);
  });
});

describe("cmoOutreachExport", () => {
  it("exports outreach tracker touches to CSV", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "sales",
      profile: { sales_pipeline_empty: true } as never,
    });
    const laneB = createLaneBWorkspaceFromThesis(thesis);
    const rows = outreachTouchRows(laneB);
    assert.ok(rows.length >= 15);
    const csv = outreachTrackerToCsv(laneB);
    assert.match(csv, /^touch_id,touch_number,target_name/);
    assert.match(csv, /Touch 1|outbound_sales\.laneb\.outreach/);
  });

  it("outreachExportFilename includes week index", () => {
    assert.match(outreachExportFilename("Acme Co", 2), /w2/);
  });
});

describe("cmoMeasurement", () => {
  it("skips GA4 sync when not connected", () => {
    const plan = planGa4SyncOnCycleStart({ manual_kpis: [] } as never, { week_index: 2 });
    assert.equal(plan.shouldSync, false);
  });

  it("plans GA4 sync when oauth present", () => {
    const plan = planGa4SyncOnCycleStart({
      ga4_oauth: { refresh_token: "x", connected_at: new Date().toISOString() },
    } as never);
    assert.equal(plan.shouldSync, true);
  });
});
