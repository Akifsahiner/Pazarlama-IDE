import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { E2E_FIXTURE_APP } from "./fixturePath";
import { ensureE2eFixtureReady } from "./bootstrap";
import { bootstrapCmoIntakeAndStartWeek1 } from "./helpers/cmoIntake";
import {
  assertCycleArchived,
  assertReplanReadyInCyclePanel,
  assertWeekCycleActive,
  completeOpsCadenceViaUi,
  completeWeekReviewViaUi,
  readChannelThesisId,
} from "./helpers/cmoOpsUi";
import {
  assertCommandSurfaceStartNextCycle,
  assertReplanPreviewStrip,
  startNextCycleFromCommandSurface,
} from "./helpers/cmoReplanUi";

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

test.describe("CMO multi-week replan @cmo-multi", () => {
  test.setTimeout(360_000);

  test("Week 1→2→3 via command surface start-next-cycle + replan strip", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);

      await bootstrapCmoIntakeAndStartWeek1(page);
      const week1Thesis = await readChannelThesisId(page);

      for (let week = 1; week <= 2; week++) {
        await completeOpsCadenceViaUi(page);
        await completeWeekReviewViaUi(
          page,
          `Week ${week} @cmo-multi: ops + human proof closed; archive for replan.`,
        );
        await assertCycleArchived(page);
        await assertReplanReadyInCyclePanel(page);
        await assertCommandSurfaceStartNextCycle(page);
        await assertReplanPreviewStrip(page);
        await startNextCycleFromCommandSurface(page);
        await assertWeekCycleActive(page, week + 1);
      }

      await assertWeekCycleActive(page, 3);

      const week3Thesis = await readChannelThesisId(page);
      expect(week3Thesis).toBeTruthy();
      expect(week3Thesis).toBe(week1Thesis);
    } finally {
      await app.close();
    }
  });
});
