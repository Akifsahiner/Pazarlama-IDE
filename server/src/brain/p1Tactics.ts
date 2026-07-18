type TacticRow = {
  id: string;
  skillId: string;
  playbookId: string;
  phaseLabel?: string;
  label: string;
  teaching: string[];
  acceptanceCriteria: string[];
};

export const X_TACTICS: TacticRow[] = [
  { id: "x_icp_account_map", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "T-30", label: "ICP account map (30 X accounts)", teaching: ["Founders + eng leaders in stack", "Engage before pitch"], acceptanceCriteria: ["30 accounts scored"] },
  { id: "x_profile_bio_hook", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "T-30", label: "Bio hook + pinned thread", teaching: ["Pain → outcome ≤160 chars", "Pin = best value thread"], acceptanceCriteria: ["Bio + pin live"] },
  { id: "x_build_in_public_cadence", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "T-21", label: "Build-in-public 3×/week", teaching: ["Mon/Wed/Fri cadence", "8020 value/product"], acceptanceCriteria: ["12 posts / 28d"] },
  { id: "x_thread_format_7", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "T-14", label: "7-tweet thread format", teaching: ["Hook + GIF + single CTA", "Tweet 7 UTM link"], acceptanceCriteria: ["7 tweets drafted"] },
  { id: "x_engagement_before_pitch", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "T-14", label: "Engage 10 ICP posts/day (14d)", teaching: ["Substantive replies only", "No product links in replies"], acceptanceCriteria: ["14-day log"] },
  { id: "x_launch_thread_h0", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "H0", label: "Launch thread publish + pin", teaching: ["Launch thread live", "Pin tweet 1"], acceptanceCriteria: ["Timestamp logged"] },
  { id: "x_reply_sla_2h", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "H0–H+8", label: "Reply SLA ≤2 hours", teaching: ["≥85% in launch window", "Factual on criticism"], acceptanceCriteria: ["SLA sheet updated"] },
  { id: "x_quote_tweet_launch_ethics", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "H0–H+4", label: "Ethical quote-tweets (max 2)", teaching: ["Add context never vote asks", "No mass @ tags"], acceptanceCriteria: ["≤2 QRTs logged"] },
  { id: "x_cross_post_delay_24h", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "T-3", label: "24h offset from LinkedIn launch", teaching: ["No duplicate copy", "Calendar gap"], acceptanceCriteria: ["Offset documented"] },
  { id: "x_teardown_thread_d1", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", phaseLabel: "D+1", label: "D+1 teardown thread", teaching: ["Honest metrics + lessons", "UTM signups cited"], acceptanceCriteria: ["Thread published"] },
  { id: "x_no_engagement_pods", skillId: "twitter-x-founder-gtm", playbookId: "aggressive-x-launch-30d", label: "No engagement pods (ever)", teaching: ["Zero pod participation", "Self-audit signed"], acceptanceCriteria: ["Audit signed"] },
];

export const NL_TACTICS: TacticRow[] = [
  { id: "nl_sponsor_shortlist_niche", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "T-21", label: "Shortlist niche dev newsletters", teaching: ["Bytes/React Status tier", "ICP overlap first"], acceptanceCriteria: ["5 newsletters scored"] },
  { id: "nl_audience_overlap_score", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "T-21", label: "Audience overlap score", teaching: ["Score 1–5 vs ICP", "Skip broad consumer lists"], acceptanceCriteria: ["Overlap doc filed"] },
  { id: "nl_media_kit_request", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "T-14", label: "Request sponsor media kit", teaching: ["Rates + specs + lead time", "Archive past sponsors"], acceptanceCriteria: ["Kit from ≥3 pubs"] },
  { id: "nl_sponsor_creative_brief", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "T-10", label: "Sponsor creative brief", teaching: ["Native not display", "Single CTA + proof"], acceptanceCriteria: ["Brief approved"] },
  { id: "nl_native_copy_120_words", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "T-7", label: "Native copy ≤120 words", teaching: ["Editorial tone", "No hype adjectives"], acceptanceCriteria: ["Copy ≤120 words"] },
  { id: "nl_utm_campaign_scheme", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "T-7", label: "UTM per newsletter slot", teaching: ["utm_source=newsletter_name", "Unique campaign per slot"], acceptanceCriteria: ["UTM sheet live"] },
  { id: "nl_slot_booking_lead_time", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "T-14", label: "Book slot ≥14d lead time", teaching: ["Prime slots fill early", "Contract start date logged"], acceptanceCriteria: ["Slot confirmed"] },
  { id: "nl_creative_ab_hook", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "T-7", label: "A/B hook on first sponsor", teaching: ["2 hooks same offer", "Pick winner for slot 2"], acceptanceCriteria: ["Winner documented"] },
  { id: "nl_kill_rule_cpa_7d", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "D+7", label: "7d CPA kill rule", teaching: ["Kill if CPA >2× target", "Pause slot 2"], acceptanceCriteria: ["Kill/scale logged"] },
  { id: "nl_post_sponsor_teardown", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "D+7", label: "Post-sponsor teardown", teaching: ["Signups per $", "Honest ROI"], acceptanceCriteria: ["Teardown published"] },
  { id: "nl_max_consecutive_slots_2", skillId: "newsletter-sponsorship", playbookId: "aggressive-sponsor-sprint", phaseLabel: "T-3", label: "Max 2 consecutive sponsor slots", teaching: ["Avoid audience fatigue", "Space ≥1 issue"], acceptanceCriteria: ["≤2 slots booked"] },
];

export const PR_TACTICS: TacticRow[] = [
  { id: "pr_press_kit_pdf", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "T-14", label: "Press kit PDF", teaching: ["Fact sheet + screenshots", "Founder bio + logo pack"], acceptanceCriteria: ["PDF <5MB live"] },
  { id: "pr_embargo_datetime_lock", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "T-7", label: "Embargo datetime lock (UTC)", teaching: ["Written embargo in pitches", "No early leaks"], acceptanceCriteria: ["Embargo doc signed"] },
  { id: "pr_reporter_shortlist_5", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "T-14", label: "Reporter shortlist (5)", teaching: ["Beat-matched journalists", "Recent similar coverage"], acceptanceCriteria: ["5 names + emails"] },
  { id: "pr_pitch_personalized_hook", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "T-10", label: "Personalized pitch hooks", teaching: ["Reference their last article", "News hook not ad"], acceptanceCriteria: ["5 unique pitches"] },
  { id: "pr_founder_quote_approved", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "T-7", label: "Founder quote approved", teaching: ["≤40 words quotable", "No unverifiable claims"], acceptanceCriteria: ["Quote doc approved"] },
  { id: "pr_screenshot_asset_kit", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "T-10", label: "Screenshot asset kit", teaching: ["UI + workflow stills", "Caption each"], acceptanceCriteria: ["≥4 assets"] },
  { id: "pr_launch_monitoring_6h", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "H0–H+6", label: "Launch monitoring 6h", teaching: ["Google Alerts + manual", "Log pickups"], acceptanceCriteria: ["Monitoring sheet"] },
  { id: "pr_follow_up_sla_24h", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "H+24", label: "Reporter follow-up SLA 24h", teaching: ["One polite bump", "Offer new angle"], acceptanceCriteria: ["Follow-ups logged"] },
  { id: "pr_kill_no_pickup_48h", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "H+48", label: "Kill rule: 0 pickups at 48h", teaching: ["Pivot to owned channels", "Teardown post"], acceptanceCriteria: ["Kill decision logged"] },
  { id: "pr_honest_coverage_ceiling", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "T-14", label: "Honest coverage ceiling stated", teaching: ["Cold pitch: 0–1 pickup typical", "In decision output"], acceptanceCriteria: ["Ceiling in plan"] },
  { id: "pr_customer_proof_permission", skillId: "press-pr-launch", playbookId: "aggressive-press-war-room", phaseLabel: "T-10", label: "Customer proof permission", teaching: ["Named logos need OK", "Anonymous OK fallback"], acceptanceCriteria: ["Permissions filed"] },
];

export const OSS_TACTICS: TacticRow[] = [
  { id: "oss_readme_star_cta", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-14", label: "README star CTA above fold", teaching: ["Why star helps project", "Not begging tone"], acceptanceCriteria: ["CTA in README"] },
  { id: "oss_release_notes_blog", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-7", label: "Release notes as distribution", teaching: ["Blog + GH release synced", "Canonical URL"], acceptanceCriteria: ["Notes published"] },
  { id: "oss_awesome_list_pr", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-10", label: "Awesome-list PR (value-add)", teaching: ["Follow list rules", "One PR per list"], acceptanceCriteria: ["PR submitted"] },
  { id: "oss_maintainer_dm_ethics", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-14", label: "Maintainer DM ethics", teaching: ["Warm intro only", "No cold spam"], acceptanceCriteria: ["0 cold blast DMs"] },
  { id: "oss_github_topics_tags", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-14", label: "GitHub topics/tags", teaching: ["5 relevant topics", "Match discovery searches"], acceptanceCriteria: ["Topics live"] },
  { id: "oss_changelog_visible", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-7", label: "CHANGELOG visible", teaching: ["Keep a Changelog format", "Link from README"], acceptanceCriteria: ["CHANGELOG.md exists"] },
  { id: "oss_show_hn_coordination", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-3", label: "Show HN coordination", teaching: ["≥48h after repo freeze", "Pair community-launch"], acceptanceCriteria: ["Calendar aligned"] },
  { id: "oss_star_milestone_thread", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "D+7", label: "Star milestone thread", teaching: ["Honest milestone", "Thank contributors"], acceptanceCriteria: ["Thread if milestone hit"] },
  { id: "oss_license_clarity_block", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-14", label: "License clarity block", teaching: ["SPDX in README", "Enterprise FAQ if dual"], acceptanceCriteria: ["License section clear"] },
  { id: "oss_good_first_issue_label", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-10", label: "good-first-issue labels", teaching: ["≥3 starter issues", "Clear acceptance"], acceptanceCriteria: ["Issues labeled"] },
  { id: "oss_package_registry_listing", skillId: "devrel-open-source-launch", playbookId: "aggressive-oss-launch", phaseLabel: "T-7", label: "npm/PyPI registry listing", teaching: ["Keywords + README link", "Version sync"], acceptanceCriteria: ["Package published"] },
];
