import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { E2E_FIXTURE_APP } from "./fixturePath";
import { ensureE2eFixtureReady } from "./bootstrap";
import { goDashboard, resetCmoLifecycleForE2e } from "./helpers/cmoIntake";

const mainEntry = path.join(process.cwd(), "out", "main", "index.js");

test.describe("Product understanding @product-understanding", () => {
  test.setTimeout(180_000);

  test("scan → intake shows Why panel with sourced claims", async () => {
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
      await resetCmoLifecycleForE2e(page);
      await goDashboard(page);

      await expect(page.getByTestId("cmo-intake-card")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("why-panel")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("claim-product_category")).toBeVisible();
      await expect(page.getByTestId("claim-site_structure")).toBeVisible();

      const graphOk = await page.evaluate(() => {
        const useApp = (window as Window & {
          __useApp?: {
            getState: () => {
              marketingProfile?: { product_understanding?: { claims: unknown[] } };
              channelThesis?: { thesis_decision?: { matched_rules: string[] } };
            };
          };
        }).__useApp;
        const s = useApp?.getState();
        return Boolean(
          s?.marketingProfile?.product_understanding?.claims?.length &&
            s?.channelThesis?.thesis_decision?.matched_rules?.length,
        );
      });
      expect(graphOk).toBe(true);
    } finally {
      await app.close();
    }
  });
});
