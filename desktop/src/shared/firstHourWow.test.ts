import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inferIntegrateRoute } from "./assetTarget";
import {
  isFirstHourEligible,
  orderRevealRoutes,
  resolveAppRootLabel,
  resolveFirstHourAutoHandoff,
  resolveFirstShipTarget,
} from "./firstHourWow";
import type { TurnReceipt } from "./turnReceipt";
import type { ProjectProfile } from "./types";

function ghostProfile(routes: string[]): ProjectProfile {
  return {
    id: "ghost",
    source: { kind: "folder", path: "/ghost" },
    name: "ghost",
    framework: "Next.js",
    monorepoRoot: "apps/console",
    appPackages: ["apps/console", "packages/ui"],
    routes,
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 120,
  };
}

describe("inferIntegrateRoute monorepo", () => {
  it("prefers apps/console/app/page.tsx over blog routes", () => {
    const routes = [
      "apps/console/app/blog/page.tsx",
      "apps/console/app/page.tsx",
      "packages/ui/src/index.ts",
    ];
    assert.equal(inferIntegrateRoute(routes), "apps/console/app/page.tsx");
  });

  it("prefers apps/console/page.tsx when no app dir", () => {
    assert.equal(
      inferIntegrateRoute(["apps/console/page.tsx", "apps/console/blog/page.tsx"]),
      "apps/console/page.tsx",
    );
  });
});

describe("resolveFirstShipTarget", () => {
  it("builds stack line and @mention edit goal for Ghost monorepo", () => {
    const target = resolveFirstShipTarget(
      ghostProfile(["apps/console/app/page.tsx", "apps/console/app/layout.tsx"]),
    );
    assert.equal(target.appRootLabel, "apps/console");
    assert.match(target.stackLine, /Next\.js/);
    assert.match(target.stackLine, /apps\/console ✓/);
    assert.equal(target.heroPath, "apps/console/app/page.tsx");
    assert.match(target.editGoal, /@apps\/console\/app\/page\.tsx/);
    assert.match(target.scoutPrompt, /@apps\/console\/app\/page\.tsx/);
    assert.match(target.scoutPrompt, /path:line/);
  });
});

describe("orderRevealRoutes", () => {
  it("puts hero route first", () => {
    const { hero, rest } = orderRevealRoutes(
      ghostProfile(["apps/console/app/blog/page.tsx", "apps/console/app/page.tsx"]),
    );
    assert.equal(hero, "apps/console/app/page.tsx");
    assert.deepEqual(rest, ["apps/console/app/blog/page.tsx"]);
  });
});

describe("resolveAppRootLabel", () => {
  it("uses monorepoRoot when set", () => {
    assert.equal(resolveAppRootLabel(ghostProfile([])), "apps/console");
  });
});

describe("isFirstHourEligible", () => {
  it("is eligible until first ship", () => {
    assert.equal(isFirstHourEligible(undefined), true);
    assert.equal(isFirstHourEligible(Date.now()), false);
  });
});

describe("resolveFirstHourAutoHandoff", () => {
  const profile = ghostProfile(["apps/console/app/page.tsx"]);

  it("uses executable edit_run action when present", () => {
    const receipt: TurnReceipt = {
      turnId: "t1",
      runId: "r1",
      completedAt: Date.now(),
      summaryLine: "Hero CTA recommendation",
      deliverables: {},
      primaryAction: {
        kind: "edit_run",
        goal: "Tighten hero CTA copy on apps/console/app/page.tsx",
        targetFiles: ["apps/console/app/page.tsx"],
      },
    };
    const intent = resolveFirstHourAutoHandoff({ project: profile, receipt });
    assert.equal(intent?.kind, "start_edit_run");
    if (intent?.kind === "start_edit_run") {
      assert.match(intent.goal, /hero CTA/i);
    }
  });

  it("falls back to scan hero edit when answer cites path:line", () => {
    const receipt: TurnReceipt = {
      turnId: "t2",
      runId: "r2",
      completedAt: Date.now(),
      summaryLine: "Change primary CTA label",
      deliverables: { citations: ["apps/console/app/page.tsx"] },
    };
    const intent = resolveFirstHourAutoHandoff({
      project: profile,
      receipt,
      answerText: "The CTA at apps/console/app/page.tsx:12 is too vague.",
    });
    assert.equal(intent?.kind, "start_edit_run");
    if (intent?.kind === "start_edit_run") {
      assert.match(intent.goal, /@apps\/console\/app\/page\.tsx/);
    }
  });

  it("returns null without grounding or hero path", () => {
    const bare: ProjectProfile = { ...profile, routes: [] };
    const receipt: TurnReceipt = {
      turnId: "t3",
      runId: "r3",
      completedAt: Date.now(),
      summaryLine: "Generic advice",
      deliverables: {},
    };
    assert.equal(resolveFirstHourAutoHandoff({ project: bare, receipt }), null);
  });
});
