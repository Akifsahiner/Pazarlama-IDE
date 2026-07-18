# Playbook: Aggressive Programmatic Cluster

14-day sprint: one commercial-intent cluster (alternatives + vs + how-to hub) with internal link graph, docs CTAs, and GSC baseline — no fake traffic claims.

## Preconditions
- [ ] ≥2 indexable routes live (`/blog`, `/docs`, or `/compare`)
- [ ] Google Search Console property verified + sitemap submitted
- [ ] 3 named competitors with honest differentiation notes
- [ ] Canonical URLs + meta component in repo (or CMS) shippable in ≤3 days
- [ ] Founder can review technical accuracy on every comparison row
- [ ] No stealth constraint blocking indexation

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | New domain, 0 backlinks | GSC baseline + 1 pillar how-to only |
| standard | Some indexation, small blog | 3-page cluster (alternatives + 1 vs + hub) |
| aggressive | Docs/blog live + competitor clarity | Full 5-page cluster + programmatic guardrails + D+30 refresh schedule |

**Honest ceiling:** Domain age <6 months and no brand search → Top 10 on niche "[competitor] alternative" in 60–120 days, not 14. Do not promise Page 1 on head terms.

## Timeline

| Phase | When | Action |
|-------|------|--------|
| T-30 | −30d | GSC baseline + index coverage audit |
| T-21 | −21d | Intent cluster map + SERP teardown (3 competitors) |
| T-14 | −14d | Ship alternatives page + comparison template QA |
| T-10 | −10d | Ship 2× vs pages + FAQ schema |
| T-7 | −7d | How-to hub + internal link graph wired in repo |
| T-3 | −3d | Docs/blog CTA placement + metadata pass |
| H0 | Launch | Submit sitemap delta; request indexing on hub |
| D+7 | +7d | First GSC impression check; fix orphan URLs |
| D+30 | +30d | Refresh titles/meta on low-CTR pages |

## Tactic stack

1. **`seo_gsc_baseline_audit` (T-30)** — Export coverage, indexed count, top queries. Metric: baseline sheet with ≥5 rows.
2. **`seo_intent_cluster_map` (T-21)** — One cluster: alternatives, vs, how-to for ICP job. Metric: 8–15 keywords tiered A/B/C.
3. **`seo_competitor_serp_teardown` (T-21)** — Top 3 SERP pages per target keyword: word count, schema, gaps. Metric: teardown doc filed.
4. **`seo_alternatives_page_template` (T-14)** — `[Category] alternatives for [ICP]` with honest table. Metric: 1 URL live + indexed request.
5. **`seo_comparison_page_template` (T-14)** — `[You] vs [Competitor]` with feature/pricing rows. Metric: table cites real sources.
6. **`seo_vs_page_template` (T-10)** — Second vs page for #2 competitor. Metric: unique intro + screenshot.
7. **`seo_how_to_hub_page` (T-7)** — Pillar how-to linking to all commercial pages. Metric: ≥3 internal links out.
8. **`seo_internal_link_graph` (T-7)** — Docs home + blog index link to hub; hub links to signup. Metric: 0 orphan cluster pages.
9. **`seo_docs_blog_cta_placement` (T-3)** — End-of-doc CTA block; no mid-article modal. Metric: 1 CTA pattern in shared component.
10. **`seo_metadata_schema_pass` (T-3)** — Title ≤60, meta ≤155, FAQ schema on comparison. Metric: Rich Results Test pass.
11. **`seo_programmatic_guardrails` (H0)** — Unique intro ≥120 words per programmatic URL. Metric: thin-content checklist signed.
12. **`seo_content_refresh_d30` (D+30)** — Rewrite title/meta on CTR <2% + impressions >500. Metric: refresh log updated.

## Orchestration

- **Primary:** Commercial cluster pages (alternatives + vs)
- **Parallel:** Docs depth articles feeding hub (not competing URLs)
- **Do not:** Publish cluster same day as PH/HN spike — split founder review capacity
- **Measurement:** GSC clicks + organic signup rate — never report impressions alone

## Realistic outcomes

| Profile | D+30 impressions | D+90 organic sessions/mo | Signups from organic |
|---------|------------------|--------------------------|----------------------|
| Aggressive (docs + niche terms) | 2k–15k cluster | 800–4k | 40–200 |
| Standard (new blog) | 500–3k | 200–800 | 15–60 |
| New domain, no links | <500 | <200 | <10 — state honest runway |

## Kill / pivot rules

- D+21: 0 indexed cluster pages → fix sitemap/canonical before writing more
- D+45: impressions >2k but CTR <1% → title/meta rewrite, not new pages
- Competitor legal pushback on comparison → soften claims, add "last verified" date
- Organic signup rate <1% after 500 sessions → fix LP message match, not SEO volume

## Ethics line

- No fake reviews, ratings schema, or purchased backlinks
- Comparison content must be fact-checkable — cite pricing pages, docs, changelogs
- Programmatic scale only with human review gate per URL
