/** Typed log lines streamed during Plan Studio generation theater. */
export type PlanStatusKind = "connect" | "outline" | "playbook" | "readiness" | "status";

export interface PlanStatusLine {
  id: string;
  kind: PlanStatusKind;
  message: string;
  playbookId?: string;
  at: number;
}

export function appendPlanStatusLine(
  lines: PlanStatusLine[],
  line: Omit<PlanStatusLine, "id" | "at">,
  makeId: () => string,
): PlanStatusLine[] {
  const last = lines[lines.length - 1];
  if (last?.message === line.message && last.kind === line.kind) return lines;
  return [...lines, { ...line, id: makeId(), at: Date.now() }].slice(-12);
}

/** Match server status "Structuring {title}…" to a playbook stub id. */
export function stubIdFromStructuringMessage(
  message: string,
  stubs: { id: string; title: string }[],
): string | undefined {
  const match = message.match(/^Structuring (.+)…$/);
  if (!match) return undefined;
  const title = match[1].trim();
  return stubs.find((s) => s.title === title)?.id;
}
