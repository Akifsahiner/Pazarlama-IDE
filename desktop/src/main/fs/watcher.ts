import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";

const IGNORED =
  /(^|[/\\])(\.git|\.claude|node_modules|\.next|dist|out|\.turbo|coverage)([/\\]|$)/;

/**
 * Debounced recursive file watcher for a run workspace. Emits the set of
 * changed paths (relative to root) so the caller can compute diffs and publish
 * `file.patch_*` events. Ignores VCS/build dirs to avoid noise.
 */
export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private pending = new Set<string>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private root: string,
    private onChange: (relPaths: string[]) => void,
    private debounceMs = 350,
  ) {}

  start(): void {
    if (this.watcher) return;
    this.watcher = chokidar.watch(this.root, {
      ignored: IGNORED,
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });
    const onAny = (file: string) => this.queue(file);
    this.watcher.on("add", onAny).on("change", onAny).on("unlink", onAny);
  }

  private queue(file: string): void {
    const rel = path.relative(this.root, file).split(path.sep).join("/");
    if (!rel || rel.startsWith("..")) return;
    this.pending.add(rel);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
    this.timer.unref?.();
  }

  private flush(): void {
    if (this.pending.size === 0) return;
    const paths = [...this.pending];
    this.pending.clear();
    this.onChange(paths);
  }

  async stop(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
    await this.watcher?.close();
    this.watcher = null;
  }
}
