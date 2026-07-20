/**
 * Part 6 — surface ownership registry (diagnostic attributes).
 */
export interface SurfaceOwnershipEntry {
  id: string;
  class: "main" | "overlay" | "backstage" | "settings";
  file: string;
  notes?: string;
}

export const SURFACE_OWNERSHIP: SurfaceOwnershipEntry[] = [
  { id: "why-panel", class: "main", file: "WhyPanel.tsx", notes: "Claim evidence drawer" },
  { id: "product-understanding-graph", class: "main", file: "productUnderstandingPolicy.ts", notes: "Profile SSOT" },
  { id: "cmo-intake-why", class: "main", file: "CmoIntakeCard.tsx", notes: "Thesis Why disclosure" },
  { id: "strategic-seal-why", class: "main", file: "StrategicDecisionCard.tsx", notes: "Seal evidence summary" },
  { id: "decision-claim-citations", class: "overlay", file: "MarketingDecisionCard.tsx", notes: "Brain claim_citations" },
  { id: "binding-why-chip", class: "main", file: "GrowthCommandSurface.tsx", notes: "Bottleneck Why chip" },
];

export function surfaceEntry(id: string): SurfaceOwnershipEntry | undefined {
  return SURFACE_OWNERSHIP.find((e) => e.id === id);
}
