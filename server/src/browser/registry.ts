import { env } from "../env.js";

/** Tracks live Computer Use sessions for concurrency capping + graceful shutdown. */
export interface Stoppable {
  stop: () => Promise<void>;
}

const sessions = new Set<Stoppable>();

export function canStartSession(): boolean {
  return sessions.size < env.BROWSER_MAX_SESSIONS;
}

export function registerSession(s: Stoppable): void {
  sessions.add(s);
}

export function unregisterSession(s: Stoppable): void {
  sessions.delete(s);
}

export function activeSessionCount(): number {
  return sessions.size;
}

export async function closeAllBrowserSessions(): Promise<void> {
  await Promise.all([...sessions].map((s) => s.stop().catch(() => undefined)));
  sessions.clear();
}
