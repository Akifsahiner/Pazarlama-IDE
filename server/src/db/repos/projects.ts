import { eq, persistenceEnabled, sb } from "../client.js";

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  source_kind: "folder" | "repo" | "url";
  source_ref: string;
  framework: string | null;
  product_type: string | null;
  profile_json: unknown;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  name: string;
  source_kind: "folder" | "repo" | "url";
  source_ref: string;
  framework?: string;
  product_type?: string;
  profile_json?: unknown;
}

export type UpdateProjectPatch = Partial<
  Pick<ProjectRow, "name" | "source_kind" | "source_ref" | "framework" | "product_type" | "profile_json">
>;

export async function list(userId: string): Promise<ProjectRow[]> {
  if (!persistenceEnabled) return [];
  return (await sb<ProjectRow[]>(`/projects?user_id=${eq(userId)}&order=updated_at.desc`)) ?? [];
}

export async function get(id: string, userId: string): Promise<ProjectRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<ProjectRow[]>(`/projects?id=${eq(id)}&user_id=${eq(userId)}&limit=1`);
  return rows?.[0] ?? null;
}

export async function create(userId: string, input: CreateProjectInput): Promise<ProjectRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<ProjectRow[]>("/projects", {
    method: "POST",
    body: JSON.stringify([
      {
        user_id: userId,
        name: input.name,
        source_kind: input.source_kind,
        source_ref: input.source_ref,
        framework: input.framework ?? null,
        product_type: input.product_type ?? null,
        profile_json: input.profile_json ?? {},
      },
    ]),
  });
  return rows?.[0] ?? null;
}

export async function update(
  id: string,
  userId: string,
  patch: UpdateProjectPatch,
): Promise<ProjectRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<ProjectRow[]>(`/projects?id=${eq(id)}&user_id=${eq(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return rows?.[0] ?? null;
}

export async function remove(id: string, userId: string): Promise<void> {
  if (!persistenceEnabled) return;
  await sb(`/projects?id=${eq(id)}&user_id=${eq(userId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}
