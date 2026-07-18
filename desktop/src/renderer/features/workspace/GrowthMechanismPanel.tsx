import { Sparkles } from "lucide-react";
import { getMechanismRecord } from "@shared/cmoGrowthMechanismKnowledge";
import { useApp } from "@renderer/state/store";
import { Badge } from "@renderer/components/ui/Badge";
import { Card } from "@renderer/components/ui/Card";

export function GrowthMechanismPanel() {
  const profile = useApp((state) => state.marketingProfile?.growth_mechanism_profile);
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
        <p className="mt-2 text-[10px] text-text-3">
          Watch: {record.failure_modes[0]}
        </p>
      )}
    </Card>
  );
}
