import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flattenFilePaths, rankFilePaths } from "./fileSearch";
import type { FileTreeNode } from "./types";

describe("fileSearch", () => {
  const tree: FileTreeNode[] = [
    {
      name: "src",
      path: "src",
      kind: "dir",
      children: [
        { name: "page.tsx", path: "src/page.tsx", kind: "file" },
        { name: "App.tsx", path: "src/App.tsx", kind: "file" },
      ],
    },
    { name: "README.md", path: "README.md", kind: "file" },
  ];

  it("flattens file paths", () => {
    const paths = flattenFilePaths(tree);
    assert.ok(paths.includes("src/page.tsx"));
    assert.ok(paths.includes("README.md"));
  });

  it("ranks by filename match", () => {
    const paths = flattenFilePaths(tree);
    const hits = rankFilePaths("page", paths);
    assert.equal(hits[0], "src/page.tsx");
  });

  it("excludes node_modules", () => {
    const paths = ["node_modules/foo/index.js", "src/index.ts"];
    assert.deepEqual(rankFilePaths("index", paths), ["src/index.ts"]);
  });
});
