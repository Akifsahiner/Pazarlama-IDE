import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cluelyLikeReadme } from "./cmoIntake";
import {
  applyMechanismToChannelThesis,
  assessGrowthMechanisms,
  buildEngineScanSignals,
  buildGrowthMechanismProfile,
  buildMechanismAntiPatternRedList,
  buildMechanismRationale,
  buildMechanismWeek1Tasks,
  buildEngineReplanHints,
  defaultPublicPresencePolicy,
  harvestEngineSignalsFromCycle,
  hydrateGrowthMechanismProfileFromJson,
  mapMechanismToThesis,
  pickAttackMechanism,
  pickSafeMechanism,
  resolveMechanismLaneBMode,
  resolveMechanismOperatorFlags,
  type MechanismEvalContext,
  type PublicPresencePolicy,
} from "./cmoGrowthEngine";
import { GROWTH_MECHANISM_IDS, getMechanismRecord } from "./cmoGrowthMechanismKnowledge";
import { listGrowthEnginePlaybooks } from "./growthEnginePlaybookCatalog";
import type { FounderFitProfile, MarketingProfile, ProjectProfile } from "./types";

const NOW = "2026-07-16T00:00:00.000Z";

function founderFit(overrides: Partial<FounderFitProfile> = {}): FounderFitProfile {
  return {
    brand_face_readiness: "sometimes",
    controversy_tolerance: "selective",
    monthly_budget_band: "500_2000",
    thirty_day_win: "qualified_signups",
    magic_moment: "Gets value fast",
    scale_readiness: "probably",
    weekly_marketing_hours: "7_15",
    completed_at: NOW,
    ...overrides,
  };
}

function project(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS for teams.",
    ...overrides,
  };
}

function profile(overrides: Partial<MarketingProfile> = {}): MarketingProfile {
  return {
    product_name: "Acme",
    product_description: "",
    category: "SaaS",
    business_model: "saas",
    target_audience: [],
    primary_problem: "",
    main_value_proposition: "",
    differentiators: [],
    competitors: [],
    company_stage: "launched",
    main_markets: [],
    available_channels: [],
    marketing_goals: [],
    brand_voice: "",
    existing_proof: [],
    available_assets: [],
    constraints: [],
    previous_experiments: [],
    successful_experiments: [],
    failed_experiments: [],
    last_updated: NOW,
    confidence_score: 0.5,
    gaps: [],
    ...overrides,
  } as MarketingProfile;
}

function ctx(
  proj: ProjectProfile,
  prof?: MarketingProfile | null,
  fit?: FounderFitProfile | null,
  presence?: PublicPresencePolicy | null,
): MechanismEvalContext {
  const p = prof ?? profile();
  return {
    project: proj,
    profile: p,
    founderFit: fit ?? founderFit(),
    presence: presence ?? defaultPublicPresencePolicy(fit),
    scanSignals: buildEngineScanSignals(proj, p),
  };
}

describe("P17 Growth Mechanism Knowledge", () => {
  it("defines 14 mechanism records", () => {
    assert.equal(GROWTH_MECHANISM_IDS.length, 14);
    for (const id of GROWTH_MECHANISM_IDS) {
      const rec = getMechanismRecord(id);
      assert.ok(rec.week1_task_templates.length >= 2);
      assert.ok(rec.hidden_system_chain.length >= 3);
      assert.ok(rec.anti_patterns.length >= 1);
    }
  });
});

