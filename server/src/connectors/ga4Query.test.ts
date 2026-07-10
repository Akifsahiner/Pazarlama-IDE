import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectorRegistry } from "./types.js";
import "./ga4Query.js";
import { GA4_QUERY_TOOL } from "./ga4Query.js";

describe("ga4Query connector", () => {
  it("registers ga4_query tool", () => {
    const tool = connectorRegistry.get("ga4_query");
    assert.ok(tool);
    assert.equal(tool?.name, "ga4_query");
    assert.equal(tool?.scope, "read_inspect");
  });

  it("GA4_QUERY_TOOL schema exposes range enum", () => {
    const schema = GA4_QUERY_TOOL.input_schema as {
      properties?: { range?: { enum?: readonly string[] } };
    };
    assert.deepEqual(schema.properties?.range?.enum, ["7d", "28d", "90d"]);
  });
});
