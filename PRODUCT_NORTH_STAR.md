# Product North Star — Software CMO

**Status:** Canonical product strategy (2026-07). Do not shrink this vision to “SEO tool” or “launch checklist.”  
**Audience:** Founders, agents, and engineers building Marketing IDE.  
**Question this doc answers:** *Does our product deliver real growth — traffic, visibility, sales — by operating like a world-class CMO alongside the developer?*

---

## 1. One-line north star

> **Marketing IDE is a Software CMO:** it diagnoses the product and market, chooses the right growth thesis, works step-by-step with the founder, **ships what it can in the repo**, **prepares and directs what the human must do** (post, DM, ads UI, hire), measures outcomes, and **pivots weekly** — forever, not “one launch month.”

We compete with **Cursor + Claude + generic advice**, not with Buffer or Hootsuite. We do **not** need to auto-post to social; we **must** make the user know exactly what to do and why, with zero ambiguity.

---

## 2. What we refuse to be

| Anti-pattern | Why it fails |
|--------------|--------------|
| “Improve your meta tags” as the product | Commodity; Cursor can do it; no growth outcome |
| 30-day generic GTM PDF / plan checklist | Briefs without execution; user still lost |
| Chat that only advises (“do X and you’ll grow”) | Marketing stays abstract; no accountability |
| Fake ROI (“saved X hours / Y TL agency”) | User asked for **felt outcomes**, not slogans |
| Auto-posting to X/TikTok/LinkedIn | Out of scope by design; CMO doesn’t always post either |
| Promising viral traffic without distribution ops | Dishonest; growth requires channel discipline |

**Do not retreat to a small wedge when planning features.** The market wants **growth operations**, not a prettier linter for landing copy.

---

## 3. What success looks like for the user

The developer who finished a project opens Marketing IDE and expects:

1. **Clarity** — no question marks: what to do today, this week, and why  
2. **Correct strategy** — channel thesis fits *their* product and founder assets (not one-size-fits-all SEO)  
3. **Concrete execution** — repo diffs, tracking, drafts, research evidence, outreach packs  
4. **Human lane** — scripts, DMs, posting calendar, ad creative export, influencer briefs **ready to run**  
5. **Measurement** — did signups/traffic/sales move? If not, **plan B** next week  
6. **Continuity** — CMO never “finishes”; intake → execute → measure → replan loop  

**Paid conversion test:** Would they pay because **numbers moved**, not because the chat was smart?

---

## 4. The CMO operating loop (product backbone)

```
INTAKE (diagnose + marketability verdict)
    → THESIS (1–2 growth levers + bottleneck)
    → OPERATE (daily/weekly tasks, owners, deadlines)
    → EXECUTE (3 lanes — see §5)
    → MEASURE (KPI / GA4 / manual + before/after)
    → REVIEW (weekly — pivot or double down)
    → repeat
```

Map to code today:

| Phase | Existing primitives | Must strengthen |
|-------|---------------------|-----------------|
| Intake | `ProjectProfile`, scan, `MarketingProfile`, browser audit | Channel thesis engine, founder-asset signals |
| Thesis | `GtmBottleneck`, `inferBottleneckFromDecision`, playbooks | Product-specific thesis (not default SEO) |
| Operate | `CampaignSession`, Plan Studio tasks | **Daily ops table**: owner, deadline, done gate |
| Execute | edit runs, browser CU, assets, exports | Lane B/C user tasks + accountability |
| Measure | manual KPI, GA4 connector, `SessionOutcome` | Mandatory metric gates; weekly review ritual |
| Review | `campaign_session.phase` → `measuring` | Auto-replan from flat metrics |

---

## 5. Four execution lanes (non-negotiable model)

Every task is tagged **Lane A | B | C | D**:

### Lane A — IDE ships (autonomous in repo)

- Landing / pricing / funnel copy → diff → apply  
- Technical SEO (sitemap, schema, canonical, meta, internal links)  
- Analytics events / pixels in codebase  
- Affiliate / referral **pages and tracking** in repo  
- Research reports (competitors, SERP, influencer lists) as structured artifacts  

### Lane B — User ships (IDE prepares; human executes)

