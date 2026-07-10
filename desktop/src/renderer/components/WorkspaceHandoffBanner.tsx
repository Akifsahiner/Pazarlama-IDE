import { useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import type { WorkspaceHandoff, WorkspaceHandoffAction } from "@shared/workspaceHandoff";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";

function runHandoffAction(action: WorkspaceHandoffAction) {
  const s = useApp.getState();
  switch (action) {
    case "generate_plan":
      s.executeIntent({ kind: "generate_plan" });
      break;
    case "preview_plan":
      s.executeIntent({ kind: "preview_plan" });
      break;
    case "open_plan":
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      break;
    case "composer":
      s.navigate("workspace");
      document.getElementById("agent-composer")?.focus();
      break;
    case "home":
      s.navigate("home");
      break;
    case "first_move":
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      if (s.runtime === "connected") void s.generatePlan();
      else s.previewPlanOutline();
      break;
    case "execute_intent": {
      const intent = s.workspaceHandoff?.payload?.intent;
      if (intent) s.executeIntent(intent, { skipConfirm: true });
      break;
    }
    default:
      break;
  }
}

/** Dismissible bridge from onboarding reveal into the IDE. */
export function WorkspaceHandoffBanner() {
  const handoff = useApp((s) => s.workspaceHandoff);
  const dismiss = useApp((s) => s.dismissWorkspaceHandoff);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!handoff) return null;

  const needsAck = handoff.requireAcknowledge === true;
  const canRun = !needsAck || acknowledged;

  const go = (action: WorkspaceHandoffAction) => {
    if (action === "execute_intent" && needsAck && !acknowledged) return;
    runHandoffAction(action);
    dismiss();
    setAcknowledged(false);
  };

  return (
    <div
      className="shrink-0 border-b border-accent/30 bg-gradient-to-r from-accent-soft/25 to-surface px-4 py-3"
      data-testid="workspace-handoff-banner"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
          <Sparkles size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            {handoff.eyebrow}
          </div>
          <p className="text-body-sm font-medium text-text">{handoff.title}</p>
          <p className="mt-0.5 text-mini text-text-2">{handoff.reason}</p>
          {handoff.payload?.modeLabel && (
            <p className="mt-1 text-micro text-text-3">Mode: {handoff.payload.modeLabel}</p>
          )}
          {needsAck && (
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-mini text-text-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>Agent will edit files in my project.</span>
            </label>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              iconRight={<ArrowRight size={13} />}
              disabled={!canRun}
              onClick={() => go(handoff.primaryAction)}
            >
              {handoff.primaryLabel}
            </Button>
            {handoff.secondaryLabel && handoff.secondaryAction && (
              <Button variant="ghost" size="sm" onClick={() => go(handoff.secondaryAction!)}>
                {handoff.secondaryLabel}
              </Button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            dismiss();
            setAcknowledged(false);
          }}
          className="shrink-0 rounded-[var(--radius-sm)] p-1 text-text-3 hover:bg-elevated hover:text-text"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function buildRevealHandoff(opts: {
  projectName: string;
  connected: boolean;
  persona: "marketing" | "sales";
}): WorkspaceHandoff {
  const { projectName, connected, persona } = opts;
  if (connected) {
    return {
      eyebrow: "You're in",
      title: persona === "sales" ? "Build your ICP, then run outbound" : "Generate your launch plan",
      reason: `${projectName} is scanned — the bar above shows your next move. Start with the plan studio.`,
      primaryLabel: "Generate launch plan",
      primaryAction: "generate_plan",
      secondaryLabel: "Open dashboard",
      secondaryAction: "home",
    };
  }
  return {
    eyebrow: "You're in",
    title: "Preview your plan outline",
    reason: `${projectName} is scanned offline — preview a 30-day outline now, connect later for full AI.`,
    primaryLabel: "Preview outline",
    primaryAction: "preview_plan",
    secondaryLabel: "Open dashboard",
    secondaryAction: "home",
  };
}
