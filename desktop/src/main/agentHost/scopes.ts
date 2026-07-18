import type { PermissionScope } from "../../shared/types";

/**
 * Map an Agent SDK tool name to a product permission scope. The permission
 * matrix then decides auto / ask / always_ask / never for that scope.
 *
 * Conservative defaults: anything that writes the filesystem or runs shell
 * commands is gated behind `modify_local_files`; pure reads are `read_inspect`.
 */
export function scopeForTool(toolName: string): PermissionScope {
  const name = toolName.toLowerCase();

  // Read-only inspection + mid-run browser verify (Faz 4)
  if (
    name === "browser_verify" ||
    name === "read" ||
    name === "grep" ||
    name === "glob" ||
    name === "ls" ||
    name === "notebookread" ||
    name === "webfetch" ||
    name === "websearch" ||
    name === "todowrite" ||
    name === "task" ||
    name === "skill"
  ) {
    return "read_inspect";
  }

  // Filesystem mutation
  if (
    name === "write" ||
    name === "edit" ||
    name === "multiedit" ||
    name === "notebookedit" ||
    name === "bash" ||
    name === "bashoutput" ||
    name === "killshell"
  ) {
    return "modify_local_files";
  }

  // MCP / connector tools — submitting to external systems. Public by default.
  if (name.startsWith("mcp__")) return "submit_public_forms";

  // Unknown tool → treat as a local mutation (safer than auto).
  return "modify_local_files";
}
