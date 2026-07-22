#!/usr/bin/env node
/**
 * Faz 10.3 — Founder journey rubric: 8 theses × 5 timepoints = 40 scenarios.
 * Each scenario evaluates See (command surface), Feel (single primary action), Complete (kernel sync).
 */
import { buildCmoIntake } from "../../desktop/src/shared/cmoIntake.ts";
import { createOpsCadenceFromThesis } from "../../desktop/src/shared/cmoOpsCadence.ts";
import {
  bootstrapExecutionKernel,
  dispatchExecutionTask,
  completeExecutionTask,
  weekReviewGovernanceId,
  projectKernelToOpsCadence,
} from "../../desktop/src/shared/executionKernel.ts";
import { completeWeekReviewGovernance } from "../../desktop/src/shared/executionKernelBridge.ts";
import { completeWeekReview } from "../../desktop/src/shared/cmoOpsCadence.ts";
import { buildActiveExecutionRecord } from "../../desktop/src/shared/executionRecord.ts";
import { resolveCommandSurfaceAction } from "../../desktop/src/shared/cmoCommandSurface.ts";
import { buildGrowthControlPlane } from "../../desktop/src/shared/cmoGrowthPlane.ts";

const THESIS_IDS = [
  "viral_short_form",
  "founder_social",
  "product_hunt_launch",
  "landing_conversion",
  "seo_content",
  "outbound_sales",
  "community_launch",
  "influencer_partnerships",
];

const TIMEPOINTS = ["day0", "day1", "day3", "day7", "week2"];

const project = {
  id: "p",
  source: { kind: "folder", path: "/p" },
  name: "Product",
  framework: "Next.js",
  routes: ["app/page.tsx"],
  hasAnalytics: false,
  excludedPaths: [],
  scannedFileCount: 50,
  readmeSummary: "SaaS product",
};

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
}

