import { test, expect } from "@playwright/test";
import { ensureE2eFixtureReady } from "./bootstrap";

const MOCK_PATCH = {
  runId: "e2e-apply-gate",
  type: "file.patch_created" as const,
  status: "success" as const,
  title: "Changed page.tsx",
  payload: {
    file: "src/app/page.tsx",
    additions: 2,
    deletions: 1,
    patch: "@@ mock",
  },
};

function validationEvent(passed: boolean) {
  return {
    runId: "e2e-apply-gate",
    type: "file.validation_completed" as const,
    status: (passed ? "success" : "failed") as "success" | "failed",
    title: passed ? "Validation passed" : "Validation found issues",
    payload: {
      checks: [{ label: "TypeScript", status: (passed ? "success" : "failed") as "success" | "failed" }],
    },
  };
}

async function seedPreviewRun(page: import("@playwright/test").Page, extraEvents: unknown[] = []) {
  await page.evaluate(
    ({ patch, events }) => {
      const useApp = (window as Window & {
        __useApp?: { setState: (p: Record<string, unknown>) => void };
      }).__useApp;
      if (!useApp) return;
      useApp.setState({
        e2eMockAgentEvents: false,
        e2eDryRunExecution: true,
        route: "workspace",
        phase: "workspace",
        canvas: { mode: "preview" },
        runApplySelection: ["src/app/page.tsx"],
        run: {
          runId: "e2e-apply-gate",
          status: "completed",
          kind: "edit",
          goal: "Apply gate e2e",
          events: [patch, ...events],
          policy: { scopes: ["repo:read", "repo:write"] },
        },
      });
    },
    { patch: MOCK_PATCH, events: extraEvents },
  );
}

/**
 * Part 11 — apply validation gate UI + store contract.
 * @apply-gate
 */
test.describe("Apply validation gate @apply-gate", () => {
  test.beforeEach(async ({ page }) => {
    await ensureE2eFixtureReady(page);
    await page.evaluate(() => {
      (window as Window & { __useApp?: { setState: (p: Record<string, unknown>) => void } }).__useApp?.setState({
        route: "workspace",
        phase: "workspace",
      });
    });
  });

  test("shows gate and disables apply when validation never ran", async ({ page }) => {
    await seedPreviewRun(page);
    await expect(page.getByTestId("apply-validation-gate")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("ship-apply-primary")).toBeDisabled();
    await expect(page.getByTestId("apply-gate-run-validation")).toBeVisible();
  });

  test("hides gate and enables apply after validation passes", async ({ page }) => {
    await seedPreviewRun(page, [validationEvent(true)]);
    await expect(page.getByTestId("apply-validation-gate")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByTestId("ship-apply-primary")).toBeEnabled();
  });

  test("store blocks apply without validation and accepts override", async ({ page }) => {
    await seedPreviewRun(page);

    const blocked = await page.evaluate(async () => {
      const useApp = (window as Window & {
        __useApp?: {
          getState: () => {
            applyRunChanges: (files: string[], opts?: { validationOverride?: boolean }) => Promise<void>;
            run: { events: unknown[] } | null;
            thread: { kind: string; text?: string }[];
          };
        };
      }).__useApp;
      if (!useApp) return { blocked: false, eventCount: 0 };
      const before = useApp.getState().thread.length;
      await useApp.getState().applyRunChanges(["src/app/page.tsx"]);
      const after = useApp.getState().thread;
      const errorEv = after.slice(before).find((e) => e.kind === "error");
      return { blocked: Boolean(errorEv), message: errorEv?.text ?? "" };
    });

    expect(blocked.blocked).toBe(true);
    expect(blocked.message).toMatch(/validation/i);

    await page.evaluate(async () => {
      const useApp = (window as Window & {
        __useApp?: {
          getState: () => {
            applyRunChanges: (files: string[], opts?: { validationOverride?: boolean }) => Promise<void>;
          };
        };
      }).__useApp;
      await useApp?.getState().applyRunChanges(["src/app/page.tsx"], { validationOverride: true });
    });

    const overrideNote = await page.evaluate(() => {
      const thread = (window as Window & {
        __useApp?: { getState: () => { thread: { kind: string; text?: string }[] } };
      }).__useApp?.getState().thread;
      return thread?.find((e) => e.text?.includes("override"))?.text ?? null;
    });
    expect(overrideNote).toMatch(/override/i);
  });

  test("override button visible when validation failed", async ({ page }) => {
    await seedPreviewRun(page, [validationEvent(false)]);
    await expect(page.getByTestId("apply-validation-gate")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("apply-gate-override")).toBeVisible();
    await expect(page.getByTestId("ship-apply-primary")).toBeDisabled();
  });
});
