import type { Transition, Variants } from "framer-motion";

export const wordRevealSpring: Transition = {
  type: "spring",
  stiffness: 900,
  damping: 70,
};

export const dividerSpring: Transition = {
  type: "spring",
  stiffness: 490,
  damping: 130,
  delay: 0,
};

export const mockupSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 120,
  mass: 3,
  delay: 1.5,
};

export const productUISpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 120,
  mass: 2,
  delay: 3,
};

export const fadeUpSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  delay: 1.4,
};

export const headerFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

export const subheadFade: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 1.2, duration: 0.6, ease: "easeOut" },
  },
};

/** SSR-safe: hidden states stay visible (opacity 1) — only motion offset animates. */
export const sectionReveal: Variants = {
  hidden: { opacity: 1, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

export const cardReveal: Variants = {
  hidden: { opacity: 1, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
};

export const statReveal: Variants = {
  hidden: { opacity: 1, x: 12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
};

export const diffLineReveal: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export const pathDraw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.1, ease: "easeInOut" },
  },
};

export function getWordDelay(index: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : 0.1 * index;
}
