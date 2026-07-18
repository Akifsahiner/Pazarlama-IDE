import { expect, type Page } from "@playwright/test";

export const CMO_LS_SUFFIXES = [
  "campaign_session.v1",
  "ops_cadence.v1",
  "lane_b_workspace.v1",
  "lane_a_workspace.v1",
  "growth_control_plane.v1",
  "distribution_operator.v1",
  "influencer_operator.v1",
  "cmo_continuous.v1",
  "lane_c_workspace.v1",
  "delegate_operator.v1",
  "growth_memory.v1",
  "budget_plan.v1",
  "product_activation.v1",
  "lane_d_workspace.v1",
  "revenue_profile.v1",
  "monetization_workspace.v1",
  "founder_fit.v1",
  "growth_narrative.v1",
  "strategic_decision.v1",
  "public_presence_policy.v1",
  "growth_mechanism_profile.v1",
  "first_ship_at.v1",
] as const;

export async function goDashboard(page: Page) {
  await page.getByRole("button", { name: /^Dashboard$/i }).click();
}

export async function resetCmoLifecycleForE2e(page: Page) {
  await page.evaluate((suffixes) => {
    const useApp = (window as Window & {
      __useApp?: {
        getState: () => {
          activeProjectId?: string;
          project?: { id: string };
          marketingProfile?: Record<string, unknown>;
          runCmoIntake: () => unknown;
        };
        setState: (patch: Record<string, unknown>) => void;
      };
    }).__useApp;
    if (!useApp) throw new Error("E2E store hook missing");

    const projectId = useApp.getState().activeProjectId ?? useApp.getState().project?.id;
    if (projectId) {
      for (const suffix of suffixes) {
        localStorage.removeItem(`${suffix}.${projectId}`);
      }
    }

    const profile = useApp.getState().marketingProfile ?? {};
    useApp.setState({
      plan: null,
      planPreviewMode: false,
      planProgress: undefined,
      marketingProfile: {
        ...profile,
        founder_fit: undefined,
        public_presence_policy: undefined,
        growth_mechanism_profile: undefined,
        growth_narrative: undefined,
        strategic_decision: undefined,
        channel_thesis: undefined,
        ops_cadence: undefined,
        campaign_session: undefined,
        budget_plan: undefined,
        product_activation: undefined,
        revenue_profile: undefined,
        monetization_workspace: undefined,
        lane_a_workspace: undefined,
        lane_b_workspace: undefined,
        lane_d_workspace: undefined,
        growth_control_plane: undefined,
        distribution_operator: undefined,
        influencer_operator: undefined,
        delegate_operator: undefined,
        cmo_continuous: undefined,
        growth_memory: undefined,
      },
      channelThesis: undefined,
      opsCadence: undefined,
      budgetPlan: undefined,
      productActivation: undefined,
      revenueProfile: undefined,
      monetizationWorkspace: undefined,
      laneAWorkspace: undefined,
      laneBWorkspace: undefined,
      laneDWorkspace: undefined,
      growthControlPlane: undefined,
      distributionOperator: undefined,
      influencerOperator: undefined,
      delegateWorkspace: undefined,
      delegateOperator: undefined,
      cmoContinuous: undefined,
      growthMemory: undefined,
      warRoomExpanded: false,
      firstHourActive: false,
      pendingWeekReviewOpen: false,
    });
    useApp.getState().runCmoIntake();
  }, CMO_LS_SUFFIXES);

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const useApp = (window as Window & {
            __useApp?: {
              getState: () => {
                channelThesis?: unknown;
                marketingProfile?: { founder_fit?: unknown };
              };
            };
          }).__useApp;
          if (!useApp) return false;
          const s = useApp.getState();
          return Boolean(s.channelThesis && !s.marketingProfile?.founder_fit);
        }),
      { timeout: 30_000 },
    )
    .toBeTruthy();
}

export async function completeFounderFitWizard(page: Page) {
  await expect(page.getByTestId("founder-fit-wizard")).toBeVisible({ timeout: 20_000 });

  const steps: Array<{ id: string; pick: RegExp } | { id: string; text: string }> = [
    { id: "brand_face_readiness", pick: /No — build without my face/i },
    { id: "controversy_tolerance", pick: /Avoid polarizing/i },
    { id: "monthly_budget_band", pick: /Under \$500/i },
    { id: "scale_readiness", pick: /Probably/i },
    {
      id: "magic_moment",
      text: "User creates the first marketing brief and sees a measurable next action",
    },
    { id: "weekly_marketing_hours", pick: /3–7 hours/i },
    { id: "thirty_day_win", pick: /Qualified signups/i },
  ];

  for (const step of steps) {
    const region = page.getByTestId(`founder-fit-step-${step.id}`);
    await expect(region).toBeVisible();
    if ("text" in step) {
      await region.locator("textarea").fill(step.text);
    } else {
      await region.getByRole("button", { name: step.pick }).click();
    }
    await page.getByTestId("founder-fit-continue").click();
  }
}

export async function completePublicPresence(page: Page) {
  await expect(page.getByTestId("public-presence-card")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("public-presence-continue").click();
}

export async function sealStrategicDecision(page: Page) {
  await expect(page.getByTestId("strategic-decision-card")).toBeVisible({ timeout: 30_000 });
  const eligible = page.locator('[data-testid^="strategic-option-"]:not([disabled])').first();
  await expect(eligible).toBeVisible();
  await eligible.click();
  await page.getByTestId("seal-strategic-decision").click();
  await expect(page.getByTestId("budget-setup-card")).toBeVisible({ timeout: 20_000 });
}

export async function completePreWeek1Setup(page: Page) {
  await page
    .getByTestId("budget-setup-card")
    .getByRole("button", { name: /Use band estimate/i })
    .click();
  await expect(page.getByTestId("product-activation-card")).toBeVisible({ timeout: 15_000 });

  const activation = page.getByTestId("product-activation-card");
  const eventInput = activation.locator("input").first();
  const eventValue = await eventInput.inputValue();
  if (eventValue.trim().length < 3) {
    await eventInput.fill("User completes first useful marketing workflow");
  }
  const numericInputs = activation.locator('input[type="number"]');
  await numericInputs.nth(0).fill("20");
  await numericInputs.nth(1).fill("12");
  await activation.getByRole("button", { name: /Save activation gate/i }).click();

  await expect(page.getByTestId("revenue-setup-card")).toBeVisible({ timeout: 15_000 });
  const revenue = page.getByTestId("revenue-setup-card");
  const revenueNumbers = revenue.locator('input[type="number"]');
  if ((await revenueNumbers.count()) >= 3) {
    await revenueNumbers.nth(0).fill("2");
    await revenueNumbers.nth(1).fill("400");
  }
  await revenue.getByRole("button", { name: /Save revenue intake/i }).click();

  await expect(page.getByTestId("cmo-intake-card")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("cmo-start-week1")).toBeEnabled({ timeout: 10_000 });
}

/** Full intake reset → seal → pre-Week-1 setup → Start Week 1 on workspace. */
export async function bootstrapCmoIntakeAndStartWeek1(page: Page) {
  await goDashboard(page);
  await resetCmoLifecycleForE2e(page);
  await completeFounderFitWizard(page);
  await completePublicPresence(page);
  await sealStrategicDecision(page);
  await completePreWeek1Setup(page);
  await page.getByTestId("cmo-start-week1").click();
  await expect(page.getByTestId("growth-command-surface")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("growth-command-surface")).toContainText(/Bugün|Today/i);
}
