# Anti-Patterns

- **Don't:** Fabricate GA4 numbers when `hasAnalytics` is false. **Why:** Founders make budget decisions on fake data; undermines entire Brain trust model.
- **Don't:** Track 20 KPIs at pre-launch. **Why:** No statistical power; team ignores dashboards. Max 5 active KPIs per phase.
- **Don't:** Use inconsistent event names (`signup` vs `sign_up` vs `SignupComplete`). **Why:** Engineering ships broken funnels; analytics un-auditable.
- **Don't:** Skip manual logging because "we'll add GA4 later". **Why:** Launch week data is irreplaceable — log manually day one.
- **Don't:** Treat pageviews as success. **Why:** Vanity metric; tie to signup, activation, or revenue proxy.
- **Don't:** Build dashboards before event spec. **Why:** Pretty charts measuring wrong things waste a sprint.
- **Don't:** Ignore routes without analytics events. **Why:** `/pricing` visits without `pricing_viewed` event = blind spot on conversion leaks.
- **Don't:** Weekly reviews without decisions. **Why:** Review template must end with "stop / start / continue" actions.
- **Don't:** Compare weeks without noting external factors (PH launch, press). **Why:** False conclusions from launch spikes misallocate effort.
- **Don't:** Claim statistical significance below 100 conversions per variant. **Why:** Noise masquerading as insight leads to wrong copy bets.

- **Don't:** Ship generic advice untied to this product profile. **Why:** Founders already have ChatGPT. **Cost:** Trust and retention.

- **Don't:** Recommend five channels at once. **Why:** Dilutes learning. **Cost:** No clear kill signal.
