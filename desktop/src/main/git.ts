import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitApplyInput {
  root: string;
  targetFile: string;
  content: string;
  branch?: string;
  message?: string;
}

export interface GitApplyResult {
  commit: string;
  branch: string;
}

async function isGitRepo(root: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

export async function applyAssetGit(input: GitApplyInput): Promise<GitApplyResult> {
  const { root, targetFile, content } = input;
  if (!(await isGitRepo(root))) {
    throw new Error("Not a git repository");
  }

  const branch = input.branch ?? `marketing-ide/${Date.now()}`;
  const resolved = path.resolve(root, targetFile);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error("Target path is outside the project");
  }

  await execFileAsync("git", ["checkout", "-B", branch], { cwd: root });
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, "utf8");
  await execFileAsync("git", ["add", targetFile], { cwd: root });
  await execFileAsync("git", ["commit", "-m", input.message ?? "Marketing IDE: apply asset"], {
    cwd: root,
  });
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root });
  return { commit: stdout.trim(), branch };
}

export async function rollbackCommit(root: string, commit: string): Promise<void> {
  if (!(await isGitRepo(root))) throw new Error("Not a git repository");
  await execFileAsync("git", ["revert", "--no-edit", commit], { cwd: root });
}
