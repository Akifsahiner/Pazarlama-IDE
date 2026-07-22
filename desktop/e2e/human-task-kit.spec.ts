import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { E2E_FIXTURE_APP } from "./fixturePath";
import { ensureE2eFixtureReady } from "./bootstrap";
import { bootstrapCmoIntakeAndStartWeek1 } from "./helpers/cmoIntake";

const mainEntry = path.join(process.cwd(), "out", "main", "index.js");

test.describe("Human Task Kit @cmo @human-lane", () => {
  test.setTimeout(180_000);

  test("primary CTA opens drawer, Copy All, Mark Posted unlocks metrics", async () => {
    const app = await electron.launch({
      args: [mainEntry],
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
        MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
      },
    });

    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);
      await bootstrapCmoIntakeAndStartWeek1(page);

      await expect(page.getByTestId("execution-record-card")).toBeVisible({ timeout: 60_000 });

      const primaryCta = page
        .getByTestId("command-surface-distribution-proof")
        .or(page.getByTestId("command-surface-lane-b-proof"))
        .or(page.getByTestId("command-surface-submit-proof"))
        .or(page.getByTestId("command-surface-runbook-step"))
        .first();

      await expect(primaryCta).toBeVisible({ timeout: 30_000 });
      await primaryCta.click();

      const drawer = page.getByTestId("human-task-kit-drawer");
      await expect(drawer).toBeVisible({ timeout: 15_000 });

      await page.getByTestId("human-kit-copy-all").click();

      await page.getByTestId("human-kit-post-url").fill("https://tiktok.com/@user/video/1234567890");
      await page.getByTestId("human-kit-mark-posted").click();

      await expect(page.getByTestId("human-kit-log-metrics")).toBeVisible({ timeout: 10_000 });
    } finally {
      await app.close();
    }
  });
});
