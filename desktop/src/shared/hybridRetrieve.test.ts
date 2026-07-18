import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Unit test for hybrid TF-IDF-ish scoring — mirrors projectIndex scoreChunkHybrid.
 * Kept shared-side so CI runs without Electron.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/)
    .filter((t) => t.length > 1);
}

function charGrams(text: string, n = 3): string[] {
  const s = text.toLowerCase().replace(/\s+/g, " ");
  if (s.length < n) return s ? [s] : [];
  const out: string[] = [];
  for (let i = 0; i <= s.length - n; i++) out.push(s.slice(i, i + n));
  return out;
}

function scoreChunkHybrid(
  query: string,
  text: string,
  pathRel: string,
  df: Map<string, number>,
  nDocs: number,
): number {
  const qTerms = tokenize(query);
  if (!qTerms.length) return 0;
  const docTerms = tokenize(`${pathRel}\n${text}`);
  if (!docTerms.length) return 0;
  const tf = new Map<string, number>();
  for (const t of docTerms) tf.set(t, (tf.get(t) ?? 0) + 1);
  let score = 0;
  for (const t of qTerms) {
    const f = tf.get(t) ?? 0;
    if (f === 0) continue;
    const docFreq = df.get(t) ?? 1;
    const idf = Math.log(1 + nDocs / docFreq);
    score += (1 + Math.log(f)) * idf;
  }
  const pathLower = pathRel.toLowerCase();
  for (const t of qTerms) {
    if (pathLower.includes(t)) score += 1.25 * Math.log(1 + nDocs);
  }
  const qg = new Set(charGrams(query));
  const dg = new Set(charGrams(text.slice(0, 2000)));
  if (qg.size && dg.size) {
    let inter = 0;
    for (const g of qg) if (dg.has(g)) inter += 1;
    score += (inter / qg.size) * 2;
  }
  return score;
}

describe("hybrid retrieve scoring", () => {
  it("ranks path-matching docs higher than unrelated", () => {
    const docs = [
      { path: "src/pricing/cta.tsx", text: "export function PricingCta() { return null }" },
      { path: "README.md", text: "welcome to the monorepo documentation" },
    ];
    const df = new Map<string, number>();
    for (const d of docs) {
      for (const t of new Set(tokenize(`${d.path}\n${d.text}`))) {
        df.set(t, (df.get(t) ?? 0) + 1);
      }
    }
    const q = "pricing cta";
    const s0 = scoreChunkHybrid(q, docs[0]!.text, docs[0]!.path, df, docs.length);
    const s1 = scoreChunkHybrid(q, docs[1]!.text, docs[1]!.path, df, docs.length);
    assert.ok(s0 > s1, `expected ${s0} > ${s1}`);
  });

  it("gives positive score for char-gram overlap on typos", () => {
    const df = new Map([["analytics", 1]]);
    const score = scoreChunkHybrid(
      "analytcs dashboard",
      "analytics dashboard metrics",
      "src/analytics.ts",
      df,
      1,
    );
    assert.ok(score > 0);
  });
});
