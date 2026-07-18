import { promises as fs } from "node:fs";
import path from "node:path";
import type { MarketingProfile } from "../schemas/marketingProfile.js";
import type { Discipline } from "./router.js";

/** Skill manifest as authored under `skills/<id>/manifest.json`. */
interface SkillManifest {
  id: string;
  name: string;
  category: string;
  applies_when?: {
    company_stage?: string[];
    channels_includes?: string[];
    business_model?: string[];
  };
  do_not_use_when?: {
    company_stage?: string[];
    constraints_includes?: string[];
  };
  required_inputs?: string[];
  primary_metric?: string;
  playbook_selector?: Array<{
    if: Partial<{
      current_users_lt: number;
      email_list_size_gte: number;
      email_list_size_lt: number;
      days_until_launch_gte: number;
      sales_pipeline_empty: boolean;
      channels_includes: string[];
      business_model: string[];
      category_contains: string[];
    }>;
    pick: string;
  }>;
}

export interface SkillPack {
  id: string;
  manifest: SkillManifest;
  principles: string;
  decisionTree: unknown;
  playbook: { id: string; body: string } | null;
  templates: Array<{ name: string; body: string }>;
  antiPatterns: string;
  kpis: unknown;
}

const DISCIPLINE_TO_SKILL_IDS: Record<Discipline, string[]> = {
  positioning: ["product-intelligence", "landing-page-conversion", "seo-content-engine", "devrel-open-source-launch"],
  icp: ["product-intelligence", "lead-research"],
  landing: ["landing-page-conversion"],
  ph_launch: ["ph_launch", "community-launch", "launch-asset-generator"],
  launch_plan: ["launch-planning", "waitlist-hype-engine", "community-launch", "press-pr-launch", "linkedin-founder-gtm"],
  email: ["email-nurture-sequence", "outreach-drafting", "waitlist-hype-engine", "launch-asset-generator"],
  content: ["launch-asset-generator", "short-form-video", "linkedin-founder-gtm", "twitter-x-founder-gtm"],
  seo: ["seo-content-engine", "landing-page-conversion", "community-launch"],
  social: ["twitter-x-founder-gtm", "community-launch", "short-form-video", "linkedin-founder-gtm", "launch-asset-generator"],
  growth: ["launch-planning", "waitlist-hype-engine", "community-launch", "seo-content-engine", "newsletter-sponsorship", "influencer-partnerships"],
  ads: ["paid-ads-optimization", "newsletter-sponsorship", "launch-asset-generator"],
  cro: ["landing-page-conversion"],
  analytics: ["analytics-measurement"],
  pricing: ["product-intelligence"],
  lead_research: ["lead-research"],
  outreach: ["outreach-drafting"],
  meta_question: [],
};

/** Plan playbook stub id → primary skill pack directory (testimonial GTM layer). */
export const PLAYBOOK_STUB_TO_SKILL: Record<string, string> = {
  "waitlist-hype": "waitlist-hype-engine",
  "ph-number-one": "ph_launch",
  "ph-launch": "ph_launch",
  "linkedin-gtm": "linkedin-founder-gtm",
  influencer: "influencer-partnerships",
  "short-form-viral": "short-form-video",
  "paid-ads-opt": "paid-ads-optimization",
  "paid-ads": "paid-ads-optimization",
  "landing-conversion": "landing-page-conversion",
  "content-engine": "launch-asset-generator",
  "sales-outbound": "outreach-drafting",
  "analytics-measurement": "analytics-measurement",
  "community-launch": "community-launch",
  "seo-foundation": "seo-content-engine",
  "seo-content-engine": "seo-content-engine",
  "email-nurture": "email-nurture-sequence",
  "twitter-x-gtm": "twitter-x-founder-gtm",
  "newsletter-sponsorship": "newsletter-sponsorship",
  "press-pr-launch": "press-pr-launch",
  "devrel-open-source-launch": "devrel-open-source-launch",
};

