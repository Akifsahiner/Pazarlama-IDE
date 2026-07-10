import type { ProjectProfile } from "./types";

export interface MarketingGap {
  id: string;
  label: string;
  hint: string;
}

/** Honest GTM readiness gaps inferred from a project scan — no fake scores. */
export function inferMarketingGaps(project: ProjectProfile): MarketingGap[] {
  const gaps: MarketingGap[] = [];

  if (!project.hasAnalytics) {
    gaps.push({
      id: "analytics",
      label: "No analytics detected",
      hint: "Add PostHog, Plausible, or GA4 so launch metrics have a home.",
    });
  }
  if (!project.readmeSummary?.trim()) {
    gaps.push({
      id: "readme",
      label: "No README summary",
      hint: "A README helps the agent understand positioning and ICP.",
    });
  }
  if (project.routes.length < 3) {
    gaps.push({
      id: "routes",
      label: "Few routes mapped",
      hint: "Landing, pricing, and signup pages drive most GTM work.",
    });
  }
  if (!project.framework) {
    gaps.push({
      id: "stack",
      label: "Stack unclear",
      hint: "package.json helps tailor playbooks and edit tasks.",
    });
  }
  if (!project.productType) {
    gaps.push({
      id: "product-type",
      label: "Product type unknown",
      hint: "Framework detection improves launch and content playbooks.",
    });
  }

  return gaps.slice(0, 4);
}
