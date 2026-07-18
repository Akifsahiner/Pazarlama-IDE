import { expect, type Page } from "@playwright/test";

export async function openOpsBackstage(page: Page) {
  const openBtn = page.getByRole("button", { name: /Open backstage/i });
  if (await openBtn.isVisible().catch(() => false)) {
    await openBtn.click();
  }
  await expect(page.getByTestId("cmo-backstage")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("cmo-backstage").getByRole("button", { name: /^Ops$/i }).click();
  await expect(page.getByTestId("cmo-ops-board")).toBeVisible();
  await page.locator("#cmo-ops-board").scrollIntoViewIfNeeded();
}

export async function openMonetizationBackstage(page: Page) {
  const openBtn = page.getByRole("button", { name: /Open backstage/i });
  if (await openBtn.isVisible().catch(() => false)) {
    await openBtn.click();
  }
  await expect(page.getByTestId("cmo-backstage")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("cmo-backstage").getByRole("button", { name: /^Monetize$/i }).click();
  await expect(page.getByTestId("monetization-panel")).toBeVisible({ timeout: 10_000 });
  await page.locator("#monetization-panel-wrap").scrollIntoViewIfNeeded();
}

async function submitMonetizationProofModal(page: Page) {
  const proofModal = page.getByTestId("monetization-task-proof-modal");
  const issueModal = page.getByTestId("monetization-issue-export-modal");
  await expect(proofModal.or(issueModal)).toBeVisible({ timeout: 10_000 });

  if (await proofModal.isVisible().catch(() => false)) {
    await proofModal.getByTestId("monetization-proof-pr-url").fill("https://example.com/e2e-pricing-pr");
    await proofModal
      .getByTestId("monetization-proof-note")
      .fill("E2E UI proof: pricing page shipped with measurable paid path.");
    await proofModal.getByTestId("monetization-proof-confirm").click();
    await expect(proofModal).toHaveCount(0, { timeout: 10_000 });
    return;
  }

  await issueModal.getByTestId("monetization-proof-issue-url").fill("https://github.com/e2e/issues/1");
  await issueModal.getByTestId("monetization-proof-confirm").click();
  await expect(issueModal).toHaveCount(0, { timeout: 10_000 });
}

/** Ship or skip open monetization P0 tasks — required before week review when revenue binding is active. */
export async function clearMonetizationBlockersViaUi(page: Page, maxSteps = 8) {
  const hasOpen = async () =>
    page.evaluate(() => {
      const ws = (
        window as Window & {
          __useApp?: {
            getState: () => {
              monetizationWorkspace?: {
                revenue_binding?: { active?: boolean };
                tasks?: Array<{ status: string }>;
              };
            };
          };
        }
      ).__useApp?.getState().monetizationWorkspace;
      if (!ws?.revenue_binding?.active) return false;
      return ws.tasks?.some((t) => t.status === "pending" || t.status === "in_progress") ?? false;
    });

  if (!(await hasOpen())) return;

  await openMonetizationBackstage(page);
  const panel = page.getByTestId("monetization-panel");

  for (let step = 0; step < maxSteps; step += 1) {
    if (!(await hasOpen())) return;

    const logProof = panel.getByTestId("monetization-log-proof");
    if (await logProof.isVisible().catch(() => false)) {
      await logProof.scrollIntoViewIfNeeded();
      await logProof.click();
      await submitMonetizationProofModal(page);
      continue;
    }

    const ship = panel.getByTestId("monetization-task-ship").first();
    if (await ship.isVisible().catch(() => false)) {
      await ship.scrollIntoViewIfNeeded();
      await ship.click();
      if (
        await page
          .getByTestId("monetization-task-proof-modal")
          .or(page.getByTestId("monetization-issue-export-modal"))
          .isVisible({ timeout: 2_000 })
          .catch(() => false)
      ) {
        await submitMonetizationProofModal(page);
      }
      continue;
    }

    const skip = panel.getByTestId("monetization-task-skip").first();
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      continue;
    }

    break;
  }

  await expect.poll(hasOpen, { timeout: 15_000 }).toBeFalsy();
}

export async function submitOpsProofModal(page: Page, kpiValue = "12") {
  const modal = page.getByTestId("ops-proof-modal");
  await expect(modal).toBeVisible({ timeout: 10_000 });

  const kpi = modal.getByTestId("ops-proof-kpi-value");
  if (await kpi.isVisible().catch(() => false)) {
    await kpi.fill(kpiValue);
  }

  await modal.getByTestId("ops-proof-url-0").fill("https://example.com/e2e-proof");
  await modal
    .getByTestId("ops-proof-note")
    .fill("E2E UI proof: live asset published with measurable signup baseline captured.");
  await modal.getByTestId("ops-proof-confirm").click();
  await expect(modal).toHaveCount(0, { timeout: 10_000 });
}

async function clickCommandSurfaceMove(page: Page): Promise<"proof" | "system" | false> {
  const move = page.getByTestId("command-surface-start-move");
  if (!(await move.isVisible().catch(() => false))) return false;

  await move.click();
  if (await page.getByTestId("ops-proof-modal").isVisible({ timeout: 3_000 }).catch(() => false)) {
    return "proof";
  }
  return "system";
}

async function clickOpsBoardAction(page: Page): Promise<"proof" | "system" | false> {
  if (!(await page.getByTestId("cmo-ops-board").isVisible().catch(() => false))) {
    await openOpsBackstage(page);
  }
  const board = page.getByTestId("cmo-ops-board");

  const startIde = board.getByTestId("ops-task-start-ide").first();
  if (await startIde.isVisible().catch(() => false)) {
    await startIde.click();
    return "system";
  }

  const markDone = board.getByTestId("ops-task-mark-done").first();
  if (await markDone.isVisible().catch(() => false)) {
    await markDone.click();
    return "proof";
  }

  return false;
}

async function waitForOpsProgress(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const cadence = (
            window as Window & {
              __useApp?: { getState: () => { opsCadence?: { tasks: Array<{ status: string }> } } };
            }
          ).__useApp?.getState().opsCadence;
          if (!cadence) return 0;
          return cadence.tasks.filter((t) => t.status === "done" || t.status === "skipped").length;
        }),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
}

