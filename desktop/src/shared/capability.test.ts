import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveMatrix,
  assertCan,
  fixLabel,
  matrixToRuntime,
} from "./capability";

describe("deriveMatrix", () => {
  it("blocks ask/edit/browse when backend down", () => {
    const m = deriveMatrix({
      connectionState: "error",
      authEnabled: false,
      authState: "signed-in",
    });
    assert.equal(m.canAsk, false);
    assert.equal(m.canEdit, false);
    assert.equal(m.canBrowse, false);
    assert.equal(m.canPlanOffline, true);
    assert.equal(m.caps.backend.state, "blocked");
    assert.equal(m.caps.backend.fix?.label, "Retry connection");
    assert.equal(matrixToRuntime(m), "local");
  });

  it("marks anthropic unavailable as degraded runtime", () => {
    const m = deriveMatrix({
      connectionState: "connected",
      providers: { anthropic: false },
      authEnabled: false,
      authState: "signed-in",
    });
    assert.equal(m.canAsk, false);
    assert.equal(m.caps.anthropic.state, "unavailable");
    assert.equal(m.caps.anthropic.fix?.label, "Open connection settings");
    assert.equal(matrixToRuntime(m), "degraded");
  });

  it("enables ask/edit/browse when fully ready", () => {
    const m = deriveMatrix({
      connectionState: "connected",
      providers: { anthropic: true },
      authEnabled: false,
      authState: "signed-in",
    });
    assert.equal(m.canAsk, true);
    assert.equal(m.canEdit, true);
    assert.equal(m.canBrowse, true);
    assert.equal(matrixToRuntime(m), "connected");
  });

  it("blocks on auth when required", () => {
    const m = deriveMatrix({
      connectionState: "connected",
      providers: { anthropic: true },
      authEnabled: true,
      authState: "signed-out",
    });
    assert.equal(m.canAsk, false);
    assert.equal(m.caps.auth.state, "blocked");
    assert.equal(fixLabel(m, ["auth", "anthropic"]), "Sign in");
  });

  it("assertCan returns missing caps", () => {
    const m = deriveMatrix({
      connectionState: "connected",
      providers: { anthropic: false },
      authEnabled: false,
      authState: "signed-in",
    });
    const r = assertCan(m, ["backend", "auth", "anthropic", "computer_use"]);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.missing.some((c) => c.id === "anthropic"));
      assert.ok(r.missing.some((c) => c.id === "computer_use"));
    }
  });
});
