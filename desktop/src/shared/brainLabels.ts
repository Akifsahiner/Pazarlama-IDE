/** Human labels for brain.* SSE phases and skill ids. */

const SKILL_LABELS: Record<string, string> = {
  "launch-copy": "Launch copy",
  "lead-research": "Lead research",
  "outreach-drafting": "Outreach drafting",
  "competitive-intel": "Competitive intel",
  "gtm-strategy": "GTM strategy",
};

export function humanizeSkillLabel(skill: string): string {
  if (SKILL_LABELS[skill]) return SKILL_LABELS[skill];
  return skill.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeSkills(skills: string[], max = 3): string {
  const labels = skills.slice(0, max).map(humanizeSkillLabel);
  if (skills.length > max) labels.push(`+${skills.length - max} more`);
  return labels.join(", ");
}

export function humanizeBrainTool(tool: string): string {
  switch (tool) {
    case "brain.status":
      return "Updating strategy phase…";
    case "brain.intent":
      return "Choosing marketing discipline…";
    case "brain.retrieved":
      return "Pulling playbook sections…";
    case "brain.profile":
      return "Reading product profile…";
    case "brain.critique":
      return "Reviewing decision quality…";
    default:
      return "Marketing brain — retrieving strategy context";
  }
}

export function strategyContextSummary(skills: string[]): string {
  return `Strategy context ready · ${humanizeSkills(skills)}`;
}
