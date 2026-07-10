import { safeStorage } from "electron";
import type { AuthTokenBlob } from "../shared/types";
import { clearAuthTokenRaw, getAuthTokenRaw, setAuthTokenRaw } from "./store";

/**
 * Secure token storage for the desktop app.
 *
 * The token blob is serialized to JSON and stored in electron-store under the
 * `authToken` key. When the OS keychain is available we encrypt it with
 * Electron `safeStorage`; otherwise we fall back to a clearly-marked plaintext
 * (base64) blob and warn — better a working sign-in than a hard failure on
 * platforms without a secret store.
 */

const PLAINTEXT_PREFIX = "plain:";

export function loadAuthBlob(): AuthTokenBlob | null {
  const raw = getAuthTokenRaw();
  if (!raw) return null;
  try {
    let json: string;
    if (raw.startsWith(PLAINTEXT_PREFIX)) {
      json = Buffer.from(raw.slice(PLAINTEXT_PREFIX.length), "base64").toString("utf8");
    } else if (safeStorage.isEncryptionAvailable()) {
      json = safeStorage.decryptString(Buffer.from(raw, "base64"));
    } else {
      // Encrypted blob exists but we can no longer decrypt it.
      return null;
    }
    return JSON.parse(json) as AuthTokenBlob;
  } catch {
    return null;
  }
}

export function saveAuthBlob(blob: AuthTokenBlob): void {
  const json = JSON.stringify(blob);
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json).toString("base64");
    setAuthTokenRaw(encrypted);
  } else {
    console.warn("[auth] safeStorage unavailable — storing tokens in plaintext");
    setAuthTokenRaw(PLAINTEXT_PREFIX + Buffer.from(json, "utf8").toString("base64"));
  }
}

export function clearAuthBlob(): void {
  clearAuthTokenRaw();
}
