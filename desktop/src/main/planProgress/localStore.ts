import Store from "electron-store";
import type { PlanProgressSnapshot } from "../../shared/planProgress";

const store = new Store<{ planProgress: Record<string, PlanProgressSnapshot> }>({
  name: "plan-progress",
  defaults: { planProgress: {} },
});

function storageKey(projectId: string, planId: string): string {
  return `${projectId}:${planId}`;
}

export function loadLocalPlanProgress(
  projectId: string,
  planId: string,
): PlanProgressSnapshot | null {
  const all = store.get("planProgress");
  return all[storageKey(projectId, planId)] ?? null;
}

export function saveLocalPlanProgress(
  projectId: string,
  snapshot: PlanProgressSnapshot,
): void {
  const all = store.get("planProgress");
  store.set("planProgress", {
    ...all,
    [storageKey(projectId, snapshot.planId)]: snapshot,
  });
}

export function clearLocalPlanProgress(projectId: string, planId: string): void {
  const all = { ...store.get("planProgress") };
  delete all[storageKey(projectId, planId)];
  store.set("planProgress", all);
}
