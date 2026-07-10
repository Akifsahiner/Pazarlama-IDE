import { spawn, type ChildProcess } from "node:child_process";

export interface PreviewEvents {
  onStarted: (runId: string) => void;
  onReady: (runId: string, url: string) => void;
  onFailed: (runId: string, message: string) => void;
}

const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/\S*)?)/i;
const READY_TIMEOUT_MS = 60_000;

/**
 * Manages isolated dev/preview servers per run. Spawns the project's `dev`
 * script in the run workspace, parses the local URL from stdout, and reports
 * lifecycle through {@link PreviewEvents}. One server per run.
 */
export class PreviewManager {
  private procs = new Map<string, ChildProcess>();

  constructor(private events: PreviewEvents) {}

  start(runId: string, workspace: string, script = "dev"): void {
    this.stop(runId);
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(npm, ["run", script], {
      cwd: workspace,
      env: { ...process.env, BROWSER: "none", FORCE_COLOR: "0" },
      shell: process.platform === "win32",
    });
    this.procs.set(runId, child);
    this.events.onStarted(runId);

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) this.events.onFailed(runId, "Preview server did not start in time.");
    }, READY_TIMEOUT_MS);
    timer.unref?.();

    const scan = (buf: Buffer) => {
      const match = buf.toString().match(URL_RE);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timer);
        this.events.onReady(runId, match[1]);
      }
    };
    child.stdout?.on("data", scan);
    child.stderr?.on("data", scan);
    child.on("error", (err) => {
      if (!resolved) this.events.onFailed(runId, err.message);
    });
    child.on("exit", (code) => {
      if (!resolved && code !== 0) {
        this.events.onFailed(runId, `Preview server exited with code ${code}.`);
      }
      this.procs.delete(runId);
    });
  }

  stop(runId: string): void {
    const child = this.procs.get(runId);
    if (!child) return;
    this.procs.delete(runId);
    try {
      child.kill();
    } catch {
      /* already gone */
    }
  }

  stopAll(): void {
    for (const runId of [...this.procs.keys()]) this.stop(runId);
  }
}