- Post short-form / X / LinkedIn (scripts + calendar + “done?” gate)  
- Send influencer DMs / emails (copy ready)  
- Launch PH/HN (runbook + assets + hour-by-hour)  
- Turn on ads in Meta/Google UI (creative + audience pack exported)  
- Send outbound / affiliate partner outreach  

**We do not auto-post.** We **direct** like a CMO: “Today: these 3 hooks, this order, this comment to pin.”

### Lane C — Delegate (IDE writes the brief)

- Hire creator / growth intern (job post + KPI)  
- Influencer deal (brief + tracking link)  
- PR / agency SOW  

### Lane D — Product Loop (IDE ships site fixes; developer owns core)

- Activation / time-to-first-value evidence enters intake before operations
- Product binding pauses marketing and emits P0 PRODUCT REQUESTs
- Site-level onboarding and instrumentation fixes ship through Lane A
- Core auth, billing, workflow, or scale changes export as tracked developer issues
- Marketing resumes only after explicit proof and a founder action

---

## 6. Growth chain (how big marketing actually works)

```
Attention → Trust → Conversion → Retention → Scale
```

| Stage | Levers | IDE role |
|-------|--------|----------|
| Attention | Viral short-form, founder story, PH, SEO, influencers | Pick **one primary** per product; ops + assets |
| Trust | Proof, demos, case studies, consistent narrative | Ship copy + evidence from browser research |
| Conversion | Landing, pricing, CTA, checkout | Lane A repo ship + verify |
| Retention | Onboarding, email (draft), product loop | Tasks + measurement |
| Scale | Paid ads, affiliate, outbound | Lane B packs + measurement |

**Honest constraint:** Lane B still requires human action. Value = **right strategy + prepared execution + proof loop**, not magic autopilot.

---

## 7. Calibration case — Cluely (why thesis matters)

Cluely’s wins were **not** “hero CTA + 30-day plan.” They were:

- Controversial **founder story** + distribution-as-product  
- **High-volume short-form** + character/universe IP  
- Minimal product → **usage data** → pivot to meeting/enterprise  

A **Software CMO** for day-0 Cluely would output:

- **Thesis:** awareness/distribution first; SEO secondary  
- **Week 1:** minimal landing + tracking + 20 hook scripts + posting cadence  
- **Week 2–4:** measure hooks; double down; pivot when usage ≠ interview  

Our **wrong** output today would be: generic launch plan + meta tags only.

**Feature test:** For each new project class, ask: *Would we have recommended Cluely’s actual path?*

---

## 8. Channel responsibility matrix (reference)

| Channel | Lane A (IDE) | Lane B (user) | Lane C (delegate) |
|---------|--------------|---------------|-------------------|
| Technical SEO | Ship in repo | — | — |
| Content / blog | Draft in repo | Publish | Writer brief |
| Short-form / social | Scripts, calendar, hooks | Film & post | Creator hire |
| Product Hunt / HN | Runbook, assets | Launch day network | — |
| Influencer | List, DM templates, brief | Calls, deals | Agency |
| Paid ads | Creative + copy export | Campaign in ad UI | Media buyer |
| Affiliate | Program page + tracking in repo | Partner outreach | — |
| Outbound sales | ICP, list, sequences, CSV | Send / call | SDR hire |
| Measurement | Events in repo | Connect GA4 / log KPI | — |

---

## 9. User experience principles

1. **No ambiguous tasks** — every item: WHAT / WHY / WHO / WHEN / DONE CRITERIA / IF FAIL  
2. **Conversation = operations** — guided campaign thread, not generic chat  
3. **Ship first** — First Hour: grounded citation → patch in repo (see `firstHourWow.ts`)  
4. **Accountability** — user tasks don’t complete without confirmation or link/evidence  
5. **Weekly war room** — one bottleneck, max 3 daily priorities  
6. **Honest metrics** — no fake GA4; empty states tell truth  

---

## 10. Architecture anchors (where to build)

