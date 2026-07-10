import type { Persona, ProjectProfile } from "./types";
import type { MarketingPlanSuite, PlanPlaybook } from "./planPlaybooks";
import { playbookTitle } from "./gtmCatalog";

const STUB_PLAYBOOKS: Array<{
  id: string;
  slug: string;
  phase: PlanPlaybook["phase"];
  iconKey: PlanPlaybook["iconKey"];
  taskTitles: string[];
  weight: (profile: ProjectProfile, persona?: Persona) => number;
}> = [
  {
    id: "landing-conversion",
    slug: "landing-conversion",
    phase: "foundation",
    iconKey: "landing",
    taskTitles: ["Audit hero copy and primary CTA", "Add social proof above the fold"],
    weight: (p) => (primaryRoute(p) ? 10 : 5),
  },
  {
    id: "waitlist-hype",
    slug: "waitlist-hype",
    phase: "warmup",
    iconKey: "product_hunt",
    taskTitles: ["Set up referral waitlist loop", "Draft launch-week email sequence"],
    weight: (p, persona) => (persona === "marketing" ? 8 : 4) + (p.productType === "saas" ? 2 : 0),
  },
  {
    id: "content-engine",
    slug: "content-engine",
    phase: "launch",
    iconKey: "content",
    taskTitles: ["Plan 2-week content calendar", "Draft founder LinkedIn posts"],
    weight: (_, persona) => (persona === "marketing" ? 7 : 5),
  },
  {
    id: "sales-outbound",
    slug: "sales-outbound",
    phase: "launch",
    iconKey: "content",
    taskTitles: ["Define ICP from repo signals", "Draft first-touch outreach for 10 leads"],
    weight: (_, persona) => (persona === "sales" ? 12 : 2),
  },
  {
    id: "analytics-measurement",
    slug: "analytics-measurement",
    phase: "always_on",
    iconKey: "analytics",
    taskTitles: ["Verify conversion events on key routes", "Define launch KPI dashboard"],
    weight: (p) => (p.hasAnalytics ? 4 : 12),
  },
];

function primaryRoute(profile: ProjectProfile): string | undefined {
  const routes = profile.routes ?? [];
  const preferred = ["app/page.tsx", "pages/index.tsx", "src/app/page.tsx"];
  for (const p of preferred) {
    if (routes.includes(p)) return p;
  }
  return routes.find((r) => /(page|index)\.(tsx|jsx)$/i.test(r)) ?? routes[0];
}

function inferIcp(profile: ProjectProfile, persona?: Persona): string {
  if (profile.readmeSummary) {
    const snippet = profile.readmeSummary.split(/[.!?]/)[0]?.trim();
    if (snippet && snippet.length > 20) return `${snippet.slice(0, 120)}…`;
  }
  if (persona === "sales") return "Buyers matching your repo’s product category — verify fit before outreach";
  if (profile.productType === "devtools") return "Developers and technical founders evaluating dev tools";
  if (profile.productType === "saas") return "Early adopters comparing solutions in your category";
  return "Early adopters evaluating your product from the landing page";
}

function buildPlaybookStub(
  spec: (typeof STUB_PLAYBOOKS)[number],
  sortOrder: number,
  profile: ProjectProfile,
  persona?: Persona,
): PlanPlaybook {
  const tasks = spec.taskTitles.map((title, i) => ({
    id: `${spec.id}-t${i + 1}`,
    title,
    dependsOn: i === 0 ? [] : [`${spec.id}-t${i}`],
    day: sortOrder * 7 + i + 1,
    playbookId: spec.id,
    action_type: spec.id === "sales-outbound" ? ("browser_research" as const) : ("draft_copy" as const),
    execution_mode: spec.id === "sales-outbound" && persona === "sales" ? ("browser" as const) : ("repo" as const),
  }));

  return {
    id: spec.id,
    slug: spec.slug,
    title: playbookTitle(spec.id),
    subtitle: `Prioritized from ${profile.framework ?? "project"} scan${persona === "sales" ? " · sales focus" : ""}`,
    phase: spec.phase,
    iconKey: spec.iconKey,
    executiveSummary: `Starter tasks for ${playbookTitle(spec.id).toLowerCase()} based on scan signals.`,
    primaryMetric: { name: "Progress", target: "Complete foundation tasks" },
    bets: [`Focus on ${profile.productType ?? "product"} launch momentum`],
    risks: ["Outline only — connect to personalize with AI"],
    dependsOnPlaybookIds: sortOrder === 0 ? [] : [],
    tasks,
    sortOrder,
  };
}

/** Read-only plan outline from local project scan — no LLM. */
export function buildOfflinePlanOutline(
  profile: ProjectProfile,
  opts?: { persona?: Persona },
): MarketingPlanSuite {
  const persona = opts?.persona;
  const route = primaryRoute(profile);
  const product = profile.name || "your product";
  const framework = profile.framework ? ` (${profile.framework})` : "";

  const ranked = [...STUB_PLAYBOOKS].sort(
    (a, b) => b.weight(profile, persona) - a.weight(profile, persona),
  );
  const primaryId = ranked[0]?.id ?? "landing-conversion";

  const thesis = route
    ? `Launch ${product}${framework} — conversion on ${route} is the fastest lever${persona === "sales" ? "; pair with targeted outbound" : ""}.`
    : `Launch ${product}${framework} — build awareness, then convert on your primary landing page.`;

  const narrativeHook =
    profile.readmeSummary?.slice(0, 280) ??
    `Based on your project scan (${profile.scannedFileCount} files, ${profile.routes?.length ?? 0} routes). Connect to generate a personalized 30-day plan.`;

  const playbooks = ranked.map((spec, i) => buildPlaybookStub(spec, i, profile, persona));
  for (let i = 1; i < playbooks.length; i++) {
    playbooks[i]!.dependsOnPlaybookIds = [playbooks[i - 1]!.id];
  }
  const taskGraph = playbooks.flatMap((pb) => pb.tasks);

  const readiness = [
    {
      label: "Landing & messaging",
      score: route ? 58 : 38,
      rationale: route
        ? `Primary route detected: ${route}`
        : "No clear landing route — add app/page or pages/index",
      suggestedPlaybookId: "landing-conversion",
    },
    {
      label: "Analytics & measurement",
      score: profile.hasAnalytics ? 72 : 22,
      rationale: profile.hasAnalytics
        ? "Analytics signals detected in the repo"
        : "No analytics detected — log KPIs manually or connect GA4 before scaling spend",
      suggestedPlaybookId: "analytics-measurement",
    },
  ];

  if (persona === "sales") {
    readiness.push({
      label: "Outbound readiness",
      score: profile.routes?.length ? 45 : 30,
      rationale: "Research leads from your ICP — export CSV when ready; you send outreach",
      suggestedPlaybookId: "sales-outbound",
    });
  }

  return {
    id: `preview-${profile.id}`,
    positioning: thesis,
    icp: inferIcp(profile, persona),
    readiness,
    taskGraph,
    contentCalendar: [],
    strategyNote: "Scan-driven outline preview — not AI-generated. Connect for a personalized plan.",
    schemaVersion: 2,
    preview: true,
    thesis,
    narrativeHook,
    primaryPlaybookId: primaryId,
    primaryBottleneck: profile.hasAnalytics ? "conversion" : "measurement",
    bottleneckWhy: profile.hasAnalytics
      ? "Conversion on your primary landing route is the fastest lever."
      : "Missing analytics — measure before you scale channels.",
    playbooks,
    antiPatterns: ["Treating this outline as a finalized launch plan without AI review"],
  };
}
