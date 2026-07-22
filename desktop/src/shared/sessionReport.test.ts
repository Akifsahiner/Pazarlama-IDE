import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSessionReportHtml, buildSessionReportMarkdown } from "./sessionReport";
import type { SessionOutcome } from "./types";

describe("sessionReport", () => {
  it("includes outcomes and weekly report header", () => {
    const outcomes: SessionOutcome[] = [
      { id: "1", at: Date.now(), kind: "run", label: "Applied hero copy", channel: "site" },
    ];
    const md = buildSessionReportMarkdown({
      projectName: "Launch Co",
      session: null,
      outcomes,
      findings: [],
    });
    assert.match(md, /ops snapshot/);
    assert.match(md, /Launch Co/);
    assert.match(md, /Applied hero copy/);
    assert.match(md, /you publish and send/i);
  });

  it("includes campaign session phase when present", () => {
    const md = buildSessionReportMarkdown({
      projectName: "Launch Co",
      session: {
        id: "sess-1",
        projectId: "proj-1",
        goal: "First 10 customers",
        persona: "marketing",
        phase: "executing",
        startedAt: "2026-07-01T10:00:00.000Z",
        runIds: ["r1"],
        assetIds: ["a1"],
        milestones: [],
      },
      outcomes: [],
      findings: [],
    });
    assert.match(md, /First 10 customers/);
    assert.match(md, /Execut/i);
  });

  it("builds printable HTML shell", () => {
    const html = buildSessionReportHtml("# Title\n\n_body_", "Title");
    assert.match(html, /<h1>Title<\/h1>/);
    assert.match(html, /<title>Title<\/title>/);
  });
});
