import { eq, persistenceEnabled, sb } from "../client.js";

export type MessageRole = "user" | "agent" | "system";

export interface MessageRow {
  id: string;
  session_id: string;
  role: MessageRole;
  kind: string | null;
  content_json: unknown;
  ts: string;
}

export interface InsertMessageInput {
  role: MessageRole;
  kind?: string;
  content_json: unknown;
}

/**
 * Strip large base64 browser frames from a content payload before persisting.
 * We never want multi-MB screenshots living in the messages table.
 */
function stripFrames(content: unknown): unknown {
  if (Array.isArray(content)) return content.map(stripFrames);
  if (content && typeof content === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(content as Record<string, unknown>)) {
      if (key === "frame" || key === "pngBase64") continue;
      out[key] = stripFrames(value);
    }
    return out;
  }
  return content;
}

export async function list(sessionId: string): Promise<MessageRow[]> {
  if (!persistenceEnabled) return [];
  return (await sb<MessageRow[]>(`/messages?session_id=${eq(sessionId)}&order=ts.asc`)) ?? [];
}

export async function insert(
  sessionId: string,
  input: InsertMessageInput,
): Promise<MessageRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<MessageRow[]>("/messages", {
    method: "POST",
    body: JSON.stringify([
      {
        session_id: sessionId,
        role: input.role,
        kind: input.kind ?? null,
        content_json: stripFrames(input.content_json),
      },
    ]),
  });
  return rows?.[0] ?? null;
}
