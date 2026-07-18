/**
 * Apply selected unified-diff hunks onto a file in the project root.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { applySelectedHunks, parseHunks, type DiffHunk } from "../../shared/patchParse";
import type { RunWorkspace } from "./worktree";

function hunkOldMatches(src: string[], hunk: DiffHunk): boolean {
  let cursor = hunk.oldStart;
  for (const L of hunk.lines) {
    if (L.startsWith("+")) continue;
    const expected = L.startsWith("-") || L.startsWith(" ") ? L.slice(1) : L;
    if ((src[cursor - 1] ?? "") !== expected) return false;
    if (L.startsWith("-") || L.startsWith(" ")) cursor += 1;
  }
  return true;
}

export async function applyWorkspaceHunks(
  ws: RunWorkspace,
  file: string,
  patch: string,
  hunkIds: string[],
): Promise<{ ok: boolean; reason?: string; applied: string[] }> {
  if (!file || !hunkIds.length) {
    return { ok: false, reason: "No hunks selected", applied: [] };
  }
  const to = path.resolve(ws.projectRoot, file);
  if (!to.startsWith(path.resolve(ws.projectRoot))) {
    return { ok: false, reason: "Path outside project", applied: [] };
  }

  let original = "";
  try {
    original = await fs.readFile(to, "utf8");
  } catch {
    original = "";
  }

  const hunks = parseHunks(patch);
  if (!hunks.length) {
    return { ok: false, reason: "Could not parse hunks from patch", applied: [] };
  }

  const selected = hunks.filter((h) => hunkIds.includes(h.id));
  if (!selected.length) {
    return { ok: false, reason: "Selected hunk ids not found in patch", applied: [] };
  }

  const lines = original.replace(/\r\n/g, "\n").split("\n");
  if (original.endsWith("\n") && lines[lines.length - 1] === "") lines.pop();
  for (const h of selected) {
    if (!hunkOldMatches(lines, h)) {
      return {
        ok: false,
        reason: `Hunk ${h.id} no longer matches the file — apply the whole file instead.`,
        applied: [],
      };
    }
  }

  const next = applySelectedHunks(original, hunks, hunkIds);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.writeFile(to, next, "utf8");
  return { ok: true, applied: [file] };
}
