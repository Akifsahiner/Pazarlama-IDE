# Follow-Up Sequence — Fill-In Template

Generic follow-up logic for any channel (email, LinkedIn, Twitter). **Each follow-up adds value — never "just bumping."**

---

## Sequence config

```
Channel:          [email / linkedin / twitter]
Lead name:        [name]
Original ask:     [call / trial / feedback / intro]
Touch 1 sent:     [YYYY-MM-DD]
Spacing:          [3–5 business days between touches]
Max touches:      [3 default — stop unless new trigger]
Status:           [awaiting_reply / replied / closed / opted_out]
```

---

## Value-add inventory (pick one per follow-up)

Before writing touch 2+, choose a **new asset** not mentioned in touch 1:

| Asset type | Example | Best for |
|------------|---------|----------|
| Loom walkthrough | 90-sec on core workflow | Visual products |
| Customer story | "[Company] cut X from Y to Z" | B2B proof |
| Template / guide | "Ramp checklist we use internally" | Ops/finance ICP |
| Competitive insight | "How teams switch from [incumbent]" | Switcher campaigns |
| Product update | "Shipped [feature] since my last note" | Long sales cycles |
| Internal forward blurb | 3 bullets they can paste to boss | B2B champion |

---

## Touch 2 template (Day +4)

```
[Channel-appropriate greeting — "Hi [name]" or "Hey [name]"]

[Reference touch 1 in ≤1 sentence — no guilt]

[Introduce NEW asset from inventory — 2 sentences on what it is and why it matters to THEIR situation]

[Soft CTA — same or lower friction than touch 1]

[Sign-off]
```

**Email subject:** `Re: [original subject]`

**LinkedIn:** Same thread, no new connection request

---

## Touch 3 template (Day +9) — Close loop

```
[Channel greeting]

Closing the loop on [original topic] — I know [their function] has no shortage of priorities.

[Optional: one new data point ONLY if genuinely new since touch 2 — otherwise skip pitch entirely]

If [pain] resurfaces, reply anytime. Otherwise I'll step back — appreciated [specific genuine compliment].

[Sign-off]
```

---

## Trigger-based touch 4+ (only with NEW signal)

**Allowed triggers for re-opening:**
- They posted about the pain again
- Company funding / acquisition / leadership change
- Mutual connection intro
- They viewed your profile / clicked link (warm signal)
- Product shipped feature directly addressing their stated gap

**Template:**
```
Hey [name] — saw [new trigger — specific]. Last we chatted about [pain].

[One sentence on what's changed on your side since touch 3 — new proof or feature only]

Still relevant? [Single question CTA]
```

**Disallowed:** Generic quarterly "checking in" with no new value.

---

## Sequence tracker

| Touch | Date sent | Asset used | Reply? | Next action |
|-------|-----------|------------|--------|-------------|
| 1 | | [initial hook] | | |
| 2 | | [asset from inventory] | | |
| 3 | | [close / none] | | |
| 4+ | | [trigger: ___] | | Only if triggered |

---

## Example sequence (email, B2B)

**Touch 1 (Day 0):** Problem + ask for 15-min call — sent.

**Touch 2 (Day +4):**
```
Hi James,

Following up with a concrete resource — recorded a 90-sec walkthrough of how a Series B ops team mapped ramp milestones to Slack without replacing their HRIS.

Link: [loom URL]

If the ramp-time project from your June post is still live, happy to talk through what they did. If not, one more note from me then I'll leave you be.

— Alex
```

**Touch 3 (Day +9):**
```
Hi James,

Closing the loop — totally understand if Q3 priorities shifted.

If ramp tooling comes back on the radar, reply anytime. Your playbook teardown post was one of the better ops threads I've read this month.

— Alex
```

---

## Bad vs good

| Bad touch 2 | Good touch 2 |
|-------------|--------------|
| "Did you get my last email?" | Shares loom, case study, or guide |
| "Available Thursday?" | Same or softer CTA + new asset |
| Identical body to touch 1 | New paragraph of value |
| Touch 4: "Quarterly check-in" | Touch 4: only with funding/post trigger |

---

## Reject the sequence if:

- Touch 2 and 3 both lack new assets/information
- More than 3 touches without trigger documented
- Follow-up sent <3 business days after previous
- Touch 3 still pitches hard instead of closing

## Measurement hooks

Add UTM to touch 2+ links: `utm_campaign=followup-touch-[N]`
Log replies in weekly review → feeds `analytics-measurement`
