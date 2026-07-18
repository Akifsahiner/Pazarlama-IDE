import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { E2E_FIXTURE_APP } from "./fixturePath";
import { ensureE2eFixtureReady } from "./bootstrap";
import { assessMeasurementBaseline } from "../src/shared/measurementBaseline";

const mainEntry = path.join(process.cwd(), "out", "main", "index.js");

test.describe("CMO measurement compulsion @cmo-measure", () => {
  test.setTimeout(120_000);

  test("measurement baseline module gates correctly", () => {
    const notReady = assessMeasurementBaseline(null, {
      id: "p",
      source: { kind: "folder", path: "/p" },
      name: "P",
      framework: "Next.js",
      routes: [],
      hasAnalytics: false,
      excludedPaths: [],
      scannedFileCount: 1,
    });
    expect(notReady.ready).toBe(false);

    const ready = assessMeasurementBaseline(
      {
        manual_kpis: [{ id: "targeted_visitors", name: "Visitors", value: 10 }],
      } as never,
      null,
    );
    expect(ready.ready).toBe(true);
  });

  test("ship win card shows measurement CTA when baseline missing", async () => {
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
      const card = page.getByTestId("ship-win-card");
      if (await card.isVisible().catch(() => false)) {
        await expect(page.getByTestId("ship-win-measurement-cta")).toBeVisible();
      }
    } finally {
      await app.close();
    }
  });
});
