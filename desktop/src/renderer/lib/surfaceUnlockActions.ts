import type { SurfaceUnlockAction } from "@shared/surfaceUnlock";
import { surfaceActionToIntent } from "@shared/conversationIntent";
import { useApp } from "@renderer/state/store";

/** Dispatch unlock CTAs from surface guides and empty states. */
export function runSurfaceUnlockAction(action: SurfaceUnlockAction) {
  const s = useApp.getState();
  const intent = surfaceActionToIntent(action);
  if (intent) {
    s.executeIntent(intent);
    return;
  }
  switch (action) {
    case "open_plan":
      s.navigate("workspace");
      s.setWorkSurface("campaign-plan");
      s.setActiveCanvas("campaign-plan");
      break;
    case "connect_ga4":
      s.navigate("settings");
      break;
    case "run_agent":
      s.navigate("workspace");
      document.getElementById("agent-composer")?.focus();
      break;
    default:
      break;
  }
}
