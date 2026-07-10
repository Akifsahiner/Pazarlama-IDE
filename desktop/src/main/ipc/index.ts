import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import electronUpdater from "electron-updater";
import { z } from "zod";
import { IPC } from "../../shared/ipc";
import type { AssetApplyResult, ProjectSource } from "../../shared/types";
import { isSafeDirectWrite } from "../../shared/assetTarget";
import {
  getBundledServerState,
  isBundledServerAvailable,
  startBundledServer,
  stopBundledServer,
} from "../serverManager";
import { hasBundledApiKey, saveBundledApiKey } from "../bundledApiKey";
import { scanProject } from "../project/scanner";
import { cloneRepo } from "../project/cloneRepo";
import { applyAssetGit, rollbackCommit } from "../git";
import { getRepoStatus } from "../git/status";
import { buildEditorFileUrl, buildEditorFolderUrl } from "../../shared/editorLinks";
import { buildFileTree, readProjectFile } from "../fs/tree";
import {
  addRecent,
  getCacheValue,
  getRecents,
  getSettings,
  setCacheValue,
  setSettings,
} from "../store";
import { clearAuthBlob, loadAuthBlob, saveAuthBlob } from "../auth";
import { agentCoordinator } from "../agentHost";
import {
  loadLocalPlanProgress,
  saveLocalPlanProgress,
} from "../planProgress/localStore";
import {
  appendBrowseRun,
  getLocalRun,
  getLocalRunEvents,
  listLocalRuns,
} from "../activity/localArchive";

const projectSourceSchema = z.union([
  z.object({ kind: z.literal("folder"), path: z.string().min(1) }),
  z.object({ kind: z.literal("repo"), url: z.string().url() }),
  z.object({ kind: z.literal("url"), url: z.string().url() }),
]);

const settingsPatchSchema = z.object({
  serverUrl: z.string().url().optional(),
  apiToken: z.string().optional(),
  provider: z.enum(["anthropic", "openai"]).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  reducedMotion: z.boolean().optional(),
  telemetry: z.boolean().optional(),
  persona: z.enum(["marketing", "sales"]).optional(),
  personaChosen: z.boolean().optional(),
  planHorizon: z.union([z.literal(14), z.literal(30)]).optional(),
});

const authTokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string(),
  expires_at: z.number(),
  email: z.string(),
  userId: z.string(),
});

const assetSchema = z.object({
  id: z.string(),
  type: z.enum(["landing-copy", "tweet", "email", "ad"]),
  targetFile: z.string().optional(),
  before: z.string().optional(),
  after: z.string(),
});

function senderWindow(event: { sender: Electron.WebContents }): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}

const gitApplySchema = z.object({
  root: z.string().min(1),
  targetFile: z.string().min(1),
  content: z.string(),
  branch: z.string().optional(),
  message: z.string().optional(),
});

