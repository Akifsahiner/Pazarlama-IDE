# Awesome-list PR template

Read the target list's `CONTRIBUTING.md` first. One PR per list. Personalize the description column — never duplicate the same sentence across lists.

---

## Pre-flight checklist

| Step | Done |
|------|------|
| List is actively maintained (commit in last 90d) | ☐ |
| CONTRIBUTING.md read; sort order noted (alpha vs category) | ☐ |
| Your tool fits list scope (not forced into wrong category) | ☐ |
| You use or have filed a genuine issue on the list before (ideal) | ☐ |
| PR title follows list convention | ☐ |

---

## PR title patterns

```
Add [Product] to [Category]
```
```
docs: add [Product] under [Subcategory]
```

---

## Entry format (adapt to list style)

**Alphabetical lists:**

```markdown
- [Product](https://github.com/yourorg/your-repo) - [One line: specific outcome, not "powerful platform"]. ([npm](https://www.npmjs.com/package/your-package))
```

**Categorized lists:**

```markdown
## [Category matching list taxonomy]

- [Product](https://github.com/yourorg/your-repo) - [Verb-led outcome: "Reduces K8s deploy time with declarative rollbacks"].
```

---

## PR body template

```markdown
## Summary
Adds [Product] to the **[Category]** section.

## Why this fits
- [1 sentence: ICP + problem]
- [1 sentence: differentiator vs existing entries in this list — name none if awkward]
- License: [SPDX]; actively maintained ([N] releases in last 90d)

## Placement
Inserted alphabetically under **[Category]** per CONTRIBUTING.

## Maintainer note
Happy to adjust wording or category. I filed [issue #X / doc fix] on this list on [date] — thanks for maintaining it.
```

---

## Maintainer DM (only after PR or prior contribution)

**Do not send before opening PR unless list rules require discussion.**

```
Hi [Name] — I opened PR #[N] on [awesome-foo] adding [Product], a [one-line outcome].
No rush on review; happy to move categories or tighten the description.
Thanks for curating the list — I used it when researching [related topic].
```

**Never:**

```
Hey! Love your list. Can you merge my PR? Also would mean a lot if you starred our repo 🙏
```

---

## Stagger schedule (aggressive playbook)

| PR | Target list | Earliest open |
|----|-------------|---------------|
| #1 | Core ecosystem list (highest fit) | T-14 |
| #2 | Adjacent ecosystem | T-10 |
| #3 | Niche high-intent list | T-5 |
| #4–5 | Only if #1–3 not closed as spam | H+48 |

Minimum **72 hours** between PR opens.

---

## Acceptance

- [ ] Description is specific outcome, ≤120 chars
- [ ] Link includes registry if list peers do
- [ ] PR body explains fit without marketing adjectives ("revolutionary", "AI-powered")
- [ ] Zero maintainer DM incidents (`maintainer_dm_incidents` KPI = 0)
