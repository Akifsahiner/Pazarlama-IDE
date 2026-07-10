/**
 * Smoke test for Marketing Brain turn pipeline (decide + draft + outreach).
 * Usage: node brain-smoke.mjs
 * Requires ANTHROPIC_API_KEY in server/.env
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env") });

const { runTurn } = await import("./dist/brain/turn.js");
const { marketingProfileSchema } = await import("./dist/schemas/marketingProfile.js");
const { retrieveSkills, renderSkillContext } = await import("./dist/brain/skillRetrieval.js");

const profile = marketingProfileSchema.parse({
  product_name: "Marketing IDE",
  product_description: "Desktop co-pilot for founders to launch and sell products.",
  main_value_proposition: "Claude-quality marketing execution in your repo.",
  target_audience: [{ persona: "solo founders", pains: ["launch paralysis"], jobs: ["ship faster"] }],
  company_stage: "prelaunch",
  competitors: [{ name: "Cursor", note: "Dev IDE" }],
});

// Pre-flight: outreach discipline must load outreach-drafting pack (no API)
{
  const outreachPacks = await retrieveSkills("outreach", profile, 2);
  if (!outreachPacks.length || outreachPacks[0].id !== "outreach-drafting") {
    console.error(
      `✗ outreach skill retrieval: expected outreach-drafting, got ${outreachPacks.map((p) => p.id).join(",") || "none"}`,
    );
    process.exit(1);
  }
  const ctx = renderSkillContext(outreachPacks);
  if (!/reply_rate|Anti-patterns|cold email/i.test(ctx)) {
    console.error("✗ outreach skill context missing outreach-drafting content");
    process.exit(1);
  }
  const leadPacks = await retrieveSkills("lead_research", profile, 1);
  if (!leadPacks.length || leadPacks[0].id !== "lead-research") {
    console.error(`✗ lead_research skill retrieval failed`);
    process.exit(1);
  }
  console.log("✓ skill pre-flight: outreach-drafting + lead-research packs inject");
}

const planProgressSummary = {
  done: 2,
  total: 20,
  nextTaskTitle: "Draft launch tweet thread",
  nextTaskId: "content-3",
  nextPlaybookId: "content",
  activePlaybookId: "content",
  activePlaybookTitle: "Content Engine",
};

// Proactive path — no LLM (Faz 7)
{
  const events = [];
  const payloads = [];
  const result = await runTurn({
    userId: "smoke",
    message: "",
    profile,
    planProgressSummary,
    context: {
      proactive_trigger: "apply_complete",
      last_run_summary: "Applied 2 files to main.",
      plan_progress: { done: 2, total: 20, next_task_title: "Draft launch tweet thread" },
    },
    emit: (e) => {
      events.push(e.type);
      if (e.type === "proactive_suggestion") payloads.push(e);
    },
  });
  if (!events.includes("proactive_suggestion")) {
    console.error(`✗ proactive-apply: missing proactive_suggestion event (${events.join(",")})`);
    process.exit(1);
  }
  const sug = payloads[0];
  if (!sug?.title || !sug?.body || !sug?.action?.taskId) {
    console.error("✗ proactive-apply: suggestion missing title/body/action");
    process.exit(1);
  }
  if (result.persist.kind !== "answer" || !result.persist.proactive) {
    console.error("✗ proactive-apply: unexpected persist shape");
    process.exit(1);
  }
  console.log("✓ proactive-apply (no LLM) suggestion fields present");
}

const cases = [
  { label: "decide-positioning", message: "How should we position Marketing IDE vs Cursor?", persona: "marketing", planProgressSummary },
  { label: "draft-landing", message: "Write landing page hero copy for our homepage.", persona: "marketing" },
  { label: "sales-outreach", message: "Draft a cold outreach email for SaaS founders.", persona: "sales" },
];

let failed = 0;
for (const c of cases) {
  const events = [];
  const t0 = Date.now();
  try {
    const result = await runTurn({
      userId: "smoke",
      message: c.message,
      profile,
      persona: c.persona,
      planProgressSummary: c.planProgressSummary,
      emit: (e) => events.push(e.type),
      signal: AbortSignal.timeout(120_000),
    });
    const ms = Date.now() - t0;
    console.log(`✓ ${c.label} (${ms}ms) kind=${result.persist.kind} events=${events.join(",")}`);

    if (!events.some((t) => t === "brain.status" || t.startsWith("brain."))) {
      console.error(`✗ ${c.label}: missing brain.status events`);
      failed += 1;
    }
    if (c.label === "decide-positioning") {
      if (result.persist.kind !== "decision") {
        console.error(`✗ expected decision kind, got ${result.persist.kind}`);
        failed += 1;
      }
      const blob = JSON.stringify(result.persist);
      if (!/plan-task:\/\//.test(blob) && !result.persist.decision?.next_steps?.some((s) => /plan-task|surface:\/\//.test(s.step))) {
        console.warn(`⚠ ${c.label}: no deep link in decision (prompt may skip when plan sparse)`);
      }
    }
    if (c.label === "sales-outreach" && result.persist.kind !== "draft" && result.persist.kind !== "decision") {
      console.error(`✗ sales case expected draft or decision, got ${result.persist.kind}`);
      failed += 1;
    }
  } catch (err) {
    failed += 1;
    console.error(`✗ ${c.label}:`, err instanceof Error ? err.message : err);
  }
}

if (failed > 0) {
  console.error(`${failed}/${cases.length} smoke cases failed`);
  process.exit(1);
}
console.log("All brain smoke cases passed.");
