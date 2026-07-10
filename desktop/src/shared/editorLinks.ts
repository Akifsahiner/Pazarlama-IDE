export type EditorId = "cursor" | "vscode";

/** Deep link to open a file in Cursor or VS Code (same scheme family). */
export function buildEditorFileUrl(editor: EditorId, absPath: string, line?: number): string {
  const normalized = absPath.replace(/\\/g, "/");
  const proto = editor === "cursor" ? "cursor" : "vscode";
  const suffix = line && line > 0 ? `:${line}:1` : "";
  return `${proto}://file/${normalized}${suffix}`;
}

/** Open project folder in editor workspace. */
export function buildEditorFolderUrl(editor: EditorId, absPath: string): string {
  const normalized = absPath.replace(/\\/g, "/");
  const proto = editor === "cursor" ? "cursor" : "vscode";
  return `${proto}://file/${normalized}`;
}
