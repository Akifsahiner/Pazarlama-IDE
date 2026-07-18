# Case study: Programmatic sprawl → indexation collapse (lesson)

## Context
PLG analytics startup. Stage: prelaunch → launch. Assets: marketing site + blog. Team shipped **28 AI-generated "best X tools" pages** in 10 days without `seo_programmatic_guardrails`. GSC indexed 8, then excluded 22 for "Crawled — currently not indexed."

## What went wrong
- Skipped `seo_gsc_baseline_audit` — no baseline
- Same 90-word intro on every URL; only keyword swapped
- No `seo_internal_link_graph` — orphan pages
- Claimed "10k monthly visitors" in investor deck using Search Console **impressions** (not clicks)

## Tactic stack that should have been used
1. `seo_intent_cluster_map` — stop at 5 URLs
2. `seo_programmatic_guardrails` — unique intro + screenshot gate
3. `seo_internal_link_graph` — hub links before index request
4. `seo_content_refresh_d30` — merge thin pages instead of adding more

## Recovery (14 weeks)
- Noindexed 18 lowest-quality URLs
- Merged 6 into 2 pillar alternatives pages with human review
- Re-indexed via internal links from docs only
- End state: 6 quality URLs, 340 organic sessions/mo — small but real

## Lesson
Programmatic SEO without guardrails is worse than no SEO. Claude/Cursor-grade advice = ship fewer pages with verifiable product proof, measure clicks → signups, never impressions vanity.
