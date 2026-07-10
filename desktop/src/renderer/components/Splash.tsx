import { motion } from "framer-motion";
import logoUrl from "@renderer/assets/logo.png";
import { useApp } from "@renderer/state/store";
import { dur, ease } from "@renderer/design/tokens";
import { ProgressBar } from "@renderer/components/ui/ProgressBar";
import type { InitPhase } from "@shared/types";

const PHASE_COPY: Record<InitPhase, string> = {
  boot: "Starting…",
  settings: "Loading settings…",
  resuming: "Restoring workspace…",
  connecting: "Connecting to backend…",
  done: "Ready",
  error: "Startup issue",
};

/** Rough progress per phase so the wait reads as motion, not a stall. */
const PHASE_PCT: Record<InitPhase, number> = {
  boot: 0.1,
  settings: 0.35,
  resuming: 0.6,
  connecting: 0.85,
  done: 1,
  error: 1,
};

/** Branded first-paint splash with init phase progress. */
export function Splash() {
  const initPhase = useApp((s) => s.initPhase);
  const initError = useApp((s) => s.initError);
  const init = useApp((s) => s.init);
  const isError = initPhase === "error";

  return (
    <div className="relative flex h-full flex-1 items-center justify-center">
      <div className="app-bg" aria-hidden />
      <motion.div
        className="relative flex w-full max-w-sm flex-col items-center gap-4 px-6"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: dur.slower, ease: ease.standard }}
      >
        <motion.img
          layoutId="onboarding-logo"
          src={logoUrl}
          alt="Marketing IDE"
          className="h-16 w-16 rounded-[var(--radius-lg)] shadow-[var(--shadow-2)]"
          animate={isError ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="w-full text-center">
          <div className="text-h3 text-text">Marketing IDE</div>
          <div className="text-caption">Claude for Marketing &amp; Sales</div>
          <p className="mt-3 text-mini text-text-2" aria-live="polite">
            {PHASE_COPY[initPhase]}
          </p>
          {!isError && (
            <div className="mx-auto mt-3 w-48">
              <ProgressBar value={PHASE_PCT[initPhase]} className="h-1" />
            </div>
          )}
        </div>
        {isError && initError && (
          <div className="w-full rounded-[var(--radius-md)] border border-warn-border bg-warn-soft px-4 py-3 text-center">
            <p className="text-mini text-text-2">{initError}</p>
            <button
              type="button"
              onClick={() => void init()}
              className="btn-accent mt-3 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => useApp.getState().continueOffline()}
              className="mt-2 block w-full text-mini text-accent hover:underline"
            >
              Continue offline
            </button>
            <p className="mt-2 text-[10px] text-text-3">
              Tip: run <code className="text-text-2">desktop/scripts/dev-clean.ps1</code> if ports
              are stuck.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
