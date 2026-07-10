import type { Transition, Variants } from "framer-motion";
import { dur, ease } from "./tokens";

/**
 * Motion vocabulary — the single source of framer-motion presets.
 *
 * Rules (Kasıt principle):
 *  - One spring standard for UI movement: 400/30. Soft variant (120/22) only
 *    for large width/progress animations.
 *  - Durations and easings come from tokens.ts; no inline literals in features.
 */

/** Standard UI spring — snappy, no overshoot worth noticing. */
export const spring: Transition = { type: "spring", stiffness: 400, damping: 30 };

/** Soft spring for progress bars / large width animations. */
export const springSoft: Transition = { type: "spring", stiffness: 120, damping: 22 };

/** @deprecated use {@link spring} */
export const fadeUpSpring: Transition = spring;

/** Page/route-level crossfade (Shell, Canvas). */
export const pageFade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: dur.base, ease: ease.standard },
} as const;

/** Directional step transition (onboarding, wizards). dir: 1 = forward. */
export const stepTransition = {
  initial: (dir: number) => ({ opacity: 0, x: 28 * (dir >= 0 ? 1 : -1) }),
  animate: { opacity: 1, x: 0, transition: { duration: dur.slow, ease: ease.emphasized } },
  exit: (dir: number) => ({
    opacity: 0,
    x: -20 * (dir >= 0 ? 1 : -1),
    transition: { duration: dur.fast, ease: ease.standard },
  }),
} as const;

/** Scene entrance for hero/reveal moments. */
export const sceneReveal: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: dur.slower, ease: ease.emphasized } },
};

export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

/** List container that staggers `staggerItem` children. */
export const staggerList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export const diffLineReveal: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: dur.slow, ease: ease.decelerate } },
};

export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: dur.fast } },
};

export const palettePop: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring },
};

/** Celebration beat for milestones (task/playbook/plan complete). */
export const milestonePop: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 22 },
  },
};

/** Plan "crystallize" moment — generation finishing into the studio hero. */
export const crystallize: Variants = {
  hidden: { opacity: 0, scale: 0.985, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: dur.slower, ease: ease.emphasized },
  },
};

/** Hero shell crystallize — used when generation thesis morphs into PlanStudioHero. */
export const heroCrystallize: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: dur.slower, ease: ease.emphasized },
  },
};

/** One-shot attention pulse for status transitions (running → done). */
export const statusPulse = {
  scale: [1, 1.18, 1],
  transition: { duration: dur.slow, ease: ease.standard },
};

/** New chat turn / agent bubble entrance. */
export const messageEnter: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.standard } },
};

/** SystemBlock expand/collapse height animation. */
export const systemCollapse = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { duration: dur.base, ease: ease.standard } },
  exit: { height: 0, opacity: 0, transition: { duration: dur.fast, ease: ease.standard } },
} as const;

/** ThinkingStrip text phase crossfade (mode="wait" pair). */
export const thinkingCrossfade = {
  initial: { opacity: 0, y: 2 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.fast, ease: ease.standard } },
  exit: { opacity: 0, y: -2, transition: { duration: dur.fast, ease: ease.standard } },
} as const;

/** Scroll-to-bottom FAB + unread badge pop-in. */
export const fabPop: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: spring },
};
