import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProjectProfile, ProjectSource } from "../../shared/types";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  ".turbo",
  ".cache",
  "coverage",
  ".vercel",
]);

/** Files we must never read content from, even if present. */
const SECRET_PATTERNS = [/^\.env/i, /\.pem$/i, /\.key$/i, /credentials/i, /secret/i];

function isSecret(name: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(name));
}

function hashId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

async function safeRead(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return undefined;
  }
}

interface WalkResult {
  fileCount: number;
  routes: string[];
  excluded: string[];
  hasAnalytics: boolean;
  packageJson?: string;
  readme?: string;
}

export interface ScanProgress {
  message: string;
  pct?: number;
}

async function walk(
  root: string,
  onProgress?: (p: ScanProgress) => void,
): Promise<WalkResult> {
  const result: WalkResult = {
    fileCount: 0,
    routes: [],
    excluded: [],
    hasAnalytics: false,
  };
  let lastEmit = Date.now();
  let readmeEmitted = false;
  let analyticsEmitted = false;
  let lastRouteEmit = 0;

  const emitProgress = (message: string, pctOverride?: number) => {
    if (!onProgress) return;
    const now = Date.now();
    if (pctOverride == null && now - lastEmit < 2000 && result.fileCount > 0) return;
    lastEmit = now;
    const pct = pctOverride ?? Math.min(92, Math.round(result.fileCount / 2 + 8));
    onProgress({ message, pct });
  };

  /** Discovery milestones bypass the file-count throttle so ScanTheater stays lively. */
  const emitMilestone = (message: string) => {
    emitProgress(message, Math.min(92, Math.round(result.fileCount / 2 + 12)));
  };

  async function recurse(dir: string, depth: number): Promise<void> {
    if (depth > 6) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await recurse(full, depth + 1);
        continue;
      }

      if (isSecret(entry.name)) {
        result.excluded.push(rel);
        continue;
      }

      result.fileCount += 1;
      if (result.fileCount % 25 === 0) {
        emitProgress(`Scanning ${result.fileCount} files…`);
      }

      const lower = entry.name.toLowerCase();
      if (lower === "readme.md" && !result.readme) {
        result.readme = await safeRead(full);
        if (result.readme && !readmeEmitted) {
          readmeEmitted = true;
          emitMilestone("README parsed");
        }
      }
      if (lower === "package.json" && depth <= 1 && !result.packageJson) {
        result.packageJson = await safeRead(full);
      }
      if (/(page|route|index)\.(t|j)sx?$/.test(lower) && /(app|pages|routes)/.test(rel)) {
        const routeName = rel.replace(/\\/g, "/");
        if (result.routes.length < 60) {
          result.routes.push(routeName);
          const n = result.routes.length;
          if (n === 1 || n === 5 || n === 12 || (n > 12 && n - lastRouteEmit >= 10)) {
            lastRouteEmit = n;
            emitMilestone(`${n} route${n === 1 ? "" : "s"} mapped`);
          }
        }
      }
      if (/(gtag|analytics|posthog|plausible|mixpanel|segment)/i.test(entry.name)) {
        if (!result.hasAnalytics) {
          result.hasAnalytics = true;
          if (!analyticsEmitted) {
            analyticsEmitted = true;
            const name = entry.name.toLowerCase();
            const label = name.includes("posthog")
              ? "PostHog found"
              : name.includes("plausible")
                ? "Plausible found"
                : name.includes("mixpanel")
                  ? "Mixpanel found"
                  : name.includes("segment")
                    ? "Segment found"
                    : "Analytics integration found";
            emitMilestone(label);
          }
        }
      }
    }
  }

  emitProgress("Analyzing project structure…");
  await recurse(root, 0);
  return result;
}

function detectFramework(pkg?: string): { framework?: string; productType?: string } {
  if (!pkg) return {};
  try {
    const json = JSON.parse(pkg) as { dependencies?: Record<string, string> };
    const deps = json.dependencies ?? {};
    if (deps.next) {
      const ver = deps.next.replace(/^[\^~>=<]*/, "");
      const major = ver.split(".")[0];
      const label = major === "15" ? "Next.js 15" : major ? `Next.js ${major}` : "Next.js";
      return { framework: label, productType: "Web app" };
    }
    if (deps.nuxt) return { framework: "Nuxt", productType: "Web app" };
    if (deps["react-native"] || deps.expo) return { framework: "React Native", productType: "Mobile app" };
    if (deps.react) return { framework: "React", productType: "Web app" };
    if (deps.vue) return { framework: "Vue", productType: "Web app" };
    if (deps.svelte) return { framework: "Svelte", productType: "Web app" };
  } catch {
    /* ignore */
  }
  return {};
}

export async function scanProject(
  source: ProjectSource,
  onProgress?: (p: ScanProgress) => void,
): Promise<ProjectProfile> {
  if (source.kind === "repo") {
    onProgress?.({ message: "Cloning repository…", pct: 5 });
    const { cloneRepo } = await import("./cloneRepo");
    const localPath = await cloneRepo(source.url);
    const profile = await scanProject({ kind: "folder", path: localPath }, onProgress);
    return {
      ...profile,
      source,
      localPath,
      name: profile.name || source.url.replace(/^https?:\/\//, ""),
    };
  }

  if (source.kind === "url") {
    onProgress?.({ message: "Fetching live site…", pct: 20 });
    try {
      const { scanLiveUrl } = await import("./urlScan");
      const live = await scanLiveUrl(source.url);
      onProgress?.({ message: "Page analyzed", pct: 100 });
      return {
        id: live.id,
        source,
        name: live.title.slice(0, 120),
        readmeSummary: live.readmeSummary?.slice(0, 600),
        routes: live.routes.length > 0 ? live.routes : ["/"],
        hasAnalytics: live.hasAnalytics,
        excludedPaths: [],
        scannedFileCount: 0,
        productType: "web",
      };
    } catch (err) {
      const url = source.url;
      onProgress?.({ message: "Could not fetch — using URL stub", pct: 100 });
      return {
        id: hashId(url),
        source,
        name: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        readmeSummary: `Could not fetch ${url}: ${err instanceof Error ? err.message : String(err)}. Connect and open a local folder for full scan.`,
        routes: ["/"],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 0,
      };
    }
  }

  const root = source.path;
  onProgress?.({ message: "Opening project folder…", pct: 10 });
  const walked = await walk(root, onProgress);
  const { framework, productType } = detectFramework(walked.packageJson);

  onProgress?.({ message: `Scanning ${walked.fileCount} files…`, pct: 93 });
  if (framework) onProgress?.({ message: `${framework} detected`, pct: 94 });
  if (walked.routes.length > 0) {
    onProgress?.({ message: `${walked.routes.length} routes mapped`, pct: 95 });
  }
  if (walked.hasAnalytics) {
    onProgress?.({ message: "Analytics integration found", pct: 96 });
  }
  if (walked.readme) {
    onProgress?.({ message: "README parsed", pct: 97 });
  }
  onProgress?.({ message: "Profile ready", pct: 100 });

  const readmeSummary = walked.readme
    ? walked.readme.replace(/[#>*_`-]/g, "").trim().slice(0, 600)
    : undefined;

  return {
    id: hashId(root),
    source,
    name: path.basename(root),
    framework,
    productType,
    readmeSummary,
    routes: walked.routes,
    hasAnalytics: walked.hasAnalytics,
    excludedPaths: walked.excluded,
    scannedFileCount: walked.fileCount,
  };
}
