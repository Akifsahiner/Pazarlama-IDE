import Store from "electron-store";
import { DEFAULT_SETTINGS } from "../shared/defaults";
import type { RecentProject, Settings } from "../shared/types";

export interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

interface StoreSchema {
  settings: Settings;
  recents: RecentProject[];
  windowBounds: WindowBounds;
  /** Encrypted (or plaintext-fallback) auth token blob — see main/auth.ts. */
  authToken?: string;
  /** Encrypted Anthropic API key for bundled local server only — renderer never reads it. */
  bundledServerApiKey?: string;
  /** Offline read cache for synced data (projects, me, …). */
  cache: Record<string, unknown>;
}

const store = new Store<StoreSchema>({
  defaults: {
    settings: DEFAULT_SETTINGS,
    recents: [],
    windowBounds: { width: 1280, height: 820 },
    cache: {},
  },
});

export function getWindowBounds(): WindowBounds {
  return store.get("windowBounds", { width: 1280, height: 820 });
}

export function setWindowBounds(bounds: WindowBounds): void {
  store.set("windowBounds", bounds);
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...store.get("settings") };
}

export function setSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  store.set("settings", next);
  return next;
}

export function getRecents(): RecentProject[] {
  return store.get("recents", []);
}

export function addRecent(project: RecentProject): void {
  const existing = getRecents().filter((r) => r.id !== project.id);
  const next = [project, ...existing].slice(0, 8);
  store.set("recents", next);
}

export function getAuthTokenRaw(): string | null {
  return store.get("authToken") ?? null;
}

export function setAuthTokenRaw(value: string): void {
  store.set("authToken", value);
}

export function clearAuthTokenRaw(): void {
  store.delete("authToken");
}

export function getBundledApiKeyRaw(): string | null {
  return store.get("bundledServerApiKey") ?? null;
}

export function setBundledApiKeyRaw(value: string): void {
  store.set("bundledServerApiKey", value);
}

export function clearBundledApiKeyRaw(): void {
  store.delete("bundledServerApiKey");
}

export function getCacheValue<T = unknown>(key: string): T | null {
  const cache = store.get("cache", {});
  return (cache[key] as T) ?? null;
}

export function setCacheValue(key: string, value: unknown): void {
  const cache = { ...store.get("cache", {}), [key]: value };
  store.set("cache", cache);
}
