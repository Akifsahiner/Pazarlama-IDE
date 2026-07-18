/**
 * Patch MarketingProfile from a local project scan (profile v2 site facts).
 */
import type { MarketingProfile, ProjectProfile } from "./types";

function blankProfile(): MarketingProfile {
  return {
    product_name: "",
    product_description: "",
    category: "",
    business_model: "",
    target_audience: [],
    primary_problem: "",
    main_value_proposition: "",
    differentiators: [],
    competitors: [],
    company_stage: "",
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
    manual_kpis: [],
    last_updated: new Date().toISOString(),
    confidence_score: 0,
    gaps: [],
  };
}

/** No-LLM channel/category inference from scan — mirrors server profileBuilder. */
export function inferChannelsFromScan(scan: ProjectProfile): {
  channels: string[];
  category: string;
  assets: string[];
} {
  const channels: string[] = [];
  if (scan.hasAnalytics) channels.push("analytics");
  if (scan.routes.some((r) => /(\bblog\b|\/blog)/i.test(r))) channels.push("content");
  if (scan.routes.some((r) => /(landing|home|index|pricing)/i.test(r))) channels.push("landing");
  if (scan.routes.some((r) => /(login|signup|signin|register|activate)/i.test(r))) {
    channels.push("product");
  }
  if (scan.routes.some((r) => /(api\/|\/api\/)/i.test(r))) channels.push("api");
  if (scan.framework && /next|remix|react/i.test(scan.framework)) {
    channels.push("seo");
  }

  const fw = (scan.framework ?? "").toLowerCase();
  let category = scan.productType ?? "";
  if (!category) {
    if (/next|remix|astro|gatsby|nuxt|sveltekit/.test(fw)) category = "Web app";
    else if (/expo|react-native/.test(fw)) category = "Mobile app";
  }

  const assets = Array.from(
    new Set(
      [
        scan.hasAnalytics ? "analytics" : null,
        scan.readmeSummary ? "readme" : null,
        scan.framework ? `stack:${scan.framework}` : null,
        ...scan.routes.slice(0, 8).map((r) => `route:${r}`),
      ].filter(Boolean) as string[],
    ),
  );

  return { channels, category, assets };
}

export function profileFromProjectScan(
  project: ProjectProfile,
  prev?: MarketingProfile | null,
): MarketingProfile {
  const base = prev ?? blankProfile();
  const inferred = inferChannelsFromScan(project);
  const gaps = (base.gaps ?? []).filter(
    (gap) =>
      gap !== "product.onboarding_missing" &&
      gap !== "product.activation_event_missing" &&
      !gap.startsWith("revenue."),
  );
  if (!project.hasAnalytics && !gaps.includes("tracking.ga4")) {
    gaps.push("tracking.ga4");
  }
  if (!project.framework && !gaps.includes("stack.framework")) {
    gaps.push("stack.framework");
  }
  const hasSignupRoute = project.routes.some((route) =>
    /(login|signup|signin|register|activate)/i.test(route),
  );
  const hasOnboardingRoute = project.routes.some((route) =>
    /(onboard|welcome|setup|getting-started|first-run)/i.test(route),
  );
  if (hasSignupRoute && !hasOnboardingRoute) {
    gaps.push("product.onboarding_missing", "product.activation_event_missing");
  }

  const routeJoin = project.routes.join(" ").toLowerCase();
  const hasShareSurface = /invite|share|refer|collaborat|embed/.test(routeJoin);
  const hasTemplateSurface = project.routes.some((r) => /template|gallery|marketplace|community/.test(r));
  const hasApiSurface = project.routes.some((r) => /api|webhook|integration/.test(r));
  if (hasSignupRoute && !hasShareSurface) gaps.push("growth.share_surface_missing");
  if (/saas|workspace|platform|horizontal/.test(`${base.business_model} ${base.category}`.toLowerCase()) && !hasTemplateSurface) {
    gaps.push("growth.template_surface_missing");
  }
  if (/developer|api|sdk|devtool/.test(`${project.readmeSummary ?? ""} ${project.framework ?? ""}`.toLowerCase()) && !hasApiSurface) {
    gaps.push("growth.integration_adjacency_unknown");
  }
  if (/design|figma|plugin|widget|remix|community file/.test(project.readmeSummary ?? "") && !hasTemplateSurface) {
    gaps.push("growth.artifact_publish_missing");
  }

  const hasPricingRoute = project.routes.some((route) => /pricing/i.test(route));
  const hasCheckoutRoute = project.routes.some((route) =>
    /(checkout|subscribe|billing)/i.test(route),
  );
  const billingHint = [
    ...(project.appPackages ?? []),
    project.framework ?? "",
    project.name,
  ]
    .join(" ")
    .toLowerCase();
  const hasBillingDep = /stripe|paddle|lemon/.test(billingHint);

  if (!hasPricingRoute) gaps.push("revenue.pricing_page_missing");
  if (!hasCheckoutRoute && !hasBillingDep) gaps.push("revenue.checkout_missing");
  if (!hasBillingDep && !hasCheckoutRoute) gaps.push("revenue.billing_integration_missing");
  if (!project.hasAnalytics && (hasPricingRoute || hasSignupRoute)) {
    gaps.push("revenue.funnel_events_missing");
  }

  const channels = Array.from(
    new Set([...(base.available_channels ?? []), ...inferred.channels]),
  );
  const assets = Array.from(
    new Set([...(base.available_assets ?? []), ...inferred.assets]),
  );

  return {
    ...base,
    product_name: base.product_name || project.name,
    product_description:
      base.product_description || project.readmeSummary || base.product_description,
    category: base.category || inferred.category || base.category,
    available_channels: channels,
    available_assets: assets,
    site_structure: {
      routes: project.routes.slice(0, 40),
      framework: project.framework,
      scanned_files: project.scannedFileCount,
      monorepo_root: project.monorepoRoot,
      app_packages: project.appPackages?.slice(0, 8),
    },
    tracking_flags: {
      analytics_detected: project.hasAnalytics,
      ga4: project.hasAnalytics ? "detected" : "missing",
    },
    gaps,
    last_updated: new Date().toISOString(),
    confidence_score: Math.min(
      1,
      (base.confidence_score || 0.25) +
        (project.scannedFileCount > 0 ? 0.15 : 0) +
        (project.framework ? 0.15 : 0) +
        (project.routes.length >= 5 ? 0.1 : 0),
    ),
  };
}
