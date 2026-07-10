import { eq, persistenceEnabled, sb } from "../client.js";

export interface AssetRow {
  id: string;
  session_id: string | null;
  project_id: string;
  user_id: string;
  type: string | null;
  target_file: string | null;
  before_text: string | null;
  after_text: string;
  applied_at: string | null;
  applied_commit: string | null;
  created_at: string;
}

export interface InsertAssetInput {
  projectId: string;
  sessionId?: string | null;
  type?: string;
  targetFile?: string;
  beforeText?: string;
  afterText: string;
}

export async function list(userId: string, projectId?: string): Promise<AssetRow[]> {
  if (!persistenceEnabled) return [];
  const projectFilter = projectId ? `&project_id=${eq(projectId)}` : "";
  return (
    (await sb<AssetRow[]>(`/assets?user_id=${eq(userId)}${projectFilter}&order=created_at.desc`)) ?? []
  );
}

export async function insert(userId: string, input: InsertAssetInput): Promise<AssetRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<AssetRow[]>("/assets", {
    method: "POST",
    body: JSON.stringify([
      {
        user_id: userId,
        project_id: input.projectId,
        session_id: input.sessionId ?? null,
        type: input.type ?? null,
        target_file: input.targetFile ?? null,
        before_text: input.beforeText ?? null,
        after_text: input.afterText,
      },
    ]),
  });
  return rows?.[0] ?? null;
}

export async function markApplied(
  id: string,
  userId: string,
  commit: string,
): Promise<AssetRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<AssetRow[]>(`/assets?id=${eq(id)}&user_id=${eq(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ applied_at: new Date().toISOString(), applied_commit: commit }),
  });
  return rows?.[0] ?? null;
}
