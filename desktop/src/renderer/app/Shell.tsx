import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { pageFade } from "@renderer/design/animations";
import { useApp } from "@renderer/state/store";
import { useToast } from "@renderer/components/ui/Toast";
import { registerBackgroundErrorToast } from "@renderer/lib/backgroundError";
import { Navigator } from "@renderer/components/Navigator";
import { ConnectionBanner } from "@renderer/components/ConnectionBanner";
import { TierGateBanner } from "@renderer/components/TierGateBanner";
import { NextActionBar } from "@renderer/components/NextActionBar";
import { Workspace } from "./Workspace";
import { HomePage } from "@renderer/features/home/HomePage";
import { RunsPage } from "@renderer/features/runs/RunsPage";
import { AssetsPage } from "@renderer/features/assets/AssetsPage";
import { SettingsPage } from "@renderer/features/settings/SettingsPage";
import { HelpPage } from "@renderer/components/HelpPage";

/** Post-onboarding app shell: navigation rail + routed destination. */
export function Shell() {
  const route = useApp((s) => s.route);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const restoredProjectName = useApp((s) => s.restoredProjectName);
  const { toast } = useToast();

  // Returning-user fast path lands here — greet once, then clear the flag.
  useEffect(() => {
    if (!restoredProjectName) return;
    toast({
      title: "Welcome back",
      description: `Picked up ${restoredProjectName} where you left off.`,
      tone: "success",
    });
    useApp.setState({ restoredProjectName: undefined });
  }, [restoredProjectName, toast]);

  useEffect(() => {
    registerBackgroundErrorToast((message) => {
      toast({ title: "Background error", description: message, tone: "warn" });
    });
    return () => registerBackgroundErrorToast(() => {});
  }, [toast]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConnectionBanner />
      <TierGateBanner />
      <div className="flex min-h-0 flex-1">
        <Navigator />
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg">
          {route !== "workspace" && <NextActionBar scope="page" />}
          <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={route}
              className="h-full"
              initial={reducedMotion ? false : pageFade.initial}
              animate={pageFade.animate}
              exit={reducedMotion ? { opacity: 0 } : pageFade.exit}
              transition={pageFade.transition}
            >
              {route === "workspace" ? (
                <Workspace />
              ) : route === "home" ? (
                <HomePage />
              ) : route === "runs" ? (
                <RunsPage />
              ) : route === "assets" ? (
                <AssetsPage />
              ) : route === "settings" ? (
                <SettingsPage />
              ) : (
                <HelpPage />
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
