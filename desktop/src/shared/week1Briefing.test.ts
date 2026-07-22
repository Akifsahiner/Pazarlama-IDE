import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCmoIntake, buildFinalChannelThesis } from "./cmoIntake";
import { synthesizeGrowthNarrative } from "./cmoGrowthNarrative";
import {
  buildStrategicDecision,
  sealStrategicDecision,
} from "./cmoStrategicOptions";
import { buildContractView, formatThirtyDayTarget } from "./contractView";
import { resolveWeek1PreviewTasks } from "./week1Preview";
import type { FounderFitProfile } from "./types";

function project() {
  return {
    id: "p1",
    source: { kind: "folder" as const, path: "/project" },
    name: "Acme",
    framework: "Next.js",
    readmeSummary: "B2B SaaS for teams",
    routes: ["app/page.tsx", "app/signup/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
  };
}

function fit(overrides: Partial<FounderFitProfile> = {}): FounderFitProfile {
  return {
    brand_face_readiness: "sometimes",
    controversy_tolerance: "selective",
    monthly_budget_band: "under_500",
    scale_readiness: "probably",
    magic_moment: "creates a verified result in under two minutes",
    weekly_marketing_hours: "3_7",
    thirty_day_win: "qualified_signups",
    completed_at: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

/** View-model assembly used by Week1BriefingModal — no DOM required. */
function buildWeek1BriefingView(input: {
  project: ReturnType<typeof project>;
  founderFit: FounderFitProfile;
  sealed: ReturnType<typeof sealStrategicDecision>;
  narrative: ReturnType<typeof synthesizeGrowthNarrative>;
  selectedId: string;
}) {
  const contract = buildContractView({ strategic_decision: input.sealed });
  if (!contract) return null;
  const selected = input.sealed.options.find((o) => o.id === input.selectedId)!;
  const thesis = buildFinalChannelThesis({
    project: input.project,
    persona: "marketing",
    founder_fit: input.founderFit,
    selected_option: selected,
    narrative: input.narrative,
  });
  const { tasks } = resolveWeek1PreviewTasks(thesis, true);
  const kpi = formatThirtyDayTarget(contract.thirtyDayTarget);
  return {
    contract,
    tasks,
    kpi,
    showAttackVolume: contract.posture === "category_attack" && Boolean(contract.founderCommits[0]),
  };
}

describe("week1Briefing view model", () => {
  it("assembles contract, personalized tasks, and Day 7 KPI after seal", () => {
    const p = project();
    const founderFit = fit();
    const baseline = buildCmoIntake({ project: p, persona: "marketing", draft: true });
    const narrative = synthesizeGrowthNarrative({ project: p, founderFit });
    const { decision } = buildStrategicDecision({
      project: p,
      founderFit,
      narrative,
      baselineThesis: baseline,
    });
    const sealed = sealStrategicDecision(decision, decision.recommended_id, "2026-07-20T00:00:00.000Z");
    const view = buildWeek1BriefingView({
      project: p,
      founderFit,
      sealed,
      narrative,
      selectedId: decision.recommended_id,
    });
    assert.ok(view);
    assert.ok(view!.tasks.length >= 1 && view!.tasks.length <= 5);
    assert.ok(view!.kpi.headline.length > 0);
    assert.ok(view!.contract.cmoCommits.length >= 1);
    assert.ok(view!.contract.founderCommits.length >= 1);
  });

  it("shows attack volume banner for category_attack posture", () => {
    const p = project();
    const founderFit = fit();
    const baseline = buildCmoIntake({ project: p, persona: "marketing", draft: true });
    const narrative = synthesizeGrowthNarrative({ project: p, founderFit });
    const { decision } = buildStrategicDecision({
      project: p,
      founderFit,
      narrative,
      baselineThesis: baseline,
    });
    const attack = decision.options.find((o) => o.posture === "category_attack" && o.eligible);
    if (!attack) return;
    const sealed = sealStrategicDecision(decision, attack.id, "2026-07-20T00:00:00.000Z");
    const view = buildWeek1BriefingView({
      project: p,
      founderFit,
      sealed,
      narrative,
      selectedId: attack.id,
    });
    assert.ok(view?.showAttackVolume);
  });
});
