import { promises as fs } from "node:fs";
import path from "node:path";

export interface FileTreeNode {
  name: string;
  path: string;
  kind: "file" | "dir";
  children?: FileTreeNode[];
}

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  ".turbo",
  ".cache",
  "coverage",
]);

const SECRET_PATTERNS = [/^\.env/i, /\.pem$/i, /\.key$/i, /credentials/i, /secret/i];

function isSecret(name: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(name));
}

export async function buildFileTree(root: string, maxDepth = 12): Promise<FileTreeNode[]> {
  async function walk(dir: string, depth: number): Promise<FileTreeNode[]> {
    if (depth > maxDepth) return [];
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }

    const nodes: FileTreeNode[] = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (isSecret(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const children = await walk(full, depth + 1);
        nodes.push({ name: entry.name, path: rel, kind: "dir", children });
      } else if (entry.isFile()) {
        nodes.push({ name: entry.name, path: rel, kind: "file" });
      }
    }
    return nodes;
  }

  return walk(root, 0);
}

export async function readProjectFile(root: string, relPath: string): Promise<string> {
  const resolved = path.resolve(root, relPath);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error("Path is outside the project");
  }
  const base = path.basename(resolved);
  if (isSecret(base)) throw new Error("Cannot read secret files");
  return fs.readFile(resolved, "utf8");
}
