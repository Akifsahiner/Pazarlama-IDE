/**
 * Part 6 — deterministic scan → ProductClaim extractors.
 */
import type { ProjectProfile } from "./types";
import {
  createEvidenceRef,
  type EvidenceRef,
  type ProductClaim,
  type ProductUnderstandingDimension,
} from "./productUnderstandingInput";
import { DIMENSION_REGISTRY } from "./productUnderstandingRegistry";

const NOW = () => new Date().toISOString();

function routeRef(route: string, ruleId: string): EvidenceRef {
  return createEvidenceRef({
    kind: "repo_path",
    label: `Route detected: ${route}`,
    ref: route,
    rule_id: ruleId,
  });
}

function heuristicRef(label: string, ruleId: string): EvidenceRef {
  return createEvidenceRef({
    kind: "scan_heuristic",
    label,
    ref: ruleId,
    rule_id: ruleId,
  });
}

function claim(
  dimension: ProductUnderstandingDimension,
  value: string | number | boolean | null,
  confidence: ProductClaim["confidence"],
  evidence: EvidenceRef[],
): ProductClaim {
  return {
    dimension,
    value,
    confidence,
    evidence,
    updated_at: NOW(),
  };
}

export function extractSiteStructureClaim(project: ProjectProfile): ProductClaim {
  const routes = (project.routes ?? []).map((r) => r.replace(/\\/g, "/"));
  const evidence: EvidenceRef[] = routes.slice(0, 12).map((r) =>
    routeRef(r, "route.detected"),
  );
  const hasLanding = routes.some((r) => /(page\.tsx|page\.jsx|index|landing|home)/i.test(r));
  const hasPricing = routes.some((r) => /pricing/i.test(r));
  const hasSignup = routes.some((r) => /(signup|signin|register|login)/i.test(r));
  const hasOnboarding = routes.some((r) =>
    /(onboard|welcome|setup|getting-started|first-run)/i.test(r),
  );
  const summary = [
    hasLanding ? "landing" : null,
    hasPricing ? "pricing" : null,
    hasSignup ? "signup" : null,
    hasOnboarding ? "onboarding" : null,
  ]
    .filter(Boolean)
    .join(", ");
  if (hasLanding) evidence.push(heuristicRef("Landing/home route present", "site.landing"));
  if (hasPricing) evidence.push(heuristicRef("Pricing route present", "route.pricing_detected"));
  if (hasSignup) evidence.push(heuristicRef("Signup/login route present", "site.signup"));
  if (hasOnboarding) evidence.push(heuristicRef("Onboarding route present", "site.onboarding"));

  return claim(
    "site_structure",
    summary || (routes.length ? `${routes.length} routes scanned` : null),
    routes.length > 0 ? "measured" : "missing",
    evidence,
  );
}

export function extractProductCategoryClaim(project: ProjectProfile): ProductClaim {
  const fw = (project.framework ?? "").toLowerCase();
  const readme = (project.readmeSummary ?? "").toLowerCase();
  const evidence: EvidenceRef[] = [];
  let value: string | null = project.productType ?? null;
  let confidence: ProductClaim["confidence"] = "missing";

  if (project.framework) {
    evidence.push(
      createEvidenceRef({
        kind: "scan_heuristic",
        label: `Framework: ${project.framework}`,
        ref: project.framework,
        rule_id: "stack.framework",
      }),
    );
  }
  if (/next|remix|astro|gatsby|nuxt|sveltekit/.test(fw)) {
    value = value ?? "Web app";
    confidence = "assumption";
    evidence.push(heuristicRef("Web app stack detected from framework", "category.web_app"));
  } else if (/expo|react-native/.test(fw)) {
    value = value ?? "Mobile app";
    confidence = "assumption";
    evidence.push(heuristicRef("Mobile stack detected", "category.mobile"));
  }
  if (/devtools|developer|api|sdk|cli/.test(readme)) {
    value = "Developer tool";
    confidence = evidence.length ? "measured" : "assumption";
    if (project.readmeSummary) {
      evidence.push(
        createEvidenceRef({
          kind: "repo_path",
          label: "README mentions developer/API signals",
          ref: "README.md",
          excerpt: project.readmeSummary.slice(0, 200),
          rule_id: "readme.devtool_signals",
        }),
      );
    }
  }
  if (!value && project.readmeSummary) {
    value = project.name;
    confidence = "assumption";
  }
  if (!value) confidence = DIMENSION_REGISTRY.product_category.default_empty_confidence;

  return claim("product_category", value, confidence, evidence);
}

