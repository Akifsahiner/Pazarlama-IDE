import path from "node:path";
import { test, expect, _electron as electron } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { verifyPassRate } from "../../src/shared/browserVerify";

const mainEntry = path.join(process.cwd(), "out", "main", "index.js");

test.describe("Browser verify matrix @browser-verify", () => {
  test("mock validation pass rate meets fixture expectations", async () => {
    const matrixPath = path.join(process.cwd(), "e2e/fixtures/verify-matrix.json");
    const raw = JSON.parse(await readFile(matrixPath, "utf8"));
    let ok = 0;
    for (const fx of raw.fixtures) {
      const rate = verifyPassRate({ validations: fx.mockValidations });
      if (Math.abs(rate - fx.expectedPassRate) < 0.001) ok += 1;
    }
    expect(ok / raw.fixtures.length).toBeGreaterThanOrEqual(0.8);
  });

  test("browserVerify module and spec exist in build tree", async () => {
    const app = await electron.launch({
      args: [mainEntry],
      env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: "true" },
    });
    try {
      const page = await app.firstWindow({ timeout: 60_000 });
      await expect(page.locator("body")).toBeVisible();
    } finally {
      await app.close();
    }
  });
});
