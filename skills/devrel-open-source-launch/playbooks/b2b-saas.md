# Playbook: B2B SaaS / DevTool OSS

Your buyer is an engineer evaluating via GitHub before procurement. Repo scan signals production readiness: license, semver releases, registry package, and enterprise-friendly CONTRIBUTING.

- **Position repo as eval artifact.** README leads with problem → install → 60s demo GIF → comparison table (honest, not FUD).
- **License block upfront.** MIT/Apache-2.0 with commercial-use sentence; link SECURITY.md if B2B.
- **Release cadence = trust.** Weekly or biweekly tags; CHANGELOG is the sales enablement doc for "is this maintained?"
- **Show HN first comment** links GitHub + registry install; star CTA in README only (`oss_show_hn_coordination` + `community-launch`).
- **Awesome-list targets:** ecosystem-specific lists (e.g. `awesome-kubernetes`, `awesome-react`) — not generic `awesome-awesome`.
- **Inbound handoff:** SDR script for "cloned repo / starred from HN" leads within 24h.

Skip consumer awesome lists; focus lists where tech leads curate.

## Preconditions
- [ ] B2B/devtool ICP with GitHub-based eval behavior
- [ ] OSS license compatible with commercial use (or clear dual-license page)
- [ ] SECURITY.md or security@ email for enterprise questions
- [ ] Registry package with version matching latest tag
- [ ] Design partner quote or metric (even n=3) for README social proof

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | Stealth eval | Private beta + public docs only |
| standard | OSS GA | Release notes + 2 list PRs + delayed Show HN |
| aggressive | OSS + sales pipeline | Full stack + maintainer relationship DMs (ethical) |

## Timeline

| Phase | When | Action |
|-------|------|--------|
| T-21 | −21d | License + SECURITY + CONTRIBUTING audit |
| T-14 | −14d | Registry publish; topics frozen |
| T-10 | −10d | Awesome-list PRs #1–2 (ecosystem lists) |
| T-7 | −7d | Release v1.0.0 + blog post |
| T-3 | −3d | README star CTA + enterprise eval section |
| H0 | Launch | Show HN (`community-launch`) |
| H+48 | +2d | Maintainer thank-you (if prior contribution) — not cold pitch |
| D+7 | +7d | Pipeline report: stars, clones, inbound demos |

## Tactic stack

1. **`oss_license_clarity_block` (T-21)** — SPDX + commercial clarity + SECURITY.md.
2. **`oss_package_registry_listing` (T-14)** — Version sync with Git tag.
3. **`oss_github_topics_tags` (T-14)** — ICP-relevant topics only.
4. **`oss_changelog_visible` (T-10)** — Semver policy in README.
5. **`oss_awesome_list_pr` (T-10)** — 2 ecosystem list PRs, staggered 72h.
6. **`oss_release_notes_blog` (T-7)** — v1.0.0 with migration + enterprise notes.
7. **`oss_readme_star_cta` (T-3)** — After install + proof section.
8. **`oss_good_first_issue_label` (T-7)** — Low-risk issues for community eval signal.
9. **`oss_show_hn_coordination` (H0)** — Repo frozen 48h prior.
10. **`oss_maintainer_dm_ethics` (H+48)** — Only to maintainers you've helped; integration question, not star ask.

## Orchestration

- **Primary:** GitHub repo as eval hub; Show HN drives qualified traffic
- **Parallel:** Sales monitors `github.com` referrer + star notifications
- **Do not:** GPL surprise after eval; don't hide commercial tier in repo
- **Pair:** `community-launch` Show HN + this skill repo prep — never HN without install path

## Realistic outcomes

| Profile | Stars (30d) | Enterprise inbound | Notes |
|---------|-------------|---------------------|-------|
| Strong OSS + design partners | 300–800 | 5–20 demos | License clarity critical |
| Tool without registry | 100–250 | 1–5 | Publish package first |
| License ambiguous | Stars OK | 0 enterprise | Fix before marketing |

## Kill / pivot rules

- Security issue reported pre-launch → delay Show HN until patch release
- Enterprise prospect blocked on license → add LICENSE FAQ same day
- Clone-to-star ratio <0.2 → README install friction; fix before more distribution
- Maintainer DM gets public complaint → pause all outreach 60d

## Ethics line

- No astroturfed GitHub issues or fake enterprise logos in README
- Maintainer DMs: contributed first, one message, specific value
- Honest comparison tables — cite sources
