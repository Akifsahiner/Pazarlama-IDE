import { safeStorage } from "electron";
import { clearBundledApiKeyRaw, getBundledApiKeyRaw, setBundledApiKeyRaw } from "./store";

const PLAINTEXT_PREFIX = "plain:";

export function hasBundledApiKey(): boolean {
  return Boolean(getBundledApiKeyRaw());
}

export function loadBundledApiKey(): string | null {
  const raw = getBundledApiKeyRaw();
  if (!raw) return null;
  try {
    if (raw.startsWith(PLAINTEXT_PREFIX)) {
      return Buffer.from(raw.slice(PLAINTEXT_PREFIX.length), "base64").toString("utf8");
    }
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(raw, "base64"));
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBundledApiKey(value: string): void {
  const trimmed = value.trim();
  if (!trimmed) {
    clearBundledApiKey();
    return;
  }
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(trimmed).toString("base64");
    setBundledApiKeyRaw(encrypted);
  } else {
    console.warn("[bundledApiKey] safeStorage unavailable — storing key in plaintext");
    setBundledApiKeyRaw(PLAINTEXT_PREFIX + Buffer.from(trimmed, "utf8").toString("base64"));
  }
}

export function clearBundledApiKey(): void {
  clearBundledApiKeyRaw();
}