function fail(label, detail = "") {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function assert(condition, label, detail = "") {
  if (condition) ok(label);
  else fail(label, detail);
}

function simulateTimepoint(timepoint, thesis, cadence, kernel) {
  const prov = { source: "ops_board", at: new Date().toISOString(), actor: "user" };
  let k = kernel;
  let c = cadence;

  if (timepoint === "day0") {
    return { kernel: k, cadence: c };
  }

  const systemTask = c.tasks.find((t) => t.owner === "system");
  const userTask = c.tasks.find((t) => t.owner === "user");

  if (timepoint === "day1" && systemTask) {
    k.instances[systemTask.id] = { ...k.instances[systemTask.id], status: "ready" };
    const d = dispatchExecutionTask(k, systemTask.id, prov);
    k = d.kernel;
    c = projectKernelToOpsCadence(k, c);
    return { kernel: k, cadence: c };
  }

  if (timepoint === "day3") {
    if (systemTask) {
      k.instances[systemTask.id] = { ...k.instances[systemTask.id], status: "ready" };
      k = completeExecutionTask(
        k,
        systemTask.id,
        { proof: { note: "Shipped day 1", completed_at: new Date().toISOString() } },
        prov,
      );
    }
    c = { ...c, day_index: 3 };
    c = projectKernelToOpsCadence(k, c);
    if (userTask && k.instances[userTask.id]?.status === "ready") {
      k = dispatchExecutionTask(k, userTask.id, prov).kernel;
      c = projectKernelToOpsCadence(k, c);
    }
    return { kernel: k, cadence: c };
  }

  if (timepoint === "day7") {
    for (const task of c.tasks) {
      if (task.owner === "system" || task.owner === "user") {
        k.instances[task.id] = { ...k.instances[task.id], status: "ready" };
        k = completeExecutionTask(
          k,
          task.id,
          {
            proof: {
              note: "Week 1 complete",
              urls: task.owner === "user" ? ["https://example.com/post"] : undefined,
              kpi_value: task.owner === "user" ? 42 : undefined,
              completed_at: new Date().toISOString(),
            },
          },
          prov,
        );
      }
    }
    c = completeWeekReview(c, "Week 1 closed with measurable proof.");
    k = completeWeekReviewGovernance(k, c, "Week 1 closed with measurable proof.");
    c = projectKernelToOpsCadence(k, c);
    return { kernel: k, cadence: c };
  }

  if (timepoint === "week2") {
    c = createOpsCadenceFromThesis(thesis);
    c = {
      ...c,
      week_index: 2,
      day_index: 1,
      prior_ops_cadence_id: cadence.id,
    };
    k = bootstrapExecutionKernel({ cadence: c, projectId: "p" });
    c = projectKernelToOpsCadence(k, c);
    return { kernel: k, cadence: c };
  }

  return { kernel: k, cadence: c };
}

function evaluateScenario(thesisId, timepoint) {
  const thesis = buildCmoIntake({
    project,
    persona: "marketing",
    profile: { company_stage: "prelaunch" },
    context: { force_thesis_id: thesisId },
  });
  let cadence = createOpsCadenceFromThesis(thesis);
  let kernel = bootstrapExecutionKernel({ cadence, projectId: "p" });
  cadence = projectKernelToOpsCadence(kernel, cadence);

  const simulated = simulateTimepoint(timepoint, thesis, cadence, kernel);
  kernel = simulated.kernel;
  cadence = simulated.cadence;

  const plane = buildGrowthControlPlane({
    thesis,
    cadence,
    project,
    profile: { company_stage: "prelaunch" },
  });

  const record = buildActiveExecutionRecord({
    plane,
    cadence,
    executionKernel: kernel,
    channelThesis: thesis,
    project,
  });

  const action = resolveCommandSurfaceAction({
    plane,
    cadence,
    executionKernel: kernel,
    channelThesis: thesis,
    project,
  });

  const label = `${thesisId}/${timepoint}`;

  // See — record and action exist
  assert(Boolean(record), `${label}/see-record`, "missing execution record");
  assert(action.kind !== "none" || timepoint === "day7", `${label}/see-action`, action.kind);

  // Feel — single unambiguous primary (not none for active weeks)
  if (timepoint !== "day7" && timepoint !== "week2") {
    assert(record.next.action.kind !== "none", `${label}/feel-primary`, record.next.action.kind);
  }

  // Complete — kernel ↔ cadence sync
  let drift = 0;
  for (const task of cadence.tasks) {
    const inst = kernel.instances[task.id];
    if (!inst) {
      drift += 1;
      continue;
    }
    const projected =
      inst.status === "completed" || inst.status === "measuring"
        ? "done"
        : inst.status === "running" ||
            inst.status === "awaiting_approval" ||
            inst.status === "verifying" ||
            inst.status === "paused" ||
            inst.status === "applied"
          ? "in_progress"
          : inst.status === "cancelled"
            ? "skipped"
            : "pending";
    if (projected !== task.status && !(inst.status === "failed" && task.status === "pending")) {
      drift += 1;
    }
  }
  assert(drift === 0, `${label}/complete-sync`, `${drift} drift`);

  if (timepoint === "week2") {
    assert(cadence.week_index >= 2, `${label}/week2-index`, `week_index=${cadence.week_index}`);
  }

  if (timepoint === "day7") {
    const gov = kernel.instances[weekReviewGovernanceId(cadence.id)];
    assert(gov?.status === "completed", `${label}/week-close-governance`, gov?.status);
  }
}

console.log("Founder journey rubric (8 thesis × 5 timepoints)\n");

for (const thesisId of THESIS_IDS) {
  for (const timepoint of TIMEPOINTS) {
    try {
      evaluateScenario(thesisId, timepoint);
    } catch (e) {
      fail(`${thesisId}/${timepoint}`, e instanceof Error ? e.message : String(e));
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed (${THESIS_IDS.length * TIMEPOINTS.length} scenarios)`);
if (failed > 0) process.exit(1);
