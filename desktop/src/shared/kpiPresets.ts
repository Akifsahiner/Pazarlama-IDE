import type { ManualKpi } from "./types";

export interface KpiPreset {
  id: string;
  label: string;
  name: string;
  unit?: string;
  channel?: string;
  defaultTarget?: number;
}

export const KPI_PRESETS: KpiPreset[] = [
  {
    id: "waitlist_signups",
    label: "Waitlist signups",
    name: "Waitlist signups",
    unit: "signups",
    channel: "waitlist-hype",
    defaultTarget: 100,
  },
  {
    id: "ph_upvotes",
    label: "PH upvotes",
    name: "Product Hunt upvotes",
    unit: "upvotes",
    channel: "ph-launch",
    defaultTarget: 50,
  },
  {
    id: "linkedin_impressions",
    label: "LinkedIn impressions",
    name: "LinkedIn impressions",
    unit: "impressions",
    channel: "linkedin-gtm",
  },
  {
    id: "paid_spend",
    label: "Ad spend",
    name: "Paid ad spend",
    unit: "USD",
    channel: "paid-ads-opt",
  },
  {
    id: "tools_spend",
    label: "Marketing tools spend",
    name: "Marketing tools spend",
    unit: "USD",
    channel: "tools",
  },
  {
    id: "targeted_visitors",
    label: "Targeted visitors",
    name: "Targeted visitors",
    unit: "visitors",
    defaultTarget: 50,
  },
  {
    id: "outbound_replies",
    label: "Outbound replies",
    name: "Outbound replies",
    unit: "replies",
    defaultTarget: 3,
  },
  {
    id: "short_form_views",
    label: "Short-form views",
    name: "Short-form video views (24h)",
    unit: "views",
    defaultTarget: 1000,
  },
  {
    id: "social_posts",
    label: "Posts published",
    name: "Social posts published",
    unit: "posts",
    defaultTarget: 3,
  },
  {
    id: "hook_retention_3s_pct",
    label: "Hook 3s retention",
    name: "Best hook 3-second retention",
    unit: "%",
    defaultTarget: 65,
  },
  {
    id: "hook_completion_pct",
    label: "Hook completion",
    name: "Best hook completion rate",
    unit: "%",
    defaultTarget: 40,
  },
  {
    id: "signup_rate_pct",
    label: "Signup rate %",
    name: "Landing signup rate",
    unit: "%",
    defaultTarget: 2,
  },
  {
    id: "activated_users",
    label: "Activated users",
    name: "Users who reached first value",
    unit: "users",
    channel: "product-loop",
  },
  {
    id: "activation_rate_pct",
    label: "Activation rate",
    name: "Signup-to-activation rate",
    unit: "%",
    channel: "product-loop",
    defaultTarget: 40,
  },
  {
    id: "time_to_first_value_hours",
    label: "Time to first value",
    name: "Time from signup to first value",
    unit: "hours",
    channel: "product-loop",
  },
  {
    id: "onboarding_completion_pct",
    label: "Onboarding completion",
    name: "Onboarding completion rate",
    unit: "%",
    channel: "product-loop",
  },
  {
    id: "paid_customers",
    label: "Paying customers",
    name: "Paying customers",
    unit: "customers",
    channel: "revenue-plane",
    defaultTarget: 30,
  },
  {
    id: "mrr_usd",
    label: "MRR",
    name: "Monthly recurring revenue",
    unit: "USD",
    channel: "revenue-plane",
  },
  {
    id: "ltv_usd",
    label: "Customer LTV",
    name: "Customer lifetime value",
    unit: "USD",
    channel: "revenue-plane",
  },
  {
    id: "pricing_page_views",
    label: "Pricing page views",
    name: "Pricing page views",
    unit: "views",
    channel: "revenue-plane",
  },
  {
    id: "checkout_starts",
    label: "Checkout starts",
    name: "Checkout started events",
    unit: "starts",
    channel: "revenue-plane",
  },
  {
    id: "trial_starts",
    label: "Trial starts",
    name: "Trial or free-tier starts",
    unit: "trials",
    channel: "revenue-plane",
  },
  {
    id: "trial_to_paid_pct",
    label: "Trial-to-paid %",
    name: "Trial to paid conversion",
    unit: "%",
    channel: "revenue-plane",
    defaultTarget: 10,
  },
  {
    id: "community_engagement",
    label: "Community replies",
    name: "Community comment replies",
    unit: "replies",
    defaultTarget: 5,
  },
  {
    id: "influencer_replies",
    label: "Influencer replies",
    name: "Influencer DM replies",
    unit: "replies",
    defaultTarget: 3,
  },
  {
    id: "influencer_referral_signups",
    label: "Influencer signups",
    name: "Influencer referral signups",
    unit: "signups",
    defaultTarget: 10,
  },
  {
    id: "influencer_pitch_reply_rate",
    label: "Pitch reply rate",
    name: "Best pitch reply rate",
    unit: "%",
    defaultTarget: 20,
  },
  {
    id: "influencer_cpa_qualified_signup",
    label: "Influencer CPA",
    name: "Influencer CPA (qualified signup)",
    unit: "USD",
    defaultTarget: 80,
  },
  {
    id: "delegate_rubric_completion_pct",
    label: "Delegate rubric",
    name: "Delegate rubric completion",
    unit: "%",
    defaultTarget: 85,
  },
  {
    id: "delegate_contacts_enriched",
    label: "Delegate contacts",
    name: "Delegate contacts enriched",
    unit: "contacts",
    defaultTarget: 30,
  },
  {
    id: "delegate_deliverables_on_time",
    label: "Delegate delivery",
    name: "Delegate briefs delivered on time",
    unit: "briefs",
    defaultTarget: 1,
  },
  {
    id: "memory_experiments_logged",
    label: "Experiments logged",
    name: "Growth experiments logged",
    unit: "experiments",
    channel: "growth-memory",
    defaultTarget: 3,
  },
  {
    id: "memory_winner_messages",
    label: "Winning messages",
    name: "Winning messages",
    unit: "messages",
    channel: "growth-memory",
    defaultTarget: 1,
  },
  {
    id: "memory_replan_applied",
    label: "Memory replan",
    name: "Memory replans applied",
    unit: "replans",
    channel: "growth-memory",
    defaultTarget: 1,
  },
  {
    id: "ga4_sessions",
    label: "GA4 sessions (7d)",
    name: "GA4 sessions",
    unit: "sessions",
    defaultTarget: 100,
  },
  {
    id: "ga4_conversions",
    label: "GA4 conversions (7d)",
    name: "GA4 conversions",
    unit: "conversions",
    defaultTarget: 5,
  },
];

