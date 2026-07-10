export function encodeOAuthState(payload: Record<string, string>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeOAuthState<T extends Record<string, string>>(state: string): T | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as T;
    return parsed;
  } catch {
    return null;
  }
}
