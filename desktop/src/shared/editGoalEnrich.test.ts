import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enrichEditGoal, mentionsFromEditContext } from "./editGoalEnrich.js";

describe("enrichEditGoal", () => {
  it("carries answer excerpt and asset body", () => {
    const goal = enrichEditGoal({
      userGoal: "Rewrite hero CTA",
      lastAnswerText:
        "### Honest ceiling\nok\n### Do this next\nUpdate hero headline to mention ROI.\n### Why\nbrief",
      lastAssets: [
        {
          id: "a1",
          type: "landing-copy",
          after: "Ship faster with Marketing IDE",
          targetFile: "marketing/hero.md",
        },
      ],
    });
    assert.match(goal, /Rewrite hero CTA/);
    assert.match(goal, /Do this next/);
    assert.match(goal, /Ship faster/);
  });

  it("collects mention paths from citations", () => {
    const mentions = mentionsFromEditContext({
      userGoal: "fix page",
      lastAnswerText: "Edit apps/console/page.tsx:12 hero",
    });
    assert.ok(mentions.some((m) => m.path === "apps/console/page.tsx"));
  });
});