export function extractPrimaryProblemClaim(
  project: ProjectProfile,
  profileProblem?: string,
): ProductClaim {
  const evidence: EvidenceRef[] = [];
  const fromProfile = profileProblem?.trim();
  if (fromProfile) {
    evidence.push(
      createEvidenceRef({
        kind: "user_answer",
        label: "User-provided primary problem",
        ref: "profile.primary_problem",
      }),
    );
    return claim("primary_problem", fromProfile, "measured", evidence);
  }
  if (project.readmeSummary?.trim()) {
    evidence.push(
      createEvidenceRef({
        kind: "repo_path",
        label: "Inferred from README summary",
        ref: "README.md",
        excerpt: project.readmeSummary.slice(0, 240),
        rule_id: "readme.value_prop",
      }),
    );
    return claim(
      "primary_problem",
      project.readmeSummary.slice(0, 120),
      "assumption",
      evidence,
    );
  }
  return claim("primary_problem", null, "missing", evidence);
}

export function extractTrafficAnalyticsClaim(project: ProjectProfile): ProductClaim {
  const evidence: EvidenceRef[] = [];
  if (project.hasAnalytics) {
    evidence.push(heuristicRef("Analytics vendor detected in scan", "analytics.detected"));
    return claim("traffic_analytics", "analytics_detected", "measured", evidence);
  }
  return claim("traffic_analytics", null, "missing", [
    heuristicRef("No analytics detected in repo scan", "analytics.missing"),
  ]);
}

export function extractPricingClaim(project: ProjectProfile): ProductClaim {
  const routes = (project.routes ?? []).map((r) => r.replace(/\\/g, "/"));
  const pricingRoute = routes.find((r) => /pricing/i.test(r));
  if (pricingRoute) {
    return claim("pricing", "pricing_page_present", "measured", [
      routeRef(pricingRoute, "route.pricing_detected"),
    ]);
  }
  return claim("pricing", null, "missing", []);
}

export function extractActivationClaim(
  project: ProjectProfile,
  magicMoment?: string,
  activationLabel?: string,
): ProductClaim {
  const routes = (project.routes ?? []).map((r) => r.replace(/\\/g, "/"));
  const hasSignup = routes.some((r) => /(signup|signin|register|login)/i.test(r));
  const hasOnboarding = routes.some((r) =>
    /(onboard|welcome|setup|getting-started|first-run)/i.test(r),
  );
  const evidence: EvidenceRef[] = [];

  if (activationLabel?.trim() || magicMoment?.trim()) {
    const label = activationLabel?.trim() || magicMoment!.trim();
    evidence.push(
      createEvidenceRef({
        kind: "user_answer",
        label: "Founder activation definition",
        ref: activationLabel ? "product_activation.activation_event_label" : "founder_fit.magic_moment",
      }),
    );
    return claim("activation_event", label, "measured", evidence);
  }
  if (hasSignup && !hasOnboarding) {
    evidence.push(heuristicRef("Signup without onboarding route", "product.activation_event_missing"));
    return claim("activation_event", null, "needs_confirmation", evidence);
  }
  if (hasOnboarding) {
    const onboardRoute = routes.find((r) =>
      /(onboard|welcome|setup|getting-started|first-run)/i.test(r),
    );
    if (onboardRoute) evidence.push(routeRef(onboardRoute, "site.onboarding"));
    return claim("activation_event", null, "needs_confirmation", evidence);
  }
  return claim("activation_event", null, "missing", evidence);
}

export function extractScanGaps(project: ProjectProfile): string[] {
  const gaps: string[] = [];
  if (!project.hasAnalytics) gaps.push("tracking.ga4");
  if (!project.framework) gaps.push("stack.framework");
  const routes = project.routes ?? [];
  const hasSignup = routes.some((r) => /(login|signup|signin|register|activate)/i.test(r));
  const hasOnboarding = routes.some((r) =>
    /(onboard|welcome|setup|getting-started|first-run)/i.test(r),
  );
  if (hasSignup && !hasOnboarding) {
    gaps.push("product.onboarding_missing", "product.activation_event_missing");
  }
  if (!routes.some((r) => /pricing/i.test(r))) gaps.push("revenue.pricing_page_missing");
  return gaps;
}

export function buildClaimsFromScan(project: ProjectProfile): ProductClaim[] {
  return [
    extractSiteStructureClaim(project),
    extractProductCategoryClaim(project),
    extractPrimaryProblemClaim(project),
    extractTrafficAnalyticsClaim(project),
    extractPricingClaim(project),
    extractActivationClaim(project),
  ];
}
