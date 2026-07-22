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

async function setCadenceDayIndex(page: import("@playwright/test").Page, dayIndex: number) {
  await page.evaluate((day) => {
    const useApp = (window as Window & {
      __useApp?: {
        getState: () => {
          opsCadence?: Record<string, unknown>;
          marketingProfile?: { ops_cadence?: Record<string, unknown> };
        };
        setState: (patch: Record<string, unknown>) => void;
      };
    }).__useApp;
    if (!useApp) throw new Error("E2E store hook missing");
    const s = useApp.getState();
    const cadence = s.opsCadence ?? s.marketingProfile?.ops_cadence;
    if (cadence) {
      useApp.setState({
        opsCadence: { ...cadence, day_index: day },
        marketingProfile: s.marketingProfile
          ? { ...s.marketingProfile, ops_cadence: { ...cadence, day_index: day } }
          : undefined,
      });
    }
  }, dayIndex);
}

test.describe("Day 3 Pulse @cmo @day-pulse", () => {
  test.setTimeout(180_000);

  test("day pulse hidden on day 1, visible on day 3", async () => {
    const app = await launchApp({ MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP });
    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);
      await bootstrapCmoIntakeAndStartWeek1(page);
      await expect(page.getByTestId("day-pulse-row")).toHaveCount(0);
      await setCadenceDayIndex(page, 3);
      await expect(page.getByTestId("day-pulse-row")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("day-pulse-checkpoint")).toBeVisible();
    } finally {
      await app.close();
    }
  });

  test("GA4 chip on morning brief footer and pulse row at day 3", async () => {
    const app = await launchApp({ MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP });
    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);
      await bootstrapCmoIntakeAndStartWeek1(page);
      await setCadenceDayIndex(page, 3);
      await expect(page.getByTestId("morning-brief-footer").getByTestId("ga4-sync-chip")).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByTestId("day-pulse-row").getByTestId("ga4-sync-chip")).toBeVisible();
    } finally {
      await app.close();
    }
  });

  test("day 5 checkpoint updates pulse title", async () => {
    const app = await launchApp({ MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP });
    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);
      await bootstrapCmoIntakeAndStartWeek1(page);
      await setCadenceDayIndex(page, 5);
      await expect(page.getByTestId("day-pulse-row")).toContainText("Day 5", { timeout: 15_000 });
    } finally {
      await app.close();
    }
  });
});