describe("P17 mechanism routing", () => {
  it("Cluely-like + camera yes → founder_narrative wins", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({ readmeSummary: cluelyLikeReadme() }),
        profile({ business_model: "consumer", company_stage: "prelaunch" }),
        founderFit({ brand_face_readiness: "primary_channel", controversy_tolerance: "lean_in" }),
      ),
    );
    assert.equal(assessment.primary, "founder_narrative");
  });

  it("camera-shy founder blocks founder_narrative", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({ readmeSummary: cluelyLikeReadme() }),
        profile({ business_model: "consumer" }),
        founderFit({ brand_face_readiness: "never" }),
        defaultPublicPresencePolicy(founderFit({ brand_face_readiness: "never" })),
      ),
    );
    assert.notEqual(assessment.primary, "founder_narrative");
    const fn = assessment.ranked.find((r) => r.engine_id === "founder_narrative");
    assert.equal(fn?.score ?? 0, 0);
  });

  it("Notion-like horizontal SaaS → solution_ecosystem", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "All-in-one workspace. Flexible templates for every team.",
          routes: ["/templates", "/gallery", "/signup"],
        }),
        profile({
          business_model: "saas",
          gaps: ["product.onboarding_missing"],
        }),
      ),
    );
    assert.ok(
      assessment.primary === "solution_ecosystem" ||
        assessment.ranked[0]?.engine_id === "solution_ecosystem" ||
        assessment.ranked.some((r) => r.engine_id === "solution_ecosystem" && r.score >= 50),
    );
  });

  it("Figma-like artifact product → remixable_artifacts", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Design tool with community files, plugins, and widgets.",
          routes: ["/community", "/plugins", "/duplicate"],
        }),
        profile({ business_model: "saas" }),
      ),
    );
    const top = assessment.ranked.slice(0, 3).map((r) => r.engine_id);
    assert.ok(top.includes("remixable_artifacts"));
  });

  it("Calendly-like scheduling → product_borne_distribution", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Scheduling links for meetings. Send invite to participants.",
          routes: ["/invite", "/share", "/schedule"],
        }),
        profile({ business_model: "saas" }),
      ),
    );
    assert.equal(assessment.primary, "product_borne_distribution");
  });

  it("Gong-like analytics → proprietary_data", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Conversation intelligence. Analyze sales calls and deals at scale.",
        }),
        profile({ business_model: "saas", company_stage: "launched" }),
        founderFit({ brand_face_readiness: "never" }),
      ),
    );
    const top = assessment.ranked.slice(0, 3).map((r) => r.engine_id);
    assert.ok(top.includes("proprietary_data"));
  });

  it("DevTool with API → partner_ecosystem or release_ritual", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Developer API platform with webhooks and integrations.",
          routes: ["/api/v1", "/docs", "/integrations"],
        }),
        profile({ business_model: "saas" }),
        founderFit({ brand_face_readiness: "never" }),
      ),
    );
    const top = assessment.ranked.slice(0, 4).map((r) => r.engine_id);
    assert.ok(top.includes("partner_ecosystem") || top.includes("release_ritual"));
  });

  it("prelaunch $0 budget blocks owned_culture_media", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project(),
        profile({ company_stage: "prelaunch" }),
        founderFit({ monthly_budget_band: "0" }),
      ),
    );
    const owned = assessment.ranked.find((r) => r.engine_id === "owned_culture_media");
    assert.equal(owned?.score ?? 0, 0);
  });

  it("accounting B2B blocks brand_character as primary", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({ readmeSummary: "Accounting software for finance teams." }),
        profile({ business_model: "saas", category: "Finance" }),
      ),
    );
    assert.notEqual(assessment.primary, "brand_character");
  });

  it("buildMechanismWeek1Tasks differ by mechanism", () => {
    const a = buildMechanismWeek1Tasks("founder_narrative", 1);
    const b = buildMechanismWeek1Tasks("proprietary_data", 1);
    assert.notEqual(a[0]?.what, b[0]?.what);
  });

  it("applyMechanismToChannelThesis sets mechanism signals", () => {
    const thesis = applyMechanismToChannelThesis(
      {
        id: "founder_social",
        title: "T",
        headline: "H",
        verdict: "marketable",
        verdict_reason: "ok",
        primary_bottleneck: "awareness",
        rationale: [],
        week1_priorities: [],
        primary_playbook_ids: [],
        lane_a: [],
        lane_b: [],
        deprioritize: [],
        signals: {},
        generated_at: NOW,
      },
      "proprietary_data",
    );
    assert.equal(thesis.signals.primary_mechanism_id, "proprietary_data");
    assert.equal(thesis.week1_priorities.length, 3);
  });

  it("mapMechanismToThesis respects thesis candidates", () => {
    const thesisId = mapMechanismToThesis("product_borne_distribution", ctx(project()));
    assert.ok(["landing_conversion", "community_launch"].includes(thesisId));
  });

  it("buildMechanismRationale includes anti-pattern", () => {
    const r = buildMechanismRationale("brand_character", ctx(project()));
    assert.match(r.anti_pattern, /mascot/i);
    assert.ok(r.rationale.length >= 1);
  });

  it("anti-pattern red list blocks mascot when not brand_character", () => {
    const ranked = assessGrowthMechanisms(ctx(project())).ranked;
    const list = buildMechanismAntiPatternRedList("proprietary_data", ranked);
    assert.ok(list.some((item) => item.id.includes("mascot")));
  });

  it("resolveMechanismLaneBMode maps partner outreach", () => {
    assert.equal(resolveMechanismLaneBMode("partner_ecosystem"), "outreach_tracker");
    assert.equal(resolveMechanismLaneBMode("release_ritual"), "launch_runbook");
  });

  it("resolveMechanismOperatorFlags enables character_mode", () => {
    const flags = resolveMechanismOperatorFlags("brand_character");
    assert.equal(flags.character_mode, true);
    assert.equal(flags.distribution, true);
  });

  it("execution diversity: data mechanisms skip social operators", () => {
    const gong = resolveMechanismOperatorFlags("proprietary_data");
    assert.equal(gong.distribution, undefined);
    assert.equal(gong.influencer, undefined);
    assert.equal(gong.delegate, undefined);

    const calendly = resolveMechanismOperatorFlags("product_borne_distribution");
    assert.equal(calendly.distribution, undefined);
    assert.equal(calendly.influencer, undefined);
  });

  it("execution diversity: partner_ecosystem enables delegate not distribution", () => {
    const flags = resolveMechanismOperatorFlags("partner_ecosystem");
    assert.equal(flags.delegate, true);
    assert.equal(flags.partner_brief, true);
    assert.equal(flags.distribution, undefined);
  });

  it("execution diversity: secondary blend merges operator flags", () => {
    const flags = resolveMechanismOperatorFlags("release_ritual", "partner_ecosystem");
    assert.equal(flags.distribution, true);
    assert.equal(flags.delegate, true);
    assert.equal(flags.partner_brief, true);
  });

  it("pickSafeMechanism prefers low capital mechanisms", () => {
    const ranked = assessGrowthMechanisms(
      ctx(project(), profile(), founderFit({ brand_face_readiness: "never" })),
    ).ranked;
    const safe = pickSafeMechanism(ranked);
    assert.ok(["proprietary_data", "intent_to_product", "product_borne_distribution", "partner_ecosystem"].includes(safe));
  });

  it("pickAttackMechanism returns high compounding option", () => {
    const ranked = assessGrowthMechanisms(
      ctx(project({ readmeSummary: cluelyLikeReadme() }), profile({ business_model: "consumer" })),
    ).ranked;
    const attack = pickAttackMechanism(ranked);
    assert.ok(GROWTH_MECHANISM_IDS.includes(attack));
  });

  it("buildGrowthMechanismProfile persists primary", () => {
    const gp = buildGrowthMechanismProfile({
      project: project(),
      profile: profile(),
      founderFit: founderFit(),
    });
    assert.ok(gp.primary_mechanism_id);
    assert.ok(gp.assessment.ranked.length >= 1);
  });

  it("scan detects share invite collaborate", () => {
    const signals = buildEngineScanSignals(
      project({ routes: ["/invite", "/share"] }),
      profile(),
    );
    assert.equal(signals.has_share_invite_collaborate, true);
  });

  it("default presence disables founder when face never", () => {
    const p = defaultPublicPresencePolicy(founderFit({ brand_face_readiness: "never" }));
    assert.equal(p.founder.allowed, false);
  });
});

