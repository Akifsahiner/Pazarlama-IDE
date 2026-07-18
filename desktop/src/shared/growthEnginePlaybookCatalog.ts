/**
 * P17 — Anonymized vertical launch programs derived from mechanism knowledge.
 * Not a case-study browser; seeds for Lane A/B when mechanism-specific playbooks apply.
 */
import {
  GROWTH_MECHANISM_IDS,
  getMechanismRecord,
  type GrowthMechanismId,
} from "./cmoGrowthMechanismKnowledge";

export interface GrowthEnginePlaybook {
  id: string;
  mechanism_id: GrowthMechanismId;
  title: string;
  summary: string;
  week1_focus: string;
  anti_pattern: string;
}

export function listGrowthEnginePlaybooks(): GrowthEnginePlaybook[] {
  return GROWTH_MECHANISM_IDS.map((id) => {
    const record = getMechanismRecord(id);
    const firstTask = record.week1_task_templates[0];
    return {
      id: `playbook.${id}`,
      mechanism_id: id,
      title: record.label,
      summary: record.hidden_system_chain[0] ?? record.label,
      week1_focus: firstTask?.what ?? "Define mechanism program step 1",
      anti_pattern: record.superficial_wrong_lesson,
    };
  });
}

export function getPlaybookForMechanism(id: GrowthMechanismId): GrowthEnginePlaybook | undefined {
  return listGrowthEnginePlaybooks().find((playbook) => playbook.mechanism_id === id);
}
