import type { MarketingPlan, Settings } from "@shared/types";
import {
  apiListAssets,
  apiListMessages,
  apiListPlans,
  apiListProjects,
  apiListSessions,
  apiGetMe,
} from "./api";

/** Pull projects, usage, and cache locally for offline read. */
export async function syncAll(settings: Settings, authEnabled: boolean): Promise<void> {
  const [{ projects }, me] = await Promise.all([
    apiListProjects(settings, authEnabled),
    apiGetMe(settings, authEnabled),
  ]);
  await window.api.cache.set("projects", projects);
  await window.api.cache.set("me", me);
}

/** Restore a session thread + latest plan for a project. */
export async function restoreSession(
  settings: Settings,
  authEnabled: boolean,
  sessionId: string,
  projectId: string,
): Promise<{ plan: MarketingPlan | null; messageCount: number }> {
  const [{ messages }, { latest }] = await Promise.all([
    apiListMessages(settings, authEnabled, sessionId),
    apiListPlans(settings, authEnabled, projectId),
  ]);
  void messages;
  return {
    plan: latest?.plan_json ?? null,
    messageCount: messages.length,
  };
}

export async function syncProjectSessions(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
): Promise<void> {
  const { sessions } = await apiListSessions(settings, authEnabled, projectId);
  await window.api.cache.set(`sessions:${projectId}`, sessions);
}

export async function syncProjectAssets(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
): Promise<void> {
  const { assets } = await apiListAssets(settings, authEnabled, projectId);
  await window.api.cache.set(`assets:${projectId}`, assets);
}
