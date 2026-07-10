import { eq, persistenceEnabled, sb } from "../client.js";

export type FeedbackTargetKind = "decision" | "draft" | "run" | "plan_task";

export interface FeedbackRow {
  id: string;
  user_id: string;
  project_id: string | null;
  target_kind: FeedbackTargetKind;
  target_id: string;
  rating: -1 | 1;
  comment: string | null;
  skill_id: string | null;
  discipline: string | null;
  created_at: string;
}

export interface InsertFeedbackInput {
  projectId?: string;
  targetKind: FeedbackTargetKind;
  targetId: string;
  rating: -1 | 1;
  comment?: string;
  skillId?: string;
  discipline?: string;
}

export async function insert(userId: string, input: InsertFeedbackInput): Promise<FeedbackRow | null> {
  if (!persistenceEnabled) {
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      project_id: input.projectId ?? null,
      target_kind: input.targetKind,
      target_id: input.targetId,
      rating: input.rating,
      comment: input.comment ?? null,
      skill_id: input.skillId ?? null,
      discipline: input.discipline ?? null,
      created_at: new Date().toISOString(),
    };
  }
  const rows = await sb<FeedbackRow[]>("/feedback_events", {
    method: "POST",
    body: JSON.stringify([
      {
        user_id: userId,
        project_id: input.projectId ?? null,
        target_kind: input.targetKind,
        target_id: input.targetId,
        rating: input.rating,
        comment: input.comment ?? null,
        skill_id: input.skillId ?? null,
        discipline: input.discipline ?? null,
      },
    ]),
  });
  return rows?.[0] ?? null;
}

export interface QualitySkillAggregate {
  skill_id: string | null;
  discipline: string | null;
  up: number;
  down: number;
  total: number;
  score: number;
}

export async function aggregateBySkill(userId: string, days = 30): Promise<QualitySkillAggregate[]> {
  if (!persistenceEnabled) return [];
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows =
    (await sb<FeedbackRow[]>(
      `/feedback_events?user_id=${eq(userId)}&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=500`,
    )) ?? [];

  const map = new Map<string, QualitySkillAggregate>();
  for (const row of rows) {
    const key = `${row.skill_id ?? ""}|${row.discipline ?? ""}`;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        skill_id: row.skill_id,
        discipline: row.discipline,
        up: 0,
        down: 0,
        total: 0,
        score: 0,
      };
      map.set(key, agg);
    }
    if (row.rating === 1) agg.up += 1;
    else agg.down += 1;
    agg.total += 1;
    agg.score = agg.total > 0 ? Math.round((agg.up / agg.total) * 100) : 0;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
