import { eq, persistenceEnabled, sb } from "../client.js";
import {
  computeGaps,
  confidenceFromProfile,
  marketingProfileSchema,
  type ExperimentRun,
  type ManualKpi,
  type MarketingProfile,
} from "../../schemas/marketingProfile.js";

/**
 * In-memory cache keyed by `${userId}:${projectId}` so the Marketing Brain
 * still works without Supabase (DEV_NO_AUTH / hobby installs). When persistence
 * is on, the cache is also used as a read-through layer.
 */
const cache = new Map<string, MarketingProfile>();
const key = (userId: string, projectId: string) => `${userId}:${projectId}`;

function emptyProfile(): MarketingProfile {
  return marketingProfileSchema.parse({});
}

function withMeta(profile: MarketingProfile): MarketingProfile {
  const gaps = computeGaps(profile);
  const confidence_score = confidenceFromProfile(profile);
  return { ...profile, gaps, confidence_score, last_updated: new Date().toISOString() };
}

interface Row {
  user_id: string;
  project_id: string;
  profile_json: unknown;
  updated_at: string;
}

/** Get the profile for (user, project), or a fresh empty one. Never throws. */
export async function get(userId: string, projectId: string): Promise<MarketingProfile> {
  const k = key(userId, projectId);
  if (cache.has(k)) return cache.get(k)!;
  if (!persistenceEnabled) {
    const fresh = withMeta(emptyProfile());
    cache.set(k, fresh);
    return fresh;
  }
  try {
    const rows = await sb<Row[]>(
      `/marketing_profiles?user_id=${eq(userId)}&project_id=${eq(projectId)}&limit=1`,
    );
    const json = rows?.[0]?.profile_json;
    const parsed = marketingProfileSchema.safeParse(json);
    const profile = parsed.success ? parsed.data : emptyProfile();
    const decorated = withMeta(profile);
    cache.set(k, decorated);
    return decorated;
  } catch {
    const fresh = withMeta(emptyProfile());
    cache.set(k, fresh);
    return fresh;
  }
}

/** Upsert. Returns the saved (decorated) profile. */
export async function upsert(
  userId: string,
  projectId: string,
  patch: Partial<MarketingProfile>,
): Promise<MarketingProfile> {
  const current = await get(userId, projectId);
  const merged = withMeta({ ...current, ...patch });
  cache.set(key(userId, projectId), merged);
  if (!persistenceEnabled) return merged;
  try {
    await sb(`/marketing_profiles`, {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify([
        { user_id: userId, project_id: projectId, profile_json: merged, updated_at: merged.last_updated },
      ]),
    });
  } catch {
    // Non-fatal: keep the cached copy for this session.
  }
  return merged;
}

/** Append an experiment + bucket it into success/failure if outcome known. */
export async function recordExperiment(
  userId: string,
  projectId: string,
  exp: ExperimentRun,
): Promise<MarketingProfile> {
  const current = await get(userId, projectId);
  const previous_experiments = [...current.previous_experiments.filter((e) => e.id !== exp.id), exp].slice(-50);
  const successful = exp.outcome === "success"
    ? Array.from(new Set([...current.successful_experiments, exp.id])).slice(-20)
    : current.successful_experiments;
  const failed = exp.outcome === "failure"
    ? Array.from(new Set([...current.failed_experiments, exp.id])).slice(-20)
    : current.failed_experiments;
  return upsert(userId, projectId, {
    previous_experiments,
    successful_experiments: successful,
    failed_experiments: failed,
  });
}

/** Mark a previously-pending experiment's outcome. */
export async function markExperimentOutcome(
  userId: string,
  projectId: string,
  experimentId: string,
  outcome: ExperimentRun["outcome"],
  metric?: ExperimentRun["metric"],
  learning?: string,
  evidence_urls?: string[],
): Promise<MarketingProfile> {
  const current = await get(userId, projectId);
  const target = current.previous_experiments.find((e) => e.id === experimentId);
  if (!target) return current;
  return recordExperiment(userId, projectId, {
    ...target,
    outcome,
    metric,
    learning,
    evidence_urls: evidence_urls ?? target.evidence_urls,
  });
}

/** Upsert a user-logged manual KPI (waitlist signups, PH upvotes, etc.). */
export async function upsertManualKpi(
  userId: string,
  projectId: string,
  kpi: ManualKpi,
): Promise<MarketingProfile> {
  const current = await get(userId, projectId);
  const manual_kpis = [
    ...current.manual_kpis.filter((k) => k.id !== kpi.id),
    { ...kpi, updated_at: new Date().toISOString(), source: "manual" as const },
  ];
  return upsert(userId, projectId, { manual_kpis });
}

/** Remove a manual KPI by id. */
export async function deleteManualKpi(
  userId: string,
  projectId: string,
  kpiId: string,
): Promise<MarketingProfile> {
  const current = await get(userId, projectId);
  return upsert(userId, projectId, {
    manual_kpis: current.manual_kpis.filter((k) => k.id !== kpiId),
  });
}
