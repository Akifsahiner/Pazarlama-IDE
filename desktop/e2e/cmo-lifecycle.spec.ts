import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { E2E_FIXTURE_APP } from "./fixturePath";
import { ensureE2eFixtureReady } from "./bootstrap";
import { bootstrapCmoIntakeAndStartWeek1 } from "./helpers/cmoIntake";
import {
  assertCycleArchived,
  assertReplanReadyInCyclePanel,
  assertThesisChangedAfterPivot,
  assertWeekCycleActive,
  completeOpsCadenceViaUi,
  completeWeekReviewViaUi,
  openCycleBackstage,
  openOpsBackstage,
  readChannelThesisId,
  startNextCycleDoubleDownViaUi,
  startNextCyclePivotViaUi,
} from "./helpers/cmoOpsUi";

const mainEntry = path.join(process.cwd(), "out", "main", "index.js");

function launchApp(extraEnv: Record<string, string> = {}) {
  return electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      ...extraEnv,
    },
  });
}

test.describe("CMO lifecycle @cmo", () => {
  test.setTimeout(240_000);

  test("UI intake → ops proof modals → week review → cycle archive", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);

      await bootstrapCmoIntakeAndStartWeek1(page);
      await completeOpsCadenceViaUi(page);
      await completeWeekReviewViaUi(
        page,
        "Week 1 E2E UI: Lane A shipped, user tasks proofed in modals, ready to replan.",
      );
      await assertCycleArchived(page);

      await openCycleBackstage(page);
      await expect(page.getByTestId("cmo-cycle-double-down")).toBeVisible({ timeout: 15_000 });
    } finally {
      await app.close();
    }
  });

  test("Week 1 review → double down → Week 2 ops cadence live", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);

      await bootstrapCmoIntakeAndStartWeek1(page);
      const week1ThesisId = await readChannelThesisId(page);

      await completeOpsCadenceViaUi(page);
      await completeWeekReviewViaUi(
        page,
        "Week 1 E2E double-down path: archive outcomes and scale same channel.",
      );
      await assertCycleArchived(page);
      await assertReplanReadyInCyclePanel(page);

      await startNextCycleDoubleDownViaUi(page);
      await assertWeekCycleActive(page, 2);

      const week2ThesisId = await readChannelThesisId(page);
      expect(week2ThesisId).toBe(week1ThesisId);

      await openOpsBackstage(page);
      await expect(page.getByTestId("cmo-ops-board")).toContainText(/Week 2/i);
      await expect(
        page.getByTestId("ops-task-start-ide").or(page.getByTestId("ops-task-mark-done")).first(),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await app.close();
    }
  });

  test("Week 1 flat KPI → pivot → Week 2 new thesis", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);

      await bootstrapCmoIntakeAndStartWeek1(page);
      const week1ThesisId = await readChannelThesisId(page);

      // Low KPI proofs trigger flat verdict → pivot suggestion with alternate thesis ids.
      await completeOpsCadenceViaUi(page, { kpiValue: "1" });
      await completeWeekReviewViaUi(
        page,
        "Week 1 E2E pivot path: flat signal — switch channel thesis for Week 2.",
      );
      await assertCycleArchived(page);

      await openCycleBackstage(page);
      await expect(page.getByTestId("cmo-cycle-pivot-start")).toBeVisible({ timeout: 15_000 });

      await startNextCyclePivotViaUi(page);
      await assertWeekCycleActive(page, 2);
      await assertThesisChangedAfterPivot(page, week1ThesisId);

      await openOpsBackstage(page);
      await expect(page.getByTestId("cmo-pivot-card")).toHaveCount(0);
    } finally {
      await app.close();
    }
  });
});
