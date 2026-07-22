import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import { createDistributionOperatorFromThesis } from "./cmoDistributionOperator";
import { buildHookLeaderboard } from "./hookLeaderboard";

describe("hookLeaderboard", () => {
  it("buildHookLeaderboard ranks hooks with leading verdict", () => {
    const thesis = buildCmoIntake({
      project: {
        id: "p1",
        source: { kind: "folder", path: "/p" },
        name: "Co",
        framework: "Next",
        routes: [],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 10,
      },
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const ws = createDistributionOperatorFromThesis(thesis, { week_index: 1 });
    assert.ok(ws);
    const hookA = ws.hooks[0]!;
    const hookB = ws.hooks[1]!;
    const slotA = ws.slots.find((s) => s.hook_id === hookA.id && s.slot_kind === "post")!;
    const slotB = ws.slots.find((s) => s.hook_id === hookB.id && s.slot_kind === "post")!;

    const withProof: typeof ws = {
      ...ws,
      slots: ws.slots.map((s) => {
        if (s.id === slotA.id) {
          return {
            ...s,
            status: "measured" as const,
            proof: {
              completed_at: new Date().toISOString(),
              post_url: "https://tiktok.com/a",
              retention_3s_pct: 62,
              views_24h: 847,
            },
          };
        }
        if (s.id === slotB.id) {
          return {
            ...s,
            status: "measured" as const,
            proof: {
              completed_at: new Date().toISOString(),
              post_url: "https://tiktok.com/b",
              retention_3s_pct: 28,
              views_24h: 120,
            },
          };
        }
        return s;
      }),
    };

    const rows = buildHookLeaderboard(withProof);
    assert.ok(rows.length >= 2);
    const leading = rows.find((r) => r.verdict === "leading");
    assert.ok(leading);
    assert.equal(leading!.hook_label, hookA.label);
    assert.equal(leading!.retention_3s_pct, 62);
  });

  it("shouldKillHook at 3 posts below 20% retention", () => {
    const thesis = buildCmoIntake({
      project: {
        id: "p1",
        source: { kind: "folder", path: "/p" },
        name: "Co",
        framework: "Next",
        routes: [],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 10,
      },
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const ws = createDistributionOperatorFromThesis(thesis, { week_index: 1 });
    assert.ok(ws);
    const hook = ws.hooks[1]!;
    const posts = ws.slots.filter((s) => s.hook_id === hook.id && s.slot_kind === "post");
    let next = ws;
    for (let i = 0; i < 3; i++) {
      next = {
        ...next,
        slots: next.slots.map((s) =>
          s.id === posts[i]!.id
            ? {
                ...s,
                status: "measured" as const,
                proof: {
                  completed_at: new Date().toISOString(),
                  post_url: `https://tiktok.com/${i}`,
                  retention_3s_pct: 12,
                  views_24h: 50,
                },
              }
            : s,
        ),
      };
    }
    const rows = buildHookLeaderboard(next);
    const killed = rows.find((r) => r.hook_id === hook.id);
    assert.equal(killed?.verdict, "kill");
  });
});
