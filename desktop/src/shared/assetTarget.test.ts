import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultSidecarPath,
  inferIntegrateRoute,
  isCodePath,
  isSafeDirectWrite,
  slugFromTitle,
} from "./assetTarget";
import {
  decisionKindToMarketingType,
  prepareMarketingAssetFromDecision,
  resolveAssetActions,
} from "./assetActions";

describe("assetTarget", () => {
  it("slugFromTitle normalizes titles", () => {
    assert.equal(slugFromTitle("Hero Headline Copy"), "hero-headline-copy");
  });

  it("isCodePath detects tsx", () => {
    assert.equal(isCodePath("app/page.tsx"), true);
    assert.equal(isCodePath("marketing/hero.md"), false);
  });

  it("isSafeDirectWrite allows marketing sidecar", () => {
    assert.equal(isSafeDirectWrite("marketing/hero.md"), true);
    assert.equal(isSafeDirectWrite("app/page.tsx"), false);
  });

  it("defaultSidecarPath dedupes collisions", () => {
    assert.equal(defaultSidecarPath("Hero"), "marketing/hero.md");
    assert.equal(defaultSidecarPath("Hero", ["marketing/hero.md"]), "marketing/hero-2.md");
  });

  it("inferIntegrateRoute prefers app/page", () => {
    const route = inferIntegrateRoute(["src/foo.tsx", "app/page.tsx", "pages/index.tsx"]);
    assert.equal(route, "app/page.tsx");
  });

  it("inferIntegrateRoute prefers src/app/page", () => {
    const route = inferIntegrateRoute(["lib/util.ts", "src/app/page.tsx", "pages/home.tsx"]);
    assert.equal(route, "src/app/page.tsx");
  });

  it("inferIntegrateRoute falls back to landing/home code paths", () => {
    const route = inferIntegrateRoute(["components/Landing.tsx", "lib/util.ts"]);
    assert.equal(route, "components/Landing.tsx");
  });
});

describe("assetActions", () => {
  const folderProject = {
    id: "p1",
    source: { kind: "folder" as const, path: "/proj" },
    name: "Demo",
    routes: ["app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 10,
  };

  it("no folder → preview only, integrate unavailable", () => {
    const asset = prepareMarketingAssetFromDecision({
      kind: "copy",
      title: "Hero",
      content: "Hello",
    });
    const actions = resolveAssetActions({
      asset,
      project: null,
      title: "Hero",
      decisionKind: "copy",
    });
    assert.equal(actions.canApplyToRepo, false);
    assert.equal(actions.primary.kind, "preview");
    assert.equal(actions.integrateRoute, undefined);
    assert.ok(!actions.secondary.some((a) => a.kind === "integrate_run"));
    assert.match(actions.applyBlockReason ?? "", /local folder/i);
  });

  it("folder + copy → integrate primary", () => {
    const asset = prepareMarketingAssetFromDecision({
      kind: "copy",
      title: "Hero",
      content: "Hello",
    });
    const actions = resolveAssetActions({
      asset,
      project: folderProject,
      title: "Hero",
      decisionKind: "copy",
    });
    assert.equal(actions.primary.kind, "integrate_run");
    assert.equal(actions.primary.label, "Apply to site");
    assert.equal(actions.integrateRoute, "app/page.tsx");
    assert.ok(actions.secondary.some((a) => a.kind === "apply_sidecar" && a.label === "Save to marketing/"));
  });

  it("folder + copy → sidecar apply path", () => {
    const asset = prepareMarketingAssetFromDecision({
      kind: "copy",
      title: "Hero",
      content: "Hello",
    });
    const actions = resolveAssetActions({
      asset,
      project: folderProject,
      title: "Hero",
      decisionKind: "copy",
    });
    assert.equal(actions.canApplyToRepo, true);
    assert.equal(actions.targetFile, "marketing/hero.md");
    assert.equal(actions.primary.kind, "integrate_run");
  });

  it("email asset → copy primary", () => {
    const asset = prepareMarketingAssetFromDecision({
      kind: "email",
      title: "Welcome",
      content: "Hi there",
    });
    const actions = resolveAssetActions({
      asset,
      project: folderProject,
      title: "Welcome",
      decisionKind: "email",
    });
    assert.equal(actions.primary.kind, "copy");
    assert.equal(decisionKindToMarketingType("email"), "email");
  });
});
