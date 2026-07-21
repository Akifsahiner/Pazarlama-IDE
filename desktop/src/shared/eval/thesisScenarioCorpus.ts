/**
 * P18 eval corpus — ≥100 realistic company scenarios for thesis quality matrix.
 */
import { cluelyLikeReadme } from "../cmoIntake";
import type { ChannelThesisId } from "../cmoIntake";
import type { GrowthMechanismId } from "../cmoGrowthMechanismKnowledge";
import type { FounderFitProfile, MarketingProfile, Persona, ProjectProfile } from "../types";

export interface ThesisScenarioExpect {
  primary_thesis_id: ChannelThesisId;
  primary_mechanism_id?: GrowthMechanismId;
  must_not_primary?: ChannelThesisId[];
  deprioritize_contains?: string[];
  min_evidence_count?: number;
  why_now_must_match?: string;
}

export interface ThesisScenario {
  id: string;
  tags: string[];
  project: Partial<ProjectProfile>;
  profile: Partial<MarketingProfile>;
  founder_fit?: Partial<FounderFitProfile>;
  persona?: Persona;
  expect: ThesisScenarioExpect;
}

const NOW = "2026-07-16T00:00:00.000Z";

function baseProject(
  name: string,
  readmeSummary: string,
  routes: string[] = ["apps/web/app/page.tsx"],
): Partial<ProjectProfile> {
  return {
    id: `sc-${name.toLowerCase().replace(/\s+/g, "-")}`,
    source: { kind: "folder", path: `/proj/${name}` },
    name,
    framework: "Next.js",
    readmeSummary,
    routes,
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
  };
}

function defaultFit(overrides: Partial<FounderFitProfile> = {}): Partial<FounderFitProfile> {
  return {
    brand_face_readiness: "sometimes",
    controversy_tolerance: "selective",
    monthly_budget_band: "500_2000",
    scale_readiness: "probably",
    magic_moment: "User gets measurable value in under two minutes",
    weekly_marketing_hours: "7_15",
    thirty_day_win: "qualified_signups",
    completed_at: NOW,
    ...overrides,
  };
}

function cluelyScenarios(): ThesisScenario[] {
  const variants = [
    { name: "Cluely", stage: "prelaunch" as const },
    { name: "StealthAI", stage: "idea" as const },
    { name: "InterviewCoder", stage: "prelaunch" as const },
    { name: "OverlayAssist", stage: "prelaunch" as const },
    { name: "ViralMate", stage: "idea" as const },
    { name: "PolarizeApp", stage: "prelaunch" as const },
    { name: "TikTokTool", stage: "prelaunch" as const },
    { name: "CreatorCheat", stage: "idea" as const },
    { name: "MeetingGhost", stage: "prelaunch" as const },
    { name: "UndetectableAI", stage: "prelaunch" as const },
    { name: "ShortFormAI", stage: "idea" as const },
    { name: "ControversyLabs", stage: "prelaunch" as const },
  ];
  return variants.map((v, i) => ({
    id: `cluely-${i + 1}`,
    tags: ["cluely", "distribution-first", "consumer"],
    project: baseProject(v.name, cluelyLikeReadme().replace("Cluely", v.name)),
    profile: {
      product_name: v.name,
      company_stage: v.stage,
      business_model: "consumer",
    },
    founder_fit: defaultFit({
      brand_face_readiness: "primary_channel",
      controversy_tolerance: "lean_in",
      thirty_day_win: "brand_awareness",
    }),
    expect: {
      primary_thesis_id: "viral_short_form",
      must_not_primary: ["seo_content"],
      min_evidence_count: 1,
      why_now_must_match: v.name,
    },
  }));
}

