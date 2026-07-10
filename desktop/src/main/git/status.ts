import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface RepoStatus {
  isGit: boolean;
  branch?: string;
  headSha?: string;
}

async function isGitRepo(root: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

/** Read-only git metadata for status bar / run context. */
export async function getRepoStatus(root: string): Promise<RepoStatus> {
  const isGit = await isGitRepo(root);
  if (!isGit) return { isGit: false };
  try {
    const [branchOut, shaOut] = await Promise.all([
      execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root }),
      execFileAsync("git", ["rev-parse", "--short", "HEAD"], { cwd: root }),
    ]);
    return {
      isGit: true,
      branch: branchOut.stdout.trim() || undefined,
      headSha: shaOut.stdout.trim() || undefined,
    };
  } catch {
    return { isGit: true };
  }
}
