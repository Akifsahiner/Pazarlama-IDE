import { promises as fs } from "node:fs";
import path from "node:path";
import { app } from "electron";

/**
 * Resolve the bundled skills source directory. Skills are authored at the repo
 * root `skills/` (dev) and shipped under resources (packaged).
 */
export function skillsSourceDir(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, "skills");
  // Dev: app path is .../<repo>/desktop → skills live at <repo>/skills.
  return path.join(app.getAppPath(), "..", "skills");
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy the bundled marketing/sales skills into the run worktree's
 * `.claude/skills` so the Agent SDK discovers them via `settingSources:["project"]`.
 * Returns the list of installed skill names (directory names with a SKILL.md).
 * The `.claude` directory is never applied back to the user's project.
 */
export async function installSkills(workspace: string): Promise<string[]> {
  const src = skillsSourceDir();
  if (!(await exists(src))) return [];

  const dest = path.join(workspace, ".claude", "skills");
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });
  const installed: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(src, entry.name, "SKILL.md");
    if (!(await exists(skillFile))) continue;
    await fs.cp(path.join(src, entry.name), path.join(dest, entry.name), {
      recursive: true,
    });
    installed.push(entry.name);
  }
  return installed;
}