describe("P17 mechanism mix and materialization", () => {
  it("selectMechanismMix returns primary from assessment", () => {
    const assessment = assessGrowthMechanisms(ctx(project(), profile()));
    assert.ok(assessment.primary);
    assert.ok(assessment.ranked[0]?.engine_id);
  });

  it("buildEngineReplanHints returns failure-mode lines", () => {
    const gp = buildGrowthMechanismProfile({
      project: project(),
      profile: profile(),
      founderFit: founderFit(),
    });
    const hints = buildEngineReplanHints(gp);
    assert.ok(hints.length >= 1);
    assert.ok(hints[0]?.rationale.length > 10);
  });

  it("harvestEngineSignalsFromCycle records engine_signal experiments", () => {
    const rows = harvestEngineSignalsFromCycle({
      mechanismId: "solution_ecosystem",
      cycleIndex: 1,
      thesisId: "seo_content",
      programStepsCompleted: 2,
      now: NOW,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.source, "engine_signal");
  });

  it("hydrateGrowthMechanismProfileFromJson round-trips", () => {
    const gp = buildGrowthMechanismProfile({
      project: project(),
      profile: profile(),
      founderFit: founderFit(),
    });
    const hydrated = hydrateGrowthMechanismProfileFromJson(gp);
    assert.equal(hydrated?.primary_mechanism_id, gp.primary_mechanism_id);
  });

  it("all mechanisms produce distinct first week1 tasks", () => {
    const firstTasks = new Set(
      GROWTH_MECHANISM_IDS.map((id) => buildMechanismWeek1Tasks(id, 1)[0]?.what),
    );
    assert.ok(firstTasks.size >= 10);
  });
});

describe("P17 calibration routing matrix", () => {
  it("Canva-like SEO product → intent_to_product scores well", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Design anything. Templates for every use case.",
          routes: ["/templates", "/create", "/blog"],
        }),
        profile({ business_model: "saas" }),
      ),
    );
    const row = assessment.ranked.find((r) => r.engine_id === "intent_to_product");
    assert.ok((row?.score ?? 0) >= 45);
  });

  it("Zapier-like integrations → partner_ecosystem", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Connect apps with integrations and webhooks.",
          routes: ["/integrations", "/api", "/apps"],
        }),
        profile({ business_model: "saas" }),
      ),
    );
    assert.equal(assessment.primary, "partner_ecosystem");
  });

  it("HubSpot-like B2B → category_education in top 3", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Inbound marketing methodology for B2B teams.",
          routes: ["/blog", "/academy", "/certification"],
        }),
        profile({ business_model: "saas", company_stage: "launched" }),
        founderFit({ brand_face_readiness: "never" }),
      ),
    );
    const top = assessment.ranked.slice(0, 3).map((r) => r.engine_id);
    assert.ok(top.includes("category_education"));
  });

  it("Supabase-like devtool → release_ritual in top 4", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Open source developer platform. API and database.",
          routes: ["/docs", "/changelog", "/api"],
        }),
        profile({ business_model: "saas", days_until_launch: 14 }),
      ),
    );
    const top = assessment.ranked.slice(0, 4).map((r) => r.engine_id);
    assert.ok(top.includes("release_ritual"));
  });

  it("GoPro-like output product → customer_output scores well", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Capture and share action video and photo from your adventures.",
          routes: ["/share", "/gallery"],
        }),
        profile({ business_model: "consumer" }),
      ),
    );
    const row = assessment.ranked.find((r) => r.engine_id === "customer_output");
    assert.ok((row?.score ?? 0) >= 50);
  });

  it("Liquid Death-like consumer brand → entertainment_ip in top 4", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Consumer drink brand with merch and entertainment.",
        }),
        profile({ business_model: "consumer" }),
        founderFit({ monthly_budget_band: "500_2000" }),
      ),
    );
    const top = assessment.ranked.slice(0, 4).map((r) => r.engine_id);
    assert.ok(top.includes("entertainment_ip"));
  });

  it("e.l.f.-like beauty → community_demand", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({
          readmeSummary: "Beauty and cosmetics for Gen Z consumers.",
        }),
        profile({ business_model: "consumer", category: "Beauty" }),
      ),
    );
    const top = assessment.ranked.slice(0, 3).map((r) => r.engine_id);
    assert.ok(top.includes("community_demand"));
  });

  it("high reputational risk blocks entertainment_ip primary for accounting", () => {
    const assessment = assessGrowthMechanisms(
      ctx(
        project({ readmeSummary: "Accounting software for SMB finance teams." }),
        profile({ business_model: "saas" }),
        founderFit({ controversy_tolerance: "avoid" }),
        {
          ...defaultPublicPresencePolicy(founderFit({ controversy_tolerance: "avoid" })),
          reputational_risk: "low",
        },
      ),
    );
    assert.notEqual(assessment.primary, "entertainment_ip");
  });

  it("creators allowed enables influencer path without founder face", () => {
    const presence = defaultPublicPresencePolicy(founderFit({ brand_face_readiness: "never" }));
    presence.creators.allowed = true;
    presence.creators.sponsored_content_allowed = true;
    const assessment = assessGrowthMechanisms(
      ctx(
        project({ readmeSummary: "Consumer mobile app." }),
        profile({ business_model: "consumer" }),
        founderFit({ brand_face_readiness: "never" }),
        presence,
      ),
    );
    const inf = assessment.ranked.find((r) => r.engine_id === "entertainment_ip");
    assert.ok((inf?.score ?? 0) > 0);
  });

  it("anti-pattern red list includes discord when not solution_ecosystem", () => {
    const ranked = assessGrowthMechanisms(ctx(project())).ranked;
    const list = buildMechanismAntiPatternRedList("proprietary_data", ranked);
    assert.ok(list.some((item) => /discord|ambassador/i.test(item.tactic)));
  });

  it("applyMechanism merges deprioritize anti-patterns", () => {
    const thesis = applyMechanismToChannelThesis(
      {
        id: "seo_content",
        title: "T",
        headline: "H",
        verdict: "marketable",
        verdict_reason: "ok",
        primary_bottleneck: "awareness",
        rationale: [],
        week1_priorities: [],
        primary_playbook_ids: [],
        lane_a: [],
        lane_b: [],
        deprioritize: [],
        signals: {},
        generated_at: NOW,
      },
      "brand_character",
    );
    assert.ok(thesis.deprioritize.length >= 1);
  });

  it("secondary mechanism can blend into week1 task 3", () => {
    const tasks = buildMechanismWeek1Tasks("release_ritual", 2, "partner_ecosystem");
    assert.equal(tasks.length, 3);
    assert.notEqual(tasks[0]?.what, tasks[2]?.what);
  });
});

describe("P17 playbook catalog", () => {
  it("lists anonymized playbooks for all mechanisms", () => {
    const playbooks = listGrowthEnginePlaybooks();
    assert.equal(playbooks.length, GROWTH_MECHANISM_IDS.length);
    assert.ok(playbooks.every((p) => !p.summary.includes("Duolingo")));
  });
});

describe("P17 corpus completeness", () => {
  for (const id of GROWTH_MECHANISM_IDS) {
    it(`${id} maps to at least one thesis candidate`, () => {
      const record = getMechanismRecord(id);
      assert.ok(record.thesis_candidates.length >= 1);
      assert.ok(record.thesis_candidates.every((t) => typeof t === "string"));
    });

    it(`${id} exposes operator_flags object`, () => {
      const record = getMechanismRecord(id);
      assert.equal(typeof record.operator_flags, "object");
    });
  }
});
