import path from "node:path";
import { BrowserWindow, app } from "electron";
import { registerIpcHandlers } from "./ipc";
import { initAutoUpdater } from "./updater";
import { createMainWindow } from "./window";
import { stopAllProjectIndexWatchers } from "./context/projectIndexWatcher";
import { agentCoordinator } from "./agentHost";
import { maybeAutoStartBundledServer, stopBundledServerOnQuit } from "./serverManager";
import { getSettings } from "./store";
import { IPC } from "../shared/ipc";

const PROTOCOL = "marketingide";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

function sendAuthCallback(url: string): void {
  mainWindow?.webContents.send(IPC.auth.callback, url);
}

function handleDeepLink(argv: string[]): void {
  const link = argv.find((a) => a.startsWith(`${PROTOCOL}://`));
  if (link) sendAuthCallback(link);
}

app.on("second-instance", (_event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  handleDeepLink(argv);
});

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

app.whenReady().then(async () => {
  app.setAppUserModelId("com.marketingide.app");
  registerIpcHandlers();
  const settings = getSettings();
  await maybeAutoStartBundledServer(settings.serverUrl).catch(() => {});
  mainWindow = createMainWindow();
  initAutoUpdater(mainWindow);
  handleDeepLink(process.argv);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  sendAuthCallback(url);
});

app.on("before-quit", () => {
  stopBundledServerOnQuit();
  void stopAllProjectIndexWatchers();
  void agentCoordinator.shutdown();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});