import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";

const mainEntry = path.join(process.cwd(), "out", "main", "index.js");

test.describe("Marketing IDE Electron smoke", () => {
  test("built app launches a window", async () => {
    const app = await electron.launch({
      args: [mainEntry],
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      },
    });

    try {
      const window = await app.firstWindow({ timeout: 45_000 });
      await window.waitForLoadState("domcontentloaded");
      const title = await window.title();
      expect(title.length).toBeGreaterThan(0);
      await expect(window.locator("body")).toBeVisible();
    } finally {
      await app.close();
    }
  });
});

test.describe("Golden path shell", () => {
  test("offline continue reaches workspace shell", async () => {
    const app = await electron.launch({
      args: [mainEntry],
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      },
    });

    try {
      const window = await app.firstWindow({ timeout: 45_000 });
      await window.waitForLoadState("domcontentloaded");

      // Splash → onboarding: skip auth if visible, continue offline
      const offlineBtn = window.getByRole("button", { name: /continue offline|continue exploring/i });
      if (await offlineBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await offlineBtn.click();
      }

      // Open project flow may appear — look for workspace/nav affordances
      const navHome = window.getByRole("button", { name: /^Home$/i });
      const openProject = window.getByRole("button", { name: /open.*project|choose folder/i });

      await expect
        .poll(
          async () =>
            (await navHome.isVisible().catch(() => false)) ||
            (await openProject.isVisible().catch(() => false)) ||
            (await window.getByText(/Marketing IDE|Welcome|Open a project/i).first().isVisible().catch(() => false)),
          { timeout: 30_000 },
        )
        .toBeTruthy();
    } finally {
      await app.close();
    }
  });
});
