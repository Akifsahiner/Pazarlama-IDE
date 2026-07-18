/**
 * Per-project local index (JSON + FTS-lite). Schema mirrors the SQLite plan;
 * swap storage later without changing callers.
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { app } from "electron";

export interface IndexFileRow {
  path: string;
  hash: string;
  mtime: number;
  bytes: number;
  kind: string;
  language: string;
}

export interface IndexChunkRow {
  id: string;
  path: string;
  start_line: number;
  end_line: number;
  text: string;
}

export interface IndexFactRow {
  id: string;
  key: string;
  value: string;
  source_path?: string;
  confidence: number;
  updated_at: number;
}

export interface ProjectIndexData {
  files: IndexFileRow[];
  chunks: IndexChunkRow[];
  facts: IndexFactRow[];
  meta: Record<string, string>;
}

function indexRoot(): string {
  return path.join(app.getPath("userData"), "indexes");
}

function projectHash(projectId: string, cwd: string): string {
  return createHash("sha256").update(`${projectId}:${cwd}`).digest("hex").slice(0, 16);
}

function indexPath(projectId: string, cwd: string): string {
  return path.join(indexRoot(), `${projectHash(projectId, cwd)}.json`);
}

export async function loadProjectIndex(
  projectId: string,
  cwd: string,
): Promise<ProjectIndexData> {
  try {
    const raw = await fs.readFile(indexPath(projectId, cwd), "utf8");
    return JSON.parse(raw) as ProjectIndexData;
  } catch {
    return { files: [], chunks: [], facts: [], meta: {} };
  }
}

export async function saveProjectIndex(
  projectId: string,
  cwd: string,
  data: ProjectIndexData,
): Promise<void> {
  await fs.mkdir(indexRoot(), { recursive: true });
  data.meta.updatedAt = String(Date.now());
  await fs.writeFile(indexPath(projectId, cwd), JSON.stringify(data), "utf8");
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "out",
  "build",
  ".next",
  "coverage",
  ".marketing-ide",
]);

const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".md",
  ".mdx",
  ".json",
  ".css",
  ".html",
  ".vue",
  ".svelte",
  ".yml",
  ".yaml",
  ".toml",
  ".txt",
]);

function guessKind(rel: string): string {
  if (/page|route|app\//i.test(rel)) return "page";
  if (/component/i.test(rel)) return "component";
  if (/\.(json|ya?ml|toml|env)/i.test(rel)) return "config";
  if (/\.mdx?$/i.test(rel)) return "content";
  return "other";
}

function chunkText(text: string, pathRel: string): IndexChunkRow[] {
  const lines = text.split(/\r?\n/);
  const chunks: IndexChunkRow[] = [];
  const size = 40;
  for (let i = 0; i < lines.length; i += size) {
    const slice = lines.slice(i, i + size);
    const body = slice.join("\n").trim();
    if (!body) continue;
    chunks.push({
      id: `${pathRel}:${i + 1}`,
      path: pathRel,
      start_line: i + 1,
      end_line: Math.min(i + size, lines.length),
      text: body.slice(0, 4000),
    });
  }
  return chunks;
}

async function walkFiles(root: string, rel = ""): Promise<string[]> {
  const dir = path.join(root, rel);
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".env.example") continue;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...(await walkFiles(root, path.join(rel, e.name))));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (TEXT_EXT.has(ext)) out.push(path.join(rel, e.name).replace(/\\/g, "/"));
    }
  }
  return out;
}

function prioritizeIndexPaths(rels: string[]): string[] {
  const score = (rel: string) => {
    let s = 0;
    if (/package\.json$/i.test(rel)) s += 22;
    if (/readme/i.test(rel)) s += 14;
    if (/(page|route|layout)\.(t|j)sx?$/i.test(rel)) s += 16;
    if (/(landing|pricing|marketing|blog|hero)/i.test(rel)) s += 12;
    if (/^apps\//i.test(rel)) s += 10;
    if (/^src\//i.test(rel)) s += 8;
    if (/\.mdx?$/i.test(rel)) s += 6;
    return s;
  };
  return [...rels].sort((a, b) => score(b) - score(a));
}

export async function indexProjectFull(
  projectId: string,
  cwd: string,
): Promise<{ files: number; chunks: number }> {
  const rels = prioritizeIndexPaths(await walkFiles(cwd));
  const files: IndexFileRow[] = [];
  const chunks: IndexChunkRow[] = [];
  for (const rel of rels.slice(0, 600)) {
    const abs = path.join(cwd, rel);
    try {
      const st = await fs.stat(abs);
      if (st.size > 200_000) continue;
      const text = await fs.readFile(abs, "utf8");
      const hash = createHash("sha1").update(text).digest("hex");
      files.push({
        path: rel,
        hash,
        mtime: st.mtimeMs,
        bytes: st.size,
        kind: guessKind(rel),
        language: path.extname(rel).slice(1),
      });
      chunks.push(...chunkText(text, rel));
    } catch {
      /* skip */
    }
  }
  const prev = await loadProjectIndex(projectId, cwd);
  await saveProjectIndex(projectId, cwd, {
    files,
    chunks,
    facts: prev.facts,
    meta: { ...prev.meta, lastFullIndex: String(Date.now()) },
  });
  return { files: files.length, chunks: chunks.length };
}

