import { expect, type Page } from "@playwright/test";

/** Wait for Electron shell + fixture project (handles offline gate and slow init). */
export async function ensureE2eFixtureReady(page: Page, timeoutMs = 180_000) {
  await page.waitForLoadState("domcontentloaded");

  const offlineBtn = page.getByRole("button", { name: /continue offline|continue exploring/i });
  if (await offlineBtn.isVisible({ timeout: 12_000 }).catch(() => false)) {
    await offlineBtn.click();
  }

  const marketingBtn = page.getByRole("button", { name: /^Marketing$/i });
  if (await marketingBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await marketingBtn.click();
  }

  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const useApp = (window as Window & {
            __useApp?: {
              getState: () => {
                initPhase?: string;
                phase?: string;
                scanning?: boolean;
                project?: { id: string };
                localOnlyMode?: boolean;
                settings?: { personaChosen?: boolean };
                navigate: (route: string) => void;
                openProject: (
                  source: { kind: "folder"; path: string },
                  opts?: { workspace?: boolean },
                ) => Promise<void>;
                continueOffline: () => void;
                updateSettings: (patch: Record<string, unknown>) => Promise<void>;
              };
              setState: (patch: Record<string, unknown>) => void;
            };
          }).__useApp;
          if (!useApp) return "no-store";

          const state = useApp.getState();
          if (state.initPhase !== "done") return `init:${state.initPhase}`;

          if (!state.project) {
            const e2e = await window.api.app.e2e();
            if (!e2e.fixturePath) return "no-fixture";

            if (!state.localOnlyMode) state.continueOffline();
            if (!state.settings?.personaChosen) {
              await state.updateSettings({ persona: "marketing", personaChosen: true });
            }
            useApp.setState({ e2eDryRunExecution: true, phase: "workspace", route: "workspace" });
            await state.openProject({ kind: "folder", path: e2e.fixturePath }, { workspace: true });
          }

          const after = useApp.getState();
          if (after.scanning) return "scanning";
          if (!after.project || after.phase !== "workspace") return `phase:${after.phase ?? "none"}`;
          after.navigate("home");
          return "ready";
        }),
      { timeout: timeoutMs },
    )
    .toBe("ready");

  await expect(page.getByRole("button", { name: /^Dashboard$/i })).toBeVisible({ timeout: 15_000 });
}
