/**
 * Part 6 — deterministic scan → ProductClaim extractors.
 * Uses scanCitations (path + line) when available from scanner.ts.
 */
import type { ProjectProfile, ScanFileCitation } from "./types";
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

function lineRangeForPattern(
  text: string,
  pattern: RegExp,
): { startLine: number; endLine: number; excerpt: string } | null {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((line) => pattern.test(line));
  if (idx < 0) return null;
  const startLine = idx + 1;
  const endLine = Math.min(lines.length, idx + 4);
  return {
    startLine,
    endLine,
    excerpt: lines.slice(idx, endLine).join("\n").slice(0, 280),
  };
}

function citationEvidence(
  cite: ScanFileCitation | undefined,
  opts: {
    ruleId: string;
    label: string;
    pattern?: RegExp;
    fallbackExcerpt?: string;
  },
): EvidenceRef | null {
  if (!cite?.path) return null;
  const raw = cite.excerpt ?? opts.fallbackExcerpt ?? "";
  const range = raw && opts.pattern ? lineRangeForPattern(raw, opts.pattern) : null;
  return createEvidenceRef({
    kind: "repo_path",
    label: opts.label,
    ref: cite.path,
    excerpt: (range?.excerpt ?? raw.slice(0, 240)) || undefined,
    startLine: range?.startLine ?? cite.startLine,
    endLine: range?.endLine ?? cite.endLine,
    rule_id: opts.ruleId,
  });
}

