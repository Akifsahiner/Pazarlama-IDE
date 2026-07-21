import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GrowthControlPlane } from "./cmoGrowthPlane";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import {
  buildMorningBriefView,
  estimateFocusEffortBudget,
  morningBriefDayKey,
  resolveQueuedHint,
  shouldShowDayUnlockToast,
} from "./morningBrief";

function cadence(overrides: Partial<CmoOpsCadence> = {}): CmoOpsCadence {
  return {
    id: "ops.1",
    thesis_id: "viral_short_form",
    started_at: "2026-07-01T00:00:00.000Z",
    week_index: 1,
    day_index: 2,
    tasks: [
      {
        id: "task.1",
        priority_index: 0,
        what: "Post Hook B on TikTok",
        why: "Hook A retention 62% — testing variant B",
        owner: "user",
        done_when: "Live URL + 24h view log",
        status: "in_progress",
        day_slot: "now",
      },
      {
        id: "task.2",
        priority_index: 1,
        what: "Ship landing UTM params",
        why: "Attribution for viral traffic",
        owner: "system",
        done_when: "UTM params in repo",
        status: "pending",
        day_slot: "today",
      },
    ],
    week_review: {
      week_index: 1,
      due_at: "2099-07-08T00:00:00.000Z",
      status: "pending",
    },
    last_focus_reset_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function plane(overrides: Partial<GrowthControlPlane> = {}): GrowthControlPlane {
  return {
    id: "gcp.1",
    computed_at: "2026-07-01T00:00:00.000Z",
    equation: { product_class: "consumer", formula: "attention → signup", stages: [] },
    binding: {
      stage_id: "attention",
      gtm: "distribution",
      headline: "Retention on hook A",
      rationale: ["Reach below threshold"],
      evidence: [],
    },
    red_list: [],
    thesis_id: "viral_short_form",
    thesis_aligned: true,
    primary_lever: "Test short-form hooks",
    mechanism_label: "Viral short-form",
    today: {
      what: "Post Hook B on TikTok",
      why: "Hook A retention 62% — testing variant B",
      done_when: "Live URL + 24h view log",
      owner: "user",
      ops_task_id: "task.1",
    },
    ...overrides,
  };
}

describe("morningBrief", () => {
  it("builds four-field view from cadence + plane", () => {
    const view = buildMorningBriefView({ plane: plane(), cadence: cadence() });
    assert.ok(view);
    assert.equal(view!.bottleneck, "Retention on hook A");
    assert.equal(view!.today, "Post Hook B on TikTok");
    assert.ok(view!.why.includes("62%"));
    assert.equal(view!.doneWhen, "Live URL + 24h view log");
    assert.equal(view!.dayIndex, 2);
    assert.ok(view!.headerLine.includes("Day 2"));
    assert.ok(view!.headerLine.includes("Viral short-form"));
  });

  it("sums effort and formats owner breakdown", () => {
    const effort = estimateFocusEffortBudget([
      { owner: "system" } as never,
      { owner: "system" } as never,
      { owner: "user" } as never,
    ]);
    assert.equal(effort.totalMinutes, 120);
    assert.equal(effort.ownerBreakdown, "2 IDE · 1 you");
    assert.match(effort.totalLabel, /^~2h/);
  });

  it("caps focus tasks at 3", () => {
    const manyTasks = Array.from({ length: 5 }, (_, i) => ({
      id: `t.${i}`,
      priority_index: i,
      what: `Task ${i}`,
      why: "why",
      owner: "system" as const,
      done_when: "done",
      status: i === 0 ? ("in_progress" as const) : ("pending" as const),
      day_slot: "later" as const,
    }));
    const c = cadence({ tasks: manyTasks });
    const view = buildMorningBriefView({ plane: plane(), cadence: c });
    assert.ok(view);
    assert.equal(view!.focusTasks.length, 1);
  });

  it("returns queued hint when task 2 is locked", () => {
    const c = cadence({
      tasks: [
        {
          id: "task.1",
          priority_index: 0,
          what: "First",
          why: "w",
          owner: "user",
          done_when: "d",
          status: "in_progress",
          day_slot: "now",
        },
        {
          id: "task.2",
          priority_index: 1,
          what: "Second",
          why: "w",
          owner: "system",
          done_when: "d",
          status: "pending",
          day_slot: "today",
        },
      ],
    });
    assert.equal(resolveQueuedHint(c), undefined);

    const locked = cadence({
      tasks: [
        {
          id: "task.1",
          priority_index: 0,
          what: "First",
          why: "w",
          owner: "user",
          done_when: "d",
          status: "pending",
          day_slot: "now",
        },
        {
          id: "task.2",
          priority_index: 1,
          what: "Second",
          why: "w",
          owner: "system",
          done_when: "d",
          status: "pending",
          day_slot: "today",
        },
      ],
    });
    const hint = resolveQueuedHint(locked);
    assert.ok(hint);
    assert.match(hint!.message, /Queued — finish Task #1 first/);
    assert.equal(hint!.blockedTaskId, "task.1");
  });

  it("detects calendar day unlock", () => {
    const key = morningBriefDayKey("proj-1", new Date("2026-07-21T10:00:00Z"));
    assert.equal(key, "proj-1:2026-07-21");
    assert.equal(
      shouldShowDayUnlockToast("proj-1:2026-07-20", "proj-1", cadence(), new Date("2026-07-21T10:00:00Z")),
      true,
    );
    assert.equal(
      shouldShowDayUnlockToast(key, "proj-1", cadence(), new Date("2026-07-21T12:00:00Z")),
      false,
    );
  });
});