function b2bOutboundScenarios(): ThesisScenario[] {
  const names = [
    "RevSignal",
    "PipelineOS",
    "GongLite",
    "SalesForge",
    "OutboundIQ",
    "DealDesk",
    "CRMBridge",
    "ProspectAI",
    "MeetingBook",
    "QuotaTrack",
    "EnterpriseHub",
    "B2BFlow",
  ];
  return names.map((name, i) => ({
    id: `b2b-outbound-${i + 1}`,
    tags: ["b2b_outbound", "revenue"],
    project: baseProject(
      name,
      `${name} is B2B SaaS for sales teams. Revenue intelligence and pipeline automation for enterprise.`,
      ["apps/console/app/page.tsx", "apps/console/app/pricing/page.tsx"],
    ),
    profile: {
      product_name: name,
      company_stage: "launched",
      business_model: "saas",
      sales_pipeline_empty: true,
    },
    persona: "sales" as Persona,
    founder_fit: defaultFit({ thirty_day_win: "pipeline_meetings" }),
    expect: {
      primary_thesis_id: "outbound_sales",
      min_evidence_count: 1,
      why_now_must_match: name,
    },
  }));
}

function seoDemandScenarios(): ThesisScenario[] {
  const names = [
    "ContentHub",
    "BlogScale",
    "SEOForge",
    "RankTrack",
    "InboundPro",
    "SearchLift",
    "GrowthBlog",
    "DemandCapture",
    "KeywordOS",
    "OrganicFlow",
    "ContentEngine",
    "TrafficLab",
  ];
  return names.map((name, i) => ({
    id: `seo-demand-${i + 1}`,
    tags: ["seo_demand", "warm_demand"],
    project: baseProject(
      name,
      `${name} helps teams publish SEO content and capture search demand.`,
      ["apps/web/app/page.tsx", "apps/web/app/blog/page.tsx", "apps/web/app/blog/[slug]/page.tsx"],
    ),
    profile: {
      product_name: name,
      company_stage: "growing",
      business_model: "saas",
      current_users: 200 + i * 50,
      email_list_size: 800 + i * 100,
    },
    founder_fit: defaultFit({ weekly_marketing_hours: "7_15" }),
    expect: {
      primary_thesis_id: "seo_content",
      min_evidence_count: 1,
      why_now_must_match: name,
    },
  }));
}

function phLaunchScenarios(): ThesisScenario[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `ph-launch-${i + 1}`,
    tags: ["product_hunt", "launch_window"],
    project: baseProject(`LaunchPad${i + 1}`, "Developer SaaS launching publicly soon."),
    profile: {
      product_name: `LaunchPad${i + 1}`,
      company_stage: "prelaunch",
      business_model: "saas",
      days_until_launch: 7 + i,
      marketing_goals: ["Product Hunt launch"],
    },
    founder_fit: defaultFit(),
    expect: {
      primary_thesis_id: "product_hunt_launch",
      min_evidence_count: 1,
    },
  }));
}

function devtoolCommunityScenarios(): ThesisScenario[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `devtool-community-${i + 1}`,
    tags: ["devtools", "community"],
    project: baseProject(
      `DevKit${i + 1}`,
      "Open source developer API SDK with CLI and docs for B2B teams.",
      ["apps/web/app/page.tsx", "apps/web/app/docs/page.tsx", "packages/cli/index.ts"],
    ),
    profile: {
      product_name: `DevKit${i + 1}`,
      company_stage: "prelaunch",
      business_model: "saas",
    },
    founder_fit: defaultFit({ brand_face_readiness: "sometimes" }),
    expect: {
      primary_thesis_id: "community_launch",
      min_evidence_count: 1,
    },
  }));
}

function activationBlockScenarios(): ThesisScenario[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `activation-block-${i + 1}`,
    tags: ["activation_block", "lane_d"],
    project: baseProject(`ActivatePro${i + 1}`, "B2B SaaS with signup but weak onboarding."),
    profile: {
      product_name: `ActivatePro${i + 1}`,
      company_stage: "launched",
      business_model: "saas",
      current_users: 100 + i * 10,
      product_activation: {
        activation_event_label: "First project created",
        signup_count: 100 + i * 10,
        activated_count: 8 + i,
        activation_rate_pct: 8,
        activation_rate_target_pct: 40,
        confidence: "measured",
        metric_confidence: {
          signup_count: "measured",
          activated_count: "measured",
          activation_rate_pct: "measured",
          activation_rate_target_pct: "measured",
          ttfv_hours: "missing",
          ttfv_target_hours: "missing",
        },
        updated_at: NOW,
      },
    },
    founder_fit: defaultFit({ scale_readiness: "probably" }),
    expect: {
      primary_thesis_id: "founder_social",
      must_not_primary: ["viral_short_form", "landing_conversion"],
      min_evidence_count: 1,
    },
  }));
}

