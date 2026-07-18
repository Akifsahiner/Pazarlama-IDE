/**
 * In-app notification center with 1h dedupe — no spam / demo prompts.
 */
import { randomUUID } from "node:crypto";
import type { BrowserWindow } from "electron";
import type { IdeNotification, RunIntent } from "../../shared/orchestration";
import { IPC } from "../../shared/ipc";

const DEDUPE_MS = 60 * 60 * 1000;

class NotificationCenter {
  private items: IdeNotification[] = [];
  private lastByKey = new Map<string, number>();
  private window: BrowserWindow | null = null;

  attachWindow(win: BrowserWindow): void {
    this.window = win;
  }

  list(): IdeNotification[] {
    return [...this.items].sort((a, b) => b.createdAt - a.createdAt);
  }

  push(input: {
    severity: IdeNotification["severity"];
    title: string;
    body: string;
    dedupeKey: string;
    actions?: Array<{ id: string; label: string; intent?: RunIntent }>;
  }): IdeNotification | null {
    const now = Date.now();
    const last = this.lastByKey.get(input.dedupeKey) ?? 0;
    if (now - last < DEDUPE_MS) return null;
    this.lastByKey.set(input.dedupeKey, now);

    const note: IdeNotification = {
      id: randomUUID(),
      severity: input.severity,
      title: input.title,
      body: input.body,
      createdAt: now,
      actions: input.actions,
      dedupeKey: input.dedupeKey,
    };
    this.items = [note, ...this.items].slice(0, 50);
    this.window?.webContents.send(IPC.notifications.updated, this.list());
    return note;
  }

  dismiss(id: string): void {
    this.items = this.items.filter((n) => n.id !== id);
    this.window?.webContents.send(IPC.notifications.updated, this.list());
  }

  clear(): void {
    this.items = [];
    this.window?.webContents.send(IPC.notifications.updated, this.list());
  }
}

export const notificationCenter = new NotificationCenter();
