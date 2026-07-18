# Playbook: No Audience (OSS Repo Runway)

Repo has <50 stars, no release tags, empty CONTRIBUTING. OSS launch *earns* distribution assets — awesome-list PRs and Show HN come after the repo looks alive.

- **Days 1–7: Repo scan + license block.** SPDX in README, LICENSE file, install section copy-paste tested. No external spikes yet.
- **Days 8–14: First semver tag + CHANGELOG.** Ship v0.1.0 with real release notes; publish `oss_release_notes_blog` draft on Dev.to (technical, not pitch).
- **Days 15–18: GitHub topics + good-first-issue.** 5 topics, 3 labeled issues with repro steps. Package registry publish if applicable.
- **Days 19–21: README star CTA** placed after install + screenshot — not before value proof.
- **Days 22–28: First awesome-list PR** (one list, personalized). No maintainer DMs until you've contributed to that ecosystem.
- **Day 28+:** Coordinate Show HN via `community-launch` only if install works and ≥10 organic GitHub issues or discussions exist.

Realistic outcome: 21-day runway → 40–120 stars pre-HN; first Show HN adds 80–200 more (not front page without demo + comment history).

## Preconditions
- [ ] Public GitHub repo with README ≥200 words
- [ ] LICENSE file + SPDX identifier in README
- [ ] Install command tested locally and in CI badge (if applicable)
- [ ] Primary metric `github_stars_30d` named before execution
- [ ] Honest aggression dial: no Show HN before T-21 without demo

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | Solo, <10h/week | License + CHANGELOG + 1 release only |
| standard | 10–20h/week | Full 21d runway above |
| aggressive | Full-time founder | Add 2nd list PR + registry listing at T-14 |

**Honest ceiling:** Without releases or install path, stars stay flat regardless of social posts.

## Timeline

| Phase | When | Action |
|-------|------|--------|
| T-21 | −21d | Repo scan; fix license + README structure |
| T-14 | −14d | Tag v0.1.0; CHANGELOG visible; release notes post |
| T-10 | −10d | Topics + good-first-issue labels |
| T-7 | −7d | Registry publish (`oss_package_registry_listing`) |
| T-3 | −3d | README star CTA block live |
| T-1 | −1d | First awesome-list PR opened (one list) |
| H0 | Day 28+ | Show HN only if criteria met (`oss_show_hn_coordination`) |
| D+7 | +7d | Star count teardown; plan v0.2.0 release cadence |

## Tactic stack

1. **`oss_license_clarity_block` (T-21)** — SPDX + commercial-use sentence. Metric: checklist pass.
2. **`oss_changelog_visible` (T-14)** — CHANGELOG linked in README header. Metric: Unreleased section updated.
3. **`oss_release_notes_blog` (T-14)** — v0.1.0 post on Dev.to/blog. Metric: published with install snippet.
4. **`oss_github_topics_tags` (T-10)** — 5–8 precise topics. Metric: topics frozen in repo settings.
5. **`oss_good_first_issue_label` (T-10)** — 3 issues labeled with acceptance criteria. Metric: ≥3 issues.
6. **`oss_package_registry_listing` (T-7)** — npm/PyPI publish with keywords. Metric: install works from registry.
7. **`oss_readme_star_cta` (T-3)** — CTA after install proof. Metric: template applied, not in H1.
8. **`oss_awesome_list_pr` (T-1)** — One personalized list PR. Metric: follows list CONTRIBUTING.
9. **`oss_show_hn_coordination` (H0)** — ≥48h after repo polish; pairs `community-launch`. Metric: coordination checklist signed.

## Orchestration

- **Primary:** Repo quality (releases, install, license) — no community spike until T-21
- **Parallel:** Dev.to release notes for SEO; no maintainer DMs in runway phase
- **Do not:** Show HN, star-swap Discords, or 5 list PRs same week
- **Handoff:** After 50 stars or first external PR → graduate to `b2b-saas` or `with-email-list`

## Realistic outcomes

| Profile | Stars (30d) | Clones (14d) | Notes |
|---------|-------------|--------------|-------|
| Full runway + 1 list merge | 80–200 | 40–150 | Ready for Show HN |
| Runway skipped | 15–40 | 10–30 | HN thread dies fast |
| No registry publish | +30% lower installs | — | Fix before spike |

## Kill / pivot rules

- Zero stars after 14d with no release → ship v0.1.0 before any list PR
- List PR closed as spam → pause all list PRs 30d; rewrite personalization
- Install broken on T-7 → block Show HN until fixed
- No good-first-issue uptake by D+30 → relabel issues or improve CONTRIBUTING.md

## Ethics line

- No star swaps, fake stars, or incentivized starring
- No cold maintainer DMs during runway — contribute first
- Awesome-list PRs add genuine value to the curated list
