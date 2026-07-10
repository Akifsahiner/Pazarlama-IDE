import type { WorkSurface } from "@shared/workSurfaces";
import { ResearchMapCanvas } from "./ResearchMapCanvas";
import { CampaignPlanCanvas } from "./CampaignPlanCanvas";
import { FunnelCanvas } from "./FunnelCanvas";
import { ContentSetCanvas } from "./ContentSetCanvas";
import { AdPreviewCanvas } from "./AdPreviewCanvas";
import { PerformanceTableCanvas } from "./PerformanceTableCanvas";
import { ExperimentResultCanvas } from "./ExperimentResultCanvas";
import { MarketingDiffCanvas } from "./MarketingDiffCanvas";

const SURFACE_COMPONENTS: Record<WorkSurface, () => React.ReactElement> = {
  "research-map": ResearchMapCanvas,
  "campaign-plan": CampaignPlanCanvas,
  funnel: FunnelCanvas,
  "content-set": ContentSetCanvas,
  "ad-preview": AdPreviewCanvas,
  performance: PerformanceTableCanvas,
  experiment: ExperimentResultCanvas,
  "marketing-diff": MarketingDiffCanvas,
};

export function WorkSurfaceBody({ surface }: { surface: WorkSurface }) {
  const Component = SURFACE_COMPONENTS[surface];
  return <Component />;
}