function revenueBlockScenarios(): ThesisScenario[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `revenue-block-${i + 1}`,
    tags: ["revenue_block", "checkout_missing"],
    project: baseProject(
      `PayWall${i + 1}`,
      "B2B SaaS without billing integration yet.",
      ["apps/web/app/page.tsx", "apps/web/app/signup/page.tsx"],
    ),
    profile: {
      product_name: `PayWall${i + 1}`,
      company_stage: "launched",
      business_model: "saas",
      sales_pipeline_empty: true,
    },
    persona: (i % 3 === 0 ? "sales" : "marketing") as Persona,
    founder_fit: defaultFit({ thirty_day_win: "paying_customers" }),
    expect: {
      primary_thesis_id: i % 3 === 0 ? "outbound_sales" : "founder_social",
      must_not_primary: ["landing_conversion"],
      min_evidence_count: 1,
    },
  }));
}

function wrongChannelTrapScenarios(): ThesisScenario[] {
  const traps: Array<{ name: string; readme: string; stage: MarketingProfile["company_stage"] }> = [
    { name: "TrapViral1", readme: cluelyLikeReadme(), stage: "prelaunch" },
    { name: "TrapViral2", readme: "Consumer viral TikTok app for creators.", stage: "idea" },
    { name: "TrapViral3", readme: "Controversial AI overlay undetectable in meetings.", stage: "prelaunch" },
    { name: "TrapViral4", readme: "Mobile consumer social game with viral loops.", stage: "prelaunch" },
    { name: "TrapViral5", readme: "B2C creator tool for short-form content.", stage: "idea" },
    { name: "TrapSales1", readme: "B2B enterprise sales enablement SaaS.", stage: "launched" },
    { name: "TrapSales2", readme: "Revenue intelligence for sales teams.", stage: "growing" },
    { name: "TrapSales3", readme: "Outbound automation for B2B pipeline.", stage: "launched" },
    { name: "TrapDev1", readme: "Open source API SDK developer tool.", stage: "prelaunch" },
    { name: "TrapDev2", readme: "CLI devtool for engineers with docs site.", stage: "prelaunch" },
    { name: "TrapPH1", readme: "SaaS launching on Product Hunt next week.", stage: "prelaunch" },
    { name: "TrapPH2", readme: "Startup with public launch in 10 days.", stage: "prelaunch" },
    { name: "TrapSEO1", readme: "Content marketing platform with blog.", stage: "growing" },
    { name: "TrapSEO2", readme: "SEO tool for scaling teams with blog resources.", stage: "scaling" },
    { name: "TrapConsumer1", readme: "Consumer beauty and fashion app for retail users.", stage: "prelaunch" },
  ];
  return traps.map((t, i) => {
    const isViral = /viral|cluely|controvers|tiktok|consumer|creator|overlay|game/i.test(t.readme);
    const isSales = /sales|b2b|enterprise|revenue|outbound|pipeline/i.test(t.readme) && !isViral;
    const isDev = /devtool|api|sdk|cli|open.?source/i.test(t.readme);
    const isPh = /launch|product hunt/i.test(t.readme) && t.stage === "prelaunch";
    const isSeo = /seo|blog|content marketing/i.test(t.readme) && /growing|scaling/.test(t.stage ?? "");
    const isBeautyConsumer = /beauty|cosmetic|fashion|retail/i.test(t.readme);
    let expectPrimary: ChannelThesisId = "founder_social";
    let mustNot: ChannelThesisId[] = ["seo_content"];
    if (isViral && !isBeautyConsumer) {
      expectPrimary = "viral_short_form";
      mustNot = ["seo_content", "landing_conversion"];
    } else if (isBeautyConsumer) {
      expectPrimary = "influencer_partnerships";
      mustNot = ["seo_content"];
    } else if (isSales) {
      expectPrimary = "outbound_sales";
      mustNot = ["seo_content"];
    } else if (isPh) {
      expectPrimary = "product_hunt_launch";
    } else if (isSeo) {
      expectPrimary = "seo_content";
      mustNot = [];
    } else if (isDev) {
      expectPrimary = "community_launch";
    }
    return {
      id: `wrong-channel-trap-${i + 1}`,
      tags: ["wrong_channel_trap"],
      project: baseProject(
        t.name,
        t.readme,
        isSeo
          ? ["apps/web/app/page.tsx", "apps/web/app/blog/page.tsx"]
          : isPh
            ? ["apps/web/app/page.tsx"]
            : ["apps/web/app/page.tsx"],
      ),
      profile: {
        product_name: t.name,
        company_stage: t.stage,
        business_model: isViral ? "consumer" : "saas",
        days_until_launch: isPh ? 10 : undefined,
        sales_pipeline_empty: isSales,
        current_users: isSeo ? 300 : undefined,
        email_list_size: isSeo ? 1200 : undefined,
      },
      founder_fit: defaultFit(
        isBeautyConsumer
          ? { brand_face_readiness: "never" }
          : isViral
            ? { brand_face_readiness: "primary_channel", controversy_tolerance: "lean_in" }
            : isSales
              ? { thirty_day_win: "pipeline_meetings" }
              : {},
      ),
      persona: isSales ? ("sales" as Persona) : "marketing",
      expect: {
        primary_thesis_id: expectPrimary,
        must_not_primary: mustNot,
        min_evidence_count: 1,
      },
    };
  });
}

