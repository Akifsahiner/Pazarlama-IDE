import { join } from "node:path";
import { BrowserWindow, shell } from "electron";
import { IPC } from "../shared/ipc";
import { getWindowBounds, setWindowBounds } from "./store";

const ICON_PATH = join(__dirname, "../../resources/icon.ico");

export function createMainWindow(): BrowserWindow {
  const bounds = getWindowBounds();
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 940,
    minHeight: 620,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0d0e11",
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  win.once("ready-to-show", () => {
    if (bounds.maximized) win.maximize();
    win.show();
  });

  const notifyMaximize = () =>
    win.webContents.send(IPC.chrome.maximizeChanged, win.isMaximized());
  win.on("maximize", notifyMaximize);
  win.on("unmaximize", notifyMaximize);

  // Persist window geometry (debounced) so it is restored next launch.
  let saveTimer: NodeJS.Timeout | null = null;
  const persistBounds = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      const maximized = win.isMaximized();
      const normal = win.getNormalBounds();
      setWindowBounds({
        width: normal.width,
        height: normal.height,
        x: normal.x,
        y: normal.y,
        maximized,
      });
    }, 400);
  };
  win.on("resize", persistBounds);
  win.on("move", persistBounds);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}
