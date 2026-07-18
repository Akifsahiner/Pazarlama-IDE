import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applySelectedHunks, parseHunks } from "./patchParse";

const PATCH = `--- a/x.ts
+++ b/x.ts
@@ -1,3 +1,4 @@
 line1
-line2
+line2b
 line3
+line4
@@ -10,2 +11,2 @@
 keep
-old
+new
`;

describe("parseHunks / applySelectedHunks", () => {
  it("parses two hunks", () => {
    const hunks = parseHunks(PATCH);
    assert.equal(hunks.length, 2);
    assert.ok(hunks[0]!.header.includes("@@"));
  });

  it("applies only selected hunk", () => {
    const original = ["line1", "line2", "line3", "", "", "", "", "", "", "keep", "old"].join(
      "\n",
    );
    const hunks = parseHunks(PATCH);
    const out = applySelectedHunks(original, hunks, [hunks[0]!.id]);
    assert.ok(out.includes("line2b"));
    assert.ok(out.includes("line4"));
    assert.ok(out.includes("old")); // second hunk not applied
    assert.ok(!out.includes("\nnew\n") && !out.endsWith("\nnew"));
  });

  it("applies all hunks", () => {
    const original = ["line1", "line2", "line3", "", "", "", "", "", "", "keep", "old"].join(
      "\n",
    );
    const hunks = parseHunks(PATCH);
    const out = applySelectedHunks(
      original,
      hunks,
      hunks.map((h) => h.id),
    );
    assert.ok(out.includes("line2b"));
    assert.ok(out.includes("new"));
  });
});
