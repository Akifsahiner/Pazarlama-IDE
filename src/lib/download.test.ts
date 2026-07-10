import assert from "node:assert/strict";
import test from "node:test";
import {
  detectDownloadPlatform,
  otherDownloadOptions,
  resolveDownloadTarget,
} from "./download";

test("detectDownloadPlatform — Windows", () => {
  assert.equal(
    detectDownloadPlatform(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Win32",
    ),
    "windows",
  );
});

test("detectDownloadPlatform — macOS", () => {
  assert.equal(
    detectDownloadPlatform(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "MacIntel",
    ),
    "macos",
  );
});

test("detectDownloadPlatform — Linux", () => {
  assert.equal(
    detectDownloadPlatform("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36", "Linux x86_64"),
    "linux",
  );
});

test("resolveDownloadTarget — stable artifact URLs", () => {
  const win = resolveDownloadTarget("windows");
  assert.match(win.href, /Marketing-IDE-Setup-Windows\.exe$/);
  const mac = resolveDownloadTarget("macos");
  assert.match(mac.href, /Marketing-IDE-Setup-macOS\.dmg$/);
});

test("otherDownloadOptions — excludes current platform", () => {
  const others = otherDownloadOptions("windows");
  assert.equal(others.length, 2);
  assert.ok(others.every((o) => o.platform !== "windows"));
});