/** Command surface + ops board — system tasks via Start in IDE, user tasks via proof modal. */
export async function completeOpsCadenceViaUi(
  page: Page,
  opts?: { maxSteps?: number; kpiValue?: string },
) {
  const maxSteps = opts?.maxSteps ?? 16;
  const kpiValue = opts?.kpiValue ?? "12";

  for (let step = 0; step < maxSteps; step += 1) {
    if (await page.getByTestId("ops-week-review-open").isVisible().catch(() => false)) {
      return;
    }

    const doneBefore = await page.evaluate(() => {
      const cadence = (
        window as Window & {
          __useApp?: { getState: () => { opsCadence?: { tasks: Array<{ status: string }> } } };
        }
      ).__useApp?.getState().opsCadence;
      return cadence?.tasks.filter((t) => t.status === "done" || t.status === "skipped").length ?? 0;
    });

    let action = await clickOpsBoardAction(page);
    if (!action) action = await clickCommandSurfaceMove(page);
    if (!action) break;

    if (action === "proof") {
      await submitOpsProofModal(page, kpiValue);
    }

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const cadence = (
              window as Window & {
                __useApp?: {
                  getState: () => { opsCadence?: { tasks: Array<{ status: string }> } };
                };
              }
            ).__useApp?.getState().opsCadence;
            return (
              cadence?.tasks.filter((t) => t.status === "done" || t.status === "skipped").length ??
              0
            );
          }),
        { timeout: 15_000 },
      )
      .toBeGreaterThan(doneBefore);
  }

  if (!(await page.getByTestId("ops-week-review-open").isVisible().catch(() => false))) {
    await openOpsBackstage(page);
  }
  await expect(page.getByTestId("ops-week-review-open")).toBeVisible({ timeout: 20_000 });
}

export async function completeWeekReviewViaUi(page: Page, summary: string) {
  await clearMonetizationBlockersViaUi(page);

  const board = page.getByTestId("cmo-ops-board");
  if (!(await board.isVisible().catch(() => false))) {
    await openOpsBackstage(page);
  }
  await board.getByTestId("ops-week-review-open").click();

  const modal = page.getByTestId("cmo-week-review-modal");
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.locator("textarea").fill(summary);
  await modal.getByTestId("cmo-week-review-submit").click();

  const errLine = modal.getByTestId("cmo-week-review-error");
  if (await errLine.isVisible({ timeout: 2_000 }).catch(() => false)) {
    throw new Error(`Week review blocked: ${await errLine.textContent()}`);
  }

  await expect(modal).toHaveCount(0, { timeout: 15_000 });
}

