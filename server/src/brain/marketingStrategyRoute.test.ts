import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { marketingProfileSchema } from "../schemas/marketingProfile.js";
import {
  isBroadMarketingStrategy,
  normalizeBroadStrategy,
  buildAnswerCta,
} from "./marketingStrategyRoute.js";
import type { RoutedIntent } from "./router.js";

const minimalProfile = marketingProfileSchema.parse({
  product_name: "DevFlow",
  company_stage: "prelaunch",
  email_list_size: 200,
});

describe("isBroadMarketingStrategy", () => {
  it("detects English broad GTM questions", () => {
    assert.equal(isBroadMarketingStrategy("How do I market my SaaS?"), true);
    assert.equal(isBroadMarketingStrategy("How can I get my first 100 users?"), true);
    assert.equal(isBroadMarketingStrategy("What's the best way to launch my dev tool?"), true);
  });

  it("detects Turkish broad GTM questions", () => {
    assert.equal(isBroadMarketingStrategy("Projemi nasıl pazarlayabilirim?"), true);
    assert.equal(isBroadMarketingStrategy("pazarlama stratejisi ne olmalı"), true);
  });

  it("allows narrow copy requests", () => {
    assert.equal(isBroadMarketingStrategy("Write a tweet for our launch"), false);
    assert.equal(isBroadMarketingStrategy("Draft cold email to CTOs"), false);
  });
});

describe("normalizeBroadStrategy", () => {
  const answerIntent: RoutedIntent = {
    discipline: "meta_question",
    task_kind: "answer",
    urgency: "fast",
    user_goal_summary: "market my app",
  };

  it("forces launch_plan decide deep for broad strategy", () => {
    const out = normalizeBroadStrategy("How do I market my product?", answerIntent);
    assert.equal(out.discipline, "launch_plan");
    assert.equal(out.task_kind, "decide");
    assert.equal(out.urgency, "deep");
  });

  it("preserves draft for broad message with draft intent", () => {
    const draft: RoutedIntent = { ...answerIntent, task_kind: "draft", discipline: "social" };
    const out = normalizeBroadStrategy("How do I market on Twitter?", draft);
    assert.equal(out.task_kind, "draft");
  });
});

describe("buildAnswerCta", () => {
  const intent: RoutedIntent = {
    discipline: "growth",
    task_kind: "answer",
    urgency: "fast",
    user_goal_summary: "grow users",
  };

  it("suggests generate_plan when no plan exists", () => {
    const cta = buildAnswerCta({
      intent,
      profile: minimalProfile,
    });
    assert.ok(cta);
    assert.equal(cta!.action.kind, "generate_plan");
    assert.match(cta!.body, /Honest ceiling/i);
  });

  it("suggests continue_plan when next task exists", () => {
    const cta = buildAnswerCta({
      intent,
      profile: minimalProfile,
      planProgress: {
        done: 2,
        total: 10,
        nextTaskId: "task-3",
        nextTaskTitle: "Day 3 · Ship comparison page",
        nextPlaybookId: "seo-foundation",
      },
    });
    assert.ok(cta);
    assert.equal(cta!.action.kind, "continue_plan");
    assert.equal(cta!.action.taskId, "task-3");
  });
});
