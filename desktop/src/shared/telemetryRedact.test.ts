import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactTelemetryProps, redactTelemetryValue } from "./telemetryRedact";

describe("telemetryRedact", () => {
  it("redacts emails and absolute paths in strings", () => {
    const out = redactTelemetryValue(
      "Contact founder@acme.com at /Users/me/proj/src/app.tsx",
    ) as string;
    assert.match(out, /\[email\]/);
    assert.match(out, /\[path\]/);
    assert.doesNotMatch(out, /founder@acme\.com/);
  });

  it("redacts sensitive keys in props", () => {
    const redacted = redactTelemetryProps({
      event_kind: "apply",
      email: "secret@test.com",
      proof_url: "https://example.com/private",
      count: 3,
    });
    assert.equal(redacted!.email, "[redacted]");
    assert.equal(redacted!.proof_url, "[redacted]");
    assert.equal(redacted!.count, 3);
  });

  it("redacts token query params", () => {
    const out = redactTelemetryValue(
      "https://app.com/callback?token=abc123&foo=bar",
    ) as string;
    assert.match(out, /token=\[redacted\]/);
    assert.doesNotMatch(out, /abc123/);
  });
});
