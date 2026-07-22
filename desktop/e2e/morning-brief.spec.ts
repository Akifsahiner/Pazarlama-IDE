import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { E2E_FIXTURE_APP } from "./fixturePath";
import { ensureE2eFixtureReady } from "./bootstrap";
import { bootstrapCmoIntakeAndStartWeek1 } from "./helpers/cmoIntake";

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

test.describe("Morning brief @cmo @morning-brief", () => {
  test.setTimeout(180_000);

  test("execution record shows grid and primary CTA within 10s", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);
      await bootstrapCmoIntakeAndStartWeek1(page);

      const card = page.getByTestId("execution-record-card");
      const cardVisibleAt = Date.now();
      await expect(card).toBeVisible({ timeout: 60_000 });

      const grid = page.getByTestId("morning-brief-grid");
      await expect(grid).toBeVisible({ timeout: 10_000 });
      await expect(grid.getByText("Today", { exact: false })).toBeVisible();

      const cta = card.locator("button[data-testid^='command-surface']").first();
      await expect(cta).toBeVisible({ timeout: 10_000 });
      expect(Date.now() - cardVisibleAt).toBeLessThan(10_000);

      await cta.click();
    } finally {
      await app.close();
    }
  });
});
