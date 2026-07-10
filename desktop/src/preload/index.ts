import { contextBridge, ipcRenderer } from "electron";

import { IPC } from "../shared/ipc";

import type {

  AuthTokenBlob,

  DesktopApi,

  GitApplyInput,

  MarketingAsset,

  ProjectSource,

  RunEvent,

  Settings,

  StartRunRequest,

} from "../shared/types";



const api: DesktopApi = {

  chrome: {

    minimize: () => ipcRenderer.send(IPC.chrome.minimize),

    maximize: () => ipcRenderer.send(IPC.chrome.maximize),

    close: () => ipcRenderer.send(IPC.chrome.close),

    isMaximized: () => ipcRenderer.invoke(IPC.chrome.isMaximized),

    onMaximizeChange: (cb) => {

      const listener = (_e: unknown, isMax: boolean) => cb(isMax);

      ipcRenderer.on(IPC.chrome.maximizeChanged, listener);

      return () => ipcRenderer.removeListener(IPC.chrome.maximizeChanged, listener);

    },

  },

  dialog: {

    openProjectFolder: () => ipcRenderer.invoke(IPC.dialog.openProjectFolder),

  },

  project: {

    scan: (source: ProjectSource) => ipcRenderer.invoke(IPC.project.scan, source),

    onScanProgress: (cb) => {
      const listener = (_e: unknown, progress: { message: string; pct?: number }) => cb(progress);
      ipcRenderer.on(IPC.project.scanProgress, listener);
      return () => ipcRenderer.removeListener(IPC.project.scanProgress, listener);
    },

    recents: () => ipcRenderer.invoke(IPC.project.recents),

    applyAsset: (asset: MarketingAsset, root?: string) =>

      ipcRenderer.invoke(IPC.project.applyAsset, asset, root),

    cloneRepo: (url: string) => ipcRenderer.invoke(IPC.project.cloneRepo, url),

  },

  git: {

    applyAsset: (input: GitApplyInput) => ipcRenderer.invoke(IPC.git.applyAsset, input),

    rollback: (root: string, commit: string) => ipcRenderer.invoke(IPC.git.rollback, root, commit),

    status: (root: string) => ipcRenderer.invoke(IPC.git.status, root),

  },

  fs: {

    tree: (root: string) => ipcRenderer.invoke(IPC.fs.tree, root),

    read: (root: string, relPath: string) => ipcRenderer.invoke(IPC.fs.read, root, relPath),

  },

  settings: {

    get: () => ipcRenderer.invoke(IPC.settings.get),

    set: (patch: Partial<Settings>) => ipcRenderer.invoke(IPC.settings.set, patch),

  },

  auth: {

    getTokens: () => ipcRenderer.invoke(IPC.auth.getTokens),

    setTokens: (blob: AuthTokenBlob) => ipcRenderer.invoke(IPC.auth.setTokens, blob),

    clear: () => ipcRenderer.invoke(IPC.auth.clear),

    onCallback: (cb) => {

      const listener = (_e: unknown, url: string) => cb(url);

      ipcRenderer.on(IPC.auth.callback, listener);

      return () => ipcRenderer.removeListener(IPC.auth.callback, listener);

    },

  },

  cache: {

    get: (key: string) => ipcRenderer.invoke(IPC.cache.get, key),

    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC.cache.set, key, value),

  },

  app: {

    version: () => ipcRenderer.invoke(IPC.app.version),

    e2e: () => ipcRenderer.invoke(IPC.app.e2e),

    platform: process.platform,

  },

  updater: {

    install: () => ipcRenderer.send(IPC.updater.install),

    onAvailable: (cb) => {

      const listener = (_e: unknown, info: { version: string }) => cb(info);

      ipcRenderer.on(IPC.updater.available, listener);

      return () => ipcRenderer.removeListener(IPC.updater.available, listener);

    },

    onDownloaded: (cb) => {

      const listener = (_e: unknown, info: { version: string }) => cb(info);

      ipcRenderer.on(IPC.updater.downloaded, listener);

      return () => ipcRenderer.removeListener(IPC.updater.downloaded, listener);

    },

  },

  agent: {

    startRun: (req: StartRunRequest) => ipcRenderer.invoke(IPC.agent.startRun, req),

    interrupt: (runId: string) => ipcRenderer.invoke(IPC.agent.interrupt, runId),

    approve: (approvalId: string, approved: boolean) =>

      ipcRenderer.invoke(IPC.agent.approve, { approvalId, approved }),

    apply: (runId: string, files: string[]) =>

      ipcRenderer.invoke(IPC.agent.apply, { runId, files }),

    discard: (runId: string) => ipcRenderer.invoke(IPC.agent.discard, runId),

    discardFiles: (runId: string, files: string[]) =>
      ipcRenderer.invoke(IPC.agent.discardFiles, { runId, files }) as Promise<{
        discarded: string[];
        remaining: string[];
      }>,

    preview: (runId: string) => ipcRenderer.invoke(IPC.agent.preview, runId),

    stopPreview: (runId: string) => ipcRenderer.invoke(IPC.agent.stopPreview, runId),

    validate: (runId: string) => ipcRenderer.invoke(IPC.agent.validate, runId),

    since: (runId: string, afterSeq: number) =>

      ipcRenderer.invoke(IPC.agent.since, { runId, afterSeq }),

    activeRun: () => ipcRenderer.invoke(IPC.agent.activeRun),

    onEvent: (cb: (event: RunEvent) => void) => {

      const listener = (_e: unknown, event: RunEvent) => cb(event);

      ipcRenderer.on(IPC.agent.events, listener);

      return () => ipcRenderer.removeListener(IPC.agent.events, listener);

    },

    onRunRegistered: (cb) => {
      const listener = (_e: unknown, payload: import("../shared/types").RunRegisteredPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.agent.runRegistered, listener);
      return () => ipcRenderer.removeListener(IPC.agent.runRegistered, listener);
    },

  },

  activity: {
    listRuns: (projectId?: string) => ipcRenderer.invoke(IPC.activity.listRuns, projectId),
    getRun: (runId: string) => ipcRenderer.invoke(IPC.activity.getRun, runId),
    getRunEvents: (runId: string) => ipcRenderer.invoke(IPC.activity.getRunEvents, runId),
    appendBrowseRun: (input) => ipcRenderer.invoke(IPC.activity.appendBrowseRun, input),
  },

  planProgress: {
    load: (projectId: string, planId: string) =>
      ipcRenderer.invoke(IPC.planProgress.load, projectId, planId),
    save: (projectId: string, snapshot: import("../shared/planProgress").PlanProgressSnapshot) =>
      ipcRenderer.invoke(IPC.planProgress.save, projectId, snapshot),
  },

  shell: {
    openExternal: (url: string) => ipcRenderer.invoke(IPC.shell.openExternal, url),
    openInEditor: (input: {
      editor: "cursor" | "vscode";
      path: string;
      line?: number;
      folder?: boolean;
    }) => ipcRenderer.invoke(IPC.shell.openInEditor, input),
    revealInFolder: (absPath: string) => ipcRenderer.invoke(IPC.shell.revealInFolder, absPath),
  },

  bundledServer: {
    available: () => ipcRenderer.invoke(IPC.bundledServer.available),
    status: () => ipcRenderer.invoke(IPC.bundledServer.status),
    start: () => ipcRenderer.invoke(IPC.bundledServer.start),
    stop: () => ipcRenderer.invoke(IPC.bundledServer.stop),
    hasApiKey: () => ipcRenderer.invoke(IPC.bundledServer.hasApiKey),
    setApiKey: (key: string) => ipcRenderer.invoke(IPC.bundledServer.setApiKey, key),
  },

  export: {
    saveHtmlAsPdf: (input: { html: string; defaultFilename: string }) =>
      ipcRenderer.invoke(IPC.export.saveHtmlAsPdf, input),
  },

};



contextBridge.exposeInMainWorld("api", api);

