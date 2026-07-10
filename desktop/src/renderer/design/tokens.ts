/**
 * TS mirror of the CSS design tokens. Colors stay in CSS via var(); only the
 * measurement/timing constants are mirrored here for JS access (framer-motion
 * transitions, inline measurements).
 */

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  "2xl": 28,
  full: 9999,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Durations in seconds (for framer-motion). */
export const dur = {
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
  slower: 0.42,
} as const;

/** Cubic-bezier easing arrays (for framer-motion). */
export const ease = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.3, 0, 0, 1],
  decelerate: [0, 0, 0, 1],
} as const;

export const z = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  toast: 1400,
} as const;

export type Radius = keyof typeof radius;
export type Space = keyof typeof space;
