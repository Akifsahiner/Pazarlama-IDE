import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWeek1Ready,
  resolveLaunchReadinessSteps,
} from "./launchReadiness";
import type { FounderFitProfile } from "./types";

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

describe("launchReadiness", () => {
  it("hides revenue step unless paying_customers win", () => {
    const signup = resolveLaunchReadinessSteps({
      founderFit: fit(),
      measurementReady: false,
    });
    assert.equal(signup.steps.some((s) => s.id === "revenue"), false);

    const paying = resolveLaunchReadinessSteps({
      founderFit: fit({ thirty_day_win: "paying_customers" }),
      measurementReady: false,
    });
    assert.equal(paying.steps.some((s) => s.id === "revenue"), true);
  });

  it("counts activation as optional and complete when saved", () => {
    const state = resolveLaunchReadinessSteps({
      founderFit: fit(),
      productActivation: { activation_event_label: "First project created" } as never,
      measurementReady: true,
    });
    const activation = state.steps.find((s) => s.id === "activation")!;
    assert.equal(activation.optional, true);
    assert.equal(activation.complete, true);
    assert.equal(state.completed, state.total);
  });

  it("measurement optional does not block week1 after seal path", () => {
    const state = resolveLaunchReadinessSteps({
      founderFit: fit(),
      measurementReady: false,
    });
    assert.equal(state.canStartWeek1, true);
    assert.equal(
      isWeek1Ready({
        founderFit: fit(),
        measurementReady: false,
      }),
      true,
    );
  });

  it("revenue still blocks when paying_customers win", () => {
    const blocked = resolveLaunchReadinessSteps({
      founderFit: fit({ thirty_day_win: "paying_customers" }),
      measurementReady: true,
    });
    assert.equal(blocked.canStartWeek1, false);
    assert.equal(isWeek1Ready({ founderFit: fit({ thirty_day_win: "paying_customers" }) }), false);

    const ready = resolveLaunchReadinessSteps({
      founderFit: fit({ thirty_day_win: "paying_customers" }),
      revenueProfile: { pricing_thesis: "PLG self-serve" } as never,
      measurementReady: true,
    });
    assert.equal(ready.canStartWeek1, true);
  });

  it("measurement baseline optional — week1 ready without ack", () => {
    assert.equal(
      isWeek1Ready({
        founderFit: fit({ thirty_day_win: "qualified_signups" }),
        measurementReady: false,
      }),
      true,
    );
    assert.equal(
      isWeek1Ready({
        founderFit: fit({ thirty_day_win: "qualified_signups" }),
        measurementReady: false,
        measurementAcknowledged: true,
      }),
      true,
    );
  });

  it("measurement acknowledged counts as complete", () => {
    const state = resolveLaunchReadinessSteps({
      founderFit: fit(),
      measurementReady: false,
      measurementAcknowledged: true,
    });
    const measurement = state.steps.find((s) => s.id === "measurement")!;
    assert.equal(measurement.complete, true);
  });

  it("quick start bypasses measurement after first ship", () => {
    assert.equal(
      isWeek1Ready({
        onboardingTrack: "quick_start",
        firstShipAt: Date.now(),
        founderFit: fit(),
        measurementReady: false,
      }),
      true,
    );
    assert.equal(
      isWeek1Ready({
        onboardingTrack: "full_cmo",
        firstShipAt: Date.now(),
        founderFit: fit(),
        measurementReady: false,
      }),
      true,
    );
    const quick = resolveLaunchReadinessSteps({
      onboardingTrack: "quick_start",
      firstShipAt: Date.now(),
      founderFit: fit(),
      measurementReady: false,
    });
    assert.equal(quick.canStartWeek1, true);
    const measurement = quick.steps.find((s) => s.id === "measurement")!;
    assert.equal(measurement.complete, true);
    assert.equal(measurement.label, "Measurement (deferred)");
  });
});
