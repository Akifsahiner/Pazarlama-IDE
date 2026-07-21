import { Sparkles } from "lucide-react";
import { getMechanismRecord } from "@shared/cmoGrowthMechanismKnowledge";
import type { ThesisQualityDimensionId } from "@shared/cmoThesisQualityEngine";
import { useApp } from "@renderer/state/store";
import { Badge } from "@renderer/components/ui/Badge";
import { Card } from "@renderer/components/ui/Card";

const DIMENSION_LABEL: Record<ThesisQualityDimensionId, string> = {
  product_class: "Product class",
  market_maturity: "Market maturity",
  founder_fit: "Founder fit",
  public_presence: "Public presence",
  distribution_assets: "Distribution assets",
  budget: "Budget",
  activation_readiness: "Activation",
  monetization_readiness: "Monetization",
  existing_demand: "Existing demand",
  growth_mechanism_fit: "Mechanism fit",
  evidence_confidence: "Evidence",
};

export function GrowthMechanismPanel() {
  const profile = useApp((state) => state.marketingProfile?.growth_mechanism_profile);
  const quality = useApp((state) => state.marketingProfile?.thesis_quality_report);
  if (!profile?.primary_mechanism_id) return null;
  const record = getMechanismRecord(profile.primary_mechanism_id);
  const secondary = profile.secondary_mechanism_id
    ? getMechanismRecord(profile.secondary_mechanism_id)
    : undefined;

  return (
    <Card id="growth-mechanism-panel" className="border-line/80 bg-surface/70">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={14} className="text-accent" />
        <h3 className="text-body font-semibold text-text">Growth mechanism</h3>
        <Badge tone="accent">{record.label}</Badge>
        {secondary && <Badge tone="neutral">+ {secondary.label}</Badge>}
      </div>
      <p className="mt-2 text-body-sm text-text-2">{record.hidden_system_chain[0]}</p>
      <p className="mt-2 text-mini text-text-3">
        <span className="font-semibold text-warn">We will not:</span>{" "}
        {record.superficial_wrong_lesson}
      </p>
      {record.failure_modes[0] && (
        <p className="mt-2 text-[10px] text-text-3">Watch: {record.failure_modes[0]}</p>
      )}

      {quality && (
        <div className="mt-4 border-t border-line/60 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
            Tez kalitesi · {quality.composite_confidence}
          </p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {(Object.keys(quality.dimension_scores) as ThesisQualityDimensionId[]).map((id) => {
              const row = quality.dimension_scores[id];
              if (!row) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-line/50 bg-surface-2/40 px-2 py-1 text-[10px]"
                >
                  <span className="text-text-2">{DIMENSION_LABEL[id]}</span>
                  <Badge tone={row.confidence === "measured" ? "ok" : row.confidence === "missing" ? "warn" : "neutral"}>
                    {row.confidence}
                  </Badge>
                </div>
              );
            })}
          </div>
          {quality.kill_pivot_condition && (
            <p className="mt-2 text-[10px] text-text-3">Pivot: {quality.kill_pivot_condition}</p>
          )}
        </div>
      )}
    </Card>
  );
}
