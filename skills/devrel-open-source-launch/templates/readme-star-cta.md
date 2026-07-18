# README star CTA block

Place **after** install instructions, demo GIF, and one proof point (metric, logo, or testimonial). Never in H1 or above the fold hero.

---

## Template A — DevTool CLI

```markdown
## Quick start

\`\`\`bash
npm install -g @yourorg/your-cli
your-cli init
\`\`\`

![60s demo](docs/demo.gif)

**Used by teams at** [Company A] and [Company B] to [concrete outcome].

---

If [Product] saves you time on [specific task], a GitHub star helps others discover it.
It also signals to our team that the direction is useful — we ship weekly.

[![GitHub stars](https://img.shields.io/github/stars/yourorg/your-repo?style=social)](https://github.com/yourorg/your-repo)

**Not a fan of starring?** Open an issue with feedback — that's equally valuable.
```

---

## Template B — Library / SDK

```markdown
## Installation

\`\`\`bash
pip install your-package
\`\`\`

See [CHANGELOG](CHANGELOG.md) for release notes.

### Why teams choose [Product]
- [Outcome 1 with number]
- [Outcome 2 with number]

---

**Support the project:** Stars on GitHub help maintainers justify roadmap time to leadership.
No account required to use the library — star only if you find it useful.

[⭐ Star on GitHub](https://github.com/yourorg/your-repo)
```

---

## Template C — Minimal (pre-100 stars)

```markdown
## Install

\`\`\`bash
cargo install your-crate
\`\`\`

[Full docs →](https://yourorg.github.io/your-repo)

---

Early project — feedback welcome in [Issues](https://github.com/yourorg/your-repo/issues).
If this solves [problem] for you, starring the repo helps other [ICP] find it.
```

---

## Placement rules

| Rule | Pass |
|------|------|
| CTA below install + proof | ☐ |
| No star ask in repo description or H1 | ☐ |
| Link goes to repo root, not `/stargazers` gamification | ☐ |
| Alternative CTA offered (issue/feedback) | ☐ |
| Badge optional — text link alone is fine for B2B | ☐ |

## A/B notes

- Shield badge vs plain link: B2B often prefers plain link (less "consumer app" vibe)
- Track `?utm_source=readme_cta` on docs links near CTA, not on star link itself
- Revisit copy at 500 / 1k stars — switch from "help others discover" to "follow releases via Watch"

## Acceptance

- [ ] Copy-paste install works from README alone
- [ ] CTA visible without scrolling on 1440px after Quick start (acceptable)
- [ ] Show HN first comment does **not** say "please star" — link repo naturally
