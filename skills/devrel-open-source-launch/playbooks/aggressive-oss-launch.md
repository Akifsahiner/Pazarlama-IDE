# Playbook: Aggressive OSS Launch

30-day ethical maximum: repo scan complete, 3–5 awesome-list PRs staggered, release notes as distribution, README star CTA, registry live, Show HN coordinated via `community-launch`. **Not** star swaps, vote brigades, or mass cold maintainer DMs.

## Preconditions
- [ ] Public repo: README, LICENSE, CHANGELOG, CONTRIBUTING, SECURITY (B2B)
- [ ] ≥1 semver tag + GitHub Release with notes
- [ ] Install works: registry + README copy-paste verified on clean machine
- [ ] 5–8 GitHub topics set; 3+ `good first issue` labels
- [ ] 3–5 awesome-list targets researched (CONTRIBUTING read per list)
- [ ] Show HN title + first comment drafted (`community-launch`)
- [ ] Maintainer DM ethics doc signed: zero cold star asks
- [ ] UTM: `utm_source=github` / `awesome_list` / `release_blog` / `hacker_news`

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | <50 stars, thin bandwidth | `no-audience` 21d only |
| standard | Repo polished, some stars | 2 list PRs + release blog + delayed HN |
| aggressive | Full team + demo + list research | This playbook — full 11-tactic stack |

**Honest ceiling:** <50 stars, no HN history, no list merges → 200 stars in 30d is optimistic; 80–150 realistic. Front-page HN requires `community-launch` demo + comment history — not repo tricks alone.

## Timeline

| Phase | When | Action |
|-------|------|--------|
| T-21 | −21d | Full repo scan; license + CHANGELOG + CONTRIBUTING |
| T-18 | −18d | Registry publish (`oss_package_registry_listing`) |
| T-14 | −14d | Awesome-list PR #1; release notes blog for latest tag |
| T-12 | −12d | Topics + good-first-issue batch |
| T-10 | −10d | Awesome-list PR #2 |
| T-7 | −7d | README star CTA live; release v0.x if needed |
| T-5 | −5d | Awesome-list PR #3 |
| T-3 | −3d | Release notes distribution post #2 (what's new for launch) |
| T-2 | −2d | `oss_show_hn_coordination` checklist; repo freeze |
| H0 | Tue–Thu ~9am PT | Show HN submit (`community-launch`) |
| H0–H+4 | First 4h | Founder HN comment SLA; monitor star velocity |
| H+24 | +1d | Star milestone thread if threshold crossed (`oss_star_milestone_thread`) |
| H+48 | +2d | Awesome-list PR #4–5 (only if prior PRs not spam-flagged) |
| H+72 | +3d | Maintainer thank-you DMs to merged list owners only |
| D+7 | +7d | Teardown: stars, clones, registry downloads, list merge rate |
| D+30 | +30d | v0.x+1 release to prove cadence |

## Tactic stack

1. **`oss_license_clarity_block` (T-21)** — SPDX, LICENSE file, commercial-use line. Metric: enterprise eval unblocked.
2. **`oss_changelog_visible` (T-21)** — CHANGELOG in README nav. Metric: link above fold.
3. **`oss_github_topics_tags` (T-12)** — 5–8 ICP topics. Metric: no generic spam tags.
4. **`oss_good_first_issue_label` (T-12)** — 3–5 issues with repro + AC. Metric: labeled before H0.
5. **`oss_package_registry_listing` (T-18)** — npm/PyPI/crates with keywords. Metric: version = latest tag.
6. **`oss_readme_star_cta` (T-7)** — Template block after install proof. Metric: not in H1/title.
7. **`oss_release_notes_blog` (T-14, T-3)** — Two posts: tag release + launch narrative. Metric: UTMs + install snippet each.
8. **`oss_awesome_list_pr` (T-14 → H+48)** — 3–5 PRs, ≥72h apart, personalized. Metric: merge rate tracked.
9. **`oss_maintainer_dm_ethics` (H+72)** — Thank merged maintainers only; no cold pitches. Metric: 0 incidents.
10. **`oss_show_hn_coordination` (T-2)** — Repo frozen ≥48h before HN. Metric: signed checklist.
11. **`oss_star_milestone_thread` (H+24)** — IH/X honest milestone if organic threshold. Metric: ships within 48h of cross.

## Orchestration

- **Primary:** GitHub repo quality → awesome-list PRs → Show HN spike
- **Parallel:** Release notes blog/Dev.to for SEO; registry for install discovery
- **Pair:** `community-launch` for Show HN — this skill owns repo prep timing
- **Do not:** PH same 72h; star-swap servers; 5 list PRs same day; email blast at H0
- **Support:** Founder X/LinkedIn teardown D+1 — not "star my repo" posts

## Realistic outcomes

| Profile | Stars (30d) | List PR merges | Registry DL (wk1) | HN sessions (72h) |
|---------|-------------|----------------|-------------------|-------------------|
| Aggressive (polished + HN) | 250–800 | 1–3 | 1k–8k | 2k–12k (if front page) |
| Standard (polished, no HN) | 80–200 | 1–2 | 200–2k | — |
| List PRs only, no HN | 50–150 | 1–2 | 100–800 | — |
| Unpolished repo + HN | 30–80 | 0 | spike then flat | 200–800 |

## Kill / pivot rules

- T-7: install broken on clean machine → delay all list PRs and HN
- List PR #2 closed as spam → stop PRs 30d; rewrite approach
- H+2: <20 HN points → do not post star milestone; fix demo/title per `community-launch`
- Star velocity <5/day by D+7 post-HN → ship patch release + new release notes post
- `maintainer_dm_incidents` >0 → pause DMs 60d; public apology if warranted
- Clone/star ratio <0.15 → README install section rewrite before more distribution

## Ethics line

- **Never:** star-for-star, paid stars, fake contributors, coordinated "go star my repo"
- **Never:** cold DM "add to your awesome list" without prior relationship or list PR
- **Always:** awesome-list PRs improve the list; release notes teach; Show HN story-first
- Aggressive = maximum *legitimate* repo surface area — not manipulation
