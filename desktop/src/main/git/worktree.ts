import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { app } from "electron";

const execFileAsync = promisify(execFile);

export interface RunWorkspace {
  runId: string;
  /** Directory the agent runs in (a git worktree, or the project root for non-git). */
  workspace: string;
  /** The original project root (where approved changes are applied). */
  projectRoot: string;
  /** True when an isolated git worktree was created. */
  isGit: boolean;
  /** Base ref the worktree was created from (HEAD sha), git only. */
  baseRef?: string;
}

async function isGitRepo(root: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

async function headSha(root: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root });
  return stdout.trim();
}

function runsDir(): string {
  return path.join(app.getPath("userData"), "runs");
}

/**
 * Prepare an isolated working area for a run (Faz 3). For a git project we add a
 * detached worktree at HEAD so the agent never disturbs the user's branches or
 * working tree. For a non-git project we operate in place (changes are tracked
 * by the file watcher + snapshot, applied = no-op).
 */
export async function prepareWorkspace(
  projectRoot: string,
  runId: string,
): Promise<RunWorkspace> {
  const git = await isGitRepo(projectRoot);
  if (!git) {
    return { runId, workspace: projectRoot, projectRoot, isGit: false };
  }

  const baseRef = await headSha(projectRoot);
  const workspace = path.join(runsDir(), runId, "workspace");
  await fs.mkdir(path.dirname(workspace), { recursive: true });
  // Detached worktree at HEAD — no branch churn in the user's repo.
  await execFileAsync("git", ["worktree", "add", "--detach", workspace, baseRef], {
    cwd: projectRoot,
  });
  return { runId, workspace, projectRoot, isGit: true, baseRef };
}

/** Revert selected files inside the worktree (git checkout / remove untracked). */
export async function discardWorkspaceFiles(
  ws: RunWorkspace,
  files: string[],
): Promise<string[]> {
  const discarded: string[] = [];
  for (const rel of files) {
    if (!rel || rel.startsWith(".claude/")) continue;
    const abs = path.resolve(ws.workspace, rel);
    if (!abs.startsWith(path.resolve(ws.workspace))) continue;
    if (!ws.isGit) continue;
    try {
      await execFileAsync("git", ["checkout", "HEAD", "--", rel], { cwd: ws.workspace });
      discarded.push(rel);
    } catch {
      try {
        await fs.rm(abs, { force: true, recursive: true });
        discarded.push(rel);
      } catch {
        /* ignore */
      }
    }
  }
  return discarded;
}

/** Remove a run's worktree and its directory. Safe to call multiple times. */
export async function cleanupWorkspace(ws: RunWorkspace): Promise<void> {
  if (!ws.isGit) return;
  try {
    await execFileAsync("git", ["worktree", "remove", "--force", ws.workspace], {
      cwd: ws.projectRoot,
    });
  } catch {
    /* already removed */
  }
  try {
    await fs.rm(path.join(runsDir(), ws.runId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/**
 * Apply approved files from the worktree back to the project root and commit on
 * a dedicated branch. Returns the commit + branch. Non-git → copies in place.
 */
export async function applyWorkspaceFiles(
  ws: RunWorkspace,
  files: string[],
  message: string,
): Promise<{ commit?: string; branch?: string; applied: string[] }> {
  const applied: string[] = [];
  for (const rel of files) {
    const from = path.resolve(ws.workspace, rel);
    const to = path.resolve(ws.projectRoot, rel);
    if (!to.startsWith(path.resolve(ws.projectRoot))) continue; // path traversal guard
    if (!from.startsWith(path.resolve(ws.workspace))) continue;
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
    applied.push(rel);
  }

  if (!ws.isGit || applied.length === 0) return { applied };

  const branch = `marketing-ide/run-${ws.runId.slice(0, 8)}`;
  await execFileAsync("git", ["checkout", "-B", branch], { cwd: ws.projectRoot });
  await execFileAsync("git", ["add", ...applied], { cwd: ws.projectRoot });
  await execFileAsync("git", ["commit", "-m", message], { cwd: ws.projectRoot });
  const commit = (await headSha(ws.projectRoot)) || undefined;
  return { commit, branch, applied };
}
