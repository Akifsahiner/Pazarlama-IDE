/**
 * Computer Use "Operator" contract (server side). Mirror of the relevant types
 * in desktop/src/shared/types.ts — keep structurally identical.
 */

export type Persona = "marketing" | "sales";

export type BrowserScope =
  | "navigate"
  | "form_submit"
  | "public_post"
  | "credential"
  | "download";

export type OperatorPhase = "thinking" | "acting" | "waiting_approval" | "verifying";

export type ActionVerb =
  | "click"
  | "type"
  | "scroll"
  | "navigate"
  | "drag"
  | "key"
  | "wait"
  | "screenshot";

export interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameMeta {
  pngBase64: string;
  action?: string;
  actionVerb?: ActionVerb;
  cursor?: { x: number; y: number };
  bbox?: NormRect;
  url?: string;
  title?: string;
  step?: number;
  stepMax?: number;
  phase?: OperatorPhase;
  timestamp: string;
}

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  evidence: string;
  suggestion: string;
  url?: string;
  bbox?: NormRect;
  frameRef?: string;
  createdAt: string;
}

export interface BrowserValidation {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface BrowserSessionReport {
  goal: string;
  evidence: Finding[];
  validations: BrowserValidation[];
  visitedUrls: string[];
  outcome: "completed" | "stopped" | "error";
  startedAt: string;
  endedAt: string;
}
