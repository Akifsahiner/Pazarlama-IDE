/** Skill → capability-chip metadata for the operator UI (Marketing / Sales). */
export type SkillCategory = "Marketing" | "Sales";

export interface SkillMeta {
  id: string;
  label: string;
  category: SkillCategory;
  /** lucide-react icon name. */
  icon: string;
  what: string;
}

export const SKILLS: Record<string, SkillMeta> = {
  "product-intelligence": {
    id: "product-intelligence",
    label: "Product intel",
    category: "Marketing",
    icon: "Microscope",
    what: "Reads the repo to understand the product, ICP, and positioning.",
  },
  "landing-page-conversion": {
    id: "landing-page-conversion",
    label: "Landing audit",
    category: "Marketing",
    icon: "Gauge",
    what: "Audits a landing page for conversion and proposes diffs.",
  },
  "launch-planning": {
    id: "launch-planning",
    label: "Launch plan",
    category: "Marketing",
    icon: "CalendarRange",
    what: "Builds a phased launch plan with channels and timeline.",
  },
  "launch-asset-generator": {
    id: "launch-asset-generator",
    label: "Asset gen",
    category: "Marketing",
    icon: "Sparkles",
    what: "Generates launch assets (Product Hunt copy, posts, emails).",
  },
  "lead-research": {
    id: "lead-research",
    label: "Lead research",
    category: "Sales",
    icon: "Search",
    what: "Researches and verifies ICP-matching leads in a live browser.",
  },
  "outreach-drafting": {
    id: "outreach-drafting",
    label: "Outreach draft",
    category: "Sales",
    icon: "Mail",
    what: "Drafts personalized outreach per lead.",
  },
};

/** Best-effort: detect which skill a free-text status/title refers to. */
export function detectSkill(text: string): SkillMeta | null {
  const t = text.toLowerCase();
  for (const meta of Object.values(SKILLS)) {
    if (t.includes(meta.id) || t.includes(meta.label.toLowerCase())) return meta;
  }
  return null;
}
