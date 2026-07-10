import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface RepoProfile {
  id: string;
  name: string;
  source: { kind: "repo"; url: string };
  framework?: string;
  productType?: string;
  readmeSummary?: string;
  routes: string[];
  hasAnalytics: boolean;
  excludedPaths: string[];
  scannedFileCount: number;
}

function hashId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

function detectFramework(pkg?: string): { framework?: string; productType?: string } {
  if (!pkg) return {};
  try {
    const json = JSON.parse(pkg) as { dependencies?: Record<string, string> };
    const deps = json.dependencies ?? {};
    if (deps.next) return { framework: "Next.js", productType: "Web app" };
    if (deps.nuxt) return { framework: "Nuxt", productType: "Web app" };
    if (deps.react) return { framework: "React", productType: "Web app" };
    if (deps.vue) return { framework: "Vue", productType: "Web app" };
  } catch {
    /* ignore */
  }
  return {};
}

/** Shallow clone a public git repo and build a profile. */
export async function profileFromRepo(repoUrl: string): Promise<RepoProfile> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "marketing-ide-clone-"));
  try {
    await execFileAsync("git", ["clone", "--depth", "1", repoUrl, tmp], { timeout: 120_000 });
    let pkg: string | undefined;
    let readme: string | undefined;
    try {
      pkg = await readFile(path.join(tmp, "package.json"), "utf8");
    } catch {
      /* no package.json */
    }
    try {
      readme = await readFile(path.join(tmp, "README.md"), "utf8");
    } catch {
      /* no readme */
    }
    const { framework, productType } = detectFramework(pkg);
    const name = path.basename(repoUrl.replace(/\.git$/, "")) || "repository";

    return {
      id: hashId(repoUrl),
      name,
      source: { kind: "repo", url: repoUrl },
      framework,
      productType,
      readmeSummary: readme?.replace(/[#>*_`-]/g, "").trim().slice(0, 600),
      routes: [],
      hasAnalytics: false,
      excludedPaths: [],
      scannedFileCount: pkg ? 2 : 1,
    };
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