/** Update only changed paths (or mtime-stale files when paths omitted). */
export async function indexProjectIncremental(
  projectId: string,
  cwd: string,
  changedPaths?: string[],
): Promise<{ updated: number; removed: number }> {
  const data = await loadProjectIndex(projectId, cwd);
  let paths = [...new Set((changedPaths ?? []).map((p) => p.replace(/\\/g, "/")))];

  if (!paths.length && data.files.length) {
    const stale: string[] = [];
    for (const f of data.files.slice(0, 250)) {
      try {
        const st = await fs.stat(path.join(cwd, f.path));
        if (st.mtimeMs > f.mtime + 1) stale.push(f.path);
      } catch {
        stale.push(f.path);
      }
    }
    paths = stale;
    if (!paths.length) return { updated: 0, removed: 0 };
  }

  const removed: string[] = [];
  const toUpdate = new Set<string>();

  for (const rel of paths) {
    const abs = path.join(cwd, rel);
    try {
      await fs.access(abs);
      toUpdate.add(rel);
    } catch {
      removed.push(rel);
    }
  }

  if (removed.length) {
    const removedSet = new Set(removed);
    data.files = data.files.filter((f) => !removedSet.has(f.path));
    data.chunks = data.chunks.filter((c) => !removedSet.has(c.path));
  }

  let updated = 0;
  for (const rel of toUpdate) {
    const ext = path.extname(rel).toLowerCase();
    if (!TEXT_EXT.has(ext)) continue;
    const abs = path.join(cwd, rel);
    try {
      const st = await fs.stat(abs);
      if (st.size > 200_000) {
        data.files = data.files.filter((f) => f.path !== rel);
        data.chunks = data.chunks.filter((c) => c.path !== rel);
        continue;
      }
      const text = await fs.readFile(abs, "utf8");
      const hash = createHash("sha1").update(text).digest("hex");
      const existing = data.files.find((f) => f.path === rel);
      if (existing?.hash === hash && Math.abs(existing.mtime - st.mtimeMs) < 2) continue;

      data.files = data.files.filter((f) => f.path !== rel);
      data.chunks = data.chunks.filter((c) => c.path !== rel);
      data.files.push({
        path: rel,
        hash,
        mtime: st.mtimeMs,
        bytes: st.size,
        kind: guessKind(rel),
        language: ext.slice(1),
      });
      data.chunks.push(...chunkText(text, rel));
      updated += 1;
    } catch {
      /* race: file removed */
    }
  }

  await saveProjectIndex(projectId, cwd, {
    ...data,
    meta: { ...data.meta, lastIncremental: String(Date.now()) },
  });
  return { updated, removed: removed.length };
}

