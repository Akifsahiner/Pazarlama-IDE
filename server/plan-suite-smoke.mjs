/**
 * Smoke test for Plan Suite generation (outline + playbooks + task counts).
 * Usage: node plan-suite-smoke.mjs
 * Requires ANTHROPIC_API_KEY in server/.env
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env") });

const { generatePlanSuite } = await import("./dist/brain/planSuite.js");
const { retrieveSkillsForPlaybook } = await import("./dist/brain/skillRetrieval.js");

const scanProfile = {
  id: "smoke-project",
  source: { kind: "folder", path: "/tmp/smoke" },
  name: "Marketing IDE",
  productType: "saas",
  framework: "electron",
  readmeSummary: "Desktop co-pilot for founders to launch and sell products with Claude-quality marketing.",
  routes: ["/", "/pricing", "/docs"],
  hasAnalytics: false,
  excludedPaths: [],
  scannedFileCount: 42,
};

const marketingProfile = {
  product_name: "Marketing IDE",
  product_description: "Desktop co-pilot for founders.",
  main_value_proposition: "Claude-quality marketing execution in your repo.",
  target_audience: [{ persona: "solo founders", pains: ["launch paralysis"], jobs: ["ship faster"] }],
  company_stage: "prelaunch",
  available_channels: ["email", "twitter", "product_hunt"],
};

const events = [];
const t0 = Date.now();
let outlineMs = null;

try {
  const plan = await generatePlanSuite({
    scanProfile,
    marketingProfile,
    persona: "marketing",
    planHorizon: 30,
    emit: (e) => {
      events.push(e.type);
      if (e.type === "plan.outline" && outlineMs === null) {
        outlineMs = Date.now() - t0;
      }
    },
    signal: AbortSignal.timeout(180_000),
  });

  const ms = Date.now() - t0;
  const outlineIdx = events.indexOf("plan.outline");
  const playbookCount = events.filter((t) => t === "plan.playbook").length;
  const taskCount = plan.taskGraph.length;
  const generic = /your product/i.test(JSON.stringify(plan));
  const withDeliverable = plan.taskGraph.filter((t) => t.deliverable?.trim()).length;
  const deliverableRatio = taskCount > 0 ? withDeliverable / taskCount : 0;

  console.log(`✓ plan-suite (${ms}ms)`);
  console.log(`  events: ${events.join(" → ")}`);
  console.log(`  playbooks: ${plan.playbooks.length}, tasks: ${taskCount}`);
  console.log(`  outline at event #${outlineIdx + 1} (${outlineMs ?? "?"}ms)`);
  console.log(`  deliverable ratio: ${(deliverableRatio * 100).toFixed(0)}%`);

  if (playbookCount < 3) {
    console.error(`✗ expected ≥3 plan.playbook events, got ${playbookCount}`);
    process.exit(1);
  }
  if (plan.playbooks.length < 3) {
    console.error(`✗ expected ≥3 playbooks in plan, got ${plan.playbooks.length}`);
    process.exit(1);
  }
  if (taskCount < 20) {
    console.error(`✗ expected ≥20 tasks, got ${taskCount}`);
    process.exit(1);
  }
  if (generic) {
    console.error("✗ generic 'your product' phrasing detected");
    process.exit(1);
  }
  if (outlineMs !== null && outlineMs > 4000) {
    console.error(`✗ outline p95 target exceeded: ${outlineMs}ms > 4000ms`);
    process.exit(1);
  }
  if (deliverableRatio < 0.8) {
    console.error(`✗ deliverable ratio ${(deliverableRatio * 100).toFixed(0)}% < 80%`);
    process.exit(1);
  }

  for (const pb of plan.playbooks) {
    if (pb.tasks.length < 8 || pb.tasks.length > 15) {
      console.error(`✗ playbook ${pb.id}: expected 8–15 tasks, got ${pb.tasks.length}`);
      process.exit(1);
    }
    const rich = pb.tasks.filter((t) => t.deliverable?.trim() && t.acceptance_criteria?.trim()).length;
    const ratio = pb.tasks.length > 0 ? rich / pb.tasks.length : 0;
    if (ratio < 0.8) {
      console.error(`✗ playbook ${pb.id}: acceptance ratio ${(ratio * 100).toFixed(0)}% < 80%`);
      process.exit(1);
    }
  }

  console.log("All plan suite smoke checks passed.");

  const outboundSkill = await retrieveSkillsForPlaybook("sales-outbound", marketingProfile);
  if (!outboundSkill.length || outboundSkill[0].id !== "outreach-drafting") {
    console.error("✗ sales-outbound must map to outreach-drafting skill pack");
    process.exit(1);
  }
  console.log("✓ sales-outbound → outreach-drafting skill mapping");

  console.log("--- sales persona plan suite ---");
  const salesEvents = [];
  const salesPlan = await generatePlanSuite({
    scanProfile,
    marketingProfile,
    persona: "sales",
    planHorizon: 30,
    emit: (e) => salesEvents.push(e.type),
    signal: AbortSignal.timeout(180_000),
  });

  const salesOutbound = salesPlan.playbooks.find((pb) => pb.id === "sales-outbound");
  if (!salesOutbound) {
    console.error("✗ sales persona plan missing sales-outbound playbook");
    process.exit(1);
  }
  const salesDeliverable = salesOutbound.tasks.filter((t) => t.deliverable?.trim()).length;
  const salesRatio = salesOutbound.tasks.length > 0 ? salesDeliverable / salesOutbound.tasks.length : 0;
  console.log(
    `  sales-outbound: ${salesOutbound.tasks.length} tasks, ${(salesRatio * 100).toFixed(0)}% with deliverables`,
  );
  if (salesRatio < 0.8) {
    console.error(`✗ sales-outbound deliverable ratio ${(salesRatio * 100).toFixed(0)}% < 80%`);
    process.exit(1);
  }
  console.log("✓ sales-outbound playbook deliverables OK");
} catch (err) {
  console.error("✗ plan-suite-smoke:", err instanceof Error ? err.message : err);
  process.exit(1);
}
