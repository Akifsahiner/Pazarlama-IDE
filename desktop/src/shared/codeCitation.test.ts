import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractCodeCitations,
  linkifyCodeCitations,
  parseRepoFileLink,
} from "./codeCitation.js";

describe("extractCodeCitations", () => {
  it("finds path:line and path:line-range", () => {
    const text =
      "Ship the hero in apps/console/page.tsx:12 and wire billing in src/api/route.ts:40-55";
    const cites = extractCodeCitations(text);
    assert.equal(cites.length, 2);
    assert.equal(cites[0]!.path, "apps/console/page.tsx");
    assert.equal(cites[0]!.startLine, 12);
    assert.equal(cites[1]!.endLine, 55);
  });
});

describe("linkifyCodeCitations", () => {
  it("wraps citations as markdown links", () => {
    const out = linkifyCodeCitations("See apps/foo.tsx:7 for CTA copy");
    assert.match(out, /\[apps\/foo\.tsx:7\]\(repo-file:\/\//);
  });
});

describe("parseRepoFileLink", () => {
  it("parses line query params", () => {
    const p = parseRepoFileLink("repo-file://apps/console/page.tsx?line=12&end=40");
    assert.equal(p?.path, "apps/console/page.tsx");
    assert.equal(p?.line, 12);
    assert.equal(p?.endLine, 40);
  });
});
