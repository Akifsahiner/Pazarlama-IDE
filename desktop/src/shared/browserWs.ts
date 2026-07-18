/** Shared browser WebSocket URL helper (renderer + main). */
export function browserWsUrl(serverUrl: string): string {
  return `${serverUrl.replace(/^http/i, "ws").replace(/\/+$/, "")}/browser`;
}
