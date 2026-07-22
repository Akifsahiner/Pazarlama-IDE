import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadBundledApiKey } from "./bundledApiKey";

export type BundledServerState = "stopped" | "starting" | "ready" | "error";

let child: ChildProcess | null = null;
let state: BundledServerState = "stopped";
let lastError: string | undefined;

function devServerRoot(): string | null {
  const candidates = [
    path.join(process.cwd(), "server", "dist", "index.js"),
    path.join(process.cwd(), "..", "server", "dist", "index.js"),
    path.join(__dirname, "..", "..", "..", "server", "dist", "index.js"),
  ];
  for (const entry of candidates) {
    if (fs.existsSync(entry)) return path.dirname(path.dirname(entry));
  }
  return null;
}

function bundledServerRoot(): string | null {
  const packaged = path.join(process.resourcesPath, "server");
  const packagedEntry = path.join(packaged, "dist", "index.js");
  if (fs.existsSync(packagedEntry)) return packaged;
  return devServerRoot();
}

function serverEntryPath(): string | null {
  const root = bundledServerRoot();
  if (!root) return null;
  return path.join(root, "dist", "index.js");
}

export function getBundledServerState(): { state: BundledServerState; error?: string } {
  return { state, error: lastError };
}

export function isBundledServerAvailable(): boolean {
  return serverEntryPath() !== null;
}

async function waitForHealth(port: number, attempts = 30): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function bundledServerEnv(port: number): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    ELECTRON_RUN_AS_NODE: "1",
  };
  const apiKey = loadBundledApiKey();
  if (apiKey) env.ANTHROPIC_API_KEY = apiKey;
  return env;
}

/** Best-effort Playwright Chromium install for bundled browser tasks (async, non-blocking). */
function ensurePlaywrightBrowsers(serverRoot: string): void {
  const cli = path.join(serverRoot, "node_modules", "playwright", "cli.js");
  if (!fs.existsSync(cli)) return;
  const proc = spawn(process.execPath, [cli, "install", "chromium"], {
    cwd: serverRoot,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: "ignore",
    windowsHide: true,
  });
  proc.unref();
}

export async function startBundledServer(port = 8787): Promise<{ ok: boolean; error?: string }> {
  if (child) return { ok: state === "ready", error: lastError };

  const entry = serverEntryPath();
  const root = bundledServerRoot();
  if (!entry || !root) {
    lastError = "Bundled server not found in this install.";
    state = "error";
    return { ok: false, error: lastError };
  }

  state = "starting";
  lastError = undefined;

  child = spawn(process.execPath, [entry], {
    cwd: root,
    env: bundledServerEnv(port),
    stdio: "ignore",
    windowsHide: true,
  });

  child.on("error", (err) => {
    lastError = err.message;
    state = "error";
    child = null;
  });

  child.on("exit", (code) => {
    if (state !== "stopped") {
      lastError = code ? `Server exited (${code})` : undefined;
      state = code ? "error" : "stopped";
    }
    child = null;
  });

  const ok = await waitForHealth(port);
  if (ok) {
    state = "ready";
    ensurePlaywrightBrowsers(root);
    return { ok: true };
  }

  lastError = "Server started but health check failed.";
  state = "error";
  void stopBundledServer();
  return { ok: false, error: lastError };
}

export async function stopBundledServer(): Promise<void> {
  state = "stopped";
  lastError = undefined;
  if (!child) return;
  const proc = child;
  child = null;
  proc.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 300));
  if (!proc.killed) proc.kill("SIGKILL");
}

export function stopBundledServerOnQuit(): void {
  if (child) child.kill("SIGTERM");
}

/** Auto-start when localhost backend is expected (packaged + dev with server build). */
export async function maybeAutoStartBundledServer(serverUrl: string): Promise<{ started: boolean; ok: boolean }> {
  try {
    const url = new URL(serverUrl);
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return { started: false, ok: false };
  } catch {
    return { started: false, ok: false };
  }
  if (!isBundledServerAvailable()) return { started: false, ok: false };
  try {
    const res = await fetch(`${serverUrl.replace(/\/$/, "")}/healthz`);
    if (res.ok) return { started: false, ok: true };
  } catch {
    // start bundled
  }
  const result = await startBundledServer();
  return { started: true, ok: result.ok };
}
