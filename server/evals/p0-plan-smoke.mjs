#!/usr/bin/env node
/**
 * P0+P1 Plan Studio smoke — structural catalog, skill injection, golden playbook lint.
 *
 * Phase A (no API): catalog, skill injection, tactic stubs, golden playbook lint.
 * Phase B (optional): full generatePlanSuite when ANTHROPIC_API_KEY + P0_LLM_SMOKE=1.
 *
 * Usage: npm run build && node evals/p0-plan-smoke.mjs
 *        P0_LLM_SMOKE=1 node evals/p0-plan-smoke.mjs  # force LLM phase
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dir, "..");
config({ path: resolve(serverRoot, ".env") });

const P0_STUBS = ["community-launch", "seo-foundation", "email-nurture"];
const P1_STUBS = ["twitter-x-gtm", "newsletter-sponsorship", "press-pr-launch", "devrel-open-source-launch"];
const ALL_STUBS = [...P0_STUBS, ...P1_STUBS];
const SKILL_BY_STUB = {
  "community-launch": "community-launch",
  "seo-foundation": "seo-content-engine",
  "email-nurture": "email-nurture-sequence",
  "twitter-x-gtm": "twitter-x-founder-gtm",
  "newsletter-sponsorship": "newsletter-sponsorship",
  "press-pr-launch": "press-pr-launch",
  "devrel-open-source-launch": "devrel-open-source-launch",
};
const P0_SKILLS = SKILL_BY_STUB;
const PRODUCT = "DevFlow";

const scanProfile = {
  id: "p0-smoke",
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
  competitors: [{ name: "Zapier", note: "General automation" }, { name: "n8n", note: "Self-host" }],
  marketing_goals: ["launch", "organic_growth"],
  constraints: [],
  differentiators: ["Open docs", "Live demo"],
  available_assets: ["docs", "demo_url", "waitlist"],
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

function task(id, title, tactic, phaseLabel, execution_mode, day) {
  return {
    id,
    playbookId: id.split("-")[0],
    day,
    title,
    deliverable: `${title} for ${PRODUCT}`,
    acceptance_criteria: `${PRODUCT}: ${tactic} complete with metric logged`,
    instructions_md: `Tactic: ${tactic}\n1. Ground in ${PRODUCT} ICP\n2. Execute checklist steps\n3. Log acceptance metric\n4. Review anti-patterns\n5. Ship or schedule`,
    execution_mode,
    tactic,
    phaseLabel,
    channel: execution_mode === "browser" ? "research" : "repo",
  };
}

function buildGoldenPlaybook(stubId) {
  const base = {
    slug: stubId,
    phase: "launch",
    sortOrder: 0,
    executiveSummary: `${PRODUCT} launch playbook — channel-specific tasks with registry tactics.`,
    successMetrics: [{ name: "launch_signups", target: "+100 week 1" }],
  };

  if (stubId === "community-launch") {
    return {
      ...base,
      id: "community-launch",
      title: "Community Launch (HN / IH / Reddit)",
      subtitle: "Show HN + spaced cross-posts",
      iconKey: "social",
      tasks: [
        task("community-launch-1", `${PRODUCT} map ICP communities on HN/IH`, "comm_icp_community_map", "T-14", "browser", 1),
        task("community-launch-2", `Audit subreddit rules for ${PRODUCT} ICP`, "comm_subreddit_rules_audit", "T-14", "browser", 2),
        task("community-launch-3", `${PRODUCT} IH build log #1 (story-first)`, "comm_ih_build_log", "T-10", "asset", 5),
        task("community-launch-4", `Draft Show HN title + first comment for ${PRODUCT}`, "comm_show_hn_title_draft", "T-7", "asset", 7),
        task("community-launch-5", `QA ${PRODUCT} demo URL mobile + desktop`, "comm_demo_url_live", "T-7", "browser", 7),
        task("community-launch-6", `Lock ${PRODUCT} cross-post calendar (≥48h gaps)`, "comm_cross_post_spacing_48h", "T-3", "asset", 11),
        task("community-launch-7", `Submit Show HN for ${PRODUCT} Tue–Thu AM PT`, "comm_show_hn_submit", "H0", "browser", 14),
        task("community-launch-8", `${PRODUCT} HN comment reply SLA ≤60m (4h window)`, "comm_hn_comment_sla_60m", "H0", "browser", 14),
        task("community-launch-9", `${PRODUCT} Reddit value post (story-first)`, "comm_reddit_value_post", "H+48", "browser", 16),
        task("community-launch-10", `${PRODUCT} D+1 teardown with sessions + signups`, "comm_teardown_metrics_d1", "D+1", "asset", 15),
      ],
    };
  }

  if (stubId === "seo-foundation") {
    return {
      ...base,
      id: "seo-foundation",
      title: "SEO Content Engine",
      subtitle: "Alternatives + vs cluster",
      iconKey: "seo",
      phase: "foundation",
      tasks: [
        task("seo-foundation-1", `${PRODUCT} GSC baseline + index audit`, "seo_gsc_baseline_audit", "T-30", "browser", 1),
        task("seo-foundation-2", `${PRODUCT} keyword intent cluster map`, "seo_intent_cluster_map", "T-21", "asset", 3),
        task("seo-foundation-3", `SERP teardown for ${PRODUCT} competitors`, "seo_competitor_serp_teardown", "T-21", "browser", 4),
        task("seo-foundation-4", `Ship ${PRODUCT} alternatives page`, "seo_alternatives_page_template", "T-14", "repo", 7),
        task("seo-foundation-5", `${PRODUCT} vs Zapier comparison page`, "seo_comparison_page_template", "T-14", "repo", 8),
        task("seo-foundation-6", `${PRODUCT} vs n8n comparison page`, "seo_vs_page_template", "T-10", "repo", 10),
        task("seo-foundation-7", `${PRODUCT} how-to hub pillar`, "seo_how_to_hub_page", "T-7", "repo", 12),
        task("seo-foundation-8", `Wire ${PRODUCT} internal link graph`, "seo_internal_link_graph", "T-7", "repo", 12),
        task("seo-foundation-9", `${PRODUCT} docs/blog CTA component`, "seo_docs_blog_cta_placement", "T-3", "repo", 13),
        task("seo-foundation-10", `${PRODUCT} metadata + FAQ schema pass`, "seo_metadata_schema_pass", "T-3", "repo", 13),
      ],
    };
  }

  if (stubId === "email-nurture") {
    return {
      ...base,
      id: "email-nurture",
      title: "Email Nurture Sequence",
      subtitle: "14d drip → 3 launch waves",
      iconKey: "email",
      phase: "warmup",
      tasks: [
        task("email-nurture-1", `${PRODUCT} list hygiene + segments`, "email_list_hygiene_segment", "T-21", "asset", 1),
        task("email-nurture-2", `${PRODUCT} pre-launch drip Day 1 (problem story)`, "email_prelaunch_drip_14d", "T-14", "asset", 3),
        task("email-nurture-3", `${PRODUCT} subject A/B on teaser email`, "email_subject_line_ab", "T-7", "asset", 7),
        task("email-nurture-4", `${PRODUCT} sneak peek teaser send`, "email_story_arc_teaser", "T-7", "asset", 8),
        task("email-nurture-5", `${PRODUCT} near-miss nudge (1 invite away)`, "email_near_miss_nudge", "T-3", "asset", 11),
        task("email-nurture-6", `${PRODUCT} PH/community email timing lock`, "email_ph_timing_lock", "T-1", "asset", 13),
        task("email-nurture-7", `${PRODUCT} launch wave 1 — engaged (H+6 PT)`, "email_launch_wave_1_engaged", "H+6", "asset", 14),
        task("email-nurture-8", `${PRODUCT} launch wave 2 — general (H+9 PT)`, "email_launch_wave_2_general", "H+9", "asset", 14),
        task("email-nurture-9", `${PRODUCT} launch wave 3 — reframe (H+12 PT)`, "email_launch_wave_3_reframe", "H+12", "asset", 14),
        task("email-nurture-10", `${PRODUCT} post-launch onboarding trilogy`, "email_post_launch_onboarding_3", "D+1", "asset", 15),
      ],
    };
  }

  if (stubId === "twitter-x-gtm") {
    return {
      ...base,
      id: "twitter-x-gtm",
      title: "X (Twitter) Founder GTM",
      subtitle: "Threads + build-in-public + reply SLA",
      iconKey: "social",
      tasks: [
        task("twitter-x-gtm-1", `${PRODUCT} ICP account map (30 X accounts)`, "x_icp_account_map", "T-30", "browser", 1),
        task("twitter-x-gtm-2", `${PRODUCT} bio hook + pinned thread`, "x_profile_bio_hook", "T-30", "asset", 1),
        task("twitter-x-gtm-3", `${PRODUCT} build-in-public 3×/week cadence`, "x_build_in_public_cadence", "T-21", "asset", 3),
        task("twitter-x-gtm-4", `Draft ${PRODUCT} 7-tweet launch thread`, "x_thread_format_7", "T-14", "asset", 7),
        task("twitter-x-gtm-5", `${PRODUCT} engage 10 ICP posts/day (14d)`, "x_engagement_before_pitch", "T-14", "browser", 7),
        task("twitter-x-gtm-6", `24h offset ${PRODUCT} X vs LinkedIn launch`, "x_cross_post_delay_24h", "T-3", "asset", 11),
        task("twitter-x-gtm-7", `Publish ${PRODUCT} launch thread + pin`, "x_launch_thread_h0", "H0", "browser", 14),
        task("twitter-x-gtm-8", `${PRODUCT} X reply SLA ≤2h (launch window)`, "x_reply_sla_2h", "H0", "browser", 14),
        task("twitter-x-gtm-9", `${PRODUCT} ethical quote-tweets (max 2)`, "x_quote_tweet_launch_ethics", "H0", "asset", 14),
        task("twitter-x-gtm-10", `${PRODUCT} D+1 teardown thread`, "x_teardown_thread_d1", "D+1", "asset", 15),
      ],
    };
  }

  if (stubId === "newsletter-sponsorship") {
    return {
      ...base,
      id: "newsletter-sponsorship",
      title: "Newsletter Sponsorship",
      subtitle: "Niche dev newsletters — native + UTM",
      iconKey: "partnerships",
      phase: "warmup",
      tasks: [
        task("newsletter-sponsorship-1", `Shortlist niche dev newsletters for ${PRODUCT}`, "nl_sponsor_shortlist_niche", "T-21", "browser", 1),
        task("newsletter-sponsorship-2", `${PRODUCT} audience overlap score (5 pubs)`, "nl_audience_overlap_score", "T-21", "asset", 2),
        task("newsletter-sponsorship-3", `Request sponsor media kits for ${PRODUCT}`, "nl_media_kit_request", "T-14", "browser", 4),
        task("newsletter-sponsorship-4", `Book ${PRODUCT} sponsor slot ≥14d lead`, "nl_slot_booking_lead_time", "T-14", "browser", 5),
        task("newsletter-sponsorship-5", `${PRODUCT} sponsor creative brief`, "nl_sponsor_creative_brief", "T-10", "asset", 7),
        task("newsletter-sponsorship-6", `${PRODUCT} native copy ≤120 words`, "nl_native_copy_120_words", "T-7", "asset", 9),
        task("newsletter-sponsorship-7", `${PRODUCT} UTM scheme per newsletter slot`, "nl_utm_campaign_scheme", "T-7", "asset", 9),
        task("newsletter-sponsorship-8", `${PRODUCT} A/B hook on first sponsor`, "nl_creative_ab_hook", "T-7", "asset", 10),
        task("newsletter-sponsorship-9", `Max 2 consecutive slots for ${PRODUCT}`, "nl_max_consecutive_slots_2", "T-3", "asset", 11),
        task("newsletter-sponsorship-10", `${PRODUCT} D+7 CPA kill rule + teardown`, "nl_kill_rule_cpa_7d", "D+7", "asset", 21),
      ],
    };
  }

  if (stubId === "press-pr-launch") {
    return {
      ...base,
      id: "press-pr-launch",
      title: "Press & PR Launch",
      subtitle: "Embargo + 5 reporter pitches + press kit",
      iconKey: "content",
      tasks: [
        task("press-pr-launch-1", `${PRODUCT} honest coverage ceiling doc`, "pr_honest_coverage_ceiling", "T-14", "asset", 1),
        task("press-pr-launch-2", `${PRODUCT} press kit PDF`, "pr_press_kit_pdf", "T-14", "asset", 2),
        task("press-pr-launch-3", `${PRODUCT} reporter shortlist (5)`, "pr_reporter_shortlist_5", "T-14", "browser", 3),
        task("press-pr-launch-4", `${PRODUCT} screenshot asset kit`, "pr_screenshot_asset_kit", "T-10", "asset", 5),
        task("press-pr-launch-5", `${PRODUCT} personalized pitch hooks (5)`, "pr_pitch_personalized_hook", "T-10", "asset", 6),
        task("press-pr-launch-6", `${PRODUCT} customer proof permissions`, "pr_customer_proof_permission", "T-10", "asset", 7),
        task("press-pr-launch-7", `${PRODUCT} embargo datetime lock (UTC)`, "pr_embargo_datetime_lock", "T-7", "asset", 9),
        task("press-pr-launch-8", `${PRODUCT} founder quote approved`, "pr_founder_quote_approved", "T-7", "asset", 10),
        task("press-pr-launch-9", `${PRODUCT} launch monitoring 6h`, "pr_launch_monitoring_6h", "H0", "browser", 14),
        task("press-pr-launch-10", `${PRODUCT} reporter follow-up SLA 24h`, "pr_follow_up_sla_24h", "H+24", "asset", 15),
      ],
    };
  }

  if (stubId === "devrel-open-source-launch") {
    return {
      ...base,
      id: "devrel-open-source-launch",
      title: "DevRel OSS Launch",
      subtitle: "README CTA + awesome-list PR + release notes",
      iconKey: "content",
      tasks: [
        task("devrel-open-source-launch-1", `${PRODUCT} README star CTA above fold`, "oss_readme_star_cta", "T-14", "repo", 1),
        task("devrel-open-source-launch-2", `${PRODUCT} license clarity block in README`, "oss_license_clarity_block", "T-14", "repo", 2),
        task("devrel-open-source-launch-3", `${PRODUCT} GitHub topics/tags`, "oss_github_topics_tags", "T-14", "repo", 3),
        task("devrel-open-source-launch-4", `${PRODUCT} maintainer DM ethics audit`, "oss_maintainer_dm_ethics", "T-14", "asset", 4),
        task("devrel-open-source-launch-5", `${PRODUCT} awesome-list PR (value-add)`, "oss_awesome_list_pr", "T-10", "repo", 6),
        task("devrel-open-source-launch-6", `${PRODUCT} good-first-issue labels`, "oss_good_first_issue_label", "T-10", "repo", 7),
        task("devrel-open-source-launch-7", `${PRODUCT} release notes as distribution`, "oss_release_notes_blog", "T-7", "repo", 9),
        task("devrel-open-source-launch-8", `${PRODUCT} CHANGELOG visible`, "oss_changelog_visible", "T-7", "repo", 10),
        task("devrel-open-source-launch-9", `${PRODUCT} Show HN coordination calendar`, "oss_show_hn_coordination", "T-3", "asset", 12),
        task("devrel-open-source-launch-10", `${PRODUCT} npm registry listing`, "oss_package_registry_listing", "T-7", "repo", 11),
      ],
    };
  }

  throw new Error(`unknown stub ${stubId}`);
}

const {
  lintPlaybook,
  generatePlaybooksForStubIds,
} = await import("../dist/brain/planSuite.js");
const { retrieveSkillsForPlaybook, renderSkillContext } = await import("../dist/brain/skillRetrieval.js");
const { tacticsForPlaybookStub, isRegisteredTactic } = await import("../dist/brain/tacticRegistry.js");
const { PLAYBOOK_CATALOG } = await import("../dist/brain/planSuitePrompts.js");
const { marketingProfileSchema } = await import("../dist/schemas/marketingProfile.js");

const profile = marketingProfileSchema.parse(marketingProfile);

console.log("P0+P1 Plan Studio smoke — DevFlow dev-founder profile\n");
console.log("Phase A: structural (catalog, skills, golden lint)\n");

assert(
  ALL_STUBS.every((id) => PLAYBOOK_CATALOG.some((p) => p.id === id)),
  "PLAYBOOK_CATALOG includes all P0+P1 stubs",
  `missing: ${ALL_STUBS.filter((id) => !PLAYBOOK_CATALOG.some((p) => p.id === id)).join(", ")}`,
);

const promptsSrc = readFileSync(join(serverRoot, "src", "brain", "planSuitePrompts.ts"), "utf8");
for (const id of ALL_STUBS) {
  assert(promptsSrc.includes(`"${id}"`), `PLAYBOOK_CHANNEL_GUIDANCE has ${id}`);
}

for (const stub of ALL_STUBS) {
  const expectedSkill = SKILL_BY_STUB[stub];
  const packs = await retrieveSkillsForPlaybook(stub, profile);
  assert(packs.length > 0 && packs[0].id === expectedSkill, `${stub} → ${expectedSkill} skill pack`);
  const ctx = renderSkillContext(packs);
  assert(ctx.includes("Tactic stack") || ctx.includes("tactic"), `${stub} skill context has tactic stack`);
  assert(ctx.includes("Anti-patterns"), `${stub} skill context has anti-patterns`);

  const tactics = tacticsForPlaybookStub(stub);
  assert(tactics.length >= 10, `${stub} registry tactics ≥10`, `got ${tactics.length}`);
  assert(
    tactics.every((t) => t.skillId === expectedSkill),
    `${stub} tactics belong to ${expectedSkill}`,
  );

  const golden = buildGoldenPlaybook(stub);
  const lintIssues = lintPlaybook(golden, PRODUCT);
  assert(lintIssues.length === 0, `${stub} golden playbook passes lintPlaybook`, lintIssues.join("; "));

  const tacticIds = golden.tasks.map((t) => t.tactic).filter(Boolean);
  assert(
    tacticIds.every((id) => isRegisteredTactic(id)),
    `${stub} golden tasks use registered tactics`,
  );
  assert(
    tacticIds.length === golden.tasks.length,
    `${stub} golden playbook 100% tactic coverage`,
    `${tacticIds.length}/${golden.tasks.length}`,
  );
}

console.log("\nPhase B: LLM playbook generation for P0+P1 stubs (skill injection + tactic lint)\n");

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const runLlm = hasKey && process.env.P0_LLM_SMOKE === "1";

if (!hasKey) {
  console.log("  (skipped — set ANTHROPIC_API_KEY for LLM smoke)");
} else if (!runLlm) {
  console.log("  (skipped — set P0_LLM_SMOKE=1 to run LLM playbook generation)");
} else {
  const t0 = Date.now();
  try {
    const playbooks = await generatePlaybooksForStubIds({
      scanProfile,
      marketingProfile: profile,
      stubIds: [...P0_STUBS, ...P1_STUBS],
      signal: AbortSignal.timeout(600_000),
      onStatus: (msg) => console.log(`  … ${msg}`),
    });

    const ms = Date.now() - t0;
    ok(`generatePlaybooksForStubIds completed (${ms}ms, ${playbooks.length} P0+P1 playbooks)`);

    for (const stub of [...P0_STUBS, ...P1_STUBS]) {
      const pb = playbooks.find((p) => p.id === stub);
      if (!pb) {
        fail(`LLM generated ${stub} playbook`, "missing from result");
        continue;
      }
      const lintIssues = lintPlaybook(pb, PRODUCT);
      if (lintIssues.length > 0) {
        fail(`${stub} LLM playbook lint`, lintIssues.slice(0, 5).join("; "));
      } else {
        ok(`${stub} LLM playbook passes lintPlaybook (${pb.tasks.length} tasks)`);
      }
      const withTactic = pb.tasks.filter((t) => t.tactic && isRegisteredTactic(t.tactic)).length;
      assert(
        withTactic === pb.tasks.length,
        `${stub} LLM tasks 100% registered tactics`,
        `${withTactic}/${pb.tasks.length}`,
      );
      const sampleTactics = pb.tasks.slice(0, 3).map((t) => t.tactic).join(", ");
      console.log(`      sample tactics: ${sampleTactics}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/credit balance|billing|insufficient|401|402/i.test(msg) || msg.includes("aborted")) {
      console.log(`  (skipped — LLM unavailable: ${msg.slice(0, 120)})`);
      console.log("  Phase A golden fixtures still validate tactic binding contract.");
    } else {
      fail("generatePlaybooksForStubIds", msg);
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("✓ P0+P1 Plan Studio smoke (Phase A always; Phase B when P0_LLM_SMOKE=1 + API credits)");
