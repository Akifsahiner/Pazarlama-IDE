# ICP Canvas — Fill-In Template

Use after reading README + landing routes. Every field needs an **evidence citation** (file path, URL, or quote) or the label `needs_validation`.

---

## 1. Product anchor

```
Product name:     [name]
One-liner:        [verbatim from hero or README — in quotes]
Primary CTA:      [e.g. Start free / Book demo]
Evidence:         [app/page.tsx:42, README.md:L12]
```

---

## 2. Ideal Customer Profile (the company)

| Field | Your answer | Evidence |
|-------|-------------|----------|
| **Industry / vertical** | [e.g. B2B SaaS, ecommerce ops] | |
| **Company stage** | [e.g. Series A–C, 20–200 employees] | |
| **Geography** | [e.g. US/EU, English-first] | |
| **Tech stack signals** | [e.g. uses Stripe, Shopify, Salesforce] | |
| **Budget band** | [e.g. $500–5k/mo tool budget] | [pricing page or needs_validation] |
| **Anti-ICP (exclude)** | [e.g. B2C, agencies, <10 employees] | |

---

## 3. Buyer persona (the person)

| Field | Your answer | Evidence |
|-------|-------------|----------|
| **Role / title** | [e.g. Head of Ops, VP Finance] | |
| **Reports to** | [e.g. COO, CFO] | |
| **Owns metric** | [e.g. month-end close time, CAC] | |
| **Daily pain** | [specific task, not "efficiency"] | |
| **Trigger event** | [e.g. new funding, first SOC 2 audit] | |
| **Current workaround** | [spreadsheet, incumbent, internal build] | |

---

## 4. Jobs-to-be-done (link to JTBD template)

List 3 jobs max here; expand in `jobs-to-be-done.md`.

1. **When** [situation], **I want to** [action], **so I can** [outcome]. → Route: `/[path]`
2. …
3. …

---

## 5. Qualification checklist (for lead research handoff)

**Must-have (all required for A-tier):**
- [ ] Role matches persona title
- [ ] Company stage in band
- [ ] Pain matches a documented job
- [ ] Why-now trigger identifiable
- [ ] Budget plausible for pricing tier

**Nice-to-have:**
- [ ] Uses named integration partner
- [ ] Competitor customer or mentioned competitor pain
- [ ] Inbound or warm signal

---

## Example (filled)

```
Product: Closeflow
One-liner: "Close month-end in 2 days, not 10" (pricing page hero)
Primary CTA: Start 14-day trial

ICP company: B2B SaaS, Series A–C, 30–150 employees, US
Persona: Controller or Head of Finance, owns close timeline
Trigger: First audit prep or new CFO mandate
Anti-ICP: Pre-revenue startups, agencies, companies on NetSuite Enterprise (integration gap)

Evidence: app/(marketing)/page.tsx, README "For finance teams at growing SaaS companies"
```

---

## Bad vs good patterns

| Bad | Good |
|-----|------|
| "Early adopters" | "Head of Ops at Series A SaaS, 20–80 employees" |
| "Tech-savvy users" | "Engineering managers who own incident response SLAs" |
| "SMBs" | "Shopify brands doing $50k–$500k/mo GMV" |
| No evidence column | Every row cites copy, route, or `needs_validation` |
| 12 personas | One primary, one optional secondary max |

---

## Reject the canvas if:

- Persona has no named role or owned metric
- Trigger event is generic ("growth", "scaling")
- Anti-ICP is empty (you must know who to exclude)
- >30% of fields say `needs_validation` without a validation plan
