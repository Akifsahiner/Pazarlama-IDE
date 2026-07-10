# Playbook: Outreach Drafting With an Existing Email List

List members gave permission — but they're not all equally warm. Draft **segment-specific** messages, not one blast repurposed as "personal outreach."

- **Tier 1 (engaged subscribers): founder-voice re-engagement.** Reference their signup source or a specific email they opened: "You joined after our [topic] teardown — we just shipped the thing that post promised." CTA: early access, beta slot, or founder call.
- **Tier 2 (cold subscribers): value-first reintroduction.** Assume they forgot you. One-line product reminder tied to outcome, one proof point, one ask. "Still working on [pain]? We now [specific capability]. 90-sec walkthrough if useful."
- **Never paste list email templates into LinkedIn DMs.** If subscriber has LinkedIn, cross-channel is fine — but rewrite for channel (shorter, no subject line, no HTML).
- **Launch announcement ≠ outreach draft.** Launch emails go through `launch-asset-generator`. Outreach drafts are 1:1 or small-segment (≤20 people) with individual hooks.
- **Personalize Tier 1 with signup metadata.** "You said you were evaluating [competitor]" from onboarding form → direct wedge message. Empty form → use engagement history instead.
- **Three-touch for non-responders only.** Touch 1: value + ask. Touch 2: new asset (guide, template, loom). Touch 3: "Closing the loop — reply anytime if [pain] resurfaces." Unsubscribe link implied — never guilt.
- **Separate drafts for champions vs executives on same company.** Subscriber who is IC → technical workflow angle. VP subscriber → team ROI angle. Same product, different proof.
- **UTM every link for measurement.** `?utm_source=email&utm_medium=outreach&utm_campaign=founder-touch-1` — feeds `analytics-measurement` reply tracking.
- **Flag subscribers in draft header.** YAML front matter or table column: `already_subscriber: true`, `tier: 1`, `last_open: YYYY-MM-DD`. Prevents duplicate cold outreach from parallel skills.

Track: reply rate on Tier 1 vs Tier 2 (Tier 1 should 2–3× Tier 2), unsubscribe rate (<0.5% per send), click-to-reply ratio.
