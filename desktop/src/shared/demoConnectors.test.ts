import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDemoConnectorsAllowed } from "./demoConnectors";

describe("isDemoConnectorsAllowed", () => {
  it("returns false in production builds", () => {
    assert.equal(isDemoConnectorsAllowed(true), false);
  });
});
