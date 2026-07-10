## Principles

1. **Measure what decisions need, not what's easy.** Every KPI must tie to a launch plan task or GTM bottleneck — vanity metrics are opt-in only.
2. **Event taxonomy before dashboards.** Name events consistently (`signup_completed`, `activation_project_created`) before wiring GA4 or manual logs.
3. **Manual KPIs are valid at pre-GA4 stage.** Founders log signups, replies, and spend manually — design the tree so manual → automated migration is obvious.
4. **Routes inform funnel steps.** Map `/`, `/pricing`, `/signup` to funnel stages; missing routes = missing measurement points.
5. **hasAnalytics changes the playbook.** Connected GA4 → focus on verification and dashboards; no GA4 → manual logging templates and event spec for engineering.
6. **Weekly review rhythm.** Measurement fails without a recurring review template — ship `weekly-review.md` with every plan.
7. **One north-star per phase.** Pre-launch: qualified signups; launch week: activation; growth: retention or revenue — don't track everything at once.
8. **Cohort thinking early.** Even at 50 users, segment by channel and ICP tier — aggregates lie at small N.
9. **Honest gaps in data.** Flag when `hasAnalytics` is false and manual_kpis empty — prompt user to log or connect GA4.
10. **Read-only on production data.** This skill designs measurement; it does not fabricate analytics numbers.
