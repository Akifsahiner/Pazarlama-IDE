/** Parse a unified diff into removed/added lines (stripping the leading marker). */
export function parseUnifiedPatch(patch: string): { removed: string[]; added: string[] } {
  const removed: string[] = [];
  const added: string[] = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("-") && !line.startsWith("---")) removed.push(line.slice(1));
    else if (line.startsWith("+") && !line.startsWith("+++")) added.push(line.slice(1));
  }
  return { removed, added };
}
