import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import { buildGrowthControlPlane } from "./cmoGrowthPlane";
import {
  buildInfluencerOperator,
  completeInfluencerTouch,
  createInfluencerOperatorFromThesis,
  evaluatePitchPerformance,
  generateCreatorUtm,
  getNextInfluencerTouch,
  importCreatorsFromDelegateProof,
  isInfluencerOperatorGate,
  parseCreatorImportLines,
  rollupInfluencerKpis,
  syncLaneBFromInfluencerOperator,
  updateInfluencerTouchCreator,
  validateInfluencerProof,
} from "./cmoInfluencerOperator";
import type { ProjectProfile } from "./types";

function baseProject(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "Consumer lifestyle app for creators",
    ...overrides,
  };
}

function influencerThesis() {
  return buildCmoIntake({
    project: baseProject(),
    persona: "marketing",
    context: { force_thesis_id: "influencer_partnerships" },
  });
}

describe("cmoInfluencerOperator", () => {
  it("influencer_partnerships Week 1 → 7 weekly targets, 15 touches, 3 pitches A/B/C", () => {
    const thesis = influencerThesis();
    const ws = createInfluencerOperatorFromThesis(thesis)!;
    assert.equal(ws.mode, "micro_influencer_dm");
    assert.equal(ws.pitches.length, 3);
    assert.equal(ws.weekly_targets.length, 7);
    assert.equal(ws.weekly_targets[0]!.min_dms, 2);
    assert.equal(ws.touches.length, 15);
    assert.ok(ws.pitches.some((p) => p.id === "pitch.a"));
  });

  it("pitch scaffolds are deterministic non-empty strings", () => {
    const ws = createInfluencerOperatorFromThesis(influencerThesis())!;
    for (const p of ws.pitches) {
      assert.ok(p.script_scaffold.length > 20);
      assert.ok(p.script_scaffold.includes("{handle}"));
    }
  });

  it("generateCreatorUtm produces stable slug from handle", () => {
    const utm = generateCreatorUtm("@Creator Name", "https://app.test");
    assert.equal(utm.utm_campaign, "creator_creator_name");
    assert.ok(utm.promo_code.endsWith("10"));
    assert.ok(utm.utm_link.includes("utm_campaign=creator_creator_name"));
  });

  it("reply scale rule → 2 warm replies on Pitch A → scale", () => {
    let ws = createInfluencerOperatorFromThesis(influencerThesis())!;
    const pitchA = ws.touches.filter((t) => t.pitch_id === "pitch.a");
    for (let i = 0; i < 2; i++) {
      const id = pitchA[i]!.id;
      ws = updateInfluencerTouchCreator(ws, id, {
        target_handle: `@creator${i}`,
        platform: "tiktok",
      });
      let r = completeInfluencerTouch(ws, id, "pitched", {
        note: `DM sent to @creator${i} on TikTok today`,
      });
      ws = r.workspace;
      r = completeInfluencerTouch(ws, id, "replied", {
        reply_received: true,
        reply_interest: "warm",
        reply_note: "Interested in learning more about the product",
      });
      ws = r.workspace;
    }
    const verdict = evaluatePitchPerformance(ws);
    assert.equal(verdict.kind, "scale");
    assert.equal(verdict.pitch_id, "pitch.a");
  });

  it("kill rule → 5 pitched zero replies → kill", () => {
    let ws = createInfluencerOperatorFromThesis(influencerThesis())!;
    const pitchB = ws.touches.filter((t) => t.pitch_id === "pitch.b");
    for (let i = 0; i < 5; i++) {
      const id = pitchB[i]!.id;
      ws = updateInfluencerTouchCreator(ws, id, {
        target_handle: `@dead${i}`,
        platform: "instagram",
      });
      const r = completeInfluencerTouch(ws, id, "pitched", {
        note: `DM sent to @dead${i} no response yet`,
      });
      ws = r.workspace;
    }
    const verdict = evaluatePitchPerformance(ws);
    assert.equal(verdict.kind, "kill");
    assert.equal(verdict.pitch_id, "pitch.b");
  });

  it("double down → scale + KPI ≥50% target", () => {
    let ws = createInfluencerOperatorFromThesis(influencerThesis())!;
    const pitchA = ws.touches.filter((t) => t.pitch_id === "pitch.a");
    for (let i = 0; i < 2; i++) {
      const id = pitchA[i]!.id;
      ws = updateInfluencerTouchCreator(ws, id, { target_handle: `@win${i}` });
      let r = completeInfluencerTouch(ws, id, "pitched", { note: "DM sent to creator ok" });
      ws = r.workspace;
      r = completeInfluencerTouch(ws, id, "replied", {
        reply_received: true,
        reply_interest: "hot",
        reply_note: "Let's schedule a call this week",
      });
      ws = r.workspace;
    }
    const verdict = evaluatePitchPerformance(ws, { pctOfTarget: 60, primaryValue: 2, primaryTarget: 3 });
    assert.equal(verdict.kind, "double_down");
  });

  it("proof validation → pitched without handle → error", () => {
    const ws = createInfluencerOperatorFromThesis(influencerThesis())!;
    const touch = ws.touches[0]!;
    const v = validateInfluencerProof(touch, { note: "DM sent ok enough" }, "pitched");
    assert.equal(v.ok, false);
    assert.ok(v.errors[0]!.includes("handle"));
  });

  it("proof validation → replied without interest → error", () => {
    const ws = createInfluencerOperatorFromThesis(influencerThesis())!;
    const touch = {
      ...ws.touches[0]!,
      target_handle: "@creator",
      pipeline_stage: "pitched" as const,
    };
    const v = validateInfluencerProof(touch, { reply_received: true }, "replied");
    assert.equal(v.ok, false);
  });

  it("deal validation → brief_sent without disclosure → error", () => {
    const touch = {
      ...createInfluencerOperatorFromThesis(influencerThesis())!.touches[0]!,
      target_handle: "@creator",
    };
    const v = validateInfluencerProof(
      touch,
      {},
      "brief_sent",
      { structure: "affiliate_only", promo_code: "CREATOR10", utm_campaign: "creator_creator" },
    );
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => e.includes("disclosure")));
  });

  it("rollupInfluencerKpis → replies → influencer_replies", () => {
    let ws = createInfluencerOperatorFromThesis(influencerThesis())!;
    const id = ws.touches[0]!.id;
    ws = updateInfluencerTouchCreator(ws, id, { target_handle: "@c1" });
    let r = completeInfluencerTouch(ws, id, "pitched", { note: "DM sent to @c1 today ok" });
    ws = r.workspace;
    r = completeInfluencerTouch(ws, id, "replied", {
      reply_received: true,
      reply_interest: "warm",
      reply_note: "They want to see the brief first",
    });
    ws = r.workspace;
    const kpis = rollupInfluencerKpis(ws);
    assert.ok(kpis.some((k) => k.id === "influencer_replies" && k.value === 1));
  });

  it("getNextInfluencerTouch → research with handle on earliest day", () => {
    let ws = createInfluencerOperatorFromThesis(influencerThesis())!;
    const t = ws.touches.find((x) => x.day_index === 1)!;
    ws = updateInfluencerTouchCreator(ws, t.id, { target_handle: "@first" });
    const next = getNextInfluencerTouch(ws);
    assert.equal(next?.id, t.id);
  });

  it("syncLaneBFromInfluencerOperator → lane B items match touch count", () => {
    const thesis = influencerThesis();
    const ws = createInfluencerOperatorFromThesis(thesis)!;
    const laneB = createLaneBWorkspaceFromThesis(thesis);
    const synced = syncLaneBFromInfluencerOperator(ws, laneB);
    const touches = synced.laneB.items.filter((i) => i.title.startsWith("DM") || i.title.startsWith("Touch"));
    assert.equal(touches.length, ws.touches.length);
  });

  it("gate off → conversion binding → not active", () => {
    const thesis = influencerThesis();
    const cadence = createOpsCadenceFromThesis(thesis);
    const plane = buildGrowthControlPlane({
      project: baseProject(),
      persona: "marketing",
      profile: null,
      thesis,
      opsCadence: cadence,
    });
    const conversionPlane = {
      ...plane,
      binding: { ...plane.binding, gtm: "conversion" as const },
    };
    assert.equal(
      isInfluencerOperatorGate({ thesis, opsCadence: cadence, growthPlane: conversionPlane }),
      false,
    );
  });

  it("importCreatorsFromDelegateProof → parses VA note into research touches", () => {
    const ws = createInfluencerOperatorFromThesis(influencerThesis())!;
    const note = `@alpha | tiktok | 4 | niche fitness creators
@beta | instagram | 5 | micro beauty`;
    const result = importCreatorsFromDelegateProof(ws, { id: "brief.va" } as never, note);
    assert.equal(result.imported, 2);
    assert.ok(result.workspace.touches.some((t) => t.target_handle === "@alpha"));
    assert.ok(result.workspace.touches.some((t) => t.target_handle === "@beta"));
  });

  it("parseCreatorImportLines handles pipe format", () => {
    const rows = parseCreatorImportLines("@x | linkedin | 3 | note here");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.handle, "@x");
    assert.equal(rows[0]!.platform, "linkedin");
    assert.equal(rows[0]!.icp_fit, 3);
  });

  it("buildInfluencerOperator smoke alias works", () => {
    const ws = buildInfluencerOperator(influencerThesis());
    assert.ok(ws);
  });
});
