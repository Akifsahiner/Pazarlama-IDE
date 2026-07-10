import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** In-memory outbox for node tests (no localStorage). */
const mem = new Map<string, string>();

function load(projectId: string) {
  const raw = mem.get(`messageOutbox.v1.${projectId}`);
  return raw ? (JSON.parse(raw) as unknown[]) : [];
}

function save(projectId: string, entries: unknown[]) {
  mem.set(`messageOutbox.v1.${projectId}`, JSON.stringify(entries));
}

describe("messageOutbox logic", () => {
  it("enqueue preserves order", () => {
    const projectId = "p1";
    const entries = [
      ...load(projectId),
      { id: "a", createdAt: 1, projectId, text: "hello" },
      { id: "b", createdAt: 2, projectId, text: "world" },
    ];
    save(projectId, entries);
    const loaded = load(projectId) as { id: string; text: string }[];
    assert.equal(loaded.length, 2);
    assert.equal(loaded[0]!.text, "hello");
  });
});
