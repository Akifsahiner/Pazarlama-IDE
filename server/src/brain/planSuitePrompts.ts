import type { ProjectProfile } from "../schemas/index.js";
import type { MarketingProfile } from "../schemas/marketingProfile.js";
import type { PlaybookIconKey, PlaybookPhase } from "../schemas/planPlaybooks.js";

export interface PlaybookCatalogEntry {
  id: string;
  title: string;
  subtitle: string;
  phase: PlaybookPhase;
  iconKey: PlaybookIconKey;
  skillIds: string[];
  /** When true, include unless profile explicitly lacks prerequisite. */
  defaultInclude?: boolean;
  skipIf?: (ctx: PlanContext) => string | null;
}

export interface PlanContext {
  scan: ProjectProfile;
  marketing: MarketingProfile;
  persona: "marketing" | "sales";
  horizonDays: 14 | 30;
}

export const PLAYBOOK_CATALOG: PlaybookCatalogEntry[] = [
  {
    id: "landing-conversion",
    title: "Landing & Conversion",
    subtitle: "Hero, proof, and signup flow",
    phase: "foundation",
    iconKey: "landing",
    skillIds: ["landing-page-conversion"],
    defaultInclude: true,
  },
  {
    id: "ph-launch",
    title: "Product Hunt Launch",
    subtitle: "Day spike + maker narrative",
    phase: "launch",
    iconKey: "product_hunt",
    skillIds: ["ph_launch", "launch-asset-generator"],
    skipIf: (ctx) =>
      ctx.marketing.business_model === "agency" ? "Skip if B2B agency without consumer launch" : null,
  },
  {
    id: "paid-ads",
    title: "Paid Ads Sprint",
    subtitle: "Creative + targeting experiments",
    phase: "warmup",
    iconKey: "paid_ads",
    skillIds: ["launch-asset-generator"],
    skipIf: (ctx) =>
      !ctx.marketing.available_channels.some((c) => /ads|paid|meta|google/i.test(c))
        ? "Skip if no paid channel budget declared"
        : null,
  },
  {
    id: "email-nurture",
    title: "Email Launch Sequence",
    subtitle: "Waitlist → launch → onboarding",
    phase: "warmup",
    iconKey: "email",
    skillIds: ["outreach-drafting", "launch-asset-generator"],
    defaultInclude: true,
  },
  {
    id: "content-engine",
    title: "Content & Social Engine",
    subtitle: "Organic proof-building cadence",
    phase: "always_on",
    iconKey: "content",
    skillIds: ["launch-asset-generator"],
    defaultInclude: true,
  },
  {
    id: "seo-foundation",
    title: "SEO Foundation",
    subtitle: "Indexable pages + metadata",
    phase: "foundation",
    iconKey: "seo",
    skillIds: ["landing-page-conversion"],
    skipIf: (ctx) => (ctx.scan.routes.length < 2 ? "Skip if single-page product" : null),
  },
  {
    id: "sales-outbound",
    title: "Sales Outbound",
    subtitle: "ICP list + personalized outreach",
    phase: "warmup",
    iconKey: "sales_outbound",
    skillIds: ["outreach-drafting", "lead-research"],
    skipIf: (ctx) => (ctx.persona !== "sales" ? "Skip unless sales persona" : null),
  },
  {
    id: "analytics-measurement",
    title: "Analytics & Measurement",
    subtitle: "Events, dashboards, launch KPIs",
    phase: "foundation",
    iconKey: "analytics",
    skillIds: ["launch-planning"],
    skipIf: (ctx) => (!ctx.scan.hasAnalytics ? "Enable once baseline tracking exists" : null),
  },
  {
    id: "waitlist-hype",
    title: "Waitlist & Hype Engine",
    subtitle: "Referral loop, drip, countdown, pre-launch buzz",
    phase: "warmup",
    iconKey: "email",
    skillIds: ["waitlist-hype-engine", "launch-asset-generator"],
    defaultInclude: true,
    skipIf: (ctx) =>
      ctx.marketing.company_stage === "scaling" && (ctx.marketing.current_users ?? 0) > 10_000
        ? "Already at scale with paid — prioritize paid-ads-opt over waitlist hype"
        : null,
  },
  {
    id: "ph-number-one",
    title: "Product Hunt #1 Campaign",
    subtitle: "Hour-by-hour launch coordination (ethical)",
    phase: "launch",
    iconKey: "product_hunt",
    skillIds: ["ph_launch", "launch-asset-generator"],
    skipIf: (ctx) =>
      ctx.marketing.business_model === "agency" ? "Skip if B2B agency without consumer launch" : null,
  },
  {
    id: "linkedin-gtm",
    title: "LinkedIn Founder GTM",
    subtitle: "Profile, 14-day grid, connection DMs",
    phase: "always_on",
    iconKey: "social",
    skillIds: ["linkedin-founder-gtm", "launch-asset-generator"],
    defaultInclude: true,
  },
  {
    id: "influencer",
    title: "Influencer Partnerships",
    subtitle: "Creator briefs, pitch, tracking",
    phase: "warmup",
    iconKey: "partnerships",
    skillIds: ["influencer-partnerships"],
    skipIf: (ctx) =>
      ctx.marketing.constraints.some((c) => /no paid|stealth/i.test(c))
        ? "Skip if stealth or no creator budget"
        : null,
  },
  {
    id: "short-form-viral",
    title: "Short-form Video Format",
    subtitle: "Hooks, scripts, captions — cadence not lottery",
    phase: "always_on",
    iconKey: "content",
    skillIds: ["short-form-video", "launch-asset-generator"],
  },
  {
    id: "paid-ads-opt",
    title: "Paid Ads Optimization Loop",
    subtitle: "Hypothesis → creative test → measure → iterate",
    phase: "always_on",
    iconKey: "paid_ads",
    skillIds: ["paid-ads-optimization", "launch-asset-generator"],
    skipIf: (ctx) =>
      !ctx.marketing.available_channels.some((c) => /ads|paid|meta|google/i.test(c))
        ? "Skip if no paid budget declared"
        : null,
  },
];

