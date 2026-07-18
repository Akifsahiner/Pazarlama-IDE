import type { Mention } from "./orchestration";

/** Extract @file/path mentions from composer text for ContextPack pinning. */
export function parseMentionsFromText(text: string): Mention[] {
  const seen = new Set<string>();
  const out: Mention[] = [];
  const re = /@([\w./\\-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1]?.trim();
    if (!raw || raw.length < 2) continue;
    const path = raw.replace(/\\/g, "/");
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({ type: "file", path });
  }
  return out.slice(0, 8);
}