export async function upsertFacts(
  projectId: string,
  cwd: string,
  facts: Array<{ key: string; value: string; source_path?: string; confidence?: number }>,
): Promise<number> {
  const data = await loadProjectIndex(projectId, cwd);
  const byKey = new Map(data.facts.map((f) => [f.key, f]));
  for (const f of facts) {
    byKey.set(f.key, {
      id: f.key,
      key: f.key,
      value: f.value,
      source_path: f.source_path,
      confidence: f.confidence ?? 0.8,
      updated_at: Date.now(),
    });
  }
  data.facts = [...byKey.values()];
  await saveProjectIndex(projectId, cwd, data);
  return data.facts.length;
}

/** Tokenize for hybrid lexical retrieve. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/)
    .filter((t) => t.length > 1);
}

/** Char 3-grams for fuzzy / typo-tolerant boost. */
function charGrams(text: string, n = 3): string[] {
  const s = text.toLowerCase().replace(/\s+/g, " ");
  if (s.length < n) return s ? [s] : [];
  const out: string[] = [];
  for (let i = 0; i <= s.length - n; i++) out.push(s.slice(i, i + n));
  return out;
}

/**
 * Hybrid score: TF-IDF-like term frequency vs corpus DF + path boost + char-gram overlap.
 * Not neural embeddings — but real ranking, not substring counting.
 */
function scoreChunkHybrid(
  query: string,
  text: string,
  pathRel: string,
  df: Map<string, number>,
  nDocs: number,
): number {
  const qTerms = tokenize(query);
  if (!qTerms.length) return 0;
  const docTerms = tokenize(`${pathRel}\n${text}`);
  if (!docTerms.length) return 0;

  const tf = new Map<string, number>();
  for (const t of docTerms) tf.set(t, (tf.get(t) ?? 0) + 1);

  let score = 0;
  for (const t of qTerms) {
    const f = tf.get(t) ?? 0;
    if (f === 0) continue;
    const docFreq = df.get(t) ?? 1;
    const idf = Math.log(1 + nDocs / docFreq);
    score += (1 + Math.log(f)) * idf;
  }

  // Path / filename boost
  const pathLower = pathRel.toLowerCase();
  for (const t of qTerms) {
    if (pathLower.includes(t)) score += 1.25 * Math.log(1 + nDocs);
  }

  // Char-gram Jaccard soft match (catches partial identifiers)
  const qg = new Set(charGrams(query));
  const dg = new Set(charGrams(text.slice(0, 2000)));
  if (qg.size && dg.size) {
    let inter = 0;
    for (const g of qg) if (dg.has(g)) inter += 1;
    score += (inter / qg.size) * 2;
  }

  return score;
}

function buildDf(chunks: IndexChunkRow[]): { df: Map<string, number>; nDocs: number } {
  const df = new Map<string, number>();
  for (const c of chunks) {
    const seen = new Set(tokenize(`${c.path}\n${c.text}`));
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  return { df, nDocs: Math.max(1, chunks.length) };
}

export async function searchProjectIndex(
  projectId: string,
  cwd: string,
  query: string,
  limit = 8,
): Promise<Array<{ path: string; start: number; end: number; text: string; score: number }>> {
  const data = await loadProjectIndex(projectId, cwd);
  if (!data.chunks.length) return [];
  const { df, nDocs } = buildDf(data.chunks);
  const scored = data.chunks
    .map((c) => ({
      path: c.path,
      start: c.start_line,
      end: c.end_line,
      text: c.text,
      score: scoreChunkHybrid(query, c.text, c.path, df, nDocs),
    }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export async function listFacts(
  projectId: string,
  cwd: string,
): Promise<IndexFactRow[]> {
  const data = await loadProjectIndex(projectId, cwd);
  return data.facts;
}
