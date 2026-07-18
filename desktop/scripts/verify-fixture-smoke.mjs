#!/usr/bin/env node
/**
 * Faz 4 exit gate — verify fixture matrix pass rate ≥ 80% (mocked validations).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function verifyPassRate(result) {
  if (!result.validations?.length) return 0;
  const passed = result.validations.filter((v) => v.passed).length;
  return passed / result.validations.length;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matrixPath = path.join(root, "e2e/fixtures/verify-matrix.json");
const MIN_PASS = 0.8;

const raw = JSON.parse(await readFile(matrixPath, "utf8"));
const fixtures = raw.fixtures ?? [];
let passed = 0;

for (const fx of fixtures) {
  const result = { validations: fx.mockValidations ?? [] };
  const rate = verifyPassRate(result);
  const ok = Math.abs(rate - (fx.expectedPassRate ?? 0)) < 0.001;
  if (ok) passed += 1;
  else {
    console.error(`FAIL ${fx.id}: expected ${fx.expectedPassRate}, got ${rate}`);
  }
}

const rate = fixtures.length ? passed / fixtures.length : 0;
console.log(`Verify fixtures: ${passed}/${fixtures.length} (${Math.round(rate * 100)}%)`);
if (rate < MIN_PASS) {
  console.error(`Exit gate failed — need ≥${MIN_PASS * 100}%`);
  process.exit(1);
}
