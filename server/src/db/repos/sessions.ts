import { eq, persistenceEnabled, sb } from "../client.js";

export interface SessionRow {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export async function list(userId: string, projectId?: string): Promise<SessionRow[]> {
  if (!persistenceEnabled) return [];
  const projectFilter = projectId ? `&project_id=${eq(projectId)}` : "";
  return (
    (await sb<SessionRow[]>(`/sessions?user_id=${eq(userId)}${projectFilter}&order=updated_at.desc`)) ?? []
  );
}

export async function get(id: string, userId: string): Promise<SessionRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<SessionRow[]>(`/sessions?id=${eq(id)}&user_id=${eq(userId)}&limit=1`);
  return rows?.[0] ?? null;
}

export async function create(
  userId: string,
  projectId: string,
  title?: string,
): Promise<SessionRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<SessionRow[]>("/sessions", {
    method: "POST",
    body: JSON.stringify([
      { user_id: userId, project_id: projectId, title: title ?? "New session" },
    ]),
  });
  return rows?.[0] ?? null;
}

export async function update(id: string, userId: string, title: string): Promise<SessionRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<SessionRow[]>(`/sessions?id=${eq(id)}&user_id=${eq(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title, updated_at: new Date().toISOString() }),
  });
  return rows?.[0] ?? null;
}

export async function remove(id: string, userId: string): Promise<void> {
  if (!persistenceEnabled) return;
  await sb(`/sessions?id=${eq(id)}&user_id=${eq(userId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}
