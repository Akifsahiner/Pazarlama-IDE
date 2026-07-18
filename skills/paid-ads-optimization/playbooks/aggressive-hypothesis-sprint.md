# Playbook: Aggressive Ads Hypothesis Sprint

Kill/scale rules are executable — not vibes.

## Preconditions
- [ ] Pixel/UTM tracking live
- [ ] Landing message match audited
- [ ] Weekly creative capacity ≥2 variants

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | No tracking | Pause paid |
| standard | Tracking OK | 1 hypothesis/week |
| aggressive | CPA target known | 2 creatives + kill/scale rules |

## Timeline
- **T-7**: Message match + event map
- **H0**: Launch hypothesis A with 2 creatives
- **D+3**: Check leading CPA/CTR
- **D+7**: Kill or scale +20%

## Tactic stack
1. **`ads_hypothesis_loop`** — One hypothesis; kill if CPA >2× target after 50 clicks
2. **`ads_lp_message_match`** — Fix LP before new spend
3. Scale winners only; never double budget on losers

## Orchestration
- Ads primary; LP CRO parallel when convert low

## Realistic outcomes
- Learning weeks common; do not promise profitable week 1 without history

## Kill / pivot rules
- CPA >2× after 50 clicks → kill creative
- High CTR / low convert → LP first

## Ethics line
- No misleading claims; platform ad policies respected
