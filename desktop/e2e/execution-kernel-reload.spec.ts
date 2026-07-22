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

test.describe("Execution kernel reload @execution-kernel", () => {
  test.setTimeout(180_000);

  test("kernel lifecycle + attempt + run_id survive app relaunch", async () => {
    const app = await launchApp({ MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP });

    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);
      await bootstrapCmoIntakeAndStartWeek1(page);

      const seed = await page.evaluate(async () => {
        const state = window.__useApp?.getState();
        const cadence = state?.opsCadence;
        const systemTask = cadence?.tasks.find((t) => t.owner === "system");
        if (!systemTask || !cadence || !state?.updateMarketingProfile) return null;
        state.dispatchExecutionTask(systemTask.id, "e2e");
        const kernel = window.__useApp?.getState().executionKernel;
        const inst = kernel?.instances[systemTask.id];
        if (!inst) return null;
        const runId = "e2e-reload-run-1";
        const nextKernel = {
          ...kernel!,
          instances: {
            ...kernel!.instances,
            [systemTask.id]: {
              ...inst,
              status: "running" as const,
              run_id: runId,
              attempt: 2,
            },
          },
        };
        window.__useApp?.setState({
          executionKernel: nextKernel,
          opsCadence: cadence,
          marketingProfile: {
            ...(state.marketingProfile ?? {}),
            execution_kernel: nextKernel,
            ops_cadence: cadence,
          },
        });
        await state.updateMarketingProfile({
          execution_kernel: nextKernel,
          ops_cadence: cadence,
        });
        return {
          taskId: systemTask.id,
          runId,
          attempt: 2,
        };
      });

      expect(seed).toBeTruthy();
      await app.close();

      const app2 = await launchApp({ MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP });
      try {
        const page2 = await app2.firstWindow({ timeout: 60_000 });
        await ensureE2eFixtureReady(page2);

        const hydrated = await page2.evaluate((expected) => {
          const kernel = window.__useApp?.getState().executionKernel;
          const inst = kernel?.instances[expected!.taskId];
          return inst
            ? { status: inst.status, run_id: inst.run_id, attempt: inst.attempt }
            : null;
        }, seed);

        expect(hydrated?.status).toBe("running");
        expect(hydrated?.run_id).toBe(seed!.runId);
        expect(hydrated?.attempt).toBe(2);
      } finally {
        await app2.close();
      }
    } finally {
      await app.close().catch(() => {});
    }
  });
});