function influencerScenarios(): ThesisScenario[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `influencer-${i + 1}`,
    tags: ["influencer", "consumer"],
    project: baseProject(`BeautyApp${i + 1}`, "Consumer beauty and fashion app for retail users."),
    profile: {
      product_name: `BeautyApp${i + 1}`,
      company_stage: "prelaunch",
      business_model: "consumer",
    },
    founder_fit: defaultFit({
      brand_face_readiness: "never",
      monthly_budget_band: "500_2000",
    }),
    expect: {
      primary_thesis_id: "influencer_partnerships",
      min_evidence_count: 1,
    },
  }));
}

function measurementScenarios(): ThesisScenario[] {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `measurement-${i + 1}`,
    tags: ["measurement", "conversion"],
    project: {
      ...baseProject(
        `ConvertTrack${i + 1}`,
        "B2B SaaS with traffic but unclear funnel.",
        ["apps/web/app/page.tsx", "apps/web/app/signup/page.tsx"],
      ),
      hasAnalytics: true,
    },
    profile: {
      product_name: `ConvertTrack${i + 1}`,
      company_stage: "launched",
      business_model: "saas",
      current_users: 500 + i * 20,
      tracking_flags: { analytics_detected: true },
    },
    founder_fit: defaultFit(),
    expect: {
      primary_thesis_id: "landing_conversion",
      min_evidence_count: 1,
    },
  }));
}

export const THESIS_SCENARIO_CORPUS: ThesisScenario[] = [
  ...cluelyScenarios(),
  ...b2bOutboundScenarios(),
  ...seoDemandScenarios(),
  ...phLaunchScenarios(),
  ...devtoolCommunityScenarios(),
  ...activationBlockScenarios(),
  ...revenueBlockScenarios(),
  ...wrongChannelTrapScenarios(),
  ...influencerScenarios(),
  ...measurementScenarios(),
];

export function corpusCount(): number {
  return THESIS_SCENARIO_CORPUS.length;
}
