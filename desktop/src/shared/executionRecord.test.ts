import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildActiveExecutionRecord,
  buildBottleneckSentence,
  buildExecutionHistory,
  formatExecutionDone,
  formatExecutionResults,
  resolveRecordDetailTab,
} from "./executionRecord";
import { buildShipReceiptFromApply } from "./shipReceipt";
import type { GrowthControlPlane } from "./cmoGrowthPlane";
import type { CmoOpsCadence } from "./cmoOpsCadence";

function cadence(overrides: Partial<CmoOpsCadence> = {}): CmoOpsCadence {
  return {
    id: "ops.1",
    thesis_id: "viral_short_form",
    started_at: "2026-07-01T00:00:00.000Z",
    week_index: 1,
    day_index: 1,
    tasks: [
      {
        id: "task.1",
        priority_index: 0,
        what: "Landing + founder outreach",
        why: "İlk 20 aktif kullanıcı hedefi için dağıtım testi.",
        owner: "system",
        done_when: "Hero diff uygulandı",
        status: "in_progress",
        day_slot: "now",
      },
      {
        id: "task.0",
        priority_index: 1,
        what: "Outreach mesajları",
        why: "Ajans segmenti testi.",
        owner: "user",
        done_when: "86 mesaj hazır + KPI",
        status: "done",
        day_slot: "today",
        proof: {
          completed_at: "2026-07-05T00:00:00.000Z",
          kpi_name: "Kayıt",
          kpi_value: 11,
          kpi_target: 20,
          note: "Ajans segmenti 3.2x daha iyi.",
          urls: ["https://example.com/proof"],
        },
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
      headline: "Dağıtım hacmi darboğaz",
      rationale: ["Reach eşiğinin altında."],
      evidence: [],
    },
    red_list: [],
    thesis_id: "viral_short_form",
    thesis_aligned: true,
    primary_lever: "Founder outreach",
    today: {
      what: "Landing + founder outreach",
      why: "İlk 20 aktif kullanıcı.",
      done_when: "Hero diff uygulandı",
      owner: "system",
      ops_task_id: "task.1",
    },
    ...overrides,
  };
}

describe("executionRecord", () => {
  it("buildBottleneckSentence formats English one-liner", () => {
    const s = buildBottleneckSentence({
      bottleneck: "Distribution volume",
      nextMove: "Landing + founder outreach",
    });
    assert.match(
      s,
      /Bottleneck Distribution volume → next move Landing \+ founder outreach/,
    );
  });

  it("buildActiveExecutionRecord composes goal, experiment, lifecycle", () => {
    const record = buildActiveExecutionRecord({
      plane: plane(),
      cadence: cadence(),
      campaignSession: {
        id: "cs.1",
        projectId: "p1",
        goal: "İlk 20 aktif kullanıcı",
        persona: "marketing",
        startedAt: "2026-07-01T00:00:00.000Z",
        phase: "executing",
        milestones: [],
        runIds: [],
        assetIds: [],
      },
    });

    assert.equal(record.goal, "İlk 20 aktif kullanıcı");
    assert.match(record.experiment, /Landing \+ founder outreach/);
    assert.equal(record.lifecycle, "running");
    assert.match(record.bottleneckSentence, /Bottleneck/);
    assert.ok(record.next.label.length > 0);
    assert.ok(record.morningBrief);
    assert.equal(record.morningBrief!.today, record.experiment.split(" — ")[0]);
    assert.ok(record.morningBrief!.footer.pendingOps >= 0);
  });

  it("formatExecutionResults shows thesis honest empty for done user task without KPI", () => {
    const chips = formatExecutionResults({
      taskStatus: "done",
      taskOwner: "user",
      thesisId: "viral_short_form",
    });
    assert.match(chips[0]?.value ?? "", /24–72h|log views/i);
    assert.equal(chips[0]?.tone, "missing");
  });

  it("formatExecutionResults uses thesis honest empty instead of Not measured yet", () => {
    const chips = formatExecutionResults({
      thesisId: "viral_short_form",
      cadence: cadence({ day_index: 1 }),
    });
    const empty = chips.find((c) => c.id === "results-empty");
    assert.ok(empty);
    assert.match(empty!.value!, /24–72h|log views/i);
    assert.doesNotMatch(empty!.value!, /Not measured yet/i);
  });

  it("buildActiveExecutionRecord includes dayPulse at day 3+ without growth plane", () => {
    const record = buildActiveExecutionRecord({
      cadence: cadence({ day_index: 3 }),
      campaignSession: {
        id: "cs.1",
        projectId: "p1",
        goal: "Test",
        persona: "marketing",
        startedAt: "2026-07-01T00:00:00.000Z",
        phase: "executing",
        milestones: [],
        runIds: [],
        assetIds: [],
      },
    });
    assert.ok(record.dayPulse);
    assert.equal(record.dayPulse!.checkpoint, 3);
  });

  it("history cycle empty uses thesis honest copy", () => {
    const history = buildExecutionHistory({
      continuous: {
        phase: "executing",
        current_cycle_index: 1,
        cycles: [
          {
            cycle_index: 1,
            thesis_id: "viral_short_form",
            thesis_title: "Viral",
            started_at: "2026-07-01T00:00:00.000Z",
            ops_cadence_id: "ops.1",
          },
        ],
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    });
    const empty = history[0]?.results.find((r) => r.id.includes("empty"));
    assert.ok(empty);
    assert.doesNotMatch(empty!.value ?? "", /Not measured yet/i);
  });

  it("formatExecutionDone includes proof KPI note", () => {
    const c = cadence();
    const doneTask = c.tasks[1]!;
    const items = formatExecutionDone({ task: doneTask });
    assert.ok(items.some((i) => i.label.includes("Kanıt URL") || i.detail?.includes("example.com")));
  });

  it("resolveRecordDetailTab prefers diff during active edit run", () => {
    const tab = resolveRecordDetailTab({
      record: { lifecycle: "running", detailHint: "diff" },
      activeRun: {
        runId: "r1",
        goal: "Edit hero",
        status: "running",
        kind: "edit",
        events: [],
      },
    });
    assert.equal(tab, "diff");
  });

  it("buildExecutionHistory includes done ops tasks", () => {
    const history = buildExecutionHistory({
      plane: plane(),
      cadence: cadence(),
      campaignSession: {
        id: "cs.1",
        projectId: "p1",
        goal: "İlk 20 aktif kullanıcı",
        persona: "marketing",
        startedAt: "2026-07-01T00:00:00.000Z",
        phase: "executing",
        milestones: [],
        runIds: [],
        assetIds: [],
      },
    });
    assert.ok(history.some((h) => h.id === "task.0"));
    assert.ok(history.some((h) => h.results.some((r) => r.label === "Kayıt")));
  });

  it("buildActiveExecutionRecord shows verifying lifecycle with ship receipt", () => {
    const receipt = buildShipReceiptFromApply({
      runId: "run-v",
      filesApplied: ["page.tsx"],
      previewUrl: "http://localhost:3000",
    });
    const record = buildActiveExecutionRecord({
      plane: plane(),
      cadence: cadence(),
      shipReceipt: { ...receipt, verifyStatus: "running" },
      pendingVerify: true,
    });
    assert.equal(record.lifecycle, "verifying");
    assert.ok(record.results.some((r) => r.id === "receipt-live-running"));
  });

  it("formatExecutionResults prefers ship receipt chips over proof", () => {
    const receipt = buildShipReceiptFromApply({
      runId: "run-r",
      commitSha: "abc123456789",
      filesApplied: ["page.tsx"],
    });
    const chips = formatExecutionResults({ shipReceipt: receipt });
    assert.ok(chips.some((c) => c.id === "receipt-commit"));
  });
});