/** Map task titles / KPI names to a preset for quick logging CTAs. */
export function inferKpiPresetFromText(text?: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/time.to.first.value|\bttfv\b/.test(t)) return "time_to_first_value_hours";
  if (/onboarding completion/.test(t)) return "onboarding_completion_pct";
  if (/activation rate|signup.to.activation/.test(t)) return "activation_rate_pct";
  if (/activated user/.test(t)) return "activated_users";
  if (/paying customer|paid customer|subscription created/.test(t)) return "paid_customers";
  if (/\bmrr\b|monthly recurring/.test(t)) return "mrr_usd";
  if (/\bltv\b|lifetime value/.test(t)) return "ltv_usd";
  if (/pricing page view/.test(t)) return "pricing_page_views";
  if (/checkout start/.test(t)) return "checkout_starts";
  if (/trial start|trial-to-paid|trial to paid/.test(t)) return "trial_starts";
  if (/trial.to.paid/.test(t)) return "trial_to_paid_pct";
  if (/waitlist|signup/.test(t)) return "waitlist_signups";
  if (/product hunt|\bph\b|upvote|supporter/.test(t)) return "ph_upvotes";
  if (/linkedin|impression|founder post/.test(t)) return "linkedin_impressions";
  if (/spend|paid ad|ads budget/.test(t)) return "paid_spend";
  if (/visitor|traffic|targeted/.test(t)) return "targeted_visitors";
  if (/reply|replies|response/.test(t) && /outbound|email|touch|dm|sent/.test(t)) {
    return /influencer|creator/.test(t) ? "influencer_replies" : "outbound_replies";
  }
  if (/view|tiktok|reel|short.?form|video/.test(t)) return "short_form_views";
  if (/post|publish|video/.test(t) && /url|live/.test(t)) return "social_posts";
  if (/signup\s*%|signup rate|conversion\s*%/.test(t)) return "signup_rate_pct";
  if (/comment|community|hn|show hn|reddit/.test(t)) return "community_engagement";
  return null;
}

export function kpiFromPreset(presetId: string, value: number, target?: number): ManualKpi | null {
  const preset = KPI_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  return {
    id: preset.id,
    name: preset.name,
    value,
    target: target ?? preset.defaultTarget,
    unit: preset.unit,
    channel: preset.channel,
    updated_at: new Date().toISOString(),
    source: "manual",
  };
}
