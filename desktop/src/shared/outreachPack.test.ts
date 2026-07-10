import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOutreachPack, packToWebhookPayload, shapeProviderPayload } from "./outreachPack";

describe("outreachPack", () => {
  it("builds markdown with project name and disclaimer", () => {
    const pack = buildOutreachPack({
      projectName: "My SaaS",
      thread: [],
      findings: [],
      emailAssets: [],
    });
    assert.match(pack.markdown, /Outreach pack — My SaaS/);
    assert.match(pack.markdown, /you send/i);
  });

  it("shapes Lemlist provider payload with leads array", () => {
    const pack = buildOutreachPack({
      projectName: "My SaaS",
      thread: [],
      findings: [
        {
          id: "f1",
          title: "Lead: Jane Doe",
          severity: "info",
          evidence: "VP Sales at Acme",
          suggestion: "Strong fit",
          createdAt: "2026-07-01T10:00:00.000Z",
        },
      ],
      emailAssets: [],
    });
    const shaped = shapeProviderPayload(pack, "lemlist");
    assert.ok(shaped);
    assert.equal(shaped!.provider, "lemlist");
    assert.ok(Array.isArray(shaped!.leads));
  });

  it("includes provider_payload in webhook body", () => {
    const pack = buildOutreachPack({
      projectName: "My SaaS",
      thread: [],
      findings: [],
      emailAssets: [],
    });
    const body = packToWebhookPayload(pack, "instantly");
    assert.equal(body.provider, "instantly");
    assert.ok(body.provider_payload);
  });
});
