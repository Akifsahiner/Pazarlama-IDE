# Case study: Maintainer DM backlash + list PR spam — 18 stars, stalled launch (anonymous)

## Context
Python OSS library, B2B data pipeline niche. Founder skipped `no-audience` runway. Repo: no semver tag, README star CTA in H1, license mentioned only in package metadata.

## What went wrong

### Week 1: Distribution before repo polish
- Opened **6 awesome-list PRs in 48 hours** with identical description: "AI-powered data tool"
- **`oss_awesome_list_pr` anti-pattern:** none read CONTRIBUTING; 5 closed as spam, 1 maintainer tweeted screenshot
- **`oss_maintainer_dm_ethics` violation:** cold DMs to 8 maintainers: "Would love a star — we just launched!"

### Week 2: Show HN without coordination
- **`oss_show_hn_coordination` skipped:** Show HN same day as first tag v0.0.1
- Install failed on Python 3.12 (README said 3.10+ only in issues)
- HN thread: 22 points, top comment = install broken + "star begging README"

### Week 3: Aftermath
- **`maintainer_dm_incidents`:** 2 public callouts on X; 1 list ban
- Stars stuck at 18; npm downloads flat at 40/week
- Enterprise prospect email: "Legal couldn't find license in README"

## Tactics that would have prevented failure

| Order | Tactic | Fix |
|-------|--------|-----|
| 1 | `oss_license_clarity_block` | SPDX in README day 1 |
| 2 | `oss_package_registry_listing` | Test install matrix in CI |
| 3 | `oss_changelog_visible` + tag | v0.1.0 before any PR |
| 4 | `oss_readme_star_cta` | Move CTA below install proof |
| 5 | `oss_awesome_list_pr` | 1 list, 72h cadence, personalized |
| 6 | `oss_show_hn_coordination` | HN ≥48h after repo freeze |

## Outcome (90d)
- Stars: 18 → 47 (organic only after README rewrite)
- List PR merge rate: 0/6
- Inbound demos: 0
- Founder paused marketing 60d; shipped v0.2.0 with SECURITY.md + CHANGELOG

## Lesson
Repo scan is not optional prelude — it *is* the launch. Maintainer trust and list maintainer relationships take longer to rebuild than README fixes. Pair with `community-launch` only after `no-audience` criteria met; aggression without assets burns channels for quarters.
