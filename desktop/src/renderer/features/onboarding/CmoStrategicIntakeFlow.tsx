import { useEffect } from "react";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";
import type { FounderFitProfile, StrategicOptionId } from "@shared/types";
import { useApp } from "@renderer/state/store";
import { FounderFitWizard } from "./FounderFitWizard";
import { PublicPresenceCard } from "./PublicPresenceCard";
import { StrategicDecisionCard } from "./StrategicDecisionCard";

export function CmoStrategicIntakeFlow() {
  const profile = useApp((state) => state.marketingProfile);
  const saveFounderFit = useApp((state) => state.saveFounderFit);
  const savePublicPresencePolicy = useApp((state) => state.savePublicPresencePolicy);
  const runStrategicIntake = useApp((state) => state.runStrategicIntake);
  const selectStrategicOption = useApp((state) => state.selectStrategicOption);
  const sealStrategicDecision = useApp((state) => state.sealStrategicDecision);

  const founderFit = profile?.founder_fit;
  const presence = profile?.public_presence_policy;
  const narrative = profile?.growth_narrative;
  const decision = profile?.strategic_decision;
  const presenceConfigured = Boolean(presence?.configured_at);

  useEffect(() => {
    if (founderFit && presenceConfigured && !decision) runStrategicIntake();
  }, [decision, founderFit, presenceConfigured, runStrategicIntake]);

  if (!profile?.channel_thesis || isStrategicDecisionSealed(profile)) return null;

  const finishWizard = (answers: FounderFitProfile) => {
    saveFounderFit(answers);
  };

  const finishPresence = (policy: NonNullable<typeof presence>) => {
    savePublicPresencePolicy(policy);
  };

  const confirm = (id: StrategicOptionId) => {
    sealStrategicDecision(id);
  };

  if (!founderFit) return <FounderFitWizard onComplete={finishWizard} />;
  if (!presenceConfigured) {
    return (
      <PublicPresenceCard founderFit={founderFit} initial={presence} onComplete={finishPresence} />
    );
  }
  if (!narrative || !decision) return null;

  return (
    <StrategicDecisionCard
      narrative={narrative}
      decision={decision}
      onSelect={selectStrategicOption}
      onConfirm={confirm}
    />
  );
}
