#!/usr/bin/env node
/**
 * Faz 3 — duplicate CTA lint: Execution Record owns primary CTA on workspace.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const renderer = path.join(root, "src/renderer");

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, acc);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

let failed = 0;

const files = walk(renderer);
const growthImports = files.filter((f) => {
  const text = fs.readFileSync(f, "utf8");
  return (
    /GrowthCommandSurface/.test(text) &&
    !f.endsWith("GrowthCommandSurface.tsx")
  );
});

if (growthImports.length > 0) {
  failed += 1;
  console.error("FAIL: GrowthCommandSurface must not be imported:");
  for (const f of growthImports) console.error(`  - ${path.relative(root, f)}`);
} else {
  console.log("ok GrowthCommandSurface not imported in renderer");
}

const detailPanel = fs.readFileSync(
  path.join(renderer, "features/workspace/executionRecord/ExecutionDetailPanel.tsx"),
  "utf8",
);
if (/detail-empty-cta/.test(detailPanel)) {
  failed += 1;
  console.error("FAIL: ExecutionDetailPanel must not duplicate primary CTA (detail-empty-cta)");
} else {
  console.log("ok ExecutionDetailPanel has no duplicate primary CTA");
}

const morningHero = path.join(
  renderer,
  "features/workspace/executionRecord/MorningBriefHero.tsx",
);
if (!fs.existsSync(morningHero)) {
  failed += 1;
  console.error("FAIL: MorningBriefHero.tsx missing");
} else {
  const text = fs.readFileSync(morningHero, "utf8");
  if (!text.includes("morning-brief-grid")) {
    failed += 1;
    console.error("FAIL: MorningBriefHero missing morning-brief-grid testid");
  } else {
    console.log("ok MorningBriefHero grid testid present");
  }
}

if (failed > 0) {
  console.error(`\n${failed} duplicate-cta lint failure(s)`);
  process.exit(1);
}

console.log("\nduplicate-cta lint passed");
