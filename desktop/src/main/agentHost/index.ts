import { randomUUID } from "node:crypto";
import { BrowserWindow } from "electron";
import type { PermissionScope, RunEvent } from "../../shared/types";
import { RunEventBus } from "../runs/eventBus";
import { FileWatcher } from "../fs/watcher";
import {
  prepareWorkspace,
  cleanupWorkspace,
  applyWorkspaceFiles,
  discardWorkspaceFiles,
  type RunWorkspace,
} from "../git/worktree";
import { changedFiles, filePatch } from "../git/diff";
import { PreviewManager } from "../preview/server";
import { runValidation } from "../validate/run";
import { installSkills } from "../skills/install";
import { AgentHost } from "./host";
import { appendLocalRun } from "../activity/localArchive";
import { computeRunSummary } from "../../shared/runs";
import { patchCountFromEvents } from "../../shared/shipPipeline";
import { IPC } from "../../shared/ipc";
import type { RunKind } from "../../shared/runs";

export interface StartRunRequest {
  runId?: string;
  /** Project root (a git worktree is derived from this). */
  cwd: string;
  goal: string;
  serverUrl: string;
  sessionToken: string;
  skills?: string[];
  pluginPaths?: string[];
  projectId?: string;
  sessionId?: string;
  planTaskId?: string;
  kind?: RunKind;
  /** Prepended ContextPack text for the agent prompt. */
  contextPrefix?: string;
  /** Quick Start wedge — emit NO_PATCHES failure when diff is empty. */
  guaranteedShip?: boolean;
}

interface RunContext {
  workspace: RunWorkspace;
  watcher: FileWatcher;
}

interface RunMeta {
  goal: string;
  projectId?: string;
  sessionId?: string;
  planTaskId?: string;
  kind: RunKind;
  startedAt: number;
  serverUrl: string;
  sessionToken: string;
}

/**
 * Coordinator wiring the RunEventBus + AgentHost + per-run git worktree and file
 * watcher. Owns the workspace lifecycle: prepare → watch → run → (apply|discard).
 */
class AgentCoordinator {
  private window: BrowserWindow | null = null;
  private bus: RunEventBus;
  private host: AgentHost;
  private pendingApprovals = new Map<string, (approved: boolean) => void>();
  private contexts = new Map<string, RunContext>();
  private runMeta = new Map<string, RunMeta>();
  private preview: PreviewManager;
  /** Currently running runIds, in start order (last = most recently started). */
  private activeRunIds = new Set<string>();

  constructor() {
    this.bus = new RunEventBus(() => this.window);
    this.host = new AgentHost(this.bus, (req) => this.requestApproval(req));
    this.preview = new PreviewManager({
      onStarted: (runId) =>
        this.bus.emit({ runId, type: "preview.started", status: "running", title: "Starting preview…" }),
      onReady: (runId, url) =>
        this.bus.emit({
          runId,
          type: "preview.ready",
          status: "success",
          title: "Preview ready",
          summary: url,
          payload: { url },
        }),
      onFailed: (runId, message) =>
        this.bus.emit({ runId, type: "preview.failed", status: "failed", title: "Preview failed", summary: message }),
    });
  }

  attachWindow(win: BrowserWindow): void {
    this.window = win;
  }

  async start(req: StartRunRequest): Promise<{ runId: string }> {
    const runId = req.runId ?? randomUUID();
    this.runMeta.set(runId, {
      goal: req.goal,
      projectId: req.projectId,
      sessionId: req.sessionId,
      planTaskId: req.planTaskId,
      kind: req.kind ?? "edit",
      startedAt: Date.now(),
      serverUrl: req.serverUrl,
      sessionToken: req.sessionToken,
    });
    void this.run(runId, req, `${req.serverUrl.replace(/\/+$/, "")}/anthropic`);
    return { runId };
  }

