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

test.describe("Outreach dispatch @outreach", () => {
  test("confirm modal gates webhook send; cancel dismisses", async () => {
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
        const useApp = (window as Window & {
          __useApp?: {
            getState: () => { navigate: (r: string) => void; settings: Record<string, unknown> };
            setState: (p: Record<string, unknown>) => void;
          };
        }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");

        const snap = useApp.getState();
        useApp.setState({
          settings: {
            ...snap.settings,
            persona: "sales",
            personaChosen: true,
            outreachWebhookUrl: "https://example.com/outreach-hook",
            outreachWebhookProvider: "generic",
          },
          marketingProfile: snap.marketingProfile
            ? {
                ...snap.marketingProfile,
                outreach_integrations: {
                  webhook_url: "https://example.com/outreach-hook",
                  webhook_provider: "generic",
                },
              }
            : snap.marketingProfile,
          browser: {
            ...snap.browser,
            findings: [
              {
                id: "f-lead-1",
                severity: "info",
                title: "Lead: Jordan Lee",
                evidence: "company: Acme SaaS — posted about onboarding pain",
                suggestion: "Hiring first marketer",
                url: "https://example.com/jordan",
                createdAt: new Date().toISOString(),
              },
            ],
            frameHistory: snap.browser.frameHistory ?? [],
            autoApprove: snap.browser.autoApprove ?? false,
          },
          thread: [
            {
              id: "e2e-email-asset",
              role: "agent",
              kind: "asset",
              ts: Date.now(),
              asset: {
                id: "e2e-email-1",
                type: "email",
                targetFile: "sales/outreach/jordan.md",
                after: "Subject: Quick question on onboarding\n\nHi Jordan — saw your post.",
              },
            },
          ],
        });

        snap.navigate("assets");
      });

      const panel = window.getByTestId("outreach-dispatch-panel");
      await expect(panel).toBeVisible({ timeout: 15_000 });
      await expect(panel.getByRole("button", { name: /Send to webhook/i })).toBeEnabled();

      await panel.getByRole("button", { name: /Send to webhook/i }).click();
      const modal = window.getByTestId("outreach-dispatch-confirm");
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await expect(modal.getByText(/Send to webhook\?/i)).toBeVisible();
      await expect(modal.getByText(/never sends email for you/i)).toBeVisible();

      await modal.getByTestId("outreach-dispatch-cancel").click();
      await expect(modal).toHaveCount(0, { timeout: 5_000 });
    } finally {
      await app.close();
    }
  });

  test("confirm send shows success after mocked dispatch", async () => {
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
        const useApp = (window as Window & {
          __useApp?: {
            getState: () => { navigate: (r: string) => void; settings: Record<string, unknown> };
            setState: (p: Record<string, unknown>) => void;
          };
        }).__useApp;
        if (!useApp) throw new Error("E2E store hook missing");

        const snap = useApp.getState();
        (window as Window & {
          __e2eMockOutreachDispatch?: () => Promise<{
            ok: boolean;
            message: string;
            detail?: string;
          }>;
        }).__e2eMockOutreachDispatch = async () => ({
          ok: true,
          message: "Sent to lemlist — 1 leads, 1 drafts.",
          detail: "Dispatched just now",
        });

        useApp.setState({
          settings: {
            ...snap.settings,
            persona: "sales",
            personaChosen: true,
            outreachWebhookUrl: "https://example.com/outreach-hook",
            outreachWebhookProvider: "lemlist",
          },
          marketingProfile: snap.marketingProfile
            ? {
                ...snap.marketingProfile,
                outreach_integrations: {
                  webhook_url: "https://example.com/outreach-hook",
                  webhook_provider: "lemlist",
                },
              }
            : snap.marketingProfile,
          browser: {
            ...snap.browser,
            findings: [
              {
                id: "f-lead-2",
                severity: "info",
                title: "Lead: Sam Rivera",
                evidence: "company: BetaOps — scaling outbound",
                suggestion: "New VP Sales",
                url: "https://example.com/sam",
                createdAt: new Date().toISOString(),
              },
            ],
            frameHistory: snap.browser.frameHistory ?? [],
            autoApprove: snap.browser.autoApprove ?? false,
          },
          thread: [
            {
              id: "e2e-email-asset-2",
              role: "agent",
              kind: "asset",
              ts: Date.now(),
              asset: {
                id: "e2e-email-2",
                type: "email",
                targetFile: "sales/outreach/sam.md",
                after: "Subject: Congrats on the VP role\n\nHi Sam — quick note.",
              },
            },
          ],
        });

        snap.navigate("assets");
      });

      const panel = window.getByTestId("outreach-dispatch-panel");
      await expect(panel).toBeVisible({ timeout: 15_000 });
      await panel.getByRole("button", { name: /Send to webhook/i }).click();

      const modal = window.getByTestId("outreach-dispatch-confirm");
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await modal.getByTestId("outreach-dispatch-confirm-send").click();

      await expect(modal).toHaveCount(0, { timeout: 10_000 });
      await expect(panel.getByText(/Sent to lemlist/i)).toBeVisible({ timeout: 10_000 });
    } finally {
      await app.close();
    }
  });
});
