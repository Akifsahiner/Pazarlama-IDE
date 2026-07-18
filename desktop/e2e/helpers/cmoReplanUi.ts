import { expect, type Page } from "@playwright/test";

export async function assertReplanPreviewStrip(page: Page) {
  await expect(page.getByTestId("replan-preview-strip")).toBeVisible({ timeout: 15_000 });
}

export async function startNextCycleFromCommandSurface(page: Page) {
  const btn = page.getByTestId("command-surface-start-next-cycle");
  await expect(btn).toBeVisible({ timeout: 15_000 });
  await btn.click();
}

export async function assertCommandSurfaceStartNextCycle(page: Page) {
  await expect(page.getByTestId("command-surface-start-next-cycle")).toBeVisible({
    timeout: 15_000,
  });
}
