export interface CodeCitation {
  path: string;
  startLine: number;
  endLine?: number;
  raw: string;
}

const CITATION_RE =
  /`?([a-zA-Z0-9_][\w./-]*\.(?:tsx?|jsx?|mdx?|json|css|html|vue|svelte|ya?ml|toml)):(\d+)(?:-(\d+))?`?/g;

/** Extract repo path:line citations from agent text (Brain prompt contract). */
export function extractCodeCitations(text: string): CodeCitation[] {
  const seen = new Set<string>();
  const out: CodeCitation[] = [];
  let m: RegExpExecArray | null;
  CITATION_RE.lastIndex = 0;
  while ((m = CITATION_RE.exec(text)) !== null) {
    const path = m[1]!.replace(/\\/g, "/");
    const startLine = Number(m[2]);
    const endLine = m[3] ? Number(m[3]) : undefined;
    const key = `${path}:${startLine}:${endLine ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ path, startLine, endLine, raw: m[0]! });
  }
  return out.slice(0, 12);
}

/** Turn bare path:line mentions into repo-file:// deep links for AgentMarkdown. */
export function linkifyCodeCitations(content: string): string {
  return content.replace(CITATION_RE, (_full, filePath: string, start: string, end?: string) => {
    const path = String(filePath).replace(/\\/g, "/");
    const q = end
      ? `?line=${start}&end=${end}`
      : `?line=${start}`;
    const label = end ? `${path}:${start}-${end}` : `${path}:${start}`;
    return `[${label}](repo-file://${encodeURI(path)}${q})`;
  });
}

export function parseRepoFileLink(href: string): { path: string; line?: number; endLine?: number } | null {
  if (!href.startsWith("repo-file://")) return null;
  const rest = href.replace("repo-file://", "");
  const [pathPart, queryPart] = rest.split("?");
  const path = decodeURI(pathPart ?? "").replace(/\\/g, "/");
  if (!path) return null;
  const params = new URLSearchParams(queryPart ?? "");
  const line = params.get("line");
  const end = params.get("end");
  return {
    path,
    line: line ? Number(line) : undefined,
    endLine: end ? Number(end) : undefined,
  };
}
