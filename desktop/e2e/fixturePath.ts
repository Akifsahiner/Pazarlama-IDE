import path from "node:path";

/** Minimal Next-style folder for Electron e2e scans (resolved from desktop package root). */
export const E2E_FIXTURE_APP = path.join(process.cwd(), "e2e", "fixtures", "sample-app");
