/** Marketing Computer Use task templates — injected into browser runs. */
export interface CuMarketingTemplate {
  id: string;
  label: string;
  channel: string;
  goal: string;
  evidenceHint: string;
}

export const CU_MARKETING_TEMPLATES: CuMarketingTemplate[] = [
  {
    id: "meta-ad-library",
    label: "Meta Ad Library teardown",
    channel: "paid_ads",
    goal:
      "Open Meta Ad Library for 2–3 competitors. Capture active ad hooks, CTAs, and landing URLs. Summarize 3 creative patterns we should test.",
    evidenceHint: "Screenshot top 3 ad variants per competitor",
  },
  {
    id: "ph-listing-prep",
    label: "Product Hunt listing prep",
    channel: "product_hunt",
    goal:
      "Review Product Hunt launch gallery best practices and 2 comparable launches. List gallery image requirements and maker comment structure.",
    evidenceHint: "Note tagline length limits and gallery dimensions",
  },
  {
    id: "ph-launch-day-monitor",
    label: "Product Hunt launch day monitor",
    channel: "product_hunt",
    goal:
      "On launch day, monitor 2 comparable PH launches: maker comment timing, supporter comment quality, gallery engagement. Document ethical response cadence (no upvote requests).",
    evidenceHint: "Capture comment examples and response timing patterns",
  },
  {
    id: "linkedin-profile-audit",
    label: "LinkedIn founder profile audit",
    channel: "linkedin",
    goal:
      "Review 2 founder profiles in our category on LinkedIn. Extract headline formulas, banner patterns, and featured section ideas for our ICP.",
    evidenceHint: "Capture headline + about structure patterns",
  },
  {
    id: "waitlist-teardown",
    label: "Waitlist landing teardown",
    channel: "waitlist",
    goal:
      "Find 3 high-converting waitlist landing pages in our space. Document CTA copy, social proof, referral mechanics, and countdown patterns.",
    evidenceHint: "List referral + email capture patterns",
  },
  {
    id: "influencer-creator-research",
    label: "Influencer creator research",
    channel: "influencer",
    goal:
      "Find 5 creators in our niche on Instagram/YouTube/TikTok. Note follower range, engagement rate, content style, and whether they use #ad disclosure. Draft tier list (micro/mid/macro).",
    evidenceHint: "Screenshot 3 creator profiles + recent sponsored post examples",
  },
  {
    id: "short-form-hook-teardown",
    label: "Short-form hook teardown",
    channel: "short_form",
    goal:
      "Review 5 viral-style short videos in our category (TikTok/Reels/Shorts). Extract hook patterns in first 3 seconds, CTA placement, and caption structure. Propose 3 hook variants for our product.",
    evidenceHint: "Note hook text + visual pattern for each video",
  },
  {
    id: "google-ads-preview",
    label: "Google Ads transparency check",
    channel: "paid_ads",
    goal:
      "Use Google Ads Transparency Center to review competitor search/display creatives. Summarize messaging angles and offer types.",
    evidenceHint: "Note 5 distinct hooks and landing themes",
  },
];

/** Tactic id → focused browser micro-goal (prepended before playbook template). */
export const TACTIC_CU_MICRO_GOALS: Record<string, string> = {
  referral_waitlist_loop:
    "Research 3 waitlist pages with referral mechanics. Document invite thresholds, reward copy, and share CTAs.",
  ph_supporter_comment_cadence:
    "Study 2 recent PH launches. Capture supporter comment examples (thoughtful, not generic). Note timing relative to launch hour.",
  linkedin_14_day_grid:
    "Review 3 founder LinkedIn posts with strong engagement. Extract hook formulas and post structure for a 14-day grid.",
  short_form_hook_ab:
    "Collect 5 short-form hooks from competitors. Tag pattern type (question, stat, contrarian, demo-first).",
  influencer_brief_disclosure:
    "Find 3 influencer posts with clear #ad disclosure. Note brief structure and UTM/link patterns.",
  ads_hypothesis_loop:
    "Compare 2 competitor ad sets in Meta Ad Library. List hypothesis variables (hook, offer, CTA) to test.",
  hero_social_proof_stack:
    "Audit 3 landing pages in category. Document hero headline + social proof + single CTA patterns.",
  prelaunch_drip_sequence:
    "Review 2 product waitlist email sequences (public examples). Map Day 0/3/7 email themes.",
};

export function cuTemplateById(id: string): CuMarketingTemplate | undefined {
  return CU_MARKETING_TEMPLATES.find((t) => t.id === id);
}

const PLAYBOOK_CU_TEMPLATE: Record<string, string> = {
  "ph-number-one": "ph-listing-prep",
  "ph-launch": "ph-launch-day-monitor",
  "linkedin-gtm": "linkedin-profile-audit",
  "waitlist-hype": "waitlist-teardown",
  "paid-ads-opt": "meta-ad-library",
  "paid-ads": "meta-ad-library",
  influencer: "influencer-creator-research",
  "short-form-viral": "short-form-hook-teardown",
};

export function cuGoalForPlaybook(playbookId: string): string | undefined {
  const tplId = PLAYBOOK_CU_TEMPLATE[playbookId];
  if (!tplId) return undefined;
  return cuTemplateById(tplId)?.goal;
}

/** Inject marketing CU template + plan task context into browser goals. */
export function resolveBrowserGoal(opts: {
  rawGoal: string;
  playbookId?: string;
  task?: {
    execution_mode?: string;
    instructions_md?: string;
    playbookId?: string;
    tactic?: string;
    channel?: string;
  };
}): string {
  const parts: string[] = [];
  const pb = opts.playbookId ?? opts.task?.playbookId;

  if (opts.task?.tactic && TACTIC_CU_MICRO_GOALS[opts.task.tactic]) {
    parts.push(`Tactic research focus:\n${TACTIC_CU_MICRO_GOALS[opts.task.tactic]}`);
  }

  const useCu =
    opts.task?.execution_mode === "browser" ||
    opts.task?.execution_mode === "connector_read" ||
    pb;
  if (useCu && pb) {
    const cu = cuGoalForPlaybook(pb);
    if (cu) parts.push(`Marketing CU research goal:\n${cu}`);
  }
  if (opts.task?.tactic) parts.push(`Tactic id: ${opts.task.tactic}`);
  if (opts.task?.channel) parts.push(`Channel: ${opts.task.channel}`);
  if (opts.task?.instructions_md?.trim()) {
    parts.push(`Founder checklist:\n${opts.task.instructions_md.trim()}`);
  }
  parts.push(`User request: ${opts.rawGoal.trim()}`);
  parts.push("Capture evidence screenshots. Summarize findings as structured notes — do not publish.");
  return parts.filter(Boolean).join("\n\n");
}
