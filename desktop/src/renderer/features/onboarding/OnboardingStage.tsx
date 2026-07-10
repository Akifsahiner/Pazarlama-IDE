import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import logoUrl from "@renderer/assets/logo.png";

export type OnboardingStepId = "welcome" | "connect" | "signin" | "focus" | "project";

export const ONBOARDING_STEP_META: Record<
  OnboardingStepId,
  { label: string; title: string; subtitle: string }
> = {
  welcome: { label: "Welcome", title: "", subtitle: "" },
  connect: {
    label: "Connect",
    title: "Connect to run the agent",
    subtitle: "Your project scan works offline. Sign in or connect a backend for AI plans, chat, and runs.",
  },
  signin: {
    label: "Sign in",
    title: "Sign in to Marketing IDE",
    subtitle: "Sign in with your email to sync your projects, plans, and assets across devices.",
  },
  focus: {
    label: "Focus",
    title: "What are you here to do?",
    subtitle: "This sets your default playbooks and quick actions — you can switch anytime.",
  },
  project: {
    label: "Project",
    title: "Open a project",
    subtitle: "Bring in a codebase, repo, or live site so the operator can work on it.",
  },
};

/** Horizontal step rail — every onboarding beat, including Welcome, has a place. */
export function OnboardingProgressRail({
  steps,
  current,
}: {
  steps: OnboardingStepId[];
  current: OnboardingStepId;
}) {
  const currentIdx = steps.indexOf(current);
  return (
    <nav aria-label="Onboarding progress" className="flex items-center justify-center gap-0">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex items-center">
            {i > 0 && (
              <span
                className={`mx-1.5 h-px w-8 transition-colors duration-[var(--dur-slow)] ${
                  i <= currentIdx ? "bg-accent/50" : "bg-line"
                }`}
              />
            )}
            <span className="flex items-center gap-1.5">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] transition-colors duration-[var(--dur-slow)] ${
                  done
                    ? "bg-accent text-white"
                    : active
                      ? "border-2 border-accent bg-transparent"
                      : "border border-line bg-transparent"
                }`}
              >
                {done && <Check size={9} strokeWidth={3} />}
              </span>
              <span
                className={`text-caption transition-colors ${active ? "!text-text" : done ? "!text-text-2" : ""}`}
              >
                {ONBOARDING_STEP_META[s].label}
              </span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Shared onboarding shell — persistent logo (layoutId morph from Splash),
 * directional step transitions, and the progress rail.
 */
export function OnboardingStage({
  stepKey,
  direction,
  railSteps,
  currentStep,
  showRail = true,
  children,
  footer,
}: {
  stepKey: string;
  direction: number;
  railSteps: OnboardingStepId[];
  currentStep: OnboardingStepId;
  showRail?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="app-bg" aria-hidden />
      <div className="welcome-ambient" aria-hidden />
      <div className="relative flex min-h-full flex-col items-center justify-center p-8">
        <motion.img
          layoutId="onboarding-logo"
          src={logoUrl}
          alt="Marketing IDE"
          className="mb-6 h-14 w-14 rounded-[var(--radius-lg)] shadow-[var(--shadow-2)]"
        />

        <div className="flex w-full max-w-lg flex-col items-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={stepKey}
              custom={direction}
              variants={{
                initial: (dir: number) => ({ opacity: 0, x: 28 * (dir >= 0 ? 1 : -1) }),
                animate: {
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.28, ease: [0.2, 0, 0, 1] },
                },
                exit: (dir: number) => ({
                  opacity: 0,
                  x: -20 * (dir >= 0 ? 1 : -1),
                  transition: { duration: 0.18, ease: [0.2, 0, 0, 1] },
                }),
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>

          {showRail && (
            <div className="mt-7">
              <OnboardingProgressRail steps={railSteps} current={currentStep} />
            </div>
          )}

          {footer}
        </div>
      </div>
    </div>
  );
}
