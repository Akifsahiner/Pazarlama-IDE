/**
 * Part 19 — Dogfood session taxonomy and GitHub issue builder.
 * See desktop/scripts/golden-path-dogfood-facilitator-sheet.md
 */

export type DogfoodBlockerCode =
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6"
  | "B7"
  | "B8"
  | "B9";

export type DogfoodExitScore = 1 | 2 | 3 | 4 | 5;

export interface DogfoodBlockerDefinition {
  code: DogfoodBlockerCode;
  title: string;
  description: string;
  example: string;
}

export const DOGFOOD_BLOCKERS: DogfoodBlockerDefinition[] = [
  {
    code: "B1",
    title: "Intake/seal confusion",
    description: "Could not find or complete strategic seal",
    example: "Could not find seal CTA",
  },
  {
    code: "B2",
    title: "Ops dispatch",
    description: "System ops task did not start from CTA",
    example: "Start in IDE did nothing",
  },
  {
    code: "B3",
    title: "Validation gate UX",
    description: "User did not discover Run validation before apply",
    example: "Did not discover Run validation",
  },
  {
    code: "B4",
    title: "Apply failure",
    description: "Apply error after validation passed",
    example: "Apply error after validation",
  },
  {
    code: "B5",
    title: "Verify/CU",
    description: "False complete or stuck on browser verify",
    example: "False complete or stuck verifying",
  },
  {
    code: "B6",
    title: "Human kit/proof",
    description: "Human task kit or proof modal blocked progress",
    example: "Kit or modal blocked",
  },
  {
    code: "B7",
    title: "Reload data loss",
    description: "Kernel, ops cadence, or human proof missing after reload",
    example: "Kernel/ops/proof missing",
  },
  {
    code: "B8",
    title: "Week 2 ceremony",
    description: "Forced week-review essay or modal blocked silent archive",
    example: "Forced review modal/essay",
  },
  {
    code: "B9",
    title: "Wrong surface",
    description: "Plan Studio or other surface pulled user away from ops",
    example: "Plan studio pulled away from ops",
  },
];

export const DOGFOOD_TRUST_GATES = [
  "apply_blocked_without_validation",
  "override_required_explicit_click",
  "no_false_complete_before_verify",
  "cu_offline_clear_handoff",
  "reload_ops_cadence_intact",
  "reload_execution_kernel_intact",
  "reload_human_proof_intact",
  "week2_without_mandatory_essay",
  "plan_studio_not_primary_during_ops",
] as const;

export type DogfoodTrustGate = (typeof DOGFOOD_TRUST_GATES)[number];

export interface DogfoodSessionReport {
  sessionId: string;
  founderIdAnon: string;
  date: string;
  channelThesisId?: string;
  repoType?: string;
  cuOnline?: boolean;
  screenRecordUrl?: string;
  exitScore: DogfoodExitScore;
  fstMinutes?: number;
  primaryBlocker?: DogfoodBlockerCode;
  trustGates: Partial<Record<DogfoodTrustGate, boolean>>;
  notes?: string;
  facilitator?: string;
}

export function dogfoodBlockerByCode(code: DogfoodBlockerCode): DogfoodBlockerDefinition {
  const found = DOGFOOD_BLOCKERS.find((b) => b.code === code);
  if (!found) throw new Error(`Unknown dogfood blocker: ${code}`);
  return found;
}

export function buildDogfoodIssueTitle(session: DogfoodSessionReport): string {
  if (session.primaryBlocker) {
    const blocker = dogfoodBlockerByCode(session.primaryBlocker);
    const oneLine = blocker.example.slice(0, 80);
    return `[dogfood] ${session.primaryBlocker} — ${oneLine}`;
  }
  return `[dogfood] Session ${session.sessionId} — exit score ${session.exitScore}`;
}

export function buildDogfoodIssueBody(session: DogfoodSessionReport): string {
  const blockerSection = session.primaryBlocker
    ? `**Primary blocker:** ${session.primaryBlocker} — ${dogfoodBlockerByCode(session.primaryBlocker).title}`
    : "**Primary blocker:** none (session passed)";

  const trustLines = DOGFOOD_TRUST_GATES.map((gate) => {
    const val = session.trustGates[gate];
    const mark = val === true ? "✅" : val === false ? "❌" : "—";
    return `- ${mark} \`${gate}\``;
  }).join("\n");

  return [
    "## Dogfood session report",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Session | ${session.sessionId} |`,
    `| Founder (anon) | ${session.founderIdAnon} |`,
    `| Date | ${session.date} |`,
    session.channelThesisId ? `| Channel thesis | ${session.channelThesisId} |` : "",
    session.repoType ? `| Repo type | ${session.repoType} |` : "",
    session.cuOnline != null ? `| CU online | ${session.cuOnline ? "Y" : "N"} |` : "",
    session.fstMinutes != null ? `| FST (min) | ${session.fstMinutes} |` : "",
    `| Exit score | ${session.exitScore}/5 |`,
    session.facilitator ? `| Facilitator | ${session.facilitator} |` : "",
    "",
    blockerSection,
    "",
    "## Trust gates",
    trustLines,
    "",
    session.screenRecordUrl ? `**Screen record:** ${session.screenRecordUrl}` : "",
    session.notes ? `## Notes\n${session.notes}` : "",
    "",
    "---",
    "_Generated from Marketing IDE dogfood session taxonomy (Part 19)._",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Horizon 1 exit rollup — PASS when ≥3/5 score ≥4 and zero reload/false-complete failures. */
export function evaluateDogfoodCohortExit(
  sessions: Pick<DogfoodSessionReport, "exitScore" | "primaryBlocker" | "trustGates">[],
): {
  pass: boolean;
  foundersScoringGte4: number;
  reloadDataLossCount: number;
  falseCompleteCount: number;
  medianExitScore: number;
} {
  const scores = sessions.map((s) => s.exitScore);
  const foundersScoringGte4 = scores.filter((s) => s >= 4).length;
  const reloadDataLossCount = sessions.filter(
    (s) =>
      s.primaryBlocker === "B7" || s.trustGates.reload_execution_kernel_intact === false,
  ).length;
  const falseCompleteCount = sessions.filter(
    (s) =>
      s.primaryBlocker === "B5" || s.trustGates.no_false_complete_before_verify === false,
  ).length;
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianExitScore =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 0
        ? (sorted[mid - 1]! + sorted[mid]!) / 2
        : sorted[mid]!;

  const pass =
    sessions.length >= 3 &&
    foundersScoringGte4 >= 3 &&
    reloadDataLossCount === 0 &&
    falseCompleteCount === 0;

  return {
    pass,
    foundersScoringGte4,
    reloadDataLossCount,
    falseCompleteCount,
    medianExitScore,
  };
}
