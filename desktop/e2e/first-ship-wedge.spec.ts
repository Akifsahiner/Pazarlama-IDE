import { test, expect } from "@playwright/test";
import { ensureE2eFixtureReady } from "./bootstrap";

/**
 * First-ship wedge UI — mock agent events (no e2eDryRunExecution).
 * @first-ship
 */
test.describe("First ship wedge @first-ship", () => {
  test.beforeEach(async ({ page }) => {
    await ensureE2eFixtureReady(page);
    await page.evaluate(() => {
      const useApp = (window as Window & {
        __useApp?: {
          setState: (p: Record<string, unknown>) => void;
          getState: () => { project?: { routes?: string[] } };
        };
      }).__useApp;
      if (!useApp) return;
      useApp.setState({
        e2eDryRunExecution: false,
        e2eMockAgentEvents: true,
        firstShipAt: undefined,
        wedgePhase: "scan",
        onboardingTrack: "quick_start",
      });
    });
  });

  test("reveal and home show ship-first CTA before first ship", async ({ page }) => {
    await page.evaluate(() => {
      const useApp = (window as Window & {
        __useApp?: { setState: (p: Record<string, unknown>) => void };
      }).__useApp;
      useApp?.setState({ phase: "reveal", route: "workspace" });
    });

    const shipBtn = page.getByTestId("reveal-ship-first-win");
    await expect(shipBtn).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("quick-start-thesis-line")).toBeVisible();

    await page.evaluate(() => {
      (window as Window & {
        __useApp?: { getState: () => { navigate: (r: string) => void } };
      }).__useApp?.getState().navigate("home");
    });
    await expect(page.getByTestId("ship-first-win-banner")).toBeVisible({ timeout: 15_000 });
  });

  test("ship pipeline bar appears when wedge run completes with mock patches", async ({ page }) => {
    await page.evaluate(async () => {
      const useApp = (window as Window & {
        __useApp?: {
          setState: (p: Record<string, unknown>) => void;
          getState: () => {
            navigate: (r: string) => void;
            setActiveCanvas: (m: string) => void;
          };
        };
      }).__useApp;
      if (!useApp) return;
      const runId = "e2e-mock-ship";
      useApp.setState({
        route: "workspace",
        phase: "workspace",
        wedgePhase: "ship",
        shipPipeline: { stage: "run", patchCount: 0, updatedAt: Date.now() },
        canvas: { mode: "run" },
        run: {
          runId,
          status: "running",
          kind: "edit",
          goal: "Improve hero headline",
          events: [],
          policy: { scopes: ["repo:read", "repo:write"] },
        },
      });
      useApp.getState().navigate("workspace");
      useApp.getState().setActiveCanvas("run");

      await new Promise((r) => setTimeout(r, 100));

      const patchEvent = {
        runId,
        type: "file.patch_created",
        status: "success",
        title: "Changed page.tsx",
        payload: {
          file: "src/app/page.tsx",
          additions: 2,
          deletions: 1,
          patch: "@@ mock",
        },
      };
      useApp.setState({
        run: {
          runId,
          status: "completed",
          kind: "edit",
          goal: "Improve hero headline",
          events: [patchEvent],
          policy: { scopes: ["repo:read", "repo:write"] },
        },
        shipPipeline: { stage: "apply", patchCount: 1, updatedAt: Date.now() },
        canvas: { mode: "preview" },
      });
    });

    await expect(page.getByTestId("ship-pipeline-bar")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("ship-apply-primary")).toBeVisible();
  });
});
