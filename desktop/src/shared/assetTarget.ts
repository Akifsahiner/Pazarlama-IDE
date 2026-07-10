import type { ProjectProfile } from "./types";

const CODE_EXTENSIONS = new Set([".tsx", ".jsx", ".vue", ".svelte"]);
const SAFE_EXTENSIONS = new Set([".md", ".txt", ".mdx"]);

/** Slug for marketing sidecar filenames. */
export function slugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "draft";
}

export function isCodePath(relPath: string): boolean {
  const lower = relPath.replace(/\\/g, "/").toLowerCase();
  for (const ext of CODE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

/** Paths safe for full-file write (never TSX/JSX without integrate run). */
export function isSafeDirectWrite(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized.startsWith("marketing/")) return true;
  if (normalized.startsWith("sales/outreach/")) return true;
  const lower = normalized.toLowerCase();
  for (const ext of SAFE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export function defaultSidecarPath(title: string, taken: string[] = []): string {
  const base = slugFromTitle(title);
  let candidate = `marketing/${base}.md`;
  let n = 2;
  const set = new Set(taken.map((p) => p.replace(/\\/g, "/")));
  while (set.has(candidate)) {
    candidate = `marketing/${base}-${n}.md`;
    n += 1;
  }
  return candidate;
}

const ROUTE_PRIORITY = [
  /(?:^|\/)app\/page\.(tsx|jsx|ts|js)$/i,
  /(?:^|\/)src\/app\/page\.(tsx|jsx|ts|js)$/i,
  /(?:^|\/)pages\/index\.(tsx|jsx|ts|js)$/i,
  /(?:^|\/)src\/pages\/index\.(tsx|jsx|ts|js)$/i,
  /(?:^|\/)app\/\(.*\)\/page\.(tsx|jsx)$/i,
];

const ROUTE_FALLBACK = /(page|index|landing|home|route)/i;

/** Best landing route for integrate-into-site run (code file). */
export function inferIntegrateRoute(routes: string[]): string | undefined {
  const normalized = routes.map((r) => r.replace(/\\/g, "/"));
  for (const pattern of ROUTE_PRIORITY) {
    const hit = normalized.find((r) => pattern.test(r));
    if (hit) return hit;
  }
  return normalized.find((r) => isCodePath(r) && ROUTE_FALLBACK.test(r));
}

export function hasLocalFolder(project: ProjectProfile | null | undefined): boolean {
  return project?.source.kind === "folder";
}

export function projectFolderPath(project: ProjectProfile | null | undefined): string | undefined {
  return project?.source.kind === "folder" ? project.source.path : undefined;
}

export function resolveSidecarTarget(
  title: string,
  explicit?: string,
  taken: string[] = [],
): string {
  if (explicit && isSafeDirectWrite(explicit)) return explicit.replace(/\\/g, "/");
  return defaultSidecarPath(title, taken);
}
