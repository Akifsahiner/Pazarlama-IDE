/**
 * Idle background jobs: incremental/full index, facts refresh.
 */
import { notificationCenter } from "./notificationCenter";
import { indexProjectFull, indexProjectIncremental, upsertFacts } from "../context/projectIndex";
import type { BgJob } from "../../shared/orchestration";

let busy = false;
let queued: BgJob | null = null;
let activeRuns = 0;

export function setBackgroundActiveRuns(n: number): void {
  activeRuns = n;
}

export function enqueueBackgroundJob(job: BgJob): void {
  if (busy || activeRuns > 0) {
    queued = job;
    return;
  }
  void runJob(job);
}

async function runJob(job: BgJob): Promise<void> {
  busy = true;
  try {
    if (job.type === "index.full") {
      const result = await indexProjectFull(job.projectId, job.cwd);
      notificationCenter.push({
        severity: "info",
        title: "Project indexed",
        body: `Indexed ${result.files} files · ${result.chunks} chunks`,
        dedupeKey: `index:${job.projectId}`,
      });
    } else if (job.type === "index.incremental") {
      const result = await indexProjectIncremental(job.projectId, job.cwd, job.paths);
      if (result.updated + result.removed >= 3) {
        notificationCenter.push({
          severity: "info",
          title: "Context index updated",
          body: `${result.updated} file${result.updated === 1 ? "" : "s"} refreshed · ${result.removed} removed`,
          dedupeKey: `index-inc:${job.projectId}`,
        });
      }
    } else if (job.type === "facts.refresh") {
      /* caller supplies facts via scan hook */
    }
  } catch (err) {
    notificationCenter.push({
      severity: "warning",
      title: "Index failed",
      body: err instanceof Error ? err.message : String(err),
      dedupeKey: `index-fail:${"projectId" in job ? job.projectId : "x"}`,
    });
  } finally {
    busy = false;
    if (queued && activeRuns === 0) {
      const next = queued;
      queued = null;
      void runJob(next);
    }
  }
}

/** Extract marketing facts from a scan-like profile blob. */
export async function refreshFactsFromScan(
  projectId: string,
  cwd: string,
  scan: {
    name?: string;
    framework?: string;
    hasGa4?: boolean;
    routes?: string[];
    brandHints?: string[];
  },
): Promise<void> {
  const facts: Array<{ key: string; value: string; confidence?: number }> = [];
  if (scan.name) facts.push({ key: "brand.name", value: scan.name, confidence: 0.9 });
  if (scan.framework) facts.push({ key: "stack.framework", value: scan.framework });
  if (scan.hasGa4 != null) {
    facts.push({
      key: "tracking.ga4",
      value: scan.hasGa4 ? "detected" : "missing",
      confidence: 0.85,
    });
  }
  if (scan.routes?.length) {
    facts.push({ key: "site.routes", value: scan.routes.slice(0, 20).join(", ") });
  }
  for (const [i, h] of (scan.brandHints ?? []).slice(0, 5).entries()) {
    facts.push({ key: `brand.hint.${i}`, value: h, confidence: 0.6 });
  }
  const n = await upsertFacts(projectId, cwd, facts);
  if (scan.hasGa4 === false) {
    notificationCenter.push({
      severity: "action",
      title: "Tracking gap",
      body: "GA4 snippet not detected in the project scan.",
      dedupeKey: `fact:ga4-missing:${projectId}`,
    });
  }
  notificationCenter.push({
    severity: "info",
    title: "Facts updated",
    body: `${n} marketing facts from scan`,
    dedupeKey: `facts:${projectId}`,
  });
  enqueueBackgroundJob({ type: "index.incremental", projectId, cwd });
}