| Capability | Primary locations |
|------------|-------------------|
| Bottleneck + playbooks | `server/src/brain/bottleneck.ts`, `skills/`, `gtmCatalog` |
| Campaign lifecycle | `desktop/src/shared/campaignSession.ts`, `MarketingProfile.campaign_session` |
| Repo execution | `desktop/src/main/agentHost/`, `orchestration/`, skills |
| Browser research | `server/src/browser/`, Operator UI |
| Plan → run bridge | `planPlaybooks.ts` `buildPlanTaskRunGoal`, `execution_mode` |
| First concrete win | `desktop/src/shared/firstHourWow.ts`, reveal → scout → auto-handoff |
| Skills corpus | `skills/*` — must align with channel thesis, not generic advice |

---

## 11. Implementation pillars (priority order)

Build toward Software CMO in this order:

### P0 — CMO Intake + Channel Thesis
- Verdict: marketable? primary bottleneck? **channel thesis in one page**  
- Inputs: repo scan, live site, competitors, persona, founder signals  
- Output: replaces “generic 30-day plan” as default entry  
- **Implemented:** `desktop/src/shared/cmoIntake.ts`, `CmoIntakeCard`, `beginCmoWeek1`, spec `CMO_INTAKE_SPEC.md`

### P1 — Operating Cadence UI
- Daily (1–3 tasks) + weekly review  
- Owner: `system` | `user` | `delegate`  
- Done gates tied to metrics or evidence  
- **Implemented:** `desktop/src/shared/cmoOpsCadence.ts`, `CmoOpsBoard`, `OpsTaskProofModal`, spec `CMO_OPS_SPEC.md`

### P2 — Proof loop
- Task cannot close without KPI or honest “skipped”  
- Apply → measure window → replan  
- **Implemented:** `desktop/src/shared/cmoProofLoop.ts`, KPI gate in `OpsTaskProofModal`, `CmoPivotCard`, spec `CMO_PROOF_LOOP_SPEC.md`

### P3 — Lane B task system
- Posting calendar, influencer outreach tracker, launch runbook mode  
- “Mark done” + optional URL proof  
- **Implemented:** `desktop/src/shared/cmoLaneB.ts`, `LaneBPanel`, `LaneBItemProofModal`, spec `CMO_LANE_B_SPEC.md`

### P4 — Continuous CMO
- `CampaignSession` loops: measuring → intake with delta  
- Auto-suggest pivot when metrics flat  
- **Implemented:** `desktop/src/shared/cmoContinuous.ts`, `CmoCyclePanel`, `startNextCmoCycle`, spec `CMO_CONTINUOUS_SPEC.md`

### P5 — Lane C + measurement hooks
- Delegate briefs (SDR / VA / writer) with handoff + delivery proof  
- Outreach tracker CSV export for Lane B  
- GA4 auto-sync baseline on cycle start (when connected)  
- **Implemented:** `desktop/src/shared/cmoLaneC.ts`, `cmoOutreachExport.ts`, `cmoMeasurement.ts`, `DelegatePanel`, spec `CMO_LANE_C_SPEC.md`

### P6 — Lane A execution system
- Thesis-aware IDE runs: skills, `@hero` mentions, scout→edit, browser research  
- `lane_a_workspace` tracks ship progress linked to system ops tasks  
- Apply auto-completes ops + Lane A proof (commit SHA)  
- **Implemented:** `desktop/src/shared/cmoLaneA.ts`, `LaneAPanel`, `startLaneARun`, spec `CMO_LANE_A_SPEC.md`

### P7 — Growth Control Plane
- Deterministic growth equation + binding bottleneck with evidence  
- Structured red list; thesis alignment flag (no auto-pivot)  
- P12 `GrowthCommandSurface` consumes the plane: Darboğaz / Bugün / Neden / Done when  
- **Implemented:** `desktop/src/shared/cmoGrowthPlane.ts`, spec `CMO_GROWTH_PLANE_SPEC.md`

### P8 — Distribution Operator
- Daily volume targets + hook × day grid for `viral_short_form` and `founder_social`  
- Retention-first proof (3s %, 24h views); scale / kill / double-down verdicts  
- Operator is source of truth; Lane B synced; strip shows volume when collapsed  
- **Implemented:** `desktop/src/shared/cmoDistributionOperator.ts`, `DistributionOperatorPanel`, spec `CMO_DISTRIBUTION_OPERATOR_SPEC.md`  
- **Calibration:** Cluely Week 2–4 double-down on winning hook pattern — not blind channel pivot