export async function assertCycleArchived(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const useApp = (window as Window & {
            __useApp?: {
              getState: () => {
                opsCadence?: { week_review?: { status?: string } };
                cmoContinuous?: { cycles?: unknown[] };
              };
            };
          }).__useApp;
          if (!useApp) return false;
          const s = useApp.getState();
          return (
            s.opsCadence?.week_review?.status === "completed" &&
            (s.cmoContinuous?.cycles?.length ?? 0) >= 1
          );
        }),
      { timeout: 20_000 },
    )
    .toBeTruthy();
}

export async function openCycleBackstage(page: Page) {
  const openBtn = page.getByRole("button", { name: /Open backstage/i });
  if (await openBtn.isVisible().catch(() => false)) {
    await openBtn.click();
  }
  await expect(page.getByTestId("cmo-backstage")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("cmo-backstage").getByRole("button", { name: /^Cycle$/i }).click();
  await expect(page.getByTestId("cmo-cycle-panel")).toBeVisible({ timeout: 10_000 });
  await page.locator("#cmo-cycle-panel").scrollIntoViewIfNeeded();
}

export async function assertReplanReadyInCyclePanel(page: Page) {
  await openCycleBackstage(page);
  await expect(page.getByTestId("cmo-cycle-double-down")).toBeVisible({ timeout: 15_000 });
}

export async function startNextCycleDoubleDownViaUi(page: Page) {
  await assertReplanReadyInCyclePanel(page);
  await page.getByTestId("cmo-cycle-double-down").click();
  await expect(page.getByTestId("growth-command-surface")).toBeVisible({ timeout: 20_000 });
}

export async function startNextCyclePivotViaUi(page: Page) {
  await openCycleBackstage(page);
  const pivotBtn = page.getByTestId("cmo-cycle-pivot-start");
  await expect(pivotBtn).toBeVisible({ timeout: 15_000 });
  await pivotBtn.click();
  await expect(page.getByTestId("growth-command-surface")).toBeVisible({ timeout: 20_000 });
}

export async function assertWeekCycleActive(page: Page, weekIndex: number) {
  await expect
    .poll(
      async () =>
        page.evaluate((expectedWeek) => {
          const s = (
            window as Window & {
              __useApp?: {
                getState: () => {
                  opsCadence?: {
                    week_index?: number;
                    week_review?: { status?: string };
                    tasks?: Array<{ status: string }>;
                  };
                  cmoContinuous?: { phase?: string; current_cycle_index?: number };
                };
              };
            }
          ).__useApp?.getState();
          if (!s?.opsCadence) return null;
          const pending =
            s.opsCadence.tasks?.filter((t) => t.status === "pending" || t.status === "in_progress")
              .length ?? 0;
          return {
            week: s.opsCadence.week_index,
            review: s.opsCadence.week_review?.status,
            phase: s.cmoContinuous?.phase,
            current: s.cmoContinuous?.current_cycle_index,
            pending,
          };
        }, weekIndex),
      { timeout: 20_000 },
    )
    .toMatchObject({
      week: weekIndex,
      review: "pending",
      phase: "executing",
      current: weekIndex,
    });

  const pending = await page.evaluate(() => {
    const tasks = (
      window as Window & {
        __useApp?: { getState: () => { opsCadence?: { tasks?: Array<{ status: string }> } } };
      }
    ).__useApp?.getState().opsCadence?.tasks;
    return tasks?.filter((t) => t.status === "pending" || t.status === "in_progress").length ?? 0;
  });
  expect(pending).toBeGreaterThan(0);
}

export async function assertThesisChangedAfterPivot(page: Page, priorThesisId: string) {
  await expect
    .poll(
      async () =>
        page.evaluate((prior) => {
          const id = (
            window as Window & {
              __useApp?: { getState: () => { channelThesis?: { id?: string } } };
            }
          ).__useApp?.getState().channelThesis?.id;
          return id && id !== prior ? id : null;
        }, priorThesisId),
      { timeout: 20_000 },
    )
    .toBeTruthy();
}

export async function readChannelThesisId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const id = (
      window as Window & {
        __useApp?: { getState: () => { channelThesis?: { id?: string } } };
      }
    ).__useApp?.getState().channelThesis?.id;
    if (!id) throw new Error("Channel thesis missing in E2E store");
    return id;
  });
}
