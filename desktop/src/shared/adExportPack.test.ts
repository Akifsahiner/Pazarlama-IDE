import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAdExportPack, adPackToZipEntries } from "./adExportPack";
import type { MarketingAsset } from "./types";

const sampleAsset: MarketingAsset = {
  id: "ad-1",
  type: "ad",
  after: "Ship faster with AI\nSave hours on every launch.",
};

describe("adExportPack", () => {
  it("builds pack with HTML mocks, checklist, and copy", () => {
    const pack = buildAdExportPack(sampleAsset, "Acme SaaS");
    const names = pack.files.map((f) => f.name);
    assert.ok(names.includes("meta-preview.html"));
    assert.ok(names.includes("google-preview.html"));
    assert.ok(names.includes("publish-checklist.md"));
    assert.ok(names.includes("creative-copy.txt"));
    assert.ok(names.includes("previews.svg"));
    assert.match(pack.files.find((f) => f.name === "creative-copy.txt")!.content, /Ship faster/);
    assert.match(pack.files.find((f) => f.name === "publish-checklist.md")!.content, /you publish/i);
  });

  it("produces zip entries with prefixed folder", () => {
    const pack = buildAdExportPack(sampleAsset, "Acme SaaS");
    const entries = adPackToZipEntries(pack);
    assert.ok(entries.length >= 5);
    assert.ok(entries.every((e) => e.name.startsWith("ad-pack-acme-saas/")));
    assert.ok(entries.every((e) => e.data.byteLength > 0));
  });
});
