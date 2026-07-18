# Playbook: With Email List

You have ≥500 opted-in subscribers and a public OSS repo. Email amplifies release notes and Show HN — it does not replace repo polish or vote coordination.

- **T-21: List segment** — engaged / installed / lurkers. Tag GitHub star clickers if ESP supports it.
- **T-14: Pre-launch drip email #1** — problem story + link to CHANGELOG (not star ask).
- **T-7: Release notes email** — ship v0.2.0 (or launch tag) with install command + blog link (`oss_release_notes_blog`).
- **T-3: Teaser** — "Repo goes loud Tuesday" with docs link; **no** "star us before HN" subject lines.
- **H0: Show HN day** — **no launch email at submit hour**; let organic HN seed (`oss_show_hn_coordination` + `community-launch`).
- **H+6: Wave 1** — engaged segment only: release highlights + GitHub link (UTM `utm_source=email_launch`).
- **H+24: Wave 2** — general list: honest launch recap + CONTRIBUTING invite.
- **D+3: Star milestone email** only if organically crossed 100/500 — celebrate what shipped, not vanity.

Pair with `email-nurture-sequence` for full drip calendar; this playbook covers OSS-specific repo + email timing.

## Preconditions
- [ ] Email list ≥500 with documented opt-in
- [ ] Public repo with README star CTA live (`oss_readme_star_cta`)
- [ ] Tagged release + release notes post ready
- [ ] Show HN scheduled ≥48h after repo freeze
- [ ] UTM scheme: `utm_source=email` / `utm_campaign=oss_launch_w1`

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | 200–500 list | 1 pre-launch + 1 release email only |
| standard | 500–2k | Pre-launch + 2 launch waves spaced 24h |
| aggressive | 2k+ engaged | Full stack + awesome-list PR same week as HN |

**Honest ceiling:** List with <25% engaged opens → expect 30–40% open on wave 1, not 55%.

## Timeline

| Phase | When | Action |
|-------|------|--------|
| T-21 | −21d | Segment list; repo scan complete |
| T-14 | −14d | Email #1 problem story + CHANGELOG link |
| T-10 | −10d | Awesome-list PR #1 opened |
| T-7 | −7d | Release tag + `oss_release_notes_blog` + email draft |
| T-3 | −3d | Teaser email (no star ask) |
| T-2 | −2d | README + license final QA |
| H0 | Show HN | No email blast; founder on HN comments |
| H+6 | +6h | Wave 1 → engaged |
| H+24 | +1d | Wave 2 → general |
| D+7 | +7d | Teardown email with stars + installs (honest numbers) |

## Tactic stack

1. **`oss_license_clarity_block` (T-21)** — Enterprise readers on list need clear license.
2. **`oss_changelog_visible` (T-14)** — Email links to CHANGELOG, not random blog.
3. **`oss_readme_star_cta` (T-7)** — CTA live before any email with GitHub link.
4. **`oss_release_notes_blog` (T-7)** — Release post = email body source of truth.
5. **`oss_awesome_list_pr` (T-10)** — One list PR before HN for sustained traffic.
6. **`oss_show_hn_coordination` (T-2)** — Email calendar locked to HN timing.
7. **`oss_package_registry_listing` (T-7)** — Email CTA = `npm install` + GitHub.
8. **`oss_star_milestone_thread` (D+3)** — Optional if threshold crossed organically.

## Orchestration

- **Primary:** Release notes email drives repo traffic; HN is separate spike
- **Parallel:** Awesome-list PR in flight T-10 → H0 (don't wait for merge to post HN)
- **Do not:** Email "upvote Show HN" or star incentives; do not blast at H0 submit
- **Handoff:** D+7 activation metrics → product onboarding sequence

## Realistic outcomes

| Profile | Stars (7d post-HN) | Email click→star | Notes |
|---------|-------------------|------------------|-------|
| 2k+ engaged + HN | 150–400 | 8–15% of clickers | Strong compound |
| 500–2k standard | 80–200 | 5–10% | Solid OSS launch |
| Email without repo polish | +20–50 only | <3% | Fix README first |

## Kill / pivot rules

- Wave 1 unsub >0.4% → cancel wave 2
- Email clicks but star rate <2% → README CTA placement wrong; move below install proof
- HN + email same hour → reschedule email +6h minimum
- List PR merged same day as email → don't duplicate CTA; one canonical link

## Ethics line

- No false urgency stars; no "star to unlock feature" for OSS
- Unsubscribe compliant; no Re: trick subjects
- Email tells what shipped — not "help us hit 500 stars"
