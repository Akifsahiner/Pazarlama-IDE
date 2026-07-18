# Playbook: Product Intelligence With No Audience

You have a codebase and zero (or near-zero) users. Product intelligence is **inference from evidence**, not market research theater. Every claim must cite a file, route, or README line — or land in `claims_needing_validation`.

- **Start with README + landing route, not `src/`.** Read `README.md`, `app/page.tsx` or `pages/index`, `/pricing`, and onboarding copy. If the README says "for developers" but the landing says "for marketers," flag the mismatch — that's a positioning bug.
- **Enumerate public routes before writing ICP.** Run Glob on `app/**/page.tsx` or `pages/**`. Cluster routes: marketing (`/`, `/pricing`), app (`/dashboard`, `/projects`), auth (`/login`, `/signup`), docs (`/docs`). Surface area tells you who the product expects to use it.
- **Extract value prop as a quote, not a paraphrase.** Pull the hero headline verbatim. Note the subhead, primary CTA, and any "for X" qualifier. If none exist, the product has no public positioning yet — say so.
- **Build ICP from copy signals, not imagination.** Look for: role nouns ("ops teams," "founders"), company stage ("Series A"), trigger events ("after fundraising," "when you hit 50 employees"), and stack mentions ("works with Stripe"). Missing all four = ICP is undefined.
- **Map 3–5 jobs-to-be-done from user flows.** Trace signup → first action → recurring action from routes and README setup steps. Each job needs a route or workflow anchor — "save time" without a workflow is not a job.
- **Name competitors from input + landing comparisons.** Check README, `/pricing` comparison tables, and `competitors` input. If none named, list 2–4 category incumbents from public knowledge and mark wedge as `unvalidated`.
- **Flag pricing gaps explicitly.** No `/pricing` route, no tier table, no "free" mention in README → add to `claims_needing_validation`: "Pricing model unknown — blocks paid GTM and outreach."
- **Write positioning for a marketer who won't open the repo.** One sentence: category + ICP + outcome + wedge. Attach evidence links (file paths) for every field.
- **Cap claims at what you can prove.** Pre-launch products often have aspirational copy — distinguish "product does X" (needs code evidence) from "landing promises X" (copy evidence only).

Output checklist: product profile with ≥80% evidence-backed fields, `claims_needing_validation` list, and a one-paragraph "what we'd need from 5 customer calls to validate."

Track: claim_evidence_ratio (target ≥0.8), time to first usable product profile (<30 min from repo open).

## Preconditions
- [ ] Marketing profile complete for product-intelligence
- [ ] Primary metric named before execution
- [ ] Honest aggression dial matches real assets (list, proof, team hours)

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | Thin assets / solo | One channel, learning metrics |
| standard | Warm channel or list | Best-practice cadence from narrative above |
| aggressive | Strong proof + distribution | Execute full tactic stack with kill rules |

## Timeline
- **T-14**: Instrument leading metric; lock ICP + offer
- **T-7**: Ship assets referenced in narrative
- **T-1**: Final checklist + supporter warm-up
- **H0**: Primary launch motion
- **D+1…D+7**: Measure, teardown, kill or scale

## Tactic stack
1. Name bottleneck with 3 profile citations
2. Ship one measurable experiment this week
3. Tie Plan Studio tasks to registry tactic ids
4. Cap parallel channels at 2
5. Predefine kill/pivot rule before spend or blast

## Orchestration
- One primary channel from narrative; ≤2 support channels
- Repo/browser/asset tasks split by execution_mode

## Realistic outcomes
- State honest bands — do not promise #1 PH or viral without assets
- Leading metric moves in 7–14d when playbook matches profile

## Kill / pivot rules
- Leading metric misses after agreed sample → stop and rewrite hypothesis
- Never add channels when primary motion underperforms

## Ethics line
- No fake metrics, fake social proof, undisclosed ads, or ToS-breaking growth hacks
