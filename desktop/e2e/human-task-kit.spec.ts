import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { E2E_FIXTURE_APP } from "./fixturePath";
import { ensureE2eFixtureReady } from "./bootstrap";
import { bootstrapCmoIntakeAndStartWeek1 } from "./helpers/cmoIntake";

const mainEntry = path.join(process.cwd(), "out", "main", "index.js");

test.describe("Human Task Kit @cmo @human-lane", () => {
  test.setTimeout(180_000);

  test("execution record and detail panel mount for human lane", async () => {
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
      await expect(page.getByTestId("morning-brief-grid")).toBeVisible();
      await expect(page.getByTestId("execution-detail-panel")).toBeVisible();
    } finally {
      await app.close();
    }
  });
});
