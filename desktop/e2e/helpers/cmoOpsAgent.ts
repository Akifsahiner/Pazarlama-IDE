import { expect, type Page } from "@playwright/test";

async function pollOpsTaskDone(page: Page, taskId: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const done = await page.evaluate((id) => {
      const cadence = (
        window as Window & {
          __useApp?: { getState: () => { opsCadence?: { tasks: Array<{ id: string; status: string }> } } };
        }
      ).__useApp?.getState().opsCadence;
      return cadence?.tasks.find((t) => t.id === id)?.status === "done";
    }, taskId);
    if (done) return;
    await page.waitForTimeout(1500);
  }
  throw new Error(`Ops task ${taskId} did not reach done within ${timeoutMs}ms`);
}

async function waitForRunCompleted(page: Page, timeoutMs = 600_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await page.evaluate(() => {
      const run = (
        window as Window & {
          __useApp?: { getState: () => { run?: { status?: string } } };
        }
      ).__useApp?.getState().run;
      return run?.status;
    });
    if (status === "completed" || status === "failed") return status;
    await page.waitForTimeout(2000);
  }
  throw new Error(`Run did not complete within ${timeoutMs}ms`);
}

/** Complete Week 1 ops cadence with live agent (no e2eDryRunExecution). */
export async function completeOpsCadenceWithAgent(page: Page) {
  const taskIds = await page.evaluate(() => {
    const cadence = (
      window as Window & {
        __useApp?: {
          getState: () => {
            opsCadence?: {
              tasks: Array<{ id: string; owner: string; status: string; what: string }>;
            };
          };
        };
      }
    ).__useApp?.getState().opsCadence;
    return (
      cadence?.tasks
        .filter((t) => t.status !== "done" && t.status !== "skipped")
        .map((t) => ({ id: t.id, owner: t.owner, what: t.what })) ?? []
    );
  });

  for (const task of taskIds) {
    if (task.owner === "system") {
      const startBtn = page
        .getByTestId("command-surface-start-move")
        .or(page.getByTestId("ops-task-start-ide"))
        .first();
      await startBtn.click();
      const runStatus = await waitForRunCompleted(page);
      expect(runStatus).toBe("completed");

      const applyBtn = page.getByTestId("ship-apply-primary");
      if (await applyBtn.isVisible().catch(() => false)) {
        await applyBtn.click();
        await page.waitForTimeout(3000);
      }
      await pollOpsTaskDone(page, task.id);
      continue;
    }

    const proofBtn = page
      .getByTestId("command-surface-submit-proof")
      .or(page.getByTestId("ops-task-mark-done"))
      .first();
    await proofBtn.click();
    const modal = page.getByTestId("ops-proof-modal");
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await modal.getByTestId("ops-proof-url-0").fill("https://example.com/e2e-live-post");
    await modal.getByTestId("ops-proof-kpi-value").fill("1200");
    await modal.getByTestId("ops-proof-note").fill("E2E prod agent proof");
    await modal.getByRole("button", { name: /confirm|mark done|submit/i }).click();
    await expect(modal).toHaveCount(0, { timeout: 15_000 });
    await pollOpsTaskDone(page, task.id);
  }
}