/** README-derived claims with line citations when scanCitations.readme exists. */
export function extractReadmeClaims(project: ProjectProfile): ProductClaim[] {
  const claims: ProductClaim[] = [];
  const readmeCite = project.scanCitations?.readme;
  const readmeText = readmeCite?.excerpt ?? project.readmeSummary ?? "";
  const evidence: EvidenceRef[] = [];

  const devtool =
    citationEvidence(readmeCite, {
      ruleId: "readme.devtool_signals",
      label: "README mentions developer/API signals",
      pattern: /devtools|developer|api|sdk|cli/i,
      fallbackExcerpt: readmeText,
    }) ??
    (project.readmeSummary
      ? createEvidenceRef({
          kind: "repo_path",
          label: "README summary (no line citation)",
          ref: readmeCite?.path ?? "README.md",
          excerpt: project.readmeSummary.slice(0, 240),
          rule_id: "readme.summary",
        })
      : null);
  if (devtool) evidence.push(devtool);

  const b2b =
    citationEvidence(readmeCite, {
      ruleId: "readme.b2b_signals",
      label: "README mentions B2B/SaaS positioning",
      pattern: /b2b|saas|enterprise|team|workspace/i,
      fallbackExcerpt: readmeText,
    }) ?? null;
  if (b2b) evidence.push(b2b);

  const consumer =
    citationEvidence(readmeCite, {
      ruleId: "readme.consumer_signals",
      label: "README mentions consumer/viral positioning",
      pattern: /consumer|b2c|viral|creator|tiktok|social/i,
      fallbackExcerpt: readmeText,
    }) ?? null;
  if (consumer) evidence.push(consumer);

  if (/devtools|developer|api|sdk|cli/i.test(readmeText.toLowerCase())) {
    claims.push(claim("product_category", "Developer tool", evidence.length ? "measured" : "assumption", evidence.slice(0, 3)));
  }

  const problemExcerpt =
    citationEvidence(readmeCite, {
      ruleId: "readme.value_prop",
      label: "Value proposition from README",
      pattern: /^(#+\s|>\s|-\s|\*\*)/,
      fallbackExcerpt: readmeText,
    }) ?? devtool;
  if (problemExcerpt && readmeText.trim()) {
    claims.push(
      claim(
        "primary_problem",
        readmeText.replace(/[#>*_`-]/g, "").trim().slice(0, 120),
        "assumption",
        [problemExcerpt],
      ),
    );
  }

  if (b2b && !consumer) {
    claims.push(
      claim("target_user", "B2B team buyer", "assumption", [b2b]),
    );
  } else if (consumer && !b2b) {
    claims.push(
      claim("target_user", "Consumer / creator", "assumption", [consumer]),
    );
  }

  return claims;
}

/** Pricing literals + route citation from scan. */
export function extractPricingSignals(project: ProjectProfile): ProductClaim {
  const routes = (project.routes ?? []).map((r) => r.replace(/\\/g, "/"));
  const pricingRoute = routes.find((r) => /pricing/i.test(r));
  const evidence: EvidenceRef[] = [];
  const pricingCite = project.scanCitations?.pricingPage;

  if (pricingRoute) {
    evidence.push(routeRef(pricingRoute, "route.pricing_detected"));
  }
  if (pricingCite) {
    const priceLine = lineRangeForPattern(
      pricingCite.excerpt ?? "",
      /\$\d+|€\d+|\/mo|per month|per user|tier|plan/i,
    );
    evidence.push(
      createEvidenceRef({
        kind: "repo_path",
        label: priceLine ? "Pricing page contains price/tier literals" : "Pricing page source read",
        ref: pricingCite.path,
        excerpt: priceLine?.excerpt ?? pricingCite.excerpt?.slice(0, 240),
        startLine: priceLine?.startLine ?? pricingCite.startLine,
        endLine: priceLine?.endLine ?? pricingCite.endLine,
        rule_id: priceLine ? "pricing.literal_detected" : "pricing.page_read",
      }),
    );
    const literal = (pricingCite.excerpt ?? "").match(/\$\d[\d,.]*/)?.[0];
    if (literal) {
      return claim("pricing", `pricing_page_with_${literal}`, "measured", evidence);
    }
  }
  if (pricingRoute) {
    return claim("pricing", "pricing_page_present", "measured", evidence);
  }
  return claim("pricing", null, "missing", evidence);
}

/** Analytics vendor files with repo paths. */
export function extractAnalyticsSignals(project: ProjectProfile): ProductClaim {
  const evidence: EvidenceRef[] = [];
  const files = project.scanCitations?.analyticsFiles ?? [];
  for (const f of files.slice(0, 6)) {
    evidence.push(
      createEvidenceRef({
        kind: "repo_path",
        label: `Analytics integration file: ${f.path.split("/").pop() ?? f.path}`,
        ref: f.path,
        rule_id: "analytics.file_detected",
      }),
    );
  }
  if (project.hasAnalytics && evidence.length === 0) {
    evidence.push(heuristicRef("Analytics vendor detected in scan", "analytics.detected"));
  }
  if (evidence.length > 0) {
    return claim("traffic_analytics", "analytics_detected", "measured", evidence);
  }
  return claim("traffic_analytics", null, "missing", [
    heuristicRef("No analytics detected in repo scan", "analytics.missing"),
  ]);
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

  const readmeClaim = extractReadmeClaims(project).find((c) => c.dimension === "product_category");
  if (readmeClaim?.value) {
    value = String(readmeClaim.value);
    confidence = readmeClaim.confidence;
    evidence.push(...readmeClaim.evidence);
  } else if (/devtools|developer|api|sdk|cli/.test(readme)) {
    value = "Developer tool";
    confidence = evidence.length ? "measured" : "assumption";
    const cite = citationEvidence(project.scanCitations?.readme, {
      ruleId: "readme.devtool_signals",
      label: "README mentions developer/API signals",
      pattern: /devtools|developer|api|sdk|cli/i,
      fallbackExcerpt: project.readmeSummary,
    });
    if (cite) evidence.push(cite);
  }

  if (!value && project.readmeSummary) {
    value = project.name;
    confidence = "assumption";
  }
  if (!value) confidence = DIMENSION_REGISTRY.product_category.default_empty_confidence;

  return claim("product_category", value, confidence, evidence);
}

export function extractBusinessModelClaim(project: ProjectProfile): ProductClaim {
  const routes = (project.routes ?? []).map((r) => r.replace(/\\/g, "/"));
  const evidence: EvidenceRef[] = [];
  const billingHint = [
    ...(project.appPackages ?? []),
    project.framework ?? "",
    project.name,
    project.readmeSummary ?? "",
  ]
    .join(" ")
    .toLowerCase();
  const hasPricing = routes.some((r) => /pricing/i.test(r));
  const hasCheckout = routes.some((r) => /(checkout|subscribe|billing)/i.test(r));
  const hasBillingDep = /stripe|paddle|lemon/.test(billingHint);

  if (hasBillingDep) {
    evidence.push(heuristicRef("Billing dependency detected (Stripe/Paddle/Lemon)", "revenue.billing_dep"));
  }
  if (hasCheckout) {
    evidence.push(routeRef(routes.find((r) => /checkout|billing/i.test(r))!, "revenue.checkout_route"));
  }
  if (hasPricing) {
    evidence.push(heuristicRef("Pricing route — likely paid product", "revenue.pricing_route"));
  }

  if (/open.?source|mit license|apache/i.test(project.readmeSummary ?? "")) {
    const ossCite = citationEvidence(project.scanCitations?.readme, {
      ruleId: "readme.open_source",
      label: "README mentions open source",
      pattern: /open.?source|mit|apache/i,
    });
    return claim(
      "business_model",
      "open_source_with_paid_tier",
      evidence.length || ossCite ? "assumption" : "missing",
      [...(ossCite ? [ossCite] : []), ...evidence],
    );
  }

  if (hasPricing && (hasCheckout || hasBillingDep)) {
    return claim("business_model", "saas_self_serve", "assumption", evidence);
  }
  if (hasPricing) {
    return claim("business_model", "paid_product_unknown_checkout", "assumption", evidence);
  }

  return claim("business_model", null, "missing", evidence);
}

export function extractDistributionAssetsClaim(project: ProjectProfile): ProductClaim {
  const assets: string[] = [];
  const evidence: EvidenceRef[] = [];
  if (project.hasAnalytics) assets.push("analytics");
  if (project.readmeSummary) assets.push("readme");
  if (project.framework) assets.push(`stack:${project.framework}`);
  const blogRoute = project.routes.find((r) => /\/blog\b/i.test(r));
  if (blogRoute) {
    assets.push("blog");
    evidence.push(routeRef(blogRoute, "distribution.blog_route"));
  }
  if (assets.length) {
    return claim(
      "distribution_assets",
      assets.join(", "),
      "assumption",
      evidence.length
        ? evidence
        : assets.map((a) =>
            createEvidenceRef({
              kind: "scan_heuristic",
              label: a,
              ref: a,
              rule_id: "scan.asset",
            }),
          ),
    );
  }
  return claim("distribution_assets", null, "missing", []);
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
  const fromReadme = extractReadmeClaims(project).find((c) => c.dimension === "primary_problem");
  if (fromReadme) return fromReadme;
  if (project.readmeSummary?.trim()) {
    evidence.push(
      createEvidenceRef({
        kind: "repo_path",
        label: "Inferred from README summary",
        ref: project.scanCitations?.readme?.path ?? "README.md",
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
  return extractAnalyticsSignals(project);
}

export function extractPricingClaim(project: ProjectProfile): ProductClaim {
  return extractPricingSignals(project);
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
  const readmeExtras = extractReadmeClaims(project).filter(
    (c) => c.dimension === "target_user",
  );
  return [
    extractSiteStructureClaim(project),
    extractProductCategoryClaim(project),
    extractBusinessModelClaim(project),
    extractPrimaryProblemClaim(project),
    extractTrafficAnalyticsClaim(project),
    extractPricingClaim(project),
    extractActivationClaim(project),
    extractDistributionAssetsClaim(project),
    ...readmeExtras,
  ];
}
