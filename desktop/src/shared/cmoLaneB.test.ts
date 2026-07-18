import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake, cluelyLikeReadme } from "./cmoIntake";
import {
  completeLaneBItem,
  createLaneBWorkspaceFromThesis,
  getNextLaneBItem,
  resolveLaneBMode,
  validateLaneBProof,
} from "./cmoLaneB";
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
    readmeSummary: "B2B SaaS for teams.",
    ...overrides,
  };
}

describe("cmoLaneB", () => {
  it("viral thesis → posting_calendar with day-1 posts", () => {
    const thesis = buildCmoIntake({
      project: baseProject({ readmeSummary: cluelyLikeReadme() }),
      persona: "marketing",
    });
    assert.equal(resolveLaneBMode(thesis.id), "posting_calendar");
    const ws = createLaneBWorkspaceFromThesis(thesis);
    assert.ok(ws.items.length >= 5);
    assert.ok(ws.items.some((i) => i.day === 1 && i.channel === "short-form"));
  });

  it("sales persona → outreach_tracker with touch rows", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "sales",
      profile: { sales_pipeline_empty: true } as never,
    });
    assert.equal(resolveLaneBMode(thesis.id), "outreach_tracker");
    const ws = createLaneBWorkspaceFromThesis(thesis);
    assert.ok(ws.items.some((i) => i.title.startsWith("Touch ")));
  });

  it("PH launch → launch_runbook with T-offsets", () => {
    const thesis = buildCmoIntake({
      project: baseProject({ hasAnalytics: true }),
      persona: "marketing",
      profile: { days_until_launch: 10, company_stage: "prelaunch" } as never,
    });
    assert.equal(resolveLaneBMode(thesis.id), "launch_runbook");
    const ws = createLaneBWorkspaceFromThesis(thesis);
    assert.ok(ws.items.some((i) => i.runbook_offset === "T-0"));
  });

  it("completeLaneBItem requires URL or note", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const ws = createLaneBWorkspaceFromThesis(thesis);
    const next = getNextLaneBItem(ws);
    assert.ok(next);
    const bad = completeLaneBItem(ws, next.id, {});
    assert.ok(bad.error);
    const good = completeLaneBItem(ws, next.id, {
      url: "https://linkedin.com/posts/abc",
    });
    assert.equal(good.error, undefined);
    assert.equal(
      good.workspace.items.find((i) => i.id === next.id)?.status,
      "done",
    );
  });

  it("validateLaneBProof accepts substantive note without URL", () => {
    const v = validateLaneBProof({ note: "Posted to LinkedIn — 12 comments in first hour" });
    assert.equal(v.ok, true);
  });
});
