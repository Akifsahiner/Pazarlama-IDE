import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveRuntimeCapability, buildSetupChecklist } from "./runtimeCapability";

describe("resolveRuntimeCapability", () => {
  it("returns local when backend unreachable", () => {
    const r = resolveRuntimeCapability({
      connectionState: "error",
      authEnabled: true,
      authState: "signed-out",
    });
    assert.equal(r.capability, "local");
    assert.equal(r.connectAction, "signin");
  });

  it("returns connected when health and provider ok", () => {
    const r = resolveRuntimeCapability({
      connectionState: "connected",
      providers: { anthropic: true },
      authEnabled: false,
      authState: "signed-in",
    });
    assert.equal(r.capability, "connected");
  });

  it("returns degraded when connected but no anthropic", () => {
    const r = resolveRuntimeCapability({
      connectionState: "connected",
      providers: { anthropic: false },
      authEnabled: false,
      authState: "signed-in",
    });
    assert.equal(r.capability, "degraded");
  });
});

describe("buildSetupChecklist", () => {
  it("marks server ok when connected", () => {
    const c = buildSetupChecklist({
      connectionState: "connected",
      providers: { anthropic: true },
      connectors: { ga4OAuth: true },
    });
    assert.equal(c.server, "ok");
    assert.equal(c.anthropic, "ok");
    assert.equal(c.ga4, "ok");
  });

  it("marks server error on failure", () => {
    const c = buildSetupChecklist({ connectionState: "error" });
    assert.equal(c.server, "error");
  });
});
