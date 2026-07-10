import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { E2E_FIXTURE_APP } from "./fixturePath";

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

test.describe("WOW golden path @wow", () => {
  test("fixture project opens workspace with offline plan preview", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const window = await app.firstWindow({ timeout: 60_000 });
      await window.waitForLoadState("domcontentloaded");

      // E2E bootstrap: fixture scan → workspace → offline plan preview
      await expect
        .poll(
          async () => {
            const home = await window.getByRole("button", { name: /^Home$/i }).isVisible().catch(() => false);
            const plan = await window.getByText(/Launch plan|Plan Studio|Day 1|Preview/i).first().isVisible().catch(() => false);
            return home && plan;
          },
          { timeout: 90_000 },
        )
        .toBeTruthy();

      await expect(window.getByRole("button", { name: /^Home$/i })).toBeVisible();
      await expect(window.getByText(/E2E Sample|Launch plan|playbook/i).first()).toBeVisible();
    } finally {
      await app.close();
    }
  });

  test("help page shows 30-day launch playbook", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const window = await app.firstWindow({ timeout: 60_000 });
      await window.waitForLoadState("domcontentloaded");

      await expect
        .poll(
          async () => window.getByRole("button", { name: /^Home$/i }).isVisible().catch(() => false),
          { timeout: 90_000 },
        )
        .toBeTruthy();

      const helpBtn = window.getByRole("button", { name: /^Help$/i });
      if (await helpBtn.isVisible().catch(() => false)) {
        await helpBtn.click();
        await expect(window.getByText(/Day 0|Open & scan|30-day|What to expect/i).first()).toBeVisible({
          timeout: 15_000,
        });
      }
    } finally {
      await app.close();
    }
  });

  test("locked surface peek shows unlock progress steps", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const window = await app.firstWindow({ timeout: 60_000 });
      await window.waitForLoadState("domcontentloaded");

      await expect
        .poll(
          async () => window.getByRole("button", { name: /^Home$/i }).isVisible().catch(() => false),
          { timeout: 90_000 },
        )
        .toBeTruthy();

      const workspaceBtn = window.getByRole("navigation").getByRole("button", { name: /^Workspace$/i });
      await workspaceBtn.click();

      // Fixture has offline plan → Funnel is unlocked; peek a locked tab instead
      await expect(window.getByRole("tab", { name: /Funnel/i })).toBeVisible({ timeout: 15_000 });

      const adsTab = window.getByRole("tab", { name: /^Ads$/i });
      await expect(adsTab).toBeVisible({ timeout: 10_000 });
      await adsTab.click();

      await expect(window.getByText(/Unlock · Ads/i).first()).toBeVisible({ timeout: 10_000 });
      await expect(window.getByText(/Step 1 of 3/i).first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await app.close();
    }
  });

  test("home shows active campaign card after offline plan", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const window = await app.firstWindow({ timeout: 60_000 });
      await window.waitForLoadState("domcontentloaded");

      await expect
        .poll(
          async () => window.getByRole("button", { name: /^Home$/i }).isVisible().catch(() => false),
          { timeout: 90_000 },
        )
        .toBeTruthy();

      await window.getByRole("button", { name: /^Home$/i }).click();

      await expect(window.getByTestId("active-campaign-card")).toBeVisible({ timeout: 15_000 });
      await expect(window.getByText(/Active campaign/i)).toBeVisible();
      await expect(window.getByText(/Executing|Planning|Intake/i).first()).toBeVisible();
    } finally {
      await app.close();
    }
  });

  test("agent thread shows campaign timeline when session exists", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const window = await app.firstWindow({ timeout: 60_000 });
      await window.waitForLoadState("domcontentloaded");

      await expect
        .poll(
          async () => window.getByRole("button", { name: /^Home$/i }).isVisible().catch(() => false),
          { timeout: 90_000 },
        )
        .toBeTruthy();

      await expect(window.getByTestId("campaign-timeline")).toBeVisible({ timeout: 15_000 });
      await expect(window.getByText(/Intake|Plan|Execute|Measure/i).first()).toBeVisible();
    } finally {
      await app.close();
    }
  });
});
