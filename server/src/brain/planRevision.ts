import { randomUUID } from "node:crypto";
import type { MarketingPlanSuite, PlanPlaybook } from "../schemas/planPlaybooks.js";
import { planPlaybookSchema } from "../schemas/planPlaybooks.js";

export interface PlanRevisionOps {
  summary: string;
  strategyNoteAppend?: string;
  taskIdsToRemove: string[];
  tasksToAdd: Array<{
    id: string;
    title: string;
    dependsOn: string[];
    day: number;
    playbookId: string;
    metric?: string;
    deliverable?: string;
    action_type?: "edit_files" | "browser_research" | "draft_copy" | "analyze";
    channel?: string;
    tactic?: string;
  }>;
  newPlaybooks: unknown[];
  calendarItems?: Array<{
    day: number;
    channel: string;
    title: string;
    type: "post" | "email" | "article" | "ad";
  }>;
}

function attachPlaybookIds(playbook: PlanPlaybook, stubId: string): PlanPlaybook {
  const tasks = playbook.tasks.map((t, i) => ({
    ...t,
    id: t.id || `${stubId}-t${i + 1}`,
    playbookId: stubId,
    phaseLabel: playbook.phase,
  }));
  return { ...playbook, tasks };
}

/** Apply revision ops to a plan clone — deterministic merge (Faz 11). */
export function applyPlanRevision(
  current: MarketingPlanSuite,
  ops: PlanRevisionOps,
): MarketingPlanSuite {
  const removeSet = new Set(ops.taskIdsToRemove ?? []);
  const playbooks = [...current.playbooks];
  const existingIds = new Set(playbooks.map((p) => p.id));

  for (const raw of ops.newPlaybooks ?? []) {
    const parsed = planPlaybookSchema.parse({
      bets: [],
      risks: [],
      dependsOnPlaybookIds: [],
      ...(raw as object),
    });
    if (existingIds.has(parsed.id)) continue;
    playbooks.push(attachPlaybookIds(parsed, parsed.id));
    existingIds.add(parsed.id);
  }

  const updatedPlaybooks = playbooks.map((pb) => {
    const addedHere = (ops.tasksToAdd ?? []).filter((t) => t.playbookId === pb.id);
    const kept = pb.tasks.filter((t) => !removeSet.has(t.id));
    const newTasks = addedHere.map((t) => ({
      id: t.id,
      title: t.title,
      dependsOn: t.dependsOn ?? [],
      day: t.day,
      metric: t.metric,
      deliverable: t.deliverable,
      action_type: t.action_type,
      channel: t.channel,
      tactic: t.tactic,
      playbookId: pb.id,
      phaseLabel: pb.phase,
    }));
    return { ...pb, tasks: [...kept, ...newTasks] };
  });

  const orphanAdds = (ops.tasksToAdd ?? []).filter(
    (t) => !updatedPlaybooks.some((pb) => pb.id === t.playbookId),
  );
  if (orphanAdds.length > 0 && updatedPlaybooks.length > 0) {
    const target = updatedPlaybooks[0]!;
    target.tasks = [
      ...target.tasks.filter((t) => !removeSet.has(t.id)),
      ...orphanAdds.map((t) => ({
        id: t.id,
        title: t.title,
        dependsOn: t.dependsOn ?? [],
        day: t.day,
        metric: t.metric,
        deliverable: t.deliverable,
        action_type: t.action_type,
        channel: t.channel,
        tactic: t.tactic,
        playbookId: target.id,
        phaseLabel: target.phase,
      })),
    ];
  } else {
    for (const pb of updatedPlaybooks) {
      pb.tasks = pb.tasks.filter((t) => !removeSet.has(t.id));
    }
  }

  const taskGraph = updatedPlaybooks.flatMap((pb) => pb.tasks);
  const calendar = [...(current.contentCalendar ?? [])];
  for (const item of ops.calendarItems ?? []) {
    if (!calendar.some((c) => c.day === item.day && c.title === item.title)) {
      calendar.push(item);
    }
  }

  const strategyNote = ops.strategyNoteAppend
    ? `${current.strategyNote}${current.strategyNote.endsWith(".") ? "" : "."} ${ops.strategyNoteAppend}`
    : current.strategyNote;

  return {
    ...current,
    id: randomUUID(),
    playbooks: updatedPlaybooks.sort((a, b) => a.sortOrder - b.sortOrder),
    taskGraph,
    contentCalendar: calendar,
    strategyNote,
  };
}

export function compactPlanForRevision(plan: MarketingPlanSuite): string {
  const lines: string[] = [
    `Thesis: ${plan.thesis ?? plan.strategyNote.slice(0, 120)}`,
    `Horizon tasks: ${plan.taskGraph.length}`,
    "",
    "Playbooks:",
  ];
  for (const pb of plan.playbooks) {
    lines.push(`- ${pb.id}: ${pb.title} (${pb.tasks.length} tasks)`);
    for (const t of pb.tasks.slice(0, 8)) {
      lines.push(`  · Day ${t.day} [${t.id}] ${t.title}`);
    }
    if (pb.tasks.length > 8) lines.push(`  · +${pb.tasks.length - 8} more`);
  }
  return lines.join("\n");
}

/** Heuristic — plan exists and message requests an edit (not full regen). */
export function isPlanRevisionMessage(message: string): boolean {
  const m = message.trim();
  if (m.length < 4) return false;
  if (/\b(generate plan|launch plan|create plan|plan oluştur|plan üret|planı üret|preview plan)\b/i.test(m)) {
    return false;
  }
  return (
    /\b(add|ekle|include|insert|remove|çıkar|shift|move|extend|revise|update plan|plan[aı]?\s*(güncelle|değiştir)|channel|tiktok|linkedin|youtube|instagram|newsletter)\b/i.test(
      m,
    ) && /\b(plan|playbook|task|gün|day|channel|kanal|görev)\b/i.test(m)
  ) || /\b(tiktok|linkedin|youtube)\s*(ekle|add)\b/i.test(m);
}
