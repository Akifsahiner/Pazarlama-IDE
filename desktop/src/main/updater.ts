import type { BrowserWindow } from "electron";
import electronUpdater from "electron-updater";
import { IPC } from "../shared/ipc";

const { autoUpdater } = electronUpdater;

/**
 * Wires electron-updater against the GitHub Releases provider configured in
 * electron-builder.yml. Safe no-op in development (no update metadata).
 */
export function initAutoUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    win.webContents.send(IPC.updater.available, { version: info.version });
  });
  autoUpdater.on("update-downloaded", (info) => {
    win.webContents.send(IPC.updater.downloaded, { version: info.version });
  });
  autoUpdater.on("error", (err) => {
    win.webContents.send("updater:error", { message: String(err) });
  });

  if (process.env.NODE_ENV !== "development") {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      /* offline / no releases yet — ignore */
    });
  }
}
