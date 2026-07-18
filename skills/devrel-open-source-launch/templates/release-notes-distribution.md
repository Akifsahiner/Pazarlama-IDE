# Release notes as distribution

Every semver tag ships three surfaces: **GitHub Release**, **CHANGELOG.md**, and **public post** (blog or Dev.to). The post is the distribution asset — not a duplicate of GitHub UI.

---

## GitHub Release (source of truth)

**Title:** `v1.2.0 — [Primary user-facing outcome]`

```markdown
## Highlights
- **[Feature]** — [One sentence user benefit]
- **[Fix]** — [Issue #N] [brief]

## Install
\`\`\`bash
npm install @yourorg/your-cli@1.2.0
\`\`\`

## Upgrade notes
- Breaking: [none | list with migration link]
- Config: [env var changes]

**Full diff:** https://github.com/yourorg/your-repo/compare/v1.1.0...v1.2.0
```

Attach: screenshot or 30s GIF of headline feature.

---

## CHANGELOG.md entry (Keep a Changelog style)

```markdown
## [1.2.0] - 2026-07-12

### Added
- [Feature] ([#123](https://github.com/yourorg/your-repo/pull/123))

### Fixed
- [Bug description] ([#120](https://github.com/yourorg/your-repo/issues/120))
```

README header must link: `[Changelog](CHANGELOG.md) · [Releases](https://github.com/yourorg/your-repo/releases)`

---

## Blog / Dev.to post (distribution)

**Title options:**
- `Shipping [Feature]: how [Product] now [outcome]`
- `[Product] v1.2.0 — [outcome] for [ICP]`

**Structure:**

```markdown
# [Title]

We tagged **v1.2.0** of [Product] today. If you maintain [workflow], this release [concrete outcome].

## Problem
[2–3 sentences — same pain as README, deeper]

## What's new
### [Feature name]
[Technical paragraph + code snippet]

\`\`\`bash
your-cli new-command --flag
\`\`\`

[Screenshot]

## Try it
\`\`\`bash
npm install -g @yourorg/your-cli@1.2.0
\`\`\`

Repo: https://github.com/yourorg/your-repo?utm_source=release_blog&utm_campaign=v1_2_0

## What's next
[Roadmap teaser — 1 bullet, honest]

---
*Feedback welcome in [GitHub Issues](https://github.com/yourorg/your-repo/issues).*
```

**Canonical URL:** your blog; Dev.to gets `canonical_url` pointing to blog for SEO.

---

## Cross-post calendar

| Surface | When | UTM |
|---------|------|-----|
| GitHub Release | Tag push (automated CI) | — |
| CHANGELOG.md | Same commit as tag | — |
| Blog post | T-0 or T+2h after tag | `utm_campaign=vX_Y_Z` |
| Dev.to | T+24h (canonical to blog) | `utm_source=devto` |
| Email (if list) | T+6h after blog | `utm_source=email_release` |
| Show HN | **Not** same hour as tag — coordinate `oss_show_hn_coordination` | `utm_source=hacker_news` |

---

## Launch-week special post (T-3)

For aggressive playbook, add a **narrative** post (not duplicate of v1.2.0 notes):

**Title:** `Launching [Product]: open-source [outcome] for [ICP]`

Include: why OSS, license choice, link to good-first-issues, install path. **No star beg** — link CHANGELOG and CONTRIBUTING.

---

## Thin release anti-pattern

❌ `## v1.2.0\n\nBug fixes and improvements.`

✅ Minimum one user-facing bullet with issue/PR link + install command.

---

## Acceptance

- [ ] Tag, CHANGELOG, and Release published same session
- [ ] Blog post has install snippet + screenshot
- [ ] README CHANGELOG link works
- [ ] `release_notes_referrer_sessions` baseline logged in analytics
- [ ] Show HN ≥48h after launch-week repo freeze (if coordinated)
