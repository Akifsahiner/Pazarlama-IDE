#!/usr/bin/env node
/**
 * Faz 3 — Morning brief daily ritual eval.
 */
import assert from "node:assert/strict";
import {
  buildMorningBriefView,
  canDispatchOpsTask,
  estimateFocusEffortBudget,
  morningBriefDayKey,
  shouldShowDayUnlockToast,
} from "../../desktop/src/shared/morningBrief.ts";

function plane() {
  return {
    id: "gcp.1",
    computed_at: "2026-07-01T00:00:00.000Z",
    equation: { product_class: "consumer", formula: "attention → signup", stages: [] },
    binding: {
      stage_id: "attention",
      gtm: "distribution",
      headline: "Distribution volume is the binding constraint.",
      rationale: ["Reach is below threshold"],
      evidence: [],
    },
    red_list: [],
    thesis_id: "viral_short_form",
    thesis_aligned: true,
    primary_lever: "Test hooks",
    mechanism_label: "Viral short-form",
    today: {
      what: "Post Hook B on TikTok",
      why: "Hook A retention 62%",
      done_when: "Live URL logged",
      owner: "user",
      ops_task_id: "task.1",
    },
  };
}

function cadence() {
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
        why: "Hook A retention 62%",
        owner: "user",
        done_when: "Live URL logged",
        status: "in_progress",
        day_slot: "now",
      },
      {
        id: "task.2",
        priority_index: 1,
        what: "Ship landing UTM params",
        why: "Attribution",
        owner: "system",
        done_when: "UTM in repo",
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
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL ${name}`, err);
  }
}

console.log("faz3-morning-brief");

test("morning brief four-field grid populated", () => {
  const view = buildMorningBriefView({ plane: plane(), cadence: cadence() });
  assert.ok(view?.bottleneck);
  assert.ok(view?.today);
  assert.ok(view?.why);
  assert.ok(view?.doneWhen);
  assert.ok(view?.headerLine.includes("Day 2"));
});

test("effort budget owner breakdown", () => {
  const effort = estimateFocusEffortBudget([
    { owner: "system" },
    { owner: "user" },
  ]);
  assert.equal(effort.ownerBreakdown, "1 IDE · 1 you");
  assert.equal(effort.totalMinutes, 75);
});

test("day unlock toast on new calendar day", () => {
  assert.equal(shouldShowDayUnlockToast(undefined, "p1", cadence(), new Date("2026-07-21")), true);
  const key = morningBriefDayKey("p1", new Date("2026-07-21"));
  assert.equal(shouldShowDayUnlockToast(key, "p1", cadence(), new Date("2026-07-21")), false);
});

test("governance blocks ops dispatch", () => {
  assert.equal(
    canDispatchOpsTask(
      { kind: "week_review", title: "Review", reason: "Due", primaryLabel: "Review" },
      { kind: "run_system", taskId: "t1", label: "Run", testId: "x" },
    ),
    false,
  );
  assert.equal(
    canDispatchOpsTask(
      { kind: "week_review", title: "Review", reason: "Due", primaryLabel: "Review" },
      { kind: "week_review", label: "Review", testId: "x" },
    ),
    true,
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