export function registerIpcHandlers(): void {
  // Window chrome
  ipcMain.on(IPC.chrome.minimize, (e) => senderWindow(e)?.minimize());
  ipcMain.on(IPC.chrome.maximize, (e) => {
    const win = senderWindow(e);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on(IPC.chrome.close, (e) => senderWindow(e)?.close());
  ipcMain.handle(IPC.chrome.isMaximized, (e) => senderWindow(e)?.isMaximized() ?? false);

  // Project dialog + scan
  ipcMain.handle(IPC.dialog.openProjectFolder, async (e): Promise<ProjectSource | null> => {
    const win = senderWindow(e);
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: "Open project folder",
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return { kind: "folder", path: result.filePaths[0] };
  });

  ipcMain.handle(IPC.project.scan, async (event, raw: unknown) => {
    const source = projectSourceSchema.parse(raw);
    const profile = await scanProject(source, (progress) => {
      event.sender.send(IPC.project.scanProgress, progress);
    });
    addRecent({
      id: profile.id,
      name: profile.name,
      source: profile.source,
      openedAt: Date.now(),
    });
    return profile;
  });

  ipcMain.handle(IPC.project.recents, () => getRecents());

  ipcMain.handle(IPC.project.applyAsset, async (_e, rawAsset: unknown, rawRoot: unknown): Promise<AssetApplyResult> => {
    const asset = assetSchema.parse(rawAsset);
    const root = typeof rawRoot === "string" ? rawRoot : undefined;
    if (!asset.targetFile || !root) {
      return { applied: false, reason: "No target file or project root" };
    }
    const resolved = path.resolve(root, asset.targetFile);
    if (!resolved.startsWith(path.resolve(root))) {
      return { applied: false, reason: "Target path is outside the project" };
    }
    if (!isSafeDirectWrite(asset.targetFile)) {
      return {
        applied: false,
        reason: "Unsafe target — use a markdown sidecar under marketing/ or Integrate into site for code files.",
      };
    }
    try {
      const gitResult = await applyAssetGit({
        root,
        targetFile: asset.targetFile,
        content: asset.after,
      });
      return { applied: true, path: resolved, commit: gitResult.commit, branch: gitResult.branch };
    } catch {
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, asset.after, "utf8");
      return { applied: true, path: resolved };
    }
  });

  ipcMain.handle(IPC.project.cloneRepo, async (_e, rawUrl: unknown) => {
    const url = z.string().url().parse(rawUrl);
    return cloneRepo(url);
  });

  ipcMain.handle(IPC.git.applyAsset, async (_e, raw: unknown) => {
    const input = gitApplySchema.parse(raw);
    return applyAssetGit(input);
  });

  ipcMain.handle(IPC.git.rollback, async (_e, rawRoot: unknown, rawCommit: unknown) => {
    const root = z.string().min(1).parse(rawRoot);
    const commit = z.string().min(1).parse(rawCommit);
    await rollbackCommit(root, commit);
  });

  ipcMain.handle(IPC.git.status, async (_e, rawRoot: unknown) => {
    const root = z.string().min(1).parse(rawRoot);
    return getRepoStatus(root);
  });

  ipcMain.handle(IPC.fs.tree, async (_e, rawRoot: unknown) => {
    const root = z.string().min(1).parse(rawRoot);
    return buildFileTree(root);
  });

  ipcMain.handle(IPC.fs.read, async (_e, rawRoot: unknown, rawPath: unknown) => {
    const root = z.string().min(1).parse(rawRoot);
    const relPath = z.string().min(1).parse(rawPath);
    return readProjectFile(root, relPath);
  });

  // Settings
  ipcMain.handle(IPC.settings.get, () => getSettings());
  ipcMain.handle(IPC.settings.set, (_e, raw: unknown) => {
    const patch = settingsPatchSchema.parse(raw);
    return setSettings(patch);
  });

  ipcMain.handle(IPC.bundledServer.available, () => isBundledServerAvailable());
  ipcMain.handle(IPC.bundledServer.status, () => getBundledServerState());
  ipcMain.handle(IPC.bundledServer.hasApiKey, () => hasBundledApiKey());
  ipcMain.handle(IPC.bundledServer.setApiKey, (_e, raw: unknown) => {
    const key = z.string().parse(raw);
    saveBundledApiKey(key);
  });
  ipcMain.handle(IPC.bundledServer.start, async () => {
    const settings = getSettings();
    let port = 8787;
    try {
      port = new URL(settings.serverUrl).port ? Number(new URL(settings.serverUrl).port) : 8787;
    } catch {
      // default
    }
    return startBundledServer(port);
  });
  ipcMain.handle(IPC.bundledServer.stop, () => stopBundledServer());

  // Auth tokens (encrypted at rest via safeStorage)
  ipcMain.handle(IPC.auth.getTokens, () => loadAuthBlob());
  ipcMain.handle(IPC.auth.setTokens, (_e, raw: unknown) => {
    const blob = authTokenSchema.parse(raw);
    saveAuthBlob(blob);
  });
  ipcMain.handle(IPC.auth.clear, () => clearAuthBlob());

  // Offline read cache
  ipcMain.handle(IPC.cache.get, (_e, rawKey: unknown) => {
    const key = z.string().parse(rawKey);
    return getCacheValue(key);
  });
  ipcMain.handle(IPC.cache.set, (_e, rawKey: unknown, value: unknown) => {
    const key = z.string().parse(rawKey);
    setCacheValue(key, value);
  });

  // Agent runs (Local Agent Host → Run Event Bus)
  const startRunSchema = z.object({
    runId: z.string().optional(),
    cwd: z.string().min(1),
    goal: z.string().min(1),
    serverUrl: z.string().min(1),
    sessionToken: z.string(),
    skills: z.array(z.string()).optional(),
    pluginPaths: z.array(z.string()).optional(),
    projectId: z.string().optional(),
    sessionId: z.string().optional(),
    planTaskId: z.string().optional(),
    kind: z.enum(["edit", "browse", "ask"]).optional(),
  });
  ipcMain.handle(IPC.agent.startRun, (e, raw: unknown) => {
    const win = senderWindow(e);
    if (win) agentCoordinator.attachWindow(win);
    return agentCoordinator.start(startRunSchema.parse(raw));
  });
  ipcMain.handle(IPC.agent.interrupt, (_e, rawRunId: unknown) => {
    const runId = z.string().min(1).parse(rawRunId);
    return agentCoordinator.interrupt(runId);
  });
  ipcMain.handle(IPC.agent.approve, (_e, raw: unknown) => {
    const { approvalId, approved } = z
      .object({ approvalId: z.string().min(1), approved: z.boolean() })
      .parse(raw);
    agentCoordinator.resolveApproval(approvalId, approved);
  });
  ipcMain.handle(IPC.agent.apply, (_e, raw: unknown) => {
    const { runId, files } = z
      .object({ runId: z.string().min(1), files: z.array(z.string()) })
      .parse(raw);
    return agentCoordinator.apply(runId, files);
  });
  ipcMain.handle(IPC.agent.discard, (_e, rawRunId: unknown) => {
    const runId = z.string().min(1).parse(rawRunId);
    return agentCoordinator.discard(runId);
  });
  ipcMain.handle(IPC.agent.discardFiles, (_e, raw: unknown) => {
    const { runId, files } = z
      .object({ runId: z.string().min(1), files: z.array(z.string()) })
      .parse(raw);
    return agentCoordinator.discardFiles(runId, files);
  });
  ipcMain.handle(IPC.agent.preview, (_e, rawRunId: unknown) => {
    agentCoordinator.startPreview(z.string().min(1).parse(rawRunId));
  });
  ipcMain.handle(IPC.agent.stopPreview, (_e, rawRunId: unknown) => {
    agentCoordinator.stopPreview(z.string().min(1).parse(rawRunId));
  });
  ipcMain.handle(IPC.agent.validate, (_e, rawRunId: unknown) => {
    return agentCoordinator.validate(z.string().min(1).parse(rawRunId));
  });
  ipcMain.handle(IPC.agent.since, (_e, raw: unknown) => {
    const { runId, afterSeq } = z
      .object({ runId: z.string().min(1), afterSeq: z.number() })
      .parse(raw);
    return agentCoordinator.since(runId, afterSeq);
  });
  ipcMain.handle(IPC.agent.activeRun, () => agentCoordinator.getActiveRun());

  ipcMain.handle(IPC.activity.listRuns, (_e, rawProjectId: unknown) => {
    const projectId = typeof rawProjectId === "string" ? rawProjectId : undefined;
    return listLocalRuns(projectId);
  });
  ipcMain.handle(IPC.activity.getRun, (_e, rawRunId: unknown) => {
    return getLocalRun(z.string().min(1).parse(rawRunId));
  });
  ipcMain.handle(IPC.activity.getRunEvents, (_e, rawRunId: unknown) => {
    return getLocalRunEvents(z.string().min(1).parse(rawRunId));
  });
  ipcMain.handle(IPC.activity.appendBrowseRun, (_e, raw: unknown) => {
    const input = z
      .object({
        goal: z.string().min(1),
        status: z.enum(["completed", "failed"]),
        projectId: z.string().optional(),
        steps: z.number().optional(),
        url: z.string().optional(),
        localRunId: z.string().optional(),
        startedAt: z.number().optional(),
        planTaskId: z.string().optional(),
        events: z.array(z.any()).optional(),
      })
      .parse(raw);
    return appendBrowseRun(input);
  });

  ipcMain.handle(IPC.planProgress.load, (_e, rawProjectId: unknown, rawPlanId: unknown) => {
    const projectId = z.string().min(1).parse(rawProjectId);
    const planId = z.string().min(1).parse(rawPlanId);
    return loadLocalPlanProgress(projectId, planId);
  });
  ipcMain.handle(IPC.planProgress.save, (_e, rawProjectId: unknown, rawSnapshot: unknown) => {
    const projectId = z.string().min(1).parse(rawProjectId);
    const snapshot = z
      .object({
        planId: z.string(),
        byTaskId: z.record(z.string(), z.any()),
        computed: z.any(),
      })
      .parse(rawSnapshot);
    saveLocalPlanProgress(projectId, snapshot as import("../../shared/planProgress").PlanProgressSnapshot);
  });

  ipcMain.handle(IPC.shell.openExternal, (_e, rawUrl: unknown) => {
    const url = z.string().min(1).parse(rawUrl);
    return shell.openExternal(url);
  });

  ipcMain.handle(IPC.shell.openInEditor, (_e, raw: unknown) => {
    const input = z
      .object({
        editor: z.enum(["cursor", "vscode"]),
        path: z.string().min(1),
        line: z.number().int().positive().optional(),
        folder: z.boolean().optional(),
      })
      .parse(raw);
    const url = input.folder
      ? buildEditorFolderUrl(input.editor, input.path)
      : buildEditorFileUrl(input.editor, input.path, input.line);
    return shell.openExternal(url);
  });

  ipcMain.handle(IPC.shell.revealInFolder, (_e, rawPath: unknown) => {
    const absPath = z.string().min(1).parse(rawPath);
    shell.showItemInFolder(absPath);
  });

  // App meta
  ipcMain.handle(IPC.app.version, () => app.getVersion());
  ipcMain.handle(IPC.app.e2e, () => ({
    fixturePath: process.env.MARKETING_IDE_E2E_FIXTURE?.trim() || undefined,
  }));

  ipcMain.handle(IPC.export.saveHtmlAsPdf, async (_e, raw: unknown) => {
    const input = z
      .object({
        html: z.string().min(1),
        defaultFilename: z.string().min(1),
      })
      .parse(raw);
    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const save = await dialog.showSaveDialog(parent ?? undefined, {
      defaultPath: input.defaultFilename,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (save.canceled || !save.filePath) {
      return { ok: false, cancelled: true };
    }

    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });
    const tmpHtml = path.join(tmpdir(), `session-report-${randomUUID()}.html`);
    try {
      await fs.writeFile(tmpHtml, input.html, "utf8");
      await pdfWin.loadFile(tmpHtml);
      const buffer = await pdfWin.webContents.printToPDF({
        printBackground: true,
        margins: { marginType: "default" },
      });
      await fs.writeFile(save.filePath, buffer);
      return { ok: true, path: save.filePath };
    } catch (err) {
      const message = err instanceof Error ? err.message : "PDF export failed";
      return { ok: false, error: message };
    } finally {
      pdfWin.destroy();
      await fs.unlink(tmpHtml).catch(() => {});
    }
  });

  ipcMain.on(IPC.updater.install, () => {
    electronUpdater.autoUpdater.quitAndInstall();
  });
}