### P9 — Influencer Operator
- Creator pipeline (research → pitched → replied → brief → live → reporting) for `influencer_partnerships`  
- Pitch A/B/C variants + weekly DM volume targets; UTM/deal tracking per creator  
- Reply-first proof; scale / kill / double-down verdicts; no auto-DM  
- Operator is source of truth; Lane B synced; strip shows outreach when collapsed  
- **Implemented:** `desktop/src/shared/cmoInfluencerOperator.ts`, `InfluencerOperatorPanel`, spec `CMO_INFLUENCER_OPERATOR_SPEC.md`  
- **Calibration:** Micro-influencer DM volume + pitch testing — human sends, operator tracks pipeline truth

### P10 — Delegation Operator
- VA/creator hire scaffolds + trial KPIs; daily delivery rubrics with proof  
- Bidirectional Lane C ↔ Lane B / P8 / P9 import on delivery  
- `promote` / `extend` / `release` verdicts; rubric line on P7 strip  
- **Implemented:** `desktop/src/shared/cmoDelegateOperator.ts`, `DelegateOperatorPanel`, spec `CMO_DELEGATE_OPERATOR_SPEC.md`  
- **Calibration:** Founder hires VA/creator — IDE owns brief, rubric, and import path

### P11 — Growth Memory
- Cycle-linked experiment ledger harvested from ops, Lane B, P8/P9, and delegate proof
- Evidence-backed winning/losing message memory (hooks, pitches, openers, post copy)
- Automatic Week N+1 replan preview; user starts the precomputed plan in one click
- Winning messages mutate ops/Lane B and seed P8/P9 operator double-down hints
- **Implemented:** `desktop/src/shared/cmoGrowthMemory.ts`, `GrowthMemoryPanel`, spec `CMO_GROWTH_MEMORY_SPEC.md`
- **Calibration:** Winning distribution patterns compound across weeks instead of resetting to generic Week 1 work

### P12 — Command Surface Simplification
- One primary screen: **Darboğaz / Bugün / Neden / Done when**
- One daily CTA; CMO-owned NextActionBar actions are de-duplicated
- Ops, Lane A/B/C, operators, red list, memory, and cycle history live in a collapsed backstage
- Review / measuring / pivot / replan appears as one compact governance banner
- **Implemented:** `desktop/src/shared/cmoCommandSurface.ts`, `GrowthCommandSurface`, `CmoBackstage`, spec `CMO_COMMAND_SURFACE_SPEC.md`
- **Calibration:** Preserve CMO depth without making the founder parse the operating system before acting

### P13 — Founder-Fit Intake + Strategic Options
- Exactly seven founder-fit questions constrain the scan-derived thesis before execution
- Cultural tension → one canonical narrative → Lane A/B/C and operators inherit the same story
- A/B/C strategic postures expose tradeoffs, eligibility, and honest 30-day targets
- One recommended path plus explicit **from the CMO / from the founder** contract
- One Yes seals the decision; advisory UI ends and P12 operations begin
- **Implemented:** `desktop/src/shared/cmoFounderFit.ts`, `cmoGrowthNarrative.ts`, `cmoStrategicOptions.ts`, `FounderFitWizard`, `StrategicDecisionCard`, spec `CMO_FOUNDER_FIT_SPEC.md`
- **Calibration:** A camera-shy founder is never assigned founder-led distribution; missing baselines remain labeled assumptions

### P14 — Budget Plane
- Numeric monthly ceiling confirms or replaces the P13 feasibility band
- Deterministic thesis portfolio allocates primary, paid, influencer, delegate, tools, and reserve buckets
- Lane B/C and operator actions carry separate estimates and logged actual spend
- Week close archives channel burn and CPA only when spend plus attributed outcomes are measured
- P11 harvests spend experiments separately from message winners; next-week reallocation remains a user-applied preview
- **Implemented:** `desktop/src/shared/cmoBudgetPlane.ts`, `BudgetSetupCard`, `BudgetPlanePanel`, spec `CMO_BUDGET_PLANE_SPEC.md`
- **Calibration:** No LLM money math, fake ROI, inferred zero outcome, silent reallocation, or estimate-as-actual

