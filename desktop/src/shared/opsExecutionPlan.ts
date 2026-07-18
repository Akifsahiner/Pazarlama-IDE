/**
 * Serializable ops execution plan types (no circular deps).
 */
import type { LaneAExecutionMode } from "./cmoLaneA";
import type { Mention } from "./orchestration";

export type ExpectedProofKind = "live_url" | "kpi" | "note" | "browser_evidence";

export interface OpsExecutionPlan {
  mode: LaneAExecutionMode;
  goal: string;
  skills: string[];
  mentions: Mention[];
  scout_prompt?: string;
  start_url?: string;
  lane_a_item_id?: string;
}
