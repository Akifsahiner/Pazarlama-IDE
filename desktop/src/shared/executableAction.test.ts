import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executableActionToIntent,
  parseExecutableAction,
  actionButtonLabel,
} from "./executableAction.js";

describe("executableActionToIntent", () => {
  it("maps edit_run to start_edit_run", () => {
    const intent = executableActionToIntent({
      kind: "edit_run",
      goal: "Rewrite hero CTA on apps/console/page.tsx",
    });
    assert.equal(intent?.kind, "start_edit_run");
  });
});

describe("parseExecutableAction", () => {
  it("parses edit_run payload", () => {
    const a = parseExecutableAction({
      kind: "edit_run",
      goal: "Fix meta tags",
      targetFiles: ["apps/console/page.tsx"],
    });
    assert.equal(a?.kind, "edit_run");
    assert.deepEqual(a?.kind === "edit_run" ? a.targetFiles : [], ["apps/console/page.tsx"]);
  });
});

describe("actionButtonLabel", () => {
  it("returns custom label when set", () => {
    assert.equal(
      actionButtonLabel({ kind: "edit_run", goal: "x", label: "Go" }),
      "Go",
    );
  });
});
