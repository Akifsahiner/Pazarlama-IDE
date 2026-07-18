# Playbook: Aggressive Viral Waitlist Loop

Status rewards and K-factor math beat discount spam. Three micro-launches compound faster than one big “coming soon.”

## Preconditions
- [ ] Landing can collect email with single CTA
- [ ] Referral attribution (cookie or code) shippable in ≤3 days
- [ ] Honest ceiling: if no seed audience, expect K < 0.2 for first 14 days

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | <200 emails, no product demo | Capture + weekly nurture only |
| standard | 200–2k list or warm social | Referral unlock + 1 micro-launch |
| aggressive | Demo + seed ≥500 warm | K≥0.3 target, 3 micro-launches, status tiers |

## Timeline
- **T-14**: Instrument `signup`, `invite_sent`, `invite_accepted`; ship referral unit
- **T-10**: Seed 50–100 warm invites personally (not blast)
- **T-7**: Micro-launch #1 (founders / niche Slack)
- **T-3**: Micro-launch #2 (LinkedIn founder post + waitlist CTA)
- **H0**: Micro-launch #3 (newsletter / partner swap)
- **D+7**: Compute K; kill or rewrite unlock if K < 0.3

## Tactic stack
1. **`waitlist_single_cta`** — Landing = email only; kill feature tours above fold
2. **`referral_waitlist_loop`** — Invite N → status unlock (early access / badge), not % off
3. **`k_factor_instrument`** — Weekly K = invites_accepted / signups; dashboard in sheet
4. **`micro_launch_wave_3`** — Three timed drops; never “soft launch forever”
5. **`status_tier_copy`** — Copy emphasizes scarcity of access, not discounts
6. **`near_miss_nudge`** — Day 3 email to users 1 invite from unlock
7. **`seed_warm_dm`** — Founder DMs before any ESP blast

## Orchestration
- Primary: waitlist + referral unit
- Parallel: 1 founder social channel only during micro-launches
- Do not run paid until K ≥ 0.25 on organic

## Realistic outcomes
- Cold seed (<100): 30–80 signups / 14d; K often 0.1–0.2 — still learn
- Warm seed (500+): 200–800 signups / 14d; K 0.25–0.4 if unlock is desirable
- Aggressive ceiling without product demo: state honest miss — status unlocks need proof

## Kill / pivot rules
- K < 0.2 after 100 signups → change unlock (status > discount) or CTA
- Invite spam complaints → tighten personalization; pause ESP
- Paid CAC to waitlist > 3× organic CPA → pause paid

## Ethics line
- No fake waitlist counts, fake “spots left,” or purchased email lists
- Disclose partner swaps; no dark-pattern double opt-in traps
