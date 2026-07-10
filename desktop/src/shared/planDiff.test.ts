import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffPlanVersions, formatPlanRevisionMarkdown } from "./planDiff";
import type { MarketingPlan } from "./types";

const basePlan: MarketingPlan = {
  id: "plan-1",
  schemaVersion: 2,
  positioning: "Test",
  icp: "Devs",
  readiness: [],
  playbooks: [
    {
      id: "content",
      slug: "content",
      title: "Content",
      subtitle: "Posts",
      phase: "launch",
      iconKey: "content",
      executiveSummary: "Post",
      primaryMetric: { name: "Posts", target: "10" },
      bets: [],
      risks: [],
      dependsOnPlaybookIds: [],
      tasks: [
        {
          id: "t1",
          title: "Write blog",
          dependsOn: [],
          day: 3,
          playbookId: "content",
        },
      ],
      sortOrder: 0,
    },
  ],
  taskGraph: [
    { id: "t1", title: "Write blog", dependsOn: [], day: 3, playbookId: "content" },
  ],
  contentCalendar: [],
  strategyNote: "Launch",
};

describe("planDiff", () => {
  it("detects added tasks and playbooks", () => {
    const revised = structuredClone(basePlan);
    revised.id = "plan-2";
    const playbooks = [...(revised.playbooks ?? [])];
    playbooks.push({
      id: "tiktok",
      slug: "tiktok",
      title: "TikTok",
      subtitle: "Short video",
      phase: "launch",
      iconKey: "social",
      executiveSummary: "TikTok track",
      primaryMetric: { name: "Views", target: "1k" },
      bets: [],
      risks: [],
      dependsOnPlaybookIds: [],
      tasks: [
        {
          id: "tt1",
          title: "Post TikTok intro",
          dependsOn: [],
          day: 5,
          playbookId: "tiktok",
        },
      ],
      sortOrder: 1,
    });
    revised.playbooks = playbooks;
    revised.taskGraph = playbooks.flatMap((p) => p.tasks);
    const diff = diffPlanVersions(basePlan, revised, "Added TikTok channel");
    assert.equal(diff.addedPlaybooks.length, 1);
    assert.equal(diff.addedPlaybooks[0]!.title, "TikTok");
    assert.ok(diff.addedTasks.some((t) => t.title.includes("TikTok")));
    assert.match(formatPlanRevisionMarkdown(diff), /Added TikTok channel/);
  });
});
