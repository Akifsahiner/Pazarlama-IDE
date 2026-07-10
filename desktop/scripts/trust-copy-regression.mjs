#!/usr/bin/env node
/**
 * Fails CI if forbidden sales/metrics copy reappears in user-facing surfaces.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scanRoots = [
  path.join(root, "src", "renderer"),
  path.resolve(root, "..", "src"),
];

const FORBIDDEN = [
  { pattern: /reaches your leads/i, label: "reaches your leads" },
  { pattern: /find & reach leads/i, label: "Find & reach leads" },
  { pattern: /finds and reaches/i, label: "finds and reaches" },
  { pattern: /complete marketing plan/i, label: "complete marketing plan" },
  { pattern: /auto-send/i, label: "auto-send" },
  { pattern: /auto publish/i, label: "auto publish" },
  { pattern: /fully automated/i, label: "fully automated" },
];

const REQUIRED_MARKERS = [
  { pattern: /planPreviewMode/, label: "planPreviewMode" },
  { pattern: /PLAN_PREVIEW_BADGE/, label: "PLAN_PREVIEW_BADGE" },
];

const EXT = new Set([".ts", ".tsx", ".md", ".html"]);

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "out" || e.name === "dist") continue;
      await walk(full, acc);
    } else if (EXT.has(path.extname(e.name))) {
      acc.push(full);
    }
  }
  return acc;
}

let failed = false;
const desktopFiles = await walk(path.join(root, "src"));

for (const scanRoot of scanRoots) {
  const files = await walk(scanRoot);
  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const rule of FORBIDDEN) {
      if (rule.pattern.test(text)) {
        console.error(`[trust-copy] Forbidden "${rule.label}" in ${path.relative(root, file)}`);
        failed = true;
      }
    }
  }
}

for (const rule of REQUIRED_MARKERS) {
  let found = false;
  for (const file of desktopFiles) {
    const text = await readFile(file, "utf8");
    if (rule.pattern.test(text)) {
      found = true;
      break;
    }
  }
  if (!found) {
    console.error(`[trust-copy] Missing required marker "${rule.label}" in desktop/src`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("[trust-copy] OK — no forbidden outreach/metrics copy");
