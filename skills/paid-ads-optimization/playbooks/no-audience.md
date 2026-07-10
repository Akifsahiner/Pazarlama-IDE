# Playbook: Paid Ads With No Audience (Cold Start)

No pixel data, no retargeting pool, no lookalikes. Cold-start paid means search intent + tight targeting + aggressive hypothesis cadence on small budget.

- **Days 1–3: Minimum viable tracking.** Install GA4, one ad platform pixel (Google OR LinkedIn — pick one). Conversion event: signup or demo form submit on thank-you page. Fire test conversion; verify in platform dashboard.
- **Days 4–5: One landing page, message-matched.** Headline = exact match to ad you'll run. Subhead: one proof point. CTA above fold. Mobile-first. Load test <3 sec. No homepage — dedicated LP only.
- **Days 6–7: Write 5 ad variants, one campaign.** Platform: Google Search if category has volume (check Keyword Planner); else LinkedIn with narrow title filter. Ads: 2 outcome headlines, 2 pain headlines, 1 social proof. Same LP for all — isolate creative variable only.
- **Days 8–10: Launch at $30–50/day.** Single campaign, single ad set, 5 ads. Objective: conversions (not traffic). Bid: target CPA if platform supports it, else manual CPC. Do not touch for 72 hours except kill broken ads (0 impressions).
- **Days 11–14: First kill/iterate.** Rule: pause ad with CPA >2× target after $100 spend OR 0 conversions after 50 clicks. Replace with new headline hypothesis. Log: "Pain headline 'Stop losing X' vs outcome 'Get X in 2 days' — pain won, CPA $X."
- **Days 15–18: LP hypothesis (if 100+ clicks, <3% conversion).** Problem is likely LP, not ads. A/B: above-fold proof (logo strip vs metric) OR CTA text ("Start free trial" vs "Book 15-min demo"). 50/50 split via Google Optimize, VWO, or separate LP URLs.
- **Days 19–22: Audience hypothesis (LinkedIn only).** Duplicate ad set: narrow titles (Director+) vs broader (Manager+). Same creative. Run 5 days; compare CPA. Winner takes remaining budget.
- **Days 23–26: Creative refresh.** Even at small scale, swap 2 new image/video variants if CTR dropped >25% from week 1. Screen recording demo 15 sec often beats static for SaaS.
- **Days 27–30: Scale or pivot decision.** If CPA ≤ target with 20+ conversions: increase budget 15%/week. If CPA 1.5–2× target: one more LP test, then pause if no improvement. If CPA >2× with 30+ conversions: wrong channel — shift budget to organic or different platform.

Realistic outcome: $900–1,500 first-month spend, 15–40 qualified conversions, $40–$120 CPA if fit exists, clear kill/scale data for month 2. No retargeting until 1k monthly uniques.
