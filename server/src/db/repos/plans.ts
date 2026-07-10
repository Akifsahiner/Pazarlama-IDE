import { eq, persistenceEnabled, sb } from "../client.js";

export interface PlanRow {
  id: string;
  project_id: string;
  user_id: string;
  plan_json: unknown;
  status: string;
  created_at: string;
}

export async function list(userId: string, projectId?: string): Promise<PlanRow[]> {
  if (!persistenceEnabled) return [];
  const projectFilter = projectId ? `&project_id=${eq(projectId)}` : "";
  return (await sb<PlanRow[]>(`/plans?user_id=${eq(userId)}${projectFilter}&order=created_at.desc`)) ?? [];
}

export async function insert(
  userId: string,
  projectId: string,
  planJson: unknown,
): Promise<PlanRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<PlanRow[]>("/plans", {
    method: "POST",
    body: JSON.stringify([
      { user_id: userId, project_id: projectId, plan_json: planJson, status: "complete" },
    ]),
  });
  return rows?.[0] ?? null;
}
