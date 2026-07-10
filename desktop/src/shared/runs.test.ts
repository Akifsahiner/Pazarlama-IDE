import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runChangedFiles } from "./runs";
import type { RunEvent } from "./types";

describe("runChangedFiles", () => {
  it("excludes selectively discarded patches", () => {
    const events = [
      {
        id: "1",
        runId: "r1",
        seq: 1,
        timestamp: "",
        type: "file.patch_created",
        title: "a",
        payload: { file: "src/a.ts" },
      },
      {
        id: "2",
        runId: "r1",
        seq: 2,
        timestamp: "",
        type: "file.patch_discarded",
        title: "revert a",
        payload: { file: "src/a.ts" },
      },
      {
        id: "3",
        runId: "r1",
        seq: 3,
        timestamp: "",
        type: "file.patch_updated",
        title: "b",
        payload: { file: "src/b.ts" },
      },
    ] as RunEvent[];
    assert.deepEqual(runChangedFiles(events), ["src/b.ts"]);
  });
});
