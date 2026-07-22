/** Shared copy for the developer first-hour journey (Welcome, Home, smoke markers). */
export const FIRST_TEN_MINUTES = [
  { step: "1", label: "Connect", detail: "Bundled stack or sign in — or preview offline first" },
  { step: "2", label: "Open folder", detail: "Same repo you built in Cursor" },
  { step: "3", label: "Ship hero", detail: "Review landing file → cite path:line → apply one patch" },
] as const;

export const FIRST_HOUR_MILESTONES = [
  { minutes: "0–15", label: "First patch", detail: "Hero route detected, one applied diff in your repo" },
  { minutes: "15–30", label: "Seal strategy", detail: "Founder-fit intake personalizes Week 1 ops" },
  { minutes: "30–60", label: "Week 1 loop", detail: "Daily ops task — repo ship or post kit + proof" },
] as const;
