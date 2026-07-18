/**
 * Format a skill pack excerpt for Edit Agent contextPrefix.
 * Prefer tactic stack + anti-patterns; cap at budget chars.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { skillsSourceDir } from "./install";

const DEFAULT_BUDGET = 8000;

async function tryRead(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

/** Map common plan tactics / disciplines → skill directory id. */
export function skillIdFromHint(hint?: string): string | null {
  if (!hint) return null;
  const h = hint.toLowerCase();
  if (h.startsWith("ph_") || h.includes("ph-") || h === "ph_launch") return "ph_launch";
  if (h.startsWith("comm_") || h.includes("community-launch") || h.includes("hacker_news") || h.includes("show_hn") || h.includes("show-hn") || h.includes("reddit") || h.includes("indie_hackers"))
    return "community-launch";
  if (h.startsWith("seo_") || h.includes("seo-content") || h.includes("seo-foundation") || h.includes("keyword_cluster") || h.includes("comparison_page"))
    return "seo-content-engine";
  if (h.startsWith("x_") || h.includes("twitter-x") || (h.includes("twitter") && h.includes("thread"))) return "twitter-x-founder-gtm";
  if (h.startsWith("nl_") || h.includes("newsletter-sponsor")) return "newsletter-sponsorship";
  if (h.startsWith("pr_") || h.includes("press-pr") || h.includes("embargo")) return "press-pr-launch";
  if (h.startsWith("oss_") || h.includes("devrel") || h.includes("open-source-launch")) return "devrel-open-source-launch";
  if (h.startsWith("email_") || h.includes("email-nurture") || h.includes("prelaunch_drip") || h.includes("launch_wave"))
    return "email-nurture-sequence";
  if (h.includes("waitlist") || h.includes("referral") || h.includes("k_factor") || h.includes("micro_launch"))
    return "waitlist-hype-engine";
  if (h.includes("launch_") || h === "launch-planning" || h.includes("launch_plan")) return "launch-planning";
  if (h.includes("hero_") || h.includes("cro_") || h.includes("lp_") || h.includes("landing"))
    return "landing-page-conversion";
  if (h.includes("linkedin")) return "linkedin-founder-gtm";
  if (h.includes("ads_") || h.includes("paid")) return "paid-ads-optimization";
  if (h.includes("outreach") || h.includes("outbound") || h.includes("value_first")) return "outreach-drafting";
  if (h.includes("lead_") || h.includes("icp")) return "lead-research";
  if (h.includes("asset") || h.includes("platform_native")) return "launch-asset-generator";
  if (h.includes("funnel") || h.includes("analytics")) return "analytics-measurement";
  if (h.includes("influencer")) return "influencer-partnerships";
  if (h.includes("video") || h.includes("hook")) return "short-form-video";
  if (h.includes("product") || h.includes("position")) return "product-intelligence";
  return null;
}

function truncateTacticsFirst(body: string, max: number): string {
  if (body.length <= max) return body;
  const stackIdx = body.search(/## Tactic stack/i);
  if (stackIdx >= 0) {
    const fromStack = body.slice(stackIdx);
    if (fromStack.length <= max) return fromStack;
    return fromStack.slice(0, max - 20) + "\n…[truncated]";
  }
  return body.slice(0, max - 20) + "\n…[truncated]";
}

export interface FormatSkillOpts {
  skillId?: string;
  tactic?: string;
  playbookFile?: string;
  budget?: number;
}

/**
 * Load primary playbook + anti-patterns for Edit runs.
 * Returns empty string if skills missing.
 */
export async function formatSkillPackForAgent(opts: FormatSkillOpts = {}): Promise<string> {
  const skillId = opts.skillId ?? skillIdFromHint(opts.tactic) ?? "launch-planning";
  const root = skillsSourceDir();
  const dir = path.join(root, skillId);
  const anti = (await tryRead(path.join(dir, "anti-patterns.md"))) ?? "";

  let playbookBody = "";
  let playbookId = opts.playbookFile;
  if (!playbookId) {
    try {
      const manRaw = await tryRead(path.join(dir, "manifest.json"));
      if (manRaw) {
        const man = JSON.parse(manRaw) as { aggression_playbooks?: string[] };
        playbookId = man.aggression_playbooks?.[0];
      }
    } catch {
      /* ignore */
    }
  }
  if (!playbookId) {
    try {
      const files = await fs.readdir(path.join(dir, "playbooks"));
      const md = files.find((f) => f.startsWith("aggressive") && f.endsWith(".md")) ?? files.find((f) => f.endsWith(".md"));
      if (md) playbookId = md.replace(/\.md$/, "");
    } catch {
      /* ignore */
    }
  }
  if (playbookId) {
    playbookBody = (await tryRead(path.join(dir, "playbooks", `${playbookId}.md`))) ?? "";
  }

  const budget = opts.budget ?? DEFAULT_BUDGET;
  const antiBudget = Math.min(2000, Math.floor(budget * 0.25));
  const antiPart = anti.trim() ? truncateTacticsFirst(anti.trim(), antiBudget) : "";
  const playBudget = budget - antiPart.length - 200;
  const playPart = playbookBody.trim()
    ? truncateTacticsFirst(playbookBody.trim(), Math.max(1500, playBudget))
    : "";

  if (!playPart && !antiPart) return "";

  const sections = [
    `# Skill pack — ${skillId}`,
    "Apply these runbook rules. Prefer measurable tactics over generic advice.",
  ];
  if (playPart) sections.push(`## Playbook (${playbookId})\n${playPart}`);
  if (antiPart) sections.push(`## Anti-patterns\n${antiPart}`);
  return sections.join("\n\n").slice(0, budget);
}