  private async run(runId: string, req: StartRunRequest, baseUrl: string): Promise<void> {
    this.activeRunIds.add(runId);
    // Fire-and-forget safety: nothing below may reject the returned promise.
    // Any unexpected throw is converted into a run.failed event and swallowed.
    const mirror = await this.startMirror(runId, req).catch(() => null);
    let runFailed = false;
    try {
      let workspace: RunWorkspace;
      try {
        workspace = await prepareWorkspace(req.cwd, runId);
      } catch (err) {
        this.bus.emit({
          runId,
          type: "run.failed",
          status: "failed",
          title: "Could not prepare workspace",
          summary: err instanceof Error ? err.message : String(err),
        });
        this.activeRunIds.delete(runId);
        await this.finishMirror(runId, req, mirror, true);
        return;
      }

      // Install marketing/sales skills into the worktree's .claude/skills so the
      // Agent SDK discovers them (settingSources: ["project"]).
      let installedSkills: string[] = [];
      try {
        installedSkills = await installSkills(workspace.workspace);
      } catch {
        /* skills are optional — continue without them */
      }

      const watcher = new FileWatcher(workspace.workspace, (paths) =>
        void this.onFilesChanged(runId, workspace, paths),
      );
      watcher.start();
      this.contexts.set(runId, { workspace, watcher });

      try {
        await this.host.startRun({
          runId,
          cwd: workspace.workspace,
          goal: req.goal,
          baseUrl,
          sessionToken: req.sessionToken,
          skills: req.skills ?? (installedSkills.length ? installedSkills : undefined),
          pluginPaths: req.pluginPaths,
          contextPrefix: req.contextPrefix,
          browserVerify: async ({ url, checklist }) => {
            const { executeTool } = await import("../orchestration/toolRouter");
            const result = await executeTool(
              "browser.verify_checklist",
              {
                runId,
                cwd: workspace.workspace,
                projectId: req.projectId ?? "",
                serverUrl: req.serverUrl,
                sessionToken: req.sessionToken,
                bus: this.bus,
              },
              { url, checklist },
            );
            return { ok: result.ok, summary: result.summary };
          },
        });
        await this.emitFinalDiff(runId, workspace);
        if (req.guaranteedShip) {
          const events = this.bus.getSince(runId, 0);
          if (patchCountFromEvents(events) === 0) {
            this.bus.emit({
              runId,
              type: "run.failed",
              status: "failed",
              title: "No patches produced",
              summary: "NO_PATCHES: Narrow the goal to hero headline or meta title only.",
              payload: { code: "NO_PATCHES" },
            });
          }
        }
      } catch (err) {
        runFailed = true;
        this.bus.emit({
          runId,
          type: "run.failed",
          status: "failed",
          title: "Run failed",
          summary: err instanceof Error ? err.message : String(err),
        });
      } finally {
        await watcher.stop();
        this.activeRunIds.delete(runId);
        await this.finishMirror(runId, req, mirror, runFailed);
        // Keep the worktree until the user applies or discards.
      }
    } catch (err) {
      // Catch-all for anything outside the inner try (watcher setup, etc.) so the
      // fire-and-forget promise can never reject.
      this.bus.emit({
        runId,
        type: "run.failed",
        status: "failed",
        title: "Run failed",
        summary: err instanceof Error ? err.message : String(err),
      });
      this.activeRunIds.delete(runId);
      await this.finishMirror(runId, req, mirror, true).catch(() => {});
    }
  }

  /** Active run's events for renderer resume, or null when no run is active. */
  getActiveRun(): { runId: string; events: RunEvent[] } | null {
    let runId: string | undefined;
    for (const id of this.activeRunIds) runId = id; // last = most recently started
    if (!runId) return null;
    return { runId, events: this.bus.getSince(runId, 0) };
  }

