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

test.describe("Day 3 Pulse @cmo @day-pulse", () => {
  test.setTimeout(180_000);

  test("execution record shows day pulse row and GA4 chip at day 3", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);
      await bootstrapCmoIntakeAndStartWeek1(page);

      await page.evaluate(() => {
        const useApp = (window as Window & {
          __useApp?: {
            getState: () => {
              opsCadence?: { day_index: number };
              marketingProfile?: { ops_cadence?: { day_index: number } };
            };
            setState: (patch: Record<string, unknown>) => void;
          };
        }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");
        const s = useApp.getState();
        const cadence = s.opsCadence ?? s.marketingProfile?.ops_cadence;
        if (cadence) {
          useApp.setState({
            opsCadence: { ...cadence, day_index: 3 },
            marketingProfile: s.marketingProfile
              ? {
                  ...s.marketingProfile,
                  ops_cadence: { ...cadence, day_index: 3 },
                }
              : undefined,
          });
        }
      });

      const pulseRow = page.getByTestId("day-pulse-row");
      await expect(pulseRow).toBeVisible({ timeout: 15_000 });
      await expect(pulseRow.getByTestId("day-pulse-primary-kpi")).toBeVisible();
      await expect(page.getByTestId("ga4-sync-chip")).toBeVisible();
    } finally {
      await app.close();
    }
  });
});