const SKILLS_DIR_CANDIDATES = [
  path.resolve(process.cwd(), "skills"),
  path.resolve(process.cwd(), "..", "skills"),
  path.resolve(process.cwd(), "..", "..", "skills"),
];
let resolvedSkillsDir: string | null = null;
async function skillsDir(): Promise<string | null> {
  if (resolvedSkillsDir) return resolvedSkillsDir;
  for (const candidate of SKILLS_DIR_CANDIDATES) {
    try {
      await fs.access(path.join(candidate));
      resolvedSkillsDir = candidate;
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

const manifestCache = new Map<string, SkillManifest>();
const playbookBodyCache = new Map<string, string>();
const renderContextCache = new Map<string, string>();

async function readManifest(id: string): Promise<SkillManifest | null> {
  if (manifestCache.has(id)) return manifestCache.get(id) ?? null;
  const root = await skillsDir();
  if (!root) return null;
  try {
    const raw = await fs.readFile(path.join(root, id, "manifest.json"), "utf8");
    const parsed = JSON.parse(raw) as SkillManifest;
    manifestCache.set(id, parsed);
    return parsed;
  } catch {
    manifestCache.set(id, null as unknown as SkillManifest);
    return null;
  }
}

function arrSome(a?: string[], hay?: string[]): boolean {
  if (!a || a.length === 0) return false;
  if (!hay || hay.length === 0) return false;
  return a.some((v) => hay.includes(v));
}

function appliesTo(manifest: SkillManifest, profile: MarketingProfile): boolean {
  const aw = manifest.applies_when;
  if (aw) {
    if (aw.company_stage?.length && profile.company_stage) {
      const allowed = new Set(
        aw.company_stage.flatMap((s) => (s === "pre-launch" ? ["prelaunch", "pre-launch"] : [s])),
      );
      if (!allowed.has(profile.company_stage)) return false;
    }
    if (aw.business_model?.length && profile.business_model && !aw.business_model.includes(profile.business_model)) return false;
    if (aw.channels_includes?.length && !arrSome(aw.channels_includes, profile.available_channels)) return false;
  }
  const dnu = manifest.do_not_use_when;
  if (dnu) {
    if (dnu.company_stage?.length && profile.company_stage && dnu.company_stage.includes(profile.company_stage)) return false;
    if (dnu.constraints_includes?.length && arrSome(dnu.constraints_includes, profile.constraints)) return false;
  }
  return true;
}

function selectPlaybook(manifest: SkillManifest, profile: MarketingProfile): string | null {
  if (!manifest.playbook_selector?.length) return null;
  for (const rule of manifest.playbook_selector) {
    const ok = (() => {
      const cond = rule.if;
      if (typeof cond.email_list_size_gte === "number") {
        if ((profile.email_list_size ?? 0) >= cond.email_list_size_gte) return true;
      }
      if (typeof cond.email_list_size_lt === "number") {
        if ((profile.email_list_size ?? 0) < cond.email_list_size_lt) return true;
      }
      if (typeof cond.days_until_launch_gte === "number") {
        if ((profile.days_until_launch ?? 0) >= cond.days_until_launch_gte) return true;
      }
      if (cond.sales_pipeline_empty === true && profile.sales_pipeline_empty === true) return true;
      if (typeof cond.current_users_lt === "number") {
        if ((profile.current_users ?? 0) < cond.current_users_lt) return true;
      }
      if (cond.channels_includes?.length && arrSome(cond.channels_includes, profile.available_channels)) return true;
      if (cond.business_model?.length && profile.business_model && cond.business_model.includes(profile.business_model)) return true;
      if (cond.category_contains?.length && profile.category) {
        if (cond.category_contains.some((c) => profile.category.toLowerCase().includes(c.toLowerCase()))) return true;
      }
      return false;
    })();
    if (ok) return rule.pick;
  }
  return null;
}

async function tryRead(relPath: string): Promise<string | null> {
  const root = await skillsDir();
  if (!root) return null;
  try {
    return await fs.readFile(path.join(root, relPath), "utf8");
  } catch {
    return null;
  }
}

async function loadPack(
  id: string,
  profile: MarketingProfile,
  templateLimit = 2,
): Promise<SkillPack | null> {
  const manifest = await readManifest(id);
  if (!manifest) return null;
  if (!appliesTo(manifest, profile)) return null;

  const principles = (await tryRead(`${id}/principles.md`)) ?? "";
  const treeRaw = await tryRead(`${id}/decision-tree.json`);
  const antiPatterns = (await tryRead(`${id}/anti-patterns.md`)) ?? "";
  const kpisRaw = await tryRead(`${id}/kpis.json`);

  const playbookId = selectPlaybook(manifest, profile);
  let playbook: SkillPack["playbook"] = null;
  if (playbookId) {
    const cacheK = `${id}:${playbookId}`;
    let body = playbookBodyCache.get(cacheK);
    if (!body) {
      body = (await tryRead(`${id}/playbooks/${playbookId}.md`)) ?? "";
      if (body) playbookBodyCache.set(cacheK, body);
    }
    if (body) playbook = { id: playbookId, body };
  }

  const templates: SkillPack["templates"] = [];
  const root = await skillsDir();
  if (root) {
    try {
      const entries = await fs.readdir(path.join(root, id, "templates"));
      for (const name of entries.filter((n) => n.endsWith(".md")).slice(0, templateLimit)) {
        const body = await tryRead(`${id}/templates/${name}`);
        if (body) templates.push({ name: name.replace(/\.md$/, ""), body });
      }
    } catch {
      /* no templates dir */
    }
  }

  return {
    id,
    manifest,
    principles,
    decisionTree: treeRaw ? JSON.parse(treeRaw) : null,
    playbook,
    templates,
    antiPatterns,
    kpis: kpisRaw ? JSON.parse(kpisRaw) : null,
  };
}

const PLAYBOOK_CHAR_CAP = 12_000;

function capPlaybook(pack: SkillPack): SkillPack {
  if (!pack.playbook || pack.playbook.body.length <= PLAYBOOK_CHAR_CAP) return pack;
  const body = pack.playbook.body;
  const stackIdx = body.search(/## Tactic stack/i);
  const trimmed =
    stackIdx >= 0
      ? body.slice(0, 800) + "\n\n" + body.slice(stackIdx, stackIdx + PLAYBOOK_CHAR_CAP - 900)
      : body.slice(0, PLAYBOOK_CHAR_CAP);
  return { ...pack, playbook: { ...pack.playbook, body: trimmed + "\n…[truncated]" } };
}

export async function retrieveSkills(
  discipline: Discipline,
  profile: MarketingProfile,
  limit = 2,
): Promise<SkillPack[]> {
  return retrieveSkillsV2(discipline, profile, { limit, primaryFull: true });
}

/**
 * Skill Excellence retrieval: primary pack gets full playbook + up to 5 templates;
 * support packs get principles only (token budget).
 */
export async function retrieveSkillsV2(
  discipline: Discipline,
  profile: MarketingProfile,
  opts: { limit?: number; primaryFull?: boolean } = {},
): Promise<SkillPack[]> {
  const limit = opts.limit ?? 2;
  const primaryFull = opts.primaryFull !== false;
  const ids = DISCIPLINE_TO_SKILL_IDS[discipline] ?? [];
  const out: SkillPack[] = [];
  for (let i = 0; i < ids.length && out.length < limit; i++) {
    const id = ids[i]!;
    const isPrimary = out.length === 0;
    const templateLimit = isPrimary && primaryFull ? 5 : 1;
    const pack = await loadPack(id, profile, templateLimit);
    if (!pack) continue;
    if (isPrimary && primaryFull) {
      out.push(capPlaybook(pack));
    } else {
      // Support: principles + anti excerpt only
      out.push({
        ...pack,
        playbook: null,
        templates: [],
        antiPatterns: pack.antiPatterns.slice(0, 1500),
        decisionTree: null,
        kpis: null,
      });
    }
  }
  return out;
}

/** Load skill packs for a specific plan playbook (up to 3 templates). */
export async function retrieveSkillsForPlaybook(
  playbookStubId: string,
  profile: MarketingProfile,
): Promise<SkillPack[]> {
  const primaryId = PLAYBOOK_STUB_TO_SKILL[playbookStubId];
  if (primaryId) {
    const pack = await loadPack(primaryId, profile, 5);
    if (pack) return [capPlaybook(pack)];
  }
  return retrieveSkillsV2("launch_plan", profile, { limit: 2, primaryFull: true });
}

/** All skill pack directory ids referenced by discipline routing or playbook stubs. */
export function allMappedSkillIds(): string[] {
  const ids = new Set<string>();
  for (const list of Object.values(DISCIPLINE_TO_SKILL_IDS)) {
    for (const id of list) ids.add(id);
  }
  for (const id of Object.values(PLAYBOOK_STUB_TO_SKILL)) ids.add(id);
  return [...ids].sort();
}

/** @internal test helper — discipline → skill id map */
export function disciplineSkillMap(): Record<Discipline, string[]> {
  return DISCIPLINE_TO_SKILL_IDS;
}

/** Compact text rendering for direct injection into a system prompt. */
export function renderSkillContext(packs: SkillPack[]): string {
  if (packs.length === 0) return "";
  const hash = packs
    .map((p) => `${p.id}:${p.playbook?.id ?? ""}:${(p.playbook?.body.length ?? 0)}`)
    .join("|");
  const cached = renderContextCache.get(hash);
  if (cached) return cached;
  const out = packs
    .map((p) => {
      const sections: string[] = [];
      sections.push(`## SKILL — ${p.manifest.name} (${p.manifest.category})`);
      if (p.principles.trim()) sections.push(`### Principles\n${p.principles.trim()}`);
      if (p.playbook) sections.push(`### Playbook: ${p.playbook.id}\n${p.playbook.body.trim()}`);
      if (p.decisionTree) sections.push(`### Decision tree\n${JSON.stringify(p.decisionTree)}`);
      if (p.templates.length) {
        sections.push(
          "### Templates\n" +
            p.templates.map((t) => `**${t.name}**\n${t.body.trim()}`).join("\n\n"),
        );
      }
      if (p.antiPatterns.trim()) sections.push(`### Anti-patterns\n${p.antiPatterns.trim()}`);
      if (p.kpis) sections.push(`### KPIs\n${JSON.stringify(p.kpis)}`);
      return sections.join("\n\n");
    })
    .join("\n\n---\n\n");
  renderContextCache.set(hash, out);
  return out;
}
