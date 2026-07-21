/**
 * Faz 2 — Week 1 task preview: generic template before seal, mechanism-specific after.
 */
import type { ChannelThesis, CmoWeek1Priority } from "./cmoIntake";

export interface Week1PreviewResult {
  tasks: CmoWeek1Priority[];
  generic: boolean;
}

/** Resolve Week 1 preview tasks for intake cards and briefing. */
export function resolveWeek1PreviewTasks(
  thesis: ChannelThesis,
  sealed: boolean,
): Week1PreviewResult {
  const generic = !sealed || thesis.draft === true;
  return {
    tasks: thesis.week1_priorities.slice(0, 5),
    generic,
  };
}

export const WEEK1_OWNER_LABEL = {
  system: "IDE",
  user: "You",
  delegate: "Delegate",
} as const;

export function week1OwnerBadge(owner: CmoWeek1Priority["owner"]): string {
  return WEEK1_OWNER_LABEL[owner];
}
