# Playbook: Analytics Measurement for B2B SaaS

B2B measurement tracks **pipeline quality**, not signup volume. SQL rate, demo-to-paid, and channel CPA matter more than top-of-funnel vanity.

- **North-star by motion.** PLG: activated trials/week. Hybrid: qualified demos booked. Sales-led: SQLs with budget + timeline confirmed.
- **Funnel stages map to buying process.** Visit → signup/trial → activation (core workflow complete) → PQL (usage threshold) → SQL (sales accepted) → closed-won. Define thresholds numerically — "PQL = 3+ projects + invited teammate."
- **GA4 events minimum set.** `signup_completed`, `trial_started`, `activation_[core_action]`, `pricing_page_viewed`, `demo_requested`, `integration_connected`. Snake_case, past tense, one action per event.
- **CRM is source of truth for pipeline.** GA4 tracks product; HubSpot/Pipedrive tracks deals. Weekly review reconciles: trials in product = trials in CRM. Mismatch = tracking bug or sales process gap.
- **Channel CPA by intent tier.** Google Search CPA vs LinkedIn vs PH vs outbound — never blend into "marketing CPA." B2B search converts 3–5× cold social; blended CPA hides losers.
- **Cohort by ICP tier from lead research.** A-tier outbound leads vs PLG self-serve — expect 2–3× activation delta. If not, ICP scoring or onboarding is wrong.
- **Trial-to-paid at day 14 and day 30.** Report both; B2B deals often close day 25–45. Early cutoff understates channel ROI.
- **Weekly review includes sales feedback loop.** 15 min with AE/founder: "Which channel leads were real?" Qualitative SQL quality tag improves scoring faster than analytics alone.
- **Security/compliance funnel events.** `security_pack_downloaded`, `sso_setup_started` — enterprise leading indicators. Track even at low volume.

Track: SQL rate by channel, trial-to-paid %, activation rate within 7 days, CAC payback estimate (when spend + revenue data available).
