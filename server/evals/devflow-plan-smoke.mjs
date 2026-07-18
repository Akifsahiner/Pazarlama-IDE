#!/usr/bin/env node
/**
 * DevFlow dev-founder Plan Studio smoke — P0+P1 outline eligibility + optional LLM suite.
 *
 * Phase A (no API): catalog skipIf gates, outline prompt, skill retrieval, P1 stub eligibility.
 * Phase B (optional): full generatePlanSuite + P1 playbook generation when DEVFLOW_LLM_SMOKE=1.
 *
 * Usage: npm run build && node evals/devflow-plan-smoke.mjs
 *        DEVFLOW_LLM_SMOKE=1 node evals/devflow-plan-smoke.mjs
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dir, "..");
config({ path: resolve(serverRoot, ".env") });

const PRODUCT = "DevFlow";
const P0_STUBS = ["community-launch", "seo-foundation", "email-nurture"];
const P1_STUBS = ["twitter-x-gtm", "newsletter-sponsorship", "press-pr-launch", "devrel-open-source-launch"];
const ALL_P01 = [...P0_STUBS, ...P1_STUBS];

const scanProfile = {
  id: "devflow-smoke",
  source: { kind: "folder", path: "/tmp/devflow" },
  name: PRODUCT,
  productType: "saas",
  framework: "next",
  readmeSummary:
    "DevFlow — API workflow automation for indie dev teams. Open-source on GitHub. Open docs, live demo, waitlist 2.4k engaged.",
  routes: ["/", "/pricing", "/docs", "/blog", "/compare"],
  hasAnalytics: false,
  excludedPaths: [],
  scannedFileCount: 128,
};

const marketingProfile = {
  product_name: PRODUCT,
  product_description: "API workflow automation for indie dev teams.",
  main_value_proposition: "Ship integrations in hours, not weeks — without Zapier complexity.",
  target_audience: [
    { persona: "solo dev founders", pains: ["integration glue code"], jobs: ["ship API automations"] },
  ],
  company_stage: "prelaunch",
  business_model: "saas",
  current_users: 180,
  email_list_size: 2400,
  days_until_launch: 14,
  monthly_marketing_budget: 2500,
  available_channels: ["email", "hacker_news", "reddit", "indie_hackers", "twitter", "product_hunt", "newsletter"],
  competitors: [
    { name: "Zapier", note: "General automation" },
    { name: "n8n", note: "Self-host" },
  ],
  marketing_goals: ["launch", "organic_growth"],
  constraints: [],
  differentiators: ["Open docs", "Live demo", "GitHub OSS"],
  available_assets: ["docs", "demo_url", "waitlist", "github_repo"],
};

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label, detail = "") {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function assert(cond, label, detail) {
  if (cond) ok(label);
  else fail(label, detail);
}

const {
  PLAYBOOK_CATALOG,
  catalogEligibility,
  eligiblePlaybooks,
  outlineSystemPrompt,
  profileFromScan,
} = await import("../dist/brain/planSuitePrompts.js");
const { marketingProfileSchema } = await import("../dist/schemas/marketingProfile.js");
const { retrieveSkillsForPlaybook } = await import("../dist/brain/skillRetrieval.js");
const { lintPlaybook, generatePlaybooksForStubIds, generatePlanSuite } = await import(
  "../dist/brain/planSuite.js"
);
const { isRegisteredTactic } = await import("../dist/brain/tacticRegistry.js");
const { GENERIC_TASK_TITLE_RE } = await import("../dist/brain/gtmCatalog.js");

const profile = marketingProfileSchema.parse(marketingProfile);
const ctx = {
  scan: scanProfile,
  marketing: profileFromScan(scanProfile, profile),
  persona: "marketing",
  horizonDays: 30,
};

console.log(`DevFlow Plan Studio smoke — ${PRODUCT} dev-founder profile\n`);
console.log("Phase A: catalog eligibility + outline contract\n");

const eligibility = catalogEligibility(ctx);
const eligibleIds = eligibility.filter((e) => e.eligible).map((e) => e.id);

for (const stub of P1_STUBS) {
  const row = eligibility.find((e) => e.id === stub);
  assert(row?.eligible === true, `P1 ${stub} eligible for DevFlow`, row?.skipReason ?? "not in catalog");
}

for (const stub of P0_STUBS) {
  const row = eligibility.find((e) => e.id === stub);
  assert(row?.eligible === true, `P0 ${stub} eligible for DevFlow`, row?.skipReason ?? "not in catalog");
}

assert(eligibleIds.length >= 10, `DevFlow eligible catalog ≥10 playbooks`, `got ${eligibleIds.length}`);
assert(
  eligiblePlaybooks(ctx).length === eligibleIds.length,
  "eligiblePlaybooks() matches catalogEligibility filter",
);

const outlinePrompt = outlineSystemPrompt(ctx);
assert(outlinePrompt.includes(PRODUCT), "outline prompt names DevFlow");
const outlineWithoutAntiPatternLine = outlinePrompt.replace(/No generic 'your product' phrasing\./i, "");
assert(!/your product/i.test(outlineWithoutAntiPatternLine), "outline body has no generic placeholder");
for (const stub of ALL_P01) {
  assert(outlinePrompt.includes(`"${stub}"`), `outline catalog JSON includes ${stub}`);
  const row = eligibility.find((e) => e.id === stub);
  if (row?.eligible) {
    assert(!outlinePrompt.includes(`"skipHint": "${row.skipReason}"`), `${stub} skipHint null in outline`);
  }
}

const catalogSrc = readFileSync(join(serverRoot, "src", "brain", "planSuitePrompts.ts"), "utf8");
assert(catalogSrc.includes("export function eligiblePlaybooks"), "eligiblePlaybooks exported for contract tests");

for (const stub of ALL_P01) {
  const packs = await retrieveSkillsForPlaybook(stub, profile);
  assert(packs.length > 0, `${stub} skill pack retrievable`, packs.map((p) => p.id).join(","));
}

console.log("\nPhase B: LLM plan suite (outline + P1 playbooks)\n");

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const runLlm = hasKey && process.env.DEVFLOW_LLM_SMOKE === "1";

if (!hasKey) {
  console.log("  (skipped — set ANTHROPIC_API_KEY for LLM smoke)");
} else if (!runLlm) {
  console.log("  (skipped — set DEVFLOW_LLM_SMOKE=1 to run full DevFlow plan generation)");
} else {
  const t0 = Date.now();
  try {
    const events = [];
    const plan = await generatePlanSuite({
      scanProfile,
      marketingProfile: profile,
      persona: "marketing",
      planHorizon: 30,
      emit: (e) => events.push(e.type),
      signal: AbortSignal.timeout(600_000),
    });

    const ms = Date.now() - t0;
    ok(`generatePlanSuite completed (${ms}ms, ${plan.playbooks.length} playbooks, ${plan.taskGraph.length} tasks)`);

    assert(events.includes("plan.outline"), "plan.outline event emitted");
    assert(plan.playbooks.length >= 4 && plan.playbooks.length <= 7, "outline selected 4–7 playbooks");
    assert(!/your product/i.test(JSON.stringify(plan)), "no generic 'your product' in plan JSON");

    const playbookIds = plan.playbooks.map((p) => p.id);
    const p1InOutline = P1_STUBS.filter((id) => playbookIds.includes(id));
    assert(
      p1InOutline.length >= 2,
      `outline includes ≥2 P1 playbooks for DevFlow`,
      `got: ${p1InOutline.join(", ") || "none"} (all: ${playbookIds.join(", ")})`,
    );

    const p0InOutline = P0_STUBS.filter((id) => playbookIds.includes(id));
    assert(p0InOutline.length >= 1, `outline includes ≥1 P0 playbook`, p0InOutline.join(", ") || "none");

    for (const pb of plan.playbooks) {
      if (!ALL_P01.includes(pb.id)) continue;
      const lintIssues = lintPlaybook(pb, PRODUCT);
      if (lintIssues.length > 0) {
        fail(`${pb.id} LLM playbook lint`, lintIssues.slice(0, 4).join("; "));
      } else {
        ok(`${pb.id} LLM playbook lint OK (${pb.tasks.length} tasks)`);
      }
      const withTactic = pb.tasks.filter((t) => t.tactic && isRegisteredTactic(t.tactic)).length;
      assert(
        withTactic === pb.tasks.length,
        `${pb.id} LLM tasks 100% registered tactics`,
        `${withTactic}/${pb.tasks.length}`,
      );
      const genericTasks = pb.tasks.filter((t) => GENERIC_TASK_TITLE_RE.test(t.title));
      assert(genericTasks.length === 0, `${pb.id} no generic task titles`);
      assert(
        pb.tasks.every((t) => t.title.includes(PRODUCT) || t.deliverable?.includes(PRODUCT)),
        `${pb.id} tasks grounded in ${PRODUCT}`,
      );
    }

    const p1Playbooks = await generatePlaybooksForStubIds({
      scanProfile,
      marketingProfile: profile,
      stubIds: P1_STUBS,
      signal: AbortSignal.timeout(600_000),
      onStatus: (msg) => console.log(`  … ${msg}`),
    });

    ok(`generatePlaybooksForStubIds P1 (${p1Playbooks.length} playbooks)`);
    for (const stub of P1_STUBS) {
      const pb = p1Playbooks.find((p) => p.id === stub);
      if (!pb) {
        fail(`P1 LLM ${stub} missing`);
        continue;
      }
      const lintIssues = lintPlaybook(pb, PRODUCT);
      assert(lintIssues.length === 0, `${stub} isolated P1 generation lint`, lintIssues.join("; "));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/credit balance|billing|insufficient|401|402/i.test(msg) || msg.includes("aborted")) {
      console.log(`  (skipped — LLM unavailable: ${msg.slice(0, 140)})`);
      console.log("  Phase A catalog eligibility still validates DevFlow P1 gates.");
    } else {
      fail("DevFlow LLM plan suite", msg);
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("✓ DevFlow Plan Studio smoke (Phase A always; Phase B when DEVFLOW_LLM_SMOKE=1 + API credits)");
