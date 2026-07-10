import type { MarketingPlan } from "./types";
import { normalizePlan, type MarketingPlanSuite } from "./planPlaybooks";

export interface PlanTaskRef {
  id: string;
  title: string;
  day: number;
  playbookId?: string;
}

export interface PlanRevisionDiff {
  summary: string;
  addedPlaybooks: { id: string; title: string }[];
  removedPlaybooks: { id: string; title: string }[];
  addedTasks: PlanTaskRef[];
  removedTasks: PlanTaskRef[];
  modifiedTasks: {
    id: string;
    title: string;
    day: number;
    field: string;
    before: string;
    after: string;
  }[];
  calendarAdded: number;
  calendarRemoved: number;
}


function playbookMap(suite: MarketingPlanSuite): Map<string, { id: string; title: string }> {
  const m = new Map<string, { id: string; title: string }>();
  for (const pb of suite.playbooks) m.set(pb.id, { id: pb.id, title: pb.title });
  return m;
}

function taskRefs(suite: MarketingPlanSuite): Map<string, PlanTaskRef> {
  const m = new Map<string, PlanTaskRef>();
  for (const t of suite.taskGraph) {
    m.set(t.id, {
      id: t.id,
      title: t.title,
      day: t.day,
      playbookId: t.playbookId,
    });
  }
  return m;
}

/** Deterministic diff between two plan versions (Faz 11). */
export function diffPlanVersions(
  beforeRaw: MarketingPlan | MarketingPlanSuite,
  afterRaw: MarketingPlan | MarketingPlanSuite,
  summary = "Plan updated",
): PlanRevisionDiff {
  const before = normalizePlan(beforeRaw) ?? (beforeRaw as MarketingPlanSuite);
  const after = normalizePlan(afterRaw) ?? (afterRaw as MarketingPlanSuite);

  const beforePb = playbookMap(before);
  const afterPb = playbookMap(after);
  const addedPlaybooks: PlanRevisionDiff["addedPlaybooks"] = [];
  const removedPlaybooks: PlanRevisionDiff["removedPlaybooks"] = [];

  for (const [id, pb] of afterPb) {
    if (!beforePb.has(id)) addedPlaybooks.push(pb);
  }
  for (const [id, pb] of beforePb) {
    if (!afterPb.has(id)) removedPlaybooks.push(pb);
  }

  const beforeTasks = taskRefs(before);
  const afterTasks = taskRefs(after);
  const addedTasks: PlanTaskRef[] = [];
  const removedTasks: PlanTaskRef[] = [];
  const modifiedTasks: PlanRevisionDiff["modifiedTasks"] = [];

  for (const [id, t] of afterTasks) {
    const prev = beforeTasks.get(id);
    if (!prev) {
      addedTasks.push(t);
      continue;
    }
    if (prev.title !== t.title) {
      modifiedTasks.push({
        id,
        title: t.title,
        day: t.day,
        field: "title",
        before: prev.title,
        after: t.title,
      });
    }
    if (prev.day !== t.day) {
      modifiedTasks.push({
        id,
        title: t.title,
        day: t.day,
        field: "day",
        before: String(prev.day),
        after: String(t.day),
      });
    }
  }
  for (const [id, t] of beforeTasks) {
    if (!afterTasks.has(id)) removedTasks.push(t);
  }

  const beforeCal = new Set(
    (before.contentCalendar ?? []).map((c) => `${c.day}|${c.channel}|${c.title}`),
  );
  const afterCal = new Set(
    (after.contentCalendar ?? []).map((c) => `${c.day}|${c.channel}|${c.title}`),
  );
  let calendarAdded = 0;
  let calendarRemoved = 0;
  for (const k of afterCal) if (!beforeCal.has(k)) calendarAdded++;
  for (const k of beforeCal) if (!afterCal.has(k)) calendarRemoved++;

  return {
    summary,
    addedPlaybooks,
    removedPlaybooks,
    addedTasks: addedTasks.sort((a, b) => a.day - b.day),
    removedTasks: removedTasks.sort((a, b) => a.day - b.day),
    modifiedTasks,
    calendarAdded,
    calendarRemoved,
  };
}

export function formatPlanRevisionMarkdown(diff: PlanRevisionDiff): string {
  const lines = [`## Plan revision`, "", diff.summary, ""];
  if (diff.addedPlaybooks.length) {
    lines.push("**Added playbooks**");
    for (const p of diff.addedPlaybooks) lines.push(`- ${p.title}`);
    lines.push("");
  }
  if (diff.removedPlaybooks.length) {
    lines.push("**Removed playbooks**");
    for (const p of diff.removedPlaybooks) lines.push(`- ${p.title}`);
    lines.push("");
  }
  if (diff.addedTasks.length) {
    lines.push("**Added tasks**");
    for (const t of diff.addedTasks.slice(0, 12)) {
      lines.push(`- Day ${t.day}: ${t.title}`);
    }
    if (diff.addedTasks.length > 12) lines.push(`- +${diff.addedTasks.length - 12} more`);
    lines.push("");
  }
  if (diff.removedTasks.length) {
    lines.push("**Removed tasks**");
    for (const t of diff.removedTasks.slice(0, 8)) lines.push(`- Day ${t.day}: ${t.title}`);
    lines.push("");
  }
  if (diff.modifiedTasks.length) {
    lines.push("**Modified tasks**");
    for (const m of diff.modifiedTasks.slice(0, 8)) {
      lines.push(`- ${m.title}: ${m.field} ${m.before} → ${m.after}`);
    }
    lines.push("");
  }
  if (diff.calendarAdded || diff.calendarRemoved) {
    lines.push(
      `**Calendar:** +${diff.calendarAdded} / -${diff.calendarRemoved} items`,
      "",
    );
  }
  return lines.join("\n");
}
