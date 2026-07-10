import type { FileTreeNode } from "./types";

export function flattenFilePaths(nodes: FileTreeNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    if (n.kind === "file") acc.push(n.path.replace(/\\/g, "/"));
    if (n.children) flattenFilePaths(n.children, acc);
  }
  return acc;
}

/** Subsequence fuzzy match with higher weight for filename and path segment starts. */
function scorePath(query: string, relPath: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const path = relPath.replace(/\\/g, "/").toLowerCase();
  const base = path.split("/").pop() ?? path;

  let score = 0;
  if (base === q) score += 120;
  if (base.startsWith(q)) score += 80;
  if (path.includes(q)) score += 40;

  let qi = 0;
  for (let i = 0; i < path.length && qi < q.length; i++) {
    if (path[i] === q[qi]) {
      score += path[i - 1] === "/" ? 6 : 2;
      qi++;
    }
  }
  if (qi < q.length) return 0;

  if (/\.(tsx?|jsx?|md|json|css|html)$/.test(path)) score += 4;
  if (path.includes("node_modules") || path.includes(".git/")) return 0;
  return score;
}

export function rankFilePaths(query: string, paths: string[], limit = 12): string[] {
  const q = query.trim();
  if (!q) return [];
  return paths
    .map((p) => ({ p: p.replace(/\\/g, "/"), score: scorePath(q, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.localeCompare(b.p))
    .slice(0, limit)
    .map((x) => x.p);
}
