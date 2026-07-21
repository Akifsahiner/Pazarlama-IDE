#!/usr/bin/env node
/**
 * Part 10 execution kernel matrix — lifecycle bootstrap + retry idempotency.
 */
import { buildCmoIntake } from "../../desktop/src/shared/cmoIntake.ts";
import { createOpsCadenceFromThesis } from "../../desktop/src/shared/cmoOpsCadence.ts";
import {
  bootstrapExecutionKernel,
  dispatchExecutionTask,
  completeExecutionTask,
  retryExecutionTask,
  hydrateExecutionKernelFromJson,
} from "../../desktop/src/shared/executionKernel.ts";
import { allRegisteredModes, resolveHandlerKind } from "../../desktop/src/shared/executionHandlers.ts";

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

const MODES = [
  "repo_edit",
  "browser_research",
  "content_draft",
  "scout_then_edit",
  "human_post",
  "human_outreach",
  "human_launch",
  "human_log",
  "delegate_rubric",
  "delegate_brief",
  "export_csv",
  "measurement_sync",
  "product_request",
  "week_review",
];

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
let incomplete = 0;

function ok() {
  passed += 1;
}
function fail(label, detail = "") {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log("Execution kernel matrix\n");

for (const thesisId of THESIS_IDS) {
  const thesis = buildCmoIntake({
    project,
    persona: "marketing",
    profile: { company_stage: "prelaunch" },
    context: { force_thesis_id: thesisId },
  });
  const cadence = createOpsCadenceFromThesis(thesis);
  const taskCount = cadence.tasks.length;
  let kernel = bootstrapExecutionKernel({ cadence, projectId: "eval-p" });

  if (Object.keys(kernel.instances).length !== taskCount) {
    incomplete += 1;
    fail(`${thesisId} bootstrap`, `instances ${Object.keys(kernel.instances).length} != tasks ${taskCount}`);
  } else ok();

  const systemTask = cadence.tasks.find((t) => t.owner === "system");
  if (systemTask) {
    kernel.instances[systemTask.id] = {
      ...kernel.instances[systemTask.id],
      status: "ready",
    };
    try {
      const prov = { source: "ops_board", at: new Date().toISOString() };
      const d = dispatchExecutionTask(kernel, systemTask.id, prov);
      kernel = d.kernel;
      if (kernel.instances[systemTask.id]?.status !== "running") {
        fail(`${thesisId} dispatch`, "not running");
      } else ok();

      kernel = completeExecutionTask(
        kernel,
        systemTask.id,
        { toStatus: "completed", proof: { note: "eval" } },
        prov,
      );
      if (kernel.instances[systemTask.id]?.status !== "completed") {
        fail(`${thesisId} complete`, "not completed");
      } else ok();
    } catch (e) {
      fail(`${thesisId} dispatch/complete`, e instanceof Error ? e.message : String(e));
    }
  }

  const humanTask = cadence.tasks.find((t) => t.owner === "user");
  if (humanTask?.human_execution_asset) {
    const assetBefore = JSON.stringify(humanTask.human_execution_asset);
    kernel.instances[humanTask.id] = {
      ...kernel.instances[humanTask.id],
      status: "failed",
    };
    try {
      kernel = retryExecutionTask(kernel, humanTask.id, {
        source: "ops_board",
        at: new Date().toISOString(),
      });
      if (Object.keys(kernel.instances).length !== taskCount) {
        fail(`${thesisId} retry dup`, "instance count changed");
      } else ok();
      const assetAfter = JSON.stringify(humanTask.human_execution_asset);
      if (assetBefore !== assetAfter) {
        fail(`${thesisId} retry asset`, "asset mutated");
      } else ok();
    } catch (e) {
      fail(`${thesisId} retry`, e instanceof Error ? e.message : String(e));
    }
  }

  const roundTrip = hydrateExecutionKernelFromJson(JSON.parse(JSON.stringify(kernel)));
  if (!roundTrip?.instances[systemTask?.id ?? ""]) {
    fail(`${thesisId} hydrate`, "round-trip failed");
  } else ok();
}

for (const mode of MODES) {
  const kind = resolveHandlerKind(mode);
  if (!kind) {
    incomplete += 1;
    fail(`handler/${mode}`, "no handler");
  } else ok();
}

const registered = new Set(allRegisteredModes());
for (const mode of MODES) {
  if (!registered.has(mode)) {
    incomplete += 1;
    fail(`registry/${mode}`, "not registered");
  }
}

const total = passed + failed;
const incompletePct = total > 0 ? ((incomplete / total) * 100).toFixed(1) : "0.0";
console.log(`\nIncomplete: ${incomplete}/${total} (${incompletePct}%)`);
console.log(`Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
