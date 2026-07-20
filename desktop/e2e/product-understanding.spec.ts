import { test, expect } from "@playwright/test";

test.describe("Product understanding @product-understanding", () => {
  test("WhyPanel contract — data-testid present in bundle exports", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const whyPanel = await fs.readFile(
      path.join(process.cwd(), "src/renderer/components/WhyPanel.tsx"),
      "utf8",
    );
    expect(whyPanel).toContain('data-testid="why-panel"');
    expect(whyPanel).toContain("claim-");
  });
});
