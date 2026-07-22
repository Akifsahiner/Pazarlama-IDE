/**
 * Faz 5 — Human Lane: frozen execution asset (Post Kit, outreach pack, runbook).
 * See CMO_HUMAN_EXECUTION_BIND_SPEC.md (Human Lane extension).
 */
import type { HumanExecutionRef } from "./humanExecutionPlan";

export type HumanExecutionAssetKind =
  | "post_kit"
  | "outreach_pack"
  | "launch_runbook"
  | "delegate_rubric"
  | "distribution_slot";

export interface HumanCopyBlock {
  id: string;
  label: string;
  body: string;
  platform?: string;
}

export interface HumanSuccessCriteria {
  retention_3s_target?: number;
  views_24h_target?: number;
  utm?: string;
  kpi_preset_id?: string;
}

export interface HumanPlatformChecklistItem {
  id: string;
  label: string;
  checked?: boolean;
}

export interface HumanPlatformDeepLink {
  label: string;
  url: string;
}

export interface HumanExecutionAsset {
  id: string;
  kind: HumanExecutionAssetKind;
  title: string;
  copy_blocks: HumanCopyBlock[];
  success_criteria?: HumanSuccessCriteria;
  platform_checklist: HumanPlatformChecklistItem[];
  platform_deep_links?: HumanPlatformDeepLink[];
  honesty_note?: string;
  frozen_at: string;
  source_ref: HumanExecutionRef;
  /** Distribution-only: hook grid row count for Cluely eval (≥20). */
  hook_grid_count?: number;
  /** Distribution-only: Week 1 hook×day grid rows for Post Kit visibility. */
  hook_grid_rows?: Array<{ hook_label: string; day: number; platform: string; slot_id: string }>;
  /** Distribution-only: kill suggestion when 3 posts all below threshold. */
  kill_suggestion?: { headline: string; detail: string };
  /** Launch runbook: navigable T-offset steps. */
  runbook_steps?: Array<{ offset: string; title: string; item_id: string; is_current?: boolean }>;
  /** Outbound pack: next targets from Lane B. */
  outreach_targets?: Array<{ name: string; handle?: string }>;
  /** Influencer kit: current pipeline stage for drawer rail. */
  influencer_stage?: string;
}

export interface HumanProofDraft {
  posted_url?: string;
  posted_at?: string;
  note?: string;
  kpi_value?: number;
  kpi_id?: string;
  measure_deferred?: boolean;
  retention_3s_pct?: number;
  views_24h?: number;
  reply_interest?: "cold" | "warm" | "hot";
  reply_received?: boolean;
}

export type HumanProofProgressStep = "draft" | "posted" | "metrics" | "complete";
