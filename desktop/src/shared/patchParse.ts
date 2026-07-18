/**
 * Unified diff hunk parse + selective apply (senior-grade patch algebra).
 */
export interface DiffHunk {
  id: string;
  /** Raw @@ header line */
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  /** Body lines including leading ' ', '+', '-' (no file headers). */
  lines: string[];
}

const HUNK_RE = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/;

export function parseHunks(patch: string): DiffHunk[] {
  const lines = patch.replace(/\r\n/g, "\n").split("\n");
  const hunks: DiffHunk[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i]!.match(HUNK_RE);
    if (!m) {
      i += 1;
      continue;
    }
    const header = lines[i]!;
    const oldStart = Number(m[1]);
    const oldCount = m[2] != null ? Number(m[2]) : 1;
    const newStart = Number(m[3]);
    const newCount = m[4] != null ? Number(m[4]) : 1;
    i += 1;
    const body: string[] = [];
    while (i < lines.length && !lines[i]!.match(HUNK_RE) && !lines[i]!.startsWith("diff --git")) {
      const L = lines[i]!;
      if (L.startsWith("---") || L.startsWith("+++") || L.startsWith("index ")) {
        i += 1;
        continue;
      }
      if (L.startsWith("\\")) {
        i += 1;
        continue;
      }
      if (L.startsWith(" ") || L.startsWith("+") || L.startsWith("-") || L === "") {
        body.push(L === "" ? " " : L);
        i += 1;
        continue;
      }
      break;
    }
    hunks.push({
      id: `h${hunks.length}-${oldStart}-${newStart}`,
      header,
      oldStart,
      oldCount,
      newStart,
      newCount,
      lines: body,
    });
  }
  return hunks;
}

/** Apply selected hunks onto original file content. Unselected hunks keep the old side. */
export function applySelectedHunks(
  original: string,
  hunks: DiffHunk[],
  selectedIds: Set<string> | string[],
): string {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  if (hunks.length === 0) return original;
  const src = original.replace(/\r\n/g, "\n").split("\n");
  // Drop trailing empty line artifact from split if original didn't end with newline-only empty
  if (original.endsWith("\n") && src[src.length - 1] === "") src.pop();

  const out: string[] = [];
  let cursor = 1; // 1-based line in original

  for (const hunk of hunks) {
    // copy unchanged region before hunk
    while (cursor < hunk.oldStart) {
      out.push(src[cursor - 1] ?? "");
      cursor += 1;
    }

    if (selected.has(hunk.id)) {
      for (const L of hunk.lines) {
        if (L.startsWith("+")) out.push(L.slice(1));
        else if (L.startsWith(" ")) out.push(L.slice(1));
        // '-' lines skipped
      }
      cursor = hunk.oldStart + hunk.oldCount;
    } else {
      // keep old lines
      for (let n = 0; n < hunk.oldCount; n++) {
        out.push(src[cursor - 1] ?? "");
        cursor += 1;
      }
    }
  }

  while (cursor <= src.length) {
    out.push(src[cursor - 1] ?? "");
    cursor += 1;
  }

  const joined = out.join("\n");
  return original.endsWith("\n") ? `${joined}\n` : joined;
}

/** Parse removed/added for display (legacy). */
export function parseUnifiedPatch(patch: string): { removed: string[]; added: string[] } {
  const removed: string[] = [];
  const added: string[] = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("-") && !line.startsWith("---")) removed.push(line.slice(1));
    else if (line.startsWith("+") && !line.startsWith("+++")) added.push(line.slice(1));
  }
  return { removed, added };
}
