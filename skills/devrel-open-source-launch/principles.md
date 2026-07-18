## Principles

1. **Repo is the landing page.** Before Show HN, README must answer "what, why, install" in 30 seconds. Star CTA sits after value proof — not in the H1. Metric: README scroll depth to install section ≥60% on first visit (Hotjar or Plausible scroll events).
2. **Release notes are distribution.** Every tagged release ships with a public post (GitHub Releases + blog/Dev.to) containing install snippet, migration notes, and one screenshot. Metric: release post indexed within 7d; referrer traffic from `github.com` + blog in launch week.
3. **Awesome-list PRs beat cold tweets.** One merged PR in a curated list with 2k+ stars drives sustained clone traffic for months. Target 3–5 list PRs T-14 → H0; expect 20–40% merge rate. Metric: merged PR count + 30d clone spike from list referrer.
4. **GitHub topics are SEO.** Add 5–8 precise topics (`typescript`, `cli`, `devops`) — not 20 generic tags. Topics feed GitHub Explore and registry search. Metric: topic set frozen before first external spike.
5. **CHANGELOG visible above the fold.** Link CHANGELOG in README header; unreleased section shows momentum. Readers star repos that ship weekly. Metric: ≥1 tagged release in 14d pre-launch window.
6. **Show HN coordinates with repo polish.** Run `community-launch` Show HN only after README CTA, license block, and v0.1.0 tag exist. Gap ≥48h between "repo ready" and HN submit. Metric: checklist signed T-2.
7. **Maintainer DM ethics: one touch, value first.** DM only after you contributed (issue, doc fix, or genuine use). Message = specific compliment + question — never "add us to your list." Metric: 0 maintainer blocks or public callouts.
8. **Good-first-issue lowers contribution friction.** Label 3–5 issues `good first issue` with repro steps and acceptance criteria. Stars convert to contributors when the path is obvious. Metric: ≥3 labeled issues before launch spike.
9. **License clarity prevents enterprise stall.** SPDX identifier in README + LICENSE file; commercial use stated in one sentence. Ambiguous licensing kills B2B evals. Metric: license block passes `oss_license_clarity_block` checklist.
10. **Package registry listing is discovery.** npm/PyPI/crates.io publish with README parity, keywords, and repo link. Registries compound search long after HN dies. Metric: install command works copy-paste from registry page.
11. **Star milestones are community moments.** At 100 / 500 / 1k stars, post honest IH or X thread with what shipped — not "we did it pls share." Pair with `oss_star_milestone_thread` only when organic. Metric: milestone post within 48h of crossing threshold.
12. **Honest ceiling:** Repo with <10 stars, no releases, empty issues → expect 30–80 stars from Show HN alone; use `no-audience` repo runway 21d before aggressive stack.