export function profileFromScan(scan: ProjectProfile, marketing?: MarketingProfile | null): MarketingProfile {
  if (marketing?.product_name) return marketing;
  return {
    product_name: scan.name,
    product_description: scan.readmeSummary ?? "",
    category: scan.productType ?? "",
    business_model: "",
    target_audience: [],
    primary_problem: "",
    main_value_proposition: scan.readmeSummary?.slice(0, 200) ?? scan.name,
    differentiators: [],
    competitors: [],
    company_stage: "prelaunch",
    main_markets: [],
    available_channels: [],
    marketing_goals: ["launch"],
    brand_voice: "",
    existing_proof: [],
    available_assets: [],
    constraints: [],
    previous_experiments: [],
    successful_experiments: [],
    failed_experiments: [],
    manual_kpis: [],
    connector_snapshots: {},
    outreach_integrations: {},
    last_updated: new Date().toISOString(),
    confidence_score: 0.3,
    gaps: [],
  };
}

export function outlineSystemPrompt(ctx: PlanContext): string {
  const product = ctx.marketing.product_name || ctx.scan.name;
  return [
    "You are a senior product marketer writing a launch plan OUTLINE for a founder.",
    `Product: ${product}. Horizon: ${ctx.horizonDays} days. Persona: ${ctx.persona}.`,
    "Be specific — use the product name, ICP, and differentiators. No generic 'your product' phrasing.",
    "Select 4–7 playbooks from the catalog. Ruthlessly skip misfits — quality over coverage.",
    "Pick ONE primary bottleneck playbook (awareness/conversion/distribution) — do not spam every channel.",
    "Each playbook stub needs a concrete subtitle (not 'marketing tasks').",
    "Each stub MUST include whyIncluded: one sentence tying the playbook to the primary bottleneck and ICP.",
    "thesis = one sentence launch thesis. narrativeHook = 2–3 sentences for the hero.",
    "Ethical rules: no PH upvote farms, no fake influencer deals, no misleading reach claims.",
    "",
    "PLAYBOOK CATALOG (pick subset):",
    JSON.stringify(
      PLAYBOOK_CATALOG.map((p) => ({
        id: p.id,
        title: p.title,
        phase: p.phase,
        iconKey: p.iconKey,
        skipHint: p.skipIf?.(ctx),
      })),
      null,
      2,
    ),
    "",
    "SCAN PROFILE:",
    JSON.stringify(ctx.scan, null, 2),
    "",
    "MARKETING PROFILE:",
    JSON.stringify(ctx.marketing, null, 2),
  ].join("\n");
}

export function playbookDetailSystemPrompt(
  ctx: PlanContext,
  stub: { id: string; title: string; subtitle: string },
  skillContext: string,
): string {
  const product = ctx.marketing.product_name || ctx.scan.name;
  const channelBlock = PLAYBOOK_CHANNEL_GUIDANCE[stub.id] ?? "";
  return [
    `You are writing ONE playbook: "${stub.title}" for ${product}.`,
    "executiveSummary: 120+ words, markdown paragraphs — strategy lesson tone, name product and ICP.",
    "bets: what we assume (3–5). risks: what breaks the plan (3–5).",
    "tasks: 8–15 items, day 1–" + ctx.horizonDays + ", verb + deliverable titles.",
    "Each task MUST include: tactic (snake_case id), channel, execution_mode (repo|browser|asset|run|connector_read),",
    "instructions_md (5–10 step founder checklist in markdown), deliverable, acceptance_criteria, kpi {name,target}.",
    "Reject generic titles like 'post on social' — name platform, asset, and metric.",
    "Task ids unique — prefix with playbook id.",
    channelBlock,
    skillContext ? `\nSKILL CONTEXT:\n${skillContext}` : "",
    "",
    "MARKETING PROFILE:",
    JSON.stringify(ctx.marketing, null, 2),
  ].join("\n");
}

