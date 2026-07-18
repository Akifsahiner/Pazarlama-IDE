/** Faz 3 — frozen human execution reference (user/delegate ops tasks). */
export type HumanExecutionSource = "lane_b" | "distribution" | "influencer" | "delegate";

export type HumanProofSurface = "ops_modal" | "lane_b_modal" | "operator_modal";

export type HumanExportKind = "outreach_csv" | "issue" | "brief";

export interface HumanExecutionRef {
  source: HumanExecutionSource;
  item_id: string;
  proof_surface: HumanProofSurface;
  export_kind?: HumanExportKind;
  /** Display title for handoff copy. */
  label?: string;
}
