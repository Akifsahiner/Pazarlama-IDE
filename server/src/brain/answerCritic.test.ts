import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  structuralAnswerLint,
  shouldReviseAnswer,
  shouldWarnAnswerQuality,
  ANSWER_QUALITY_REVISE_THRESHOLD,
  answerCritiqueSchema,
} from "./answerCritic.js";

const GOOD = `### Honest ceiling
DevFlow won't hit PH #1 with 200 subscribers — plan for 50–120 launch-week signups from owned channels.

### Do this next
Ship a Show HN title + first-comment draft for DevFlow; acceptance: title ≤60 chars, demo URL loads on mobile, first comment is story-first (no pitch).

### Why (brief)
Solo dev founders discover tools on HN first. DevFlow's open docs need a story-first comment to earn comments, not upvotes.`;

const GENERIC = `Just post on social and improve SEO. Growth is easy if you stay consistent for 30 days.`;

describe("structuralAnswerLint", () => {
  it("passes well-formed challenge answer", () => {
    const lint = structuralAnswerLint(GOOD, "DevFlow");
    assert.equal(lint.hardFail.length, 0);
  });

  it("fails missing headings", () => {
    const lint = structuralAnswerLint("You should market on Twitter and LinkedIn.", "DevFlow");
    assert.ok(lint.hardFail.length >= 2);
  });

  it("fails generic and hype language", () => {
    const lint = structuralAnswerLint(GENERIC, "DevFlow");
    assert.ok(lint.hardFail.length >= 1);
  });
});

describe("shouldReviseAnswer", () => {
  it("revises on structural hard fail without critique", () => {
    assert.equal(shouldReviseAnswer(null, { hardFail: ["missing"], softWarn: [] }), true);
  });

  it("revises low score or high generality", () => {
    const low = answerCritiqueSchema.parse({
      specificity: 4,
      actionability: 4,
      realism: 4,
      generality_penalty: 8,
      total: 18,
      revisions: ["One next action only"],
      approve: false,
    });
    assert.equal(shouldReviseAnswer(low), true);
    assert.equal(ANSWER_QUALITY_REVISE_THRESHOLD, 24);
  });

  it("does not revise approved answers", () => {
    const ok = answerCritiqueSchema.parse({
      specificity: 8,
      actionability: 8,
      realism: 7,
      generality_penalty: 2,
      total: 30,
      revisions: [],
      approve: true,
    });
    assert.equal(shouldReviseAnswer(ok), false);
    assert.equal(shouldWarnAnswerQuality(ok), false);
  });
});
