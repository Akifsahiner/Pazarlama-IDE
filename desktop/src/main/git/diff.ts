import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RunWorkspace } from "./worktree";

const execFileAsync = promisify(execFile);

export interface FileChange {
  file: string;
  additions: number;
  deletions: number;
}

export interface FilePatch extends FileChange {
  patch: string;
}

/**
 * List files changed in the worktree relative to its base (git: `diff HEAD`,
 * including untracked). Numstat gives additions/deletions per file.
 */
export async function changedFiles(ws: RunWorkspace): Promise<FileChange[]> {
  if (!ws.isGit) return [];
  // Stage everything (including new files) in the worktree's index so numstat
  // captures untracked files, then diff the index against HEAD.
  await execFileAsync("git", ["add", "-A"], { cwd: ws.workspace });
  const { stdout } = await execFileAsync("git", ["diff", "--cached", "--numstat"], {
    cwd: ws.workspace,
  });
  return stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [add, del, file] = line.split("\t");
      return {
        file,
        additions: add === "-" ? 0 : Number(add) || 0,
        deletions: del === "-" ? 0 : Number(del) || 0,
      };
    })
    // Exclude the injected skills dir — it must never be applied to the project.
    .filter((c) => !!c.file && !c.file.startsWith(".claude/"));
}

/** Unified diff for a single file in the worktree (vs HEAD). */
export async function filePatch(ws: RunWorkspace, file: string): Promise<FilePatch> {
  if (!ws.isGit) {
    return { file, additions: 0, deletions: 0, patch: "" };
  }
  await execFileAsync("git", ["add", "-A"], { cwd: ws.workspace });
  const { stdout: patch } = await execFileAsync(
    "git",
    ["diff", "--cached", "--", file],
    { cwd: ws.workspace },
  );
  const { stdout: numstat } = await execFileAsync(
    "git",
    ["diff", "--cached", "--numstat", "--", file],
    { cwd: ws.workspace },
  );
  const [add, del] = numstat.trim().split("\t");
  return {
    file,
    additions: add === "-" ? 0 : Number(add) || 0,
    deletions: del === "-" ? 0 : Number(del) || 0,
    patch,
  };
}
