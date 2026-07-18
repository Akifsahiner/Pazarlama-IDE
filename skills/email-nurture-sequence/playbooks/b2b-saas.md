# Playbook: B2B SaaS Nurture

Dev tool / B2B PLG: nurture emphasizes **migration proof, security, and team rollout** — not consumer urgency.

- **Drip angles:** integration time, SSO, audit log — not "last chance 50% off"
- **Launch waves:** segment by company domain when possible (even rough `@company.com` clustering)
- **Onboarding #1:** "Invite teammate" or "Connect GitHub" — one technical activation
- **Onboarding #3:** NPS + optional 15-min onboarding call CTA for accounts >10 seats

Coordinate with `sales-outbound` for accounts that clicked but didn't activate — nurture hands off, not duplicates cold email.

## Preconditions
- [ ] B2B ICP documented in profile
- [ ] Technical onboarding path exists (docs link in every email)
- [ ] Security/compliance one-pager link for enterprise-curious

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | SMB list | Standard drip + 1 launch |
| standard | Mixed SMB/mid-market | 2 waves + team invite onboarding |
| aggressive | PLG with 5k+ dev emails | Full aggressive + domain clustering |

## Timeline
- Align with aggressive playbook; replace consumer copy with migration/security proof

## Tactic stack
1. **`email_list_hygiene_segment`** — domain cluster tag if ESP supports
2. **`email_prelaunch_drip_14d`** — B2B story arc
3. **`email_launch_wave_1_engaged`** — "Ship to prod this week" CTA
4. **`email_post_launch_onboarding_3`** — team invite emphasis
5. **`email_teardown_metrics_d7`** — include activation by company size if known

## Orchestration
- Nurture warms; sales outbound hits named accounts separately
- No consumer countdown timers in footer

## Realistic outcomes
- B2B click→activation lower (5–12%) but higher ACV when activation completes

## Kill / pivot rules
- Enterprise reply "send security pack" → trigger asset task, not another blast

## Ethics line
- No sharing customer logos in email without permission