  /**
   * Best-effort mirror of a local run to the server's persistence API. Any
   * network failure is swallowed: persistence is optional and DEV_NO_AUTH /
   * persistence-off servers simply no-op server-side.
   */
  private async startMirror(
    localRunId: string,
    req: StartRunRequest,
  ): Promise<{ serverRunId: string; unsubscribe: () => Promise<void> } | null> {
    let serverRunId: string;
    try {
      const res = await fetch(`${req.serverUrl}/runs`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(req.sessionToken ? { Authorization: `Bearer ${req.sessionToken}` } : {}),
        },
        body: JSON.stringify({
          goal: req.goal,
          projectId: req.projectId,
          kind: req.kind ?? "edit",
          localRunId,
          sessionId: req.sessionId,
          planTaskId: req.planTaskId,
        }),
      });
      const json = (await res.json().catch(() => null)) as { run?: { id?: string } } | null;
      const id = json?.run?.id;
      if (!id) return null;
      serverRunId = id;
      this.window?.webContents.send(IPC.agent.runRegistered, {
        localRunId,
        serverRunId,
      });
    } catch {
      return null;
    }

    const buffer: RunEvent[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = async (): Promise<void> => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (buffer.length === 0) return;
      const batch = buffer.splice(0, buffer.length).map((e) => {
        const payload = e.payload ? { ...e.payload } : undefined;
        if (payload && "pngBase64" in payload) delete payload.pngBase64;
        return {
          seq: e.seq,
          stepId: e.stepId,
          type: e.type,
          status: e.status,
          title: e.title,
          summary: e.summary,
          payload,
        };
      });
      const maxSeq = batch.reduce((m, e) => Math.max(m, e.seq), 0);
      try {
        await fetch(`${req.serverUrl}/runs/${serverRunId}/events`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(req.sessionToken ? { Authorization: `Bearer ${req.sessionToken}` } : {}),
          },
          body: JSON.stringify({ events: batch }),
        });
        if (maxSeq > 0) {
          await fetch(`${req.serverUrl}/runs/${serverRunId}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              ...(req.sessionToken ? { Authorization: `Bearer ${req.sessionToken}` } : {}),
            },
            body: JSON.stringify({ lastSeq: maxSeq }),
          });
        }
      } catch {
        /* best-effort: drop the batch on failure */
      }
    };

    const unsubBus = this.bus.subscribe((event) => {
      if (event.runId !== localRunId) return;
      buffer.push(event);
      if (!flushTimer) {
        flushTimer = setTimeout(() => void flush(), 500);
        flushTimer.unref?.();
      }
    });

    return {
      serverRunId,
      // Flush the final batch BEFORE the caller PATCHes the terminal status so the
      // last events aren't lost.
      unsubscribe: async () => {
        unsubBus();
        await flush();
      },
    };
  }

  private async finishMirror(
    localRunId: string,
    req: StartRunRequest,
    mirror: { serverRunId: string; unsubscribe: () => Promise<void> } | null,
    failed: boolean,
  ): Promise<void> {
    const meta = this.runMeta.get(localRunId);
    const events = this.bus.getSince(localRunId, 0);
    const status = failed ? "failed" : "completed";
    const summary = computeRunSummary(events);
    if (meta?.planTaskId) summary.planTaskId = meta.planTaskId;
    if (meta) {
      summary.durationMs = Math.max(0, Date.now() - meta.startedAt);
      summary.intentPreview = meta.goal.slice(0, 120);
    }

    if (mirror) {
      await mirror.unsubscribe();
      try {
        await fetch(`${req.serverUrl}/runs/${mirror.serverRunId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            ...(req.sessionToken ? { Authorization: `Bearer ${req.sessionToken}` } : {}),
          },
          body: JSON.stringify({
            status,
            lastSeq: this.bus.lastSeq(localRunId),
            summaryJson: summary,
          }),
        });
      } catch {
        /* best-effort */
      }
    }

    if (meta) {
      await appendLocalRun({
        localRunId,
        serverRunId: mirror?.serverRunId,
        projectId: meta.projectId,
        goal: meta.goal,
        status,
        kind: meta.kind,
        events,
        startedAt: meta.startedAt,
        planTaskId: meta.planTaskId,
      }).catch(() => {});
    }
    this.runMeta.delete(localRunId);
  }

  private async onFilesChanged(
    runId: string,
    ws: RunWorkspace,
    paths: string[],
  ): Promise<void> {
    for (const file of paths.slice(0, 10)) {
      try {
        const p = await filePatch(ws, file);
        if (p.additions === 0 && p.deletions === 0) continue;
        this.bus.emit({
          runId,
          type: "file.patch_updated",
          status: "running",
          title: `Editing ${file}`,
          payload: { file, additions: p.additions, deletions: p.deletions, patch: p.patch },
        });
      } catch {
        /* file may have been removed mid-diff */
      }
    }
  }

  private async emitFinalDiff(runId: string, ws: RunWorkspace): Promise<void> {
    try {
      const changes = await changedFiles(ws);
      for (const c of changes) {
        const p = await filePatch(ws, c.file);
        this.bus.emit({
          runId,
          type: "file.patch_created",
          status: "success",
          title: `Changed ${p.file}`,
          summary: `+${p.additions} −${p.deletions}`,
          payload: {
            file: p.file,
            additions: p.additions,
            deletions: p.deletions,
            patch: p.patch,
          },
        });
      }
    } catch {
      /* non-git or diff failure */
    }
  }

  async interrupt(runId: string): Promise<void> {
    await this.host.interrupt(runId);
  }

  /** Start the project's dev server in the run workspace for live preview. */
  startPreview(runId: string): void {
    const ctx = this.contexts.get(runId);
    if (!ctx) return;
    this.preview.start(runId, ctx.workspace.workspace);
  }

  stopPreview(runId: string): void {
    this.preview.stop(runId);
  }

  /** Run typecheck/lint/build in the workspace, streaming check results. */
  async validate(runId: string): Promise<void> {
    const ctx = this.contexts.get(runId);
    if (!ctx) return;
    this.bus.emit({ runId, type: "file.validation_started", status: "running", title: "Validating changes" });
    const checks = await runValidation(ctx.workspace.workspace, (check) => {
      this.bus.emit({
        runId,
        type: "file.validation_started",
        status: check.status,
        title: `${check.label}: ${check.status}`,
        payload: { checks: [check] },
      });
    });
    const failed = checks.some((c) => c.status === "failed");
    this.bus.emit({
      runId,
      type: "file.validation_completed",
      status: failed ? "failed" : "success",
      title: failed ? "Validation found issues" : "Validation passed",
      payload: { checks },
    });
  }

  /** Apply approved files from the worktree to the project, then clean up. */
  async apply(
    runId: string,
    files: string[],
  ): Promise<{ commit?: string; branch?: string; applied: string[] }> {
    const ctx = this.contexts.get(runId);
    if (!ctx) return { applied: [] };
    const result = await applyWorkspaceFiles(
      ctx.workspace,
      files,
      `Marketing IDE: run ${runId.slice(0, 8)}`,
    );
    result.applied.forEach((file) =>
      this.bus.emit({
        runId,
        type: "file.patch_applied",
        status: "success",
        title: `Applied ${file}`,
        payload: { file, additions: 0, deletions: 0 },
      }),
    );
    await this.dispose(runId);
    return result;
  }

  async discard(runId: string): Promise<void> {
    await this.dispose(runId);
  }

  /** Revert selected files in the worktree; dispose when nothing remains. */
  async discardFiles(
    runId: string,
    files: string[],
  ): Promise<{ discarded: string[]; remaining: string[] }> {
    const ctx = this.contexts.get(runId);
    if (!ctx || files.length === 0) return { discarded: [], remaining: [] };
    const discarded = await discardWorkspaceFiles(ctx.workspace, files);
    for (const file of discarded) {
      this.bus.emit({
        runId,
        type: "file.patch_discarded",
        status: "success",
        title: `Reverted ${file}`,
        payload: { file, additions: 0, deletions: 0 },
      });
    }
    const remaining = (await changedFiles(ctx.workspace)).map((c) => c.file);
    if (remaining.length === 0) await this.dispose(runId);
    return { discarded, remaining };
  }

  private async dispose(runId: string): Promise<void> {
    this.activeRunIds.delete(runId);
    const ctx = this.contexts.get(runId);
    if (!ctx) return;
    this.contexts.delete(runId);
    this.preview.stop(runId);
    await ctx.watcher.stop();
    await cleanupWorkspace(ctx.workspace);
  }

  resolveApproval(approvalId: string, approved: boolean): void {
    const resolver = this.pendingApprovals.get(approvalId);
    if (resolver) {
      this.pendingApprovals.delete(approvalId);
      resolver(approved);
    }
  }

  /**
   * Apply selected hunks for one file from a stored unified patch onto the project root.
   */
  async applyHunks(
    runId: string,
    file: string,
    patch: string,
    hunkIds: string[],
  ): Promise<{ ok: boolean; reason?: string; applied: string[] }> {
    const ctx = this.contexts.get(runId);
    if (!ctx) return { ok: false, reason: "Run workspace gone", applied: [] };
    const { applyWorkspaceHunks } = await import("../git/applyHunks");
    const result = await applyWorkspaceHunks(ctx.workspace, file, patch, hunkIds);
    if (result.ok) {
      this.bus.emit({
        runId,
        type: "file.patch_applied",
        status: "success",
        title: `Applied hunks in ${file}`,
        summary: `${hunkIds.length} hunk(s)`,
        payload: { file, hunkIds },
      });
    }
    return result;
  }

  since(runId: string, afterSeq: number): RunEvent[] {
    return this.bus.getSince(runId, afterSeq);
  }

  /** Shared event bus — orchestrator / browser tools emit here. */
  getEventBus(): RunEventBus {
    return this.bus;
  }

  /** Stop all previews + remove all run worktrees (call on app quit). */
  async shutdown(): Promise<void> {
    this.preview.stopAll();
    for (const runId of [...this.contexts.keys()]) await this.dispose(runId);
  }

  private requestApproval(req: {
    runId: string;
    approvalId: string;
    scope: PermissionScope;
    intent: string;
  }): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.pendingApprovals.set(req.approvalId, resolve);
      const timer = setTimeout(() => {
        if (this.pendingApprovals.delete(req.approvalId)) resolve(false);
      }, 5 * 60_000);
      timer.unref?.();
    });
  }
}

export const agentCoordinator = new AgentCoordinator();
