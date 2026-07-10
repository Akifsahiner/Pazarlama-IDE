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

test.describe("Execution queue @execution-queue", () => {
  test("auto-advances to next queued task when run completes", async () => {
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
        const useApp = (window as Window & {
          __useApp?: {
            getState: () => {
              processExecutionQueue: () => void;
            };
            setState: (p: Record<string, unknown>) => void;
          };
        }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");

        useApp.setState({
          e2eDryRunExecution: true,
          run: null,
          browser: { running: false },
          executionQueue: [
            {
              id: "q-1",
              kind: "edit",
              goal: "First queued edit task",
              label: "First queued edit",
              enqueuedAt: Date.now(),
            },
            {
              id: "q-2",
              kind: "browse",
              goal: "Second queued browse task",
              label: "Second queued browse",
              enqueuedAt: Date.now() + 1,
            },
          ],
        });
      });

      await window.evaluate(() => {
        const useApp = (window as Window & {
          __useApp?: { getState: () => { processExecutionQueue: () => void } };
        }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");
        useApp.getState().processExecutionQueue();
      });

      await expect
        .poll(
          async () =>
            window.evaluate(() => {
              const useApp = (window as Window & {
                __useApp?: { getState: () => { lastQueueDrainGoal?: string; executionQueue: unknown[] } };
              }).__useApp;
              if (!useApp) return "";
              const s = useApp.getState();
              return `${s.lastQueueDrainGoal ?? ""}|${s.executionQueue.length}`;
            }),
          { timeout: 5_000 },
        )
        .toBe("First queued edit task|1");

      await window.evaluate(() => {
        const useApp = (window as Window & {
          __useApp?: { setState: (p: Record<string, unknown>) => void };
          __e2eDrainQueue?: () => void;
        }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");
        useApp.setState({
          run: { status: "completed", kind: "edit", goal: "done", events: [], lastSeq: 1, runId: "e2e" },
        });
        window.__e2eDrainQueue?.();
      });

      await expect
        .poll(
          async () =>
            window.evaluate(() => {
              const useApp = (window as Window & {
                __useApp?: { getState: () => { lastQueueDrainGoal?: string; executionQueue: unknown[] } };
              }).__useApp;
              if (!useApp) return "";
              const s = useApp.getState();
              return `${s.lastQueueDrainGoal ?? ""}|${s.executionQueue.length}`;
            }),
          { timeout: 5_000 },
        )
        .toBe("Second queued browse task|0");
    } finally {
      await app.close();
    }
  });

  test("queue panel lists items and cancel removes one", async () => {
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
        const useApp = (window as Window & {
          __useApp?: {
            getState: () => { navigate: (r: string) => void };
            setState: (p: Record<string, unknown>) => void;
          };
        }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");
        useApp.setState({
          executionQueue: [
            {
              id: "q-panel-1",
              kind: "browse",
              goal: "Research competitors",
              label: "Research competitors",
              enqueuedAt: Date.now(),
            },
          ],
        });
        useApp.getState().navigate("workspace");
      });

      const panel = window.getByTestId("execution-queue-panel");
      await expect(panel).toBeVisible({ timeout: 15_000 });
      await expect(panel.getByText(/Research competitors/i)).toBeVisible();
      await expect(panel.getByText(/starts automatically/i)).toBeVisible();

      await panel.getByTitle("Remove from queue").click();

      await expect(panel).toHaveCount(0, { timeout: 5_000 });
    } finally {
      await app.close();
    }
  });
});
