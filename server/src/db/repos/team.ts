import { eq, persistenceEnabled, sb } from "../client.js";

export type OrgRole = "owner" | "admin" | "editor" | "approver" | "viewer";
export type ProjectMemberRole = "owner" | "editor" | "approver" | "viewer";

export interface OrganizationRow {
  id: string;
  name: string;
  owner_id: string;
  tier: string;
  created_at: string;
}

export interface OrgMemberRow {
  org_id: string;
  user_id: string;
  role: OrgRole;
  joined_at: string;
}

export interface ProjectMemberRow {
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  added_at: string;
}

export interface ApprovalRequestRow {
  id: string;
  project_id: string;
  requested_by: string;
  reviewer_id: string | null;
  run_id: string | null;
  plan_task_id: string | null;
  goal: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ReportShareRow {
  id: string;
  project_id: string;
  user_id: string;
  token: string;
  title: string;
  report_md: string;
  expires_at: string;
  created_at: string;
}

export async function getOrCreateOrg(userId: string, name: string): Promise<OrganizationRow | null> {
  if (!persistenceEnabled) {
    return {
      id: "local-org",
      name,
      owner_id: userId,
      tier: "team",
      created_at: new Date().toISOString(),
    };
  }
  const existing = await sb<OrgMemberRow[]>(`/org_members?user_id=${eq(userId)}&limit=1`);
  if (existing?.[0]) {
    const orgs = await sb<OrganizationRow[]>(
      `/organizations?id=${eq(existing[0].org_id)}&limit=1`,
    );
    return orgs?.[0] ?? null;
  }
  const orgRows = await sb<OrganizationRow[]>("/organizations", {
    method: "POST",
    body: JSON.stringify([{ name, owner_id: userId, tier: "team" }]),
  });
  const org = orgRows?.[0];
  if (!org) return null;
  await sb("/org_members", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify([{ org_id: org.id, user_id: userId, role: "owner" }]),
  });
  return org;
}

export async function listOrgMembers(orgId: string): Promise<OrgMemberRow[]> {
  if (!persistenceEnabled) return [];
  return (await sb<OrgMemberRow[]>(`/org_members?org_id=${eq(orgId)}`)) ?? [];
}

export async function listProjectMembers(projectId: string): Promise<ProjectMemberRow[]> {
  if (!persistenceEnabled) return [];
  return (await sb<ProjectMemberRow[]>(`/project_members?project_id=${eq(projectId)}`)) ?? [];
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectMemberRole,
): Promise<ProjectMemberRow | null> {
  if (!persistenceEnabled) {
    return { project_id: projectId, user_id: userId, role, added_at: new Date().toISOString() };
  }
  const rows = await sb<ProjectMemberRow[]>("/project_members", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: JSON.stringify([{ project_id: projectId, user_id: userId, role }]),
  });
  return rows?.[0] ?? null;
}

export async function createApprovalRequest(input: {
  projectId: string;
  requestedBy: string;
  reviewerId?: string;
  runId?: string;
  planTaskId?: string;
  goal: string;
}): Promise<ApprovalRequestRow | null> {
  if (!persistenceEnabled) {
    return {
      id: crypto.randomUUID(),
      project_id: input.projectId,
      requested_by: input.requestedBy,
      reviewer_id: input.reviewerId ?? null,
      run_id: input.runId ?? null,
      plan_task_id: input.planTaskId ?? null,
      goal: input.goal,
      status: "pending",
      note: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
  }
  const rows = await sb<ApprovalRequestRow[]>("/approval_requests", {
    method: "POST",
    body: JSON.stringify([
      {
        project_id: input.projectId,
        requested_by: input.requestedBy,
        reviewer_id: input.reviewerId ?? null,
        run_id: input.runId ?? null,
        plan_task_id: input.planTaskId ?? null,
        goal: input.goal,
        status: "pending",
      },
    ]),
  });
  return rows?.[0] ?? null;
}

export async function listPendingApprovals(
  userId: string,
  projectId?: string,
): Promise<ApprovalRequestRow[]> {
  if (!persistenceEnabled) return [];
  let path = `/approval_requests?status=${eq("pending")}&order=created_at.desc`;
  if (projectId) path += `&project_id=${eq(projectId)}`;
  const rows = (await sb<ApprovalRequestRow[]>(path)) ?? [];
  return rows.filter((r) => r.requested_by === userId || r.reviewer_id === userId);
}

export async function resolveApproval(
  id: string,
  userId: string,
  status: "approved" | "rejected",
  note?: string,
): Promise<ApprovalRequestRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<ApprovalRequestRow[]>(
    `/approval_requests?id=${eq(id)}&limit=1`,
  );
  const row = rows?.[0];
  if (!row || (row.reviewer_id && row.reviewer_id !== userId)) return null;
  const updated = await sb<ApprovalRequestRow[]>(`/approval_requests?id=${eq(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      note: note ?? null,
      resolved_at: new Date().toISOString(),
    }),
  });
  return updated?.[0] ?? null;
}

export async function createReportShare(input: {
  projectId: string;
  userId: string;
  title: string;
  reportMd: string;
  ttlDays?: number;
}): Promise<ReportShareRow | null> {
  const ttl = input.ttlDays ?? 30;
  const expiresAt = new Date(Date.now() + ttl * 86_400_000).toISOString();
  if (!persistenceEnabled) {
    return {
      id: crypto.randomUUID(),
      project_id: input.projectId,
      user_id: input.userId,
      token: crypto.randomUUID().replace(/-/g, ""),
      title: input.title,
      report_md: input.reportMd,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };
  }
  const rows = await sb<ReportShareRow[]>("/report_shares", {
    method: "POST",
    body: JSON.stringify([
      {
        project_id: input.projectId,
        user_id: input.userId,
        title: input.title,
        report_md: input.reportMd,
        expires_at: expiresAt,
      },
    ]),
  });
  return rows?.[0] ?? null;
}

export async function getReportShareByToken(token: string): Promise<ReportShareRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<ReportShareRow[]>(`/report_shares?token=${eq(token)}&limit=1`);
  const row = rows?.[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}
