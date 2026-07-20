#!/usr/bin/env node
/**
 * Part 6 — product understanding structural smoke.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(desktopRoot, "..");

let failed = false;

const mustExist = [
  "src/shared/productUnderstandingInput.ts",
  "src/shared/productUnderstandingRegistry.ts",
  "src/shared/productUnderstandingPolicy.ts",
  "src/shared/productUnderstandingFabrication.ts",
  "src/shared/productUnderstandingFromScan.ts",
  "src/shared/productUnderstandingFromProfile.ts",
  "src/shared/productUnderstandingIntakeBind.ts",
  "src/shared/surfaceOwnership.ts",
  "src/renderer/components/WhyPanel.tsx",
  "e2e/product-understanding.spec.ts",
  "../PRODUCT_UNDERSTANDING_SPEC.md",
  "../PRODUCT_UNDERSTANDING_DOGFOOD.md",
];

for (const rel of mustExist) {
  const full = rel.startsWith("..") ? path.join(repoRoot, rel.slice(3)) : path.join(desktopRoot, rel);
  try {
    await access(full);
  } catch {
    console.error(`[product-understanding] missing ${rel}`);
    failed = true;
  }
}

const policySrc = await readFile(
  path.join(desktopRoot, "src/shared/productUnderstandingPolicy.ts"),
  "utf8",
);
const intakeSrc = await readFile(path.join(desktopRoot, "src/shared/cmoIntake.ts"), "utf8");
const storeSrc = await readFile(path.join(desktopRoot, "src/renderer/state/store.ts"), "utf8");

if (!policySrc.includes("buildProductUnderstanding")) {
  console.error("[product-understanding] buildProductUnderstanding missing");
  failed = true;
}
if (!intakeSrc.includes("attachIntakeUnderstanding")) {
  console.error("[product-understanding] intake bind missing");
  failed = true;
}
if (!storeSrc.includes("auditClaimFabrication")) {
  console.error("[product-understanding] store FAB gate missing");
  failed = true;
}

if (failed) process.exit(1);
console.log("[product-understanding] OK — Part 6 structural gates pass");
