/**
 * CI gate: ops lifecycle must route through execution kernel bridge/store.
 * Fails if known bypass patterns appear outside allowlisted files.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src");

const ALLOWLIST = new Set([
  "shared/executionKernel.ts",
  "shared/executionKernelBridge.ts",
  "shared/executionGraph.ts",
  "shared/executionRetryPolicy.ts",
  "shared/executionHandlers.ts",
  "shared/cmoOpsCadence.ts",
  "shared/executionKernelRunEvents.ts",
  "renderer/state/store.ts",
]);

const PATTERNS = [
  { re: /completeOpsTaskCore\s*\(/, label: "completeOpsTaskCore(" },
  { re: /dispatchOpsTaskCore\s*\(/, label: "dispatchOpsTaskCore(" },
  { re: /skipOpsTaskCore\s*\(/, label: "skipOpsTaskCore(" },
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

const violations = [];
for (const file of walk(ROOT)) {
  const rel = relative(join(ROOT, ".."), file).replace(/\\/g, "/");
  const normalized = rel.replace(/^desktop\/src\//, "").replace(/^src\//, "");
  if (ALLOWLIST.has(normalized)) continue;
  const text = readFileSync(file, "utf8");
  for (const { re, label } of PATTERNS) {
    if (re.test(text)) {
      violations.push(`${normalized}: ${label}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Execution kernel bypass gate FAILED:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log("Execution kernel bypass gate passed.");