### P15 — Product Loop (Lane D)
- Activation event, signup-to-activation, and time-to-first-value enter intake with measured / assumption / missing confidence
- Deterministic product binding replaces marketing tactics with P0 PRODUCT REQUESTs and explicit `marketing_paused`
- Every request carries acceptance criteria, growth impact, scope, status, and real proof
- Site-level onboarding/instrumentation ships through Lane A; core changes export as developer issues
- P11 records product fixes separately from message winners; the founder explicitly resumes marketing
- **Implemented:** `desktop/src/shared/cmoLaneD.ts`, `ProductActivationCard`, `LaneDPanel`, spec `CMO_PRODUCT_LOOP_SPEC.md`
- **Calibration:** Never scale attention into broken activation; never invent product metrics or claim an issue was filed/shipped without proof

### P16 — Revenue & Monetization Plane
- Pricing thesis, payment funnel, and paying-customer targets enter intake with measured / assumption / missing confidence
- Revenue binding shifts command-surface focus and creates monetization P0 tasks without pausing all marketing (unlike P15)
- CAC, LTV, and LTV:CAC appear only when spend and outcomes are both measured; funnel conversion requires both stage counts
- Site-level monetization ships through Lane A; core billing exports developer issues with proof
- P11 records `revenue_signal` experiments separately from message winners; P14 spend joins attribution at week close
- **Implemented:** `desktop/src/shared/cmoRevenuePlane.ts`, `RevenueSetupCard`, `RevenuePlanePanel`, spec `CMO_REVENUE_PLANE_SPEC.md`
- **Calibration:** No LLM money math, fake MRR, invented ROI, or paid-scale into an uncloseable funnel

### P17 — Growth Mechanism Intelligence
- 14 mechanism records encode hidden system chains, anti-patterns, and week1 task templates (deterministic corpus)
- Public presence policy gates founder/character/creator paths before strategic A/B/C
- Safe/Balanced/Attack options map to **different mechanisms**, then to existing 8 channel theses
- Growth plane red list rejects superficial copies from non-selected mechanisms
- Operator flags (distribution, influencer, delegate, character_mode) follow sealed mechanism
- **Implemented:** `cmoGrowthMechanismKnowledge.ts`, `cmoGrowthEngine.ts`, `PublicPresenceCard`, spec `CMO_GROWTH_ENGINE_SPEC.md`
- **Calibration:** No case-study browser; company names in calibration metadata only; no LLM mechanism picking

---

## 12. Feature decision checklist (use on every PR)

Before shipping a feature, answer:

1. Does it help pick the **right growth thesis** (not just any advice)?  
2. Does it reduce user ambiguity (**what do I do today?**)?  
3. Does it **ship in repo** (Lane A), **prepare human execution** (Lane B/C), or resolve a product bottleneck (Lane D)?  
4. Does it connect to a **metric** within 7 days?  
5. Would a **top CMO** do this step for a real company?  
6. Are we avoiding **shrinking** the product to commodity SEO/checklist?  

If mostly “no,” reconsider or reframe.

---

## 13. Relationship to Cursor / Claude

| They do | We do |
|---------|-------|
| Code anywhere | **Growth operations** for *this* repo + GTM memory |
| General reasoning | **Channel thesis + weekly ops + accountability** |
| One-shot answers | **Months-long campaign session** with measure/pivot |

**Wedge sentence (external):** *“The CMO that ships in your repo and tells you exactly what to do everywhere else.”*

---

## 14. Related docs

- `AGENTS.md` — agent entrypoint (links here)  
- `progress.md` — ADR-6 references this doc  
- `.cursor/rules/product-north-star.mdc` — always-on agent rule  
- `desktop/scripts/wow-checklist.md` — manual acceptance  
- `SKILL_EXCELLENCE.md` — skills must serve channel thesis  

---

*This document is the authoritative answer to “what real value do we provide?” If implementation diverges, update the code or update this doc — do not silently narrow the product.*
