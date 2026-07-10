import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractLeadsFromThread, leadsToCsv } from "./leadExport";

describe("leadExport", () => {
  it("parses bullet leads from thread", () => {
    const leads = extractLeadsFromThread([
      {
        role: "agent",
        text: "Lead research results:\n- Acme Corp — strong ICP fit https://acme.com",
      },
    ]);
    assert.ok(leads.length >= 1);
    assert.match(leads[0].name, /Acme/i);
  });

  it("emits valid CSV header", () => {
    const csv = leadsToCsv([
      {
        name: "Jane",
        company: "Acme",
        fit_evidence: "B2B SaaS",
        why_now: "Hiring",
        source_url: "https://acme.com",
        draft_status: "researched",
      },
    ]);
    assert.match(csv, /^name,company,/);
    assert.match(csv, /Jane/);
  });
});
