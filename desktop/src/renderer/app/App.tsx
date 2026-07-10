import { useEffect } from "react";
import { LayoutGroup, MotionConfig } from "framer-motion";
import { useApp } from "@renderer/state/store";
import { CustomTitleBar } from "@renderer/components/CustomTitleBar";
import { StatusBar } from "@renderer/components/StatusBar";
import { UpdateBanner } from "@renderer/components/UpdateBanner";
import { CommandPalette } from "@renderer/components/CommandPalette";
import { ErrorBoundary } from "@renderer/components/ErrorBoundary";
import { Splash } from "@renderer/components/Splash";
import { Onboarding } from "@renderer/features/onboarding/Onboarding";
import { ProjectReveal } from "@renderer/features/onboarding/ProjectReveal";
import { SettingsDialog } from "@renderer/features/settings/SettingsPage";
import { ToastProvider } from "@renderer/components/ui/Toast";
import { Shell } from "./Shell";

export function App() {
  const ready = useApp((s) => s.ready);
  const initPhase = useApp((s) => s.initPhase);
  const init = useApp((s) => s.init);
  const phase = useApp((s) => s.phase);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const togglePalette = useApp((s) => s.togglePalette);
  const navigate = useApp((s) => s.navigate);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const toggleHistory = useApp((s) => s.toggleHistory);
  const historyOpen = useApp((s) => s.historyOpen);
  const createNewSession = useApp((s) => s.createNewSession);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        togglePalette(true);
      } else if (key === "l") {
        e.preventDefault();
        document.getElementById("agent-composer")?.focus();
      } else if (key === "b") {
        e.preventDefault();
        toggleSidebar();
      } else if (key === ",") {
        e.preventDefault();
        navigate("settings");
      } else if (key === "n") {
        e.preventDefault();
        void createNewSession();
      } else if (key === "h") {
        e.preventDefault();
        toggleHistory();
      } else if (e.key === "Escape" && historyOpen) {
        toggleHistory(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette, navigate, toggleSidebar, toggleHistory, historyOpen, createNewSession]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
      <LayoutGroup id="app-shell">
      <ToastProvider>
        <div className="relative flex h-full flex-col bg-bg text-text">
          <CustomTitleBar />
          <UpdateBanner />

          <ErrorBoundary>
            {!ready || initPhase === "boot" || initPhase === "settings" || initPhase === "resuming" || initPhase === "connecting" || initPhase === "error" ? (
              <Splash />
            ) : phase === "onboarding" ? (
              <Onboarding />
            ) : phase === "reveal" ? (
              <ProjectReveal />
            ) : (
              <Shell />
            )}
          </ErrorBoundary>

          <StatusBar />
        </div>

        <CommandPalette />
        <SettingsDialog />
      </ToastProvider>
      </LayoutGroup>
    </MotionConfig>
  );
}