const PLAYBOOK_CHANNEL_GUIDANCE: Record<string, string> = {
  "ph-number-one": [
    "PH #1 CAMPAIGN RULES:",
    "- Day T-14: gallery asset checklist + hunter outreach list (asset).",
    "- Day T-7: supporter *comment* outreach — never ask for upvotes (browser + asset).",
    "- Day T-1: maker comment draft + launch hour timeline (asset).",
    "- Launch H+0: maker comment live 12:01 AM PT (browser).",
    "- H+3 / H+6: respond all comments + social share tasks (browser).",
    "- phaseLabel on launch-day tasks (T-7d, T-1d, H+0, H+3).",
    "- acceptance_criteria example: 'Maker comment posted with product story + 10 supporter replies logged'.",
  ].join("\n"),
  "ph-launch": "Same as ph-number-one — coordinated PH launch with ethical supporter comments.",
  "linkedin-gtm": [
    "LINKEDIN GTM:",
    "- Day 1: profile headline rewrite using ICP pain→outcome (repo/asset).",
    "- Day 2: banner + featured section checklist (asset).",
    "- Day 3–16: 14-post content grid — alternate hooks (asset).",
    "- Day 5: connection/DM script with value-first tone (asset + browser research).",
    "- ≥2 browser tasks: profile audit + competitor post teardown.",
    "- acceptance_criteria example: 'Headline + banner live; 3 post drafts with distinct hooks'.",
  ].join("\n"),
  "waitlist-hype": [
    "WAITLIST & HYPE:",
    "- Day 1: landing single CTA + referral loop copy (repo).",
    "- Day 3: waitlist email capture + analytics events (repo).",
    "- Day 5–14: 7-day email drip outline (asset).",
    "- Day 7: build-in-public teaser post (asset).",
    "- ≥1 browser task: waitlist landing teardown.",
    "- acceptance_criteria example: 'Referral CTA live; 3-invite unlock threshold configured'.",
  ].join("\n"),
  "influencer": [
    "INFLUENCER:",
    "- Day 1: creator tiering sheet micro/mid/macro (asset).",
    "- Day 3: pitch email templates value-first (asset).",
    "- Day 5: brief with #ad disclosure + UTM tracking (asset).",
    "- ≥2 browser tasks: creator research + sponsored post examples.",
    "- acceptance_criteria example: '5 creators tiered; pitch + brief ready with disclosure'.",
  ].join("\n"),
  "short-form-viral": [
    "SHORT-FORM:",
    "- Day 1: 3 hook variants A/B/C for 15–45s scripts (asset).",
    "- Day 3: storyboard + caption pack (asset).",
    "- Day 5: posting cadence schedule (asset).",
    "- ≥1 browser task: hook teardown from category leaders.",
    "- acceptance_criteria example: '3 scripts + captions; hooks differ in first 3 seconds'.",
  ].join("\n"),
  "paid-ads-opt": [
    "PAID ADS OPT LOOP:",
    "- Week 1: hypothesis sheet + 2 creative variants (asset).",
    "- Week 1: small budget test launch task (browser connector_read optional).",
    "- Week 2: measure → kill/scale decision task (asset).",
    "- acceptance_criteria example: 'Hypothesis logged; 2 creatives tested; winner documented'.",
  ].join("\n"),
};

export function readinessSystemPrompt(ctx: PlanContext): string {
  return [
    "Score 6–8 launch readiness dimensions (0–100) grounded in the profile.",
    "Each dimension needs a one-sentence rationale explaining the score.",
    "For weak scores (<50), set suggestedPlaybookId AND suggestedTactic (named tactic, not generic).",
    "Example suggestedTactic: 'Referral waitlist loop' or 'PH supporter comment cadence'.",
    `Product: ${ctx.marketing.product_name || ctx.scan.name}.`,
    "",
    "Dimension → playbook hints:",
    JSON.stringify(
      {
        "Landing & conversion": "landing-conversion · hero_social_proof_stack",
        Distribution: "ph-number-one · ph_supporter_comment_cadence",
        "Launch narrative": "waitlist-hype · referral_waitlist_loop",
        "Social proof": "linkedin-gtm · linkedin_14_day_grid",
      },
      null,
      2,
    ),
    "",
    JSON.stringify(ctx.marketing, null, 2),
  ].join("\n");
}
