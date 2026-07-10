import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Clone a public git repo to a temp directory and return the local path. */
export async function cloneRepo(url: string): Promise<string> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "marketing-ide-repo-"));
  await execFileAsync("git", ["clone", "--depth", "1", url, tmp], { timeout: 120_000 });
  return tmp;
}
