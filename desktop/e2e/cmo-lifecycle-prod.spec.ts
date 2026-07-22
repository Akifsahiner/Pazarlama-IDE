import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { E2E_FIXTURE_APP } from "./fixturePath";
import { ensureE2eFixtureReady } from "./bootstrap";
import { bootstrapCmoIntakeAndStartWeek1 } from "./helpers/cmoIntake";
import { completeOpsCadenceWithAgent } from "./helpers/cmoOpsAgent";
import { completeWeekReviewViaUi } from "./helpers/cmoOpsUi";

const mainEntry = path.join(process.cwd(), "out", "main", "index.js");
const prodEnabled =
  process.env.MARKETING_IDE_AGENT_SMOKE === "1" && Boolean(process.env.ANTHROPIC_API_KEY);

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

test.describe("CMO lifecycle prod agent @cmo-prod", () => {
  test.skip(!prodEnabled, "Requires MARKETING_IDE_AGENT_SMOKE=1 and ANTHROPIC_API_KEY");

  test.setTimeout(45 * 60_000);

  test("Week 1 system + user tasks complete with live agent (no dry-run seed)", async () => {
    const app = await launchApp({
      MARKETING_IDE_E2E_FIXTURE: E2E_FIXTURE_APP,
    });

    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await ensureE2eFixtureReady(page);

      await page.evaluate(() => {
        window.__useApp?.setState({
          e2eDryRunExecution: false,
          e2eMockAgentEvents: false,
        });
      });

      await bootstrapCmoIntakeAndStartWeek1(page);

      const bound = await page.evaluate(() => {
        const cadence = window.__useApp?.getState().opsCadence;
        const system = cadence?.tasks.filter((t) => t.owner === "system") ?? [];
        return {
          total: cadence?.tasks.length ?? 0,
          systemWithPlan: system.filter((t) => Boolean(t.execution_plan)).length,
          systemTotal: system.length,
        };
      });
      expect(bound.systemWithPlan).toBe(bound.systemTotal);
      expect(bound.total).toBeLessThanOrEqual(5);

      const humanBound = await page.evaluate(() => {
        const cadence = window.__useApp?.getState().opsCadence;
        const human = cadence?.tasks.filter((t) => t.owner === "user" || t.owner === "delegate") ?? [];
        return {
          humanTotal: human.length,
          withRef: human.filter((t) => Boolean(t.human_execution_ref)).length,
        };
      });
      expect(humanBound.withRef).toBe(humanBound.humanTotal);
      expect(humanBound.humanTotal).toBeGreaterThan(0);

      await completeOpsCadenceWithAgent(page);

      const kernelAfterOps = await page.evaluate(() => {
        const state = window.__useApp?.getState();
        const cadence = state?.opsCadence;
        const kernel = state?.executionKernel;
        const systemTasks = cadence?.tasks.filter((t) => t.owner === "system") ?? [];
        const terminal = systemTasks.filter((t) => t.status === "done").length;
        const instances = systemTasks.map((t) => ({
          id: t.id,
          kernelStatus: kernel?.instances[t.id]?.status,
          opsStatus: t.status,
        }));
        return { terminal, total: systemTasks.length, instances };
      });
      expect(kernelAfterOps.terminal).toBe(kernelAfterOps.total);
      for (const row of kernelAfterOps.instances) {
        expect(["completed", "measuring"]).toContain(row.kernelStatus);
        expect(row.opsStatus).toBe("done");
      }

      await completeWeekReviewViaUi(
        page,
        "Week 1 prod E2E: agent executed system tasks; user proof submitted with live URLs.",
      );
    } finally {
      await app.close();
    }
  });
});
