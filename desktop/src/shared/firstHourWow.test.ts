import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inferIntegrateRoute } from "./assetTarget";
import { buildCmoIntake, cluelyLikeReadme } from "./cmoIntake";
import {
  buildYourGameBeat,
  isFirstHourEligible,
  orderRevealRoutes,
  resolveAppRootLabel,
  resolveFirstHourAutoHandoff,
  resolveFirstShipTarget,
  resolveThesisFirstAction,
  resolveWeek0FirstAction,
  THESIS_FIRST_ACTION_MODE_EXPECTED,
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

function acmeProject(overrides?: Partial<ProjectProfile>): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS for teams.",
    ...overrides,
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

describe("resolveThesisFirstAction", () => {
  const theses = Object.keys(THESIS_FIRST_ACTION_MODE_EXPECTED) as Array<
    keyof typeof THESIS_FIRST_ACTION_MODE_EXPECTED
  >;

  for (const thesisId of theses) {
    it(`${thesisId} returns expected mode family`, () => {
      const action = resolveThesisFirstAction(thesisId, acmeProject());
      assert.equal(action.thesisId, thesisId);
      assert.ok(action.primaryLabel.length >= 8);
      assert.ok(action.runGoal.length >= 20);
      assert.ok(action.skills.length >= 2);
      assert.ok(action.estimatedMinutes >= 10);
      assert.match(action.antiPatternRed, /.+/);
      if (thesisId === "viral_short_form") {
        assert.equal(action.mode, "content_draft");
        assert.match(action.runGoal, /hook/i);
        assert.match(action.runGoal, /marketing\/hooks/);
      }
      if (thesisId === "landing_conversion") {
        assert.ok(["scout_then_edit", "repo_edit"].includes(action.mode));
      }
    });
  }

  it("Cluely-like product → hooks not hero-only label", () => {
    const action = resolveThesisFirstAction(
      "viral_short_form",
      acmeProject({ name: "Cluely", readmeSummary: cluelyLikeReadme() }),
    );
    assert.equal(action.mode, "content_draft");
    assert.doesNotMatch(action.primaryLabel, /hero & meta/i);
  });
});

describe("resolveWeek0FirstAction", () => {
  it("uses thesis when channel thesis present", () => {
    const thesis = buildCmoIntake({
      project: acmeProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
      context: { force_thesis_id: "outbound_sales" },
    });
    const action = resolveWeek0FirstAction(acmeProject(), thesis);
    assert.equal(action.thesisId, "outbound_sales");
    assert.equal(action.mode, "content_draft");
    assert.match(action.runGoal, /outreach/i);
  });
});

describe("buildYourGameBeat", () => {
  it("includes anti-pattern and week0 label", () => {
    const thesis = buildCmoIntake({
      project: acmeProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
      context: { force_thesis_id: "viral_short_form" },
    });
    const beat = buildYourGameBeat(thesis, acmeProject());
    assert.match(beat.thesisLabel, /short-form/i);
    assert.match(beat.antiPatternRed, /Not/i);
    assert.ok(beat.estimatedMinutes >= 10);
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

  it("viral thesis scout handoff uses content_draft goal", () => {
    const thesis = buildCmoIntake({
      project: acmeProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
      context: { force_thesis_id: "viral_short_form" },
    });
    const receipt: TurnReceipt = {
      turnId: "t4",
      runId: "r4",
      completedAt: Date.now(),
      summaryLine: "Hook ideas",
      deliverables: {},
    };
    const intent = resolveFirstHourAutoHandoff({
      project: acmeProject(),
      receipt,
      answerText: "Start with POV hooks in marketing/hooks/",
      thesis,
    });
    assert.equal(intent?.kind, "start_edit_run");
    if (intent?.kind === "start_edit_run") {
      assert.match(intent.goal, /hook/i);
    }
  });
});
