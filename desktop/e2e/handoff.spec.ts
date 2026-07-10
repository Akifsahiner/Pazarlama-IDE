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

test.describe("Intent handoff @handoff", () => {
  test("executeIntent shows confirm modal for edit runs", async () => {
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

      await window.evaluate(() => {
        const useApp = (window as Window & { __useApp?: { getState: () => {
          executeIntent: (intent: { kind: string; goal: string }) => void;
        } } }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");
        useApp.getState().executeIntent({
          kind: "start_edit_run",
          goal: "Fix hero headline copy on the landing page",
        });
      });

      const modal = window.getByTestId("handoff-confirm-modal");
      await expect(modal).toBeVisible({ timeout: 10_000 });
      await expect(modal.getByText(/Agent will edit files/i)).toBeVisible();

      await modal.locator('input[type="checkbox"]').check();
      await expect(modal.getByRole("button", { name: /^Run$/i })).toBeEnabled();
      await modal.getByRole("button", { name: /^Cancel$/i }).click();
      await expect(modal).toHaveCount(0, { timeout: 5_000 });
    } finally {
      await app.close();
    }
  });

  test("workspace handoff banner supports acknowledge + run", async () => {
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

      await window.evaluate(() => {
        const useApp = (window as Window & { __useApp?: { getState: () => {
          setWorkspaceHandoff: (h: unknown) => void;
        } } }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");
        useApp.getState().setWorkspaceHandoff({
          eyebrow: "Ready to run",
          title: "Run in project",
          reason: "Agent suggested file edits for your hero copy.",
          primaryLabel: "Run",
          primaryAction: "execute_intent",
          requireAcknowledge: true,
          payload: {
            intent: { kind: "start_edit_run", goal: "Update hero CTA" },
            modeLabel: "Edit project",
          },
        });
      });

      const banner = window.getByTestId("workspace-handoff-banner");
      await expect(banner).toBeVisible({ timeout: 10_000 });
      await banner.locator('input[type="checkbox"]').check();
      await expect(banner.getByRole("button", { name: /^Run$/i })).toBeEnabled();
    } finally {
      await app.close();
    }
  });
});

test.describe("Auto composer @handoff", () => {
  test("auto mode: hero düzelt shows edit preview then confirm", async () => {
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
      if (await workspaceBtn.isVisible().catch(() => false)) {
        await workspaceBtn.click();
      }

      const autoTab = window.getByRole("button", { name: /^Auto$/i });
      if (await autoTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await autoTab.click();
      }

      const composer = window.locator("#agent-composer");
      await expect(composer).toBeVisible({ timeout: 15_000 });
      await composer.fill("hero düzelt");

      await expect(window.getByTestId("intent-preview-chip")).toBeVisible({ timeout: 5_000 });
      await expect(window.getByTestId("intent-preview-chip")).toContainText(/Edit|çalıştırılacak/i);

      await window.evaluate(() => {
        const useApp = (window as Window & { __useApp?: { getState: () => {
          submitComposerText: (t: string) => Promise<void>;
        } } }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");
        void useApp.getState().submitComposerText("hero düzelt");
      });

      const modal = window.getByTestId("handoff-confirm-modal");
      await expect(modal).toBeVisible({ timeout: 10_000 });
    } finally {
      await app.close();
    }
  });
});

test.describe("Asset integrate @handoff", () => {
  test("landing copy asset → Apply to site shows handoff confirm", async () => {
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

      await window.evaluate(async () => {
        const useApp = (window as Window & { __useApp?: { getState: () => {
          previewMarketingAsset: (d: {
            kind: string;
            title: string;
            content: string;
          }) => Promise<void>;
          integrateCopyIntoSite: (id: string) => void;
          thread: Array<{ kind: string; asset?: { id: string } }>;
        } } }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");
        await useApp.getState().previewMarketingAsset({
          kind: "copy",
          title: "Hero",
          content: "Ship faster with Marketing IDE",
        });
        const assetId = useApp
          .getState()
          .thread.find((e) => e.kind === "asset" && e.asset)?.asset?.id;
        if (!assetId) throw new Error("E2E asset not seeded");
        useApp.getState().integrateCopyIntoSite(assetId);
      });

      const modal = window.getByTestId("handoff-confirm-modal");
      await expect(modal).toBeVisible({ timeout: 10_000 });
      await expect(modal.getByText(/Apply to site/i)).toBeVisible();
      await expect(modal.getByText(/app\/page\.tsx/i)).toBeVisible();

      await modal.locator('input[type="checkbox"]').check();
      await modal.getByRole("button", { name: /^Run$/i }).click();
      await expect(modal).toHaveCount(0, { timeout: 5_000 });
    } finally {
      await app.close();
    }
  });
});
