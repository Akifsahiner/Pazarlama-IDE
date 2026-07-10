import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { RunEventStatus } from "../../shared/types";

const execFileAsync = promisify(execFile);

export interface ValidationCheck {
  label: string;
  status: RunEventStatus;
  detail?: string;
}

interface ScriptCheck {
  label: string;
  script: string;
}

async function readScripts(workspace: string): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(path.join(workspace, "package.json"), "utf8");
    return (JSON.parse(raw).scripts ?? {}) as Record<string, string>;
  } catch {
    return {};
  }
}

async function runScript(workspace: string, script: string): Promise<ValidationCheck["status"]> {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  try {
    await execFileAsync(npm, ["run", script], {
      cwd: workspace,
      shell: process.platform === "win32",
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return "success";
  } catch {
    return "failed";
  }
}

/**
 * Run the project's available validation scripts (typecheck / lint / build) in
 * the run workspace. Streams per-check results via {@link onCheck} so the UI can
 * render a live checklist; resolves with the full set.
 */
export async function runValidation(
  workspace: string,
  onCheck: (check: ValidationCheck) => void,
): Promise<ValidationCheck[]> {
  const scripts = await readScripts(workspace);
  const candidates: ScriptCheck[] = [
    { label: "TypeScript", script: "typecheck" },
    { label: "Lint", script: "lint" },
    { label: "Build", script: "build" },
  ].filter((c) => c.script in scripts);

  const results: ValidationCheck[] = [];
  for (const c of candidates) {
    onCheck({ label: c.label, status: "running" });
    const status = await runScript(workspace, c.script);
    const result: ValidationCheck = { label: c.label, status };
    results.push(result);
    onCheck(result);
  }
  return results;
}
