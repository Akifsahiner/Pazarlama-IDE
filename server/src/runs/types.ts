/**
 * Unified Run Event model — the single contract that every execution source
 * (Agent SDK host, tool execution, browser sandbox, local file watcher) is
 * normalized into.
 *
 * This module is the CANONICAL definition. The desktop renderer keeps a
 * structurally-identical mirror in `desktop/src/shared/types.ts`. When you change
 * a type here, change it there too (they are duplicated because the two packages
 * do not share a workspace).
 *
 * Ordering: every event carries a monotonic `seq` per `runId`. Consumers that
 * reconnect (e.g. the renderer after a reload, or a browser WS after a drop)
 * resume from `afterSeq` so steps are never lost, reordered, or duplicated.
 */

export type RunEventType =
  // Run lifecycle
  | "run.created"
  | "run.planning"
  | "run.paused"
  | "run.completed"
  | "run.failed"
  // Agent narration (short intent summaries — NEVER raw chain-of-thought)
  | "agent.status"
  | "agent.message"
  // Tool authorization + execution
  | "tool.requested"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  // Browser / Computer Use visual + action stream
  | "browser.frame"
  | "browser.navigated"
  | "browser.clicked"
  | "browser.typed"
  | "browser.scrolled"
  | "browser.highlighted"
  // Local file work
  | "file.patch_created"
  | "file.patch_updated"
  | "file.patch_applied"
  | "file.validation_started"
  | "file.validation_completed"
  // Preview server
  | "preview.started"
  | "preview.ready"
  | "preview.failed"
  // Evidence + decisions
  | "evidence.captured"
  | "issue.detected"
  | "approval.required"
  | "verification.completed";

export type RunEventStatus = "pending" | "running" | "success" | "failed";

export interface RunEvent {
  id: string;
  runId: string;
  stepId?: string;

  /** Monotonic per-run sequence number; consumers resume from `afterSeq`. */
  seq: number;
  /** ISO-8601 timestamp. */
  timestamp: string;

  type: RunEventType;
  status?: RunEventStatus;

  /** Short, user-facing title (shown in the activity timeline / intent strip). */
  title: string;
  /** Optional one-line elaboration. */
  summary?: string;

  /** Type-specific structured data. See payload helper types below. */
  payload?: Record<string, unknown>;
}

/* ----------------------------- Run model ------------------------------ */

export type RunStatus = "created" | "planning" | "running" | "paused" | "completed" | "failed";

export interface Run {
  id: string;
  userId: string;
  projectId?: string;
  goal: string;
  status: RunStatus;
  /** Highest emitted seq, for quick afterSeq queries. */
  lastSeq: number;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------- Permission matrix --------------------------- */

/**
 * Action scopes the agent can request. The product gates each scope with a
 * policy level; the UI surfaces this as "Safe actions: Auto" plus an
 * expandable matrix.
 */
export type PermissionScope =
  | "read_inspect"
  | "create_drafts"
  | "modify_local_files"
  | "submit_public_forms"
  | "publish_send"
  | "spend_money";

export type PermissionLevel = "auto" | "ask" | "always_ask" | "never";

export type PermissionPolicy = Record<PermissionScope, PermissionLevel>;

/** Product-default policy. Conservative on anything irreversible or public. */
export const DEFAULT_PERMISSION_POLICY: PermissionPolicy = {
  read_inspect: "auto",
  create_drafts: "auto",
  modify_local_files: "ask",
  submit_public_forms: "always_ask",
  publish_send: "always_ask",
  spend_money: "never",
};

/** Human-readable labels for the permission matrix UI. */
export const PERMISSION_SCOPE_LABELS: Record<PermissionScope, string> = {
  read_inspect: "Read and inspect",
  create_drafts: "Create drafts",
  modify_local_files: "Modify local files",
  submit_public_forms: "Submit public forms",
  publish_send: "Publish or send",
  spend_money: "Spend money",
};

/** Whether a scope requires an explicit user approval under a given policy. */
export function requiresApproval(
  policy: PermissionPolicy,
  scope: PermissionScope,
): boolean {
  const level = policy[scope];
  return level === "ask" || level === "always_ask";
}

/** Whether a scope is hard-blocked (never allowed without policy change). */
export function isBlockedScope(policy: PermissionPolicy, scope: PermissionScope): boolean {
  return policy[scope] === "never";
}

/* --------------------- Payload helper types ---------------------------- */
/* These describe `RunEvent.payload` for specific event types. They are not
 * enforced at runtime but document the contract for producers/consumers. */

export interface FilePatchPayload {
  file: string;
  additions: number;
  deletions: number;
  /** Unified diff for the file (optional on create, present on update). */
  patch?: string;
}

export interface ValidationPayload {
  checks: { label: string; status: RunEventStatus }[];
}

export interface BrowserFramePayload {
  pngBase64: string;
  action?: string;
  cursor?: { x: number; y: number };
  viewport?: { width: number; height: number };
}

export interface ToolPayload {
  tool: string;
  scope: PermissionScope;
  args?: Record<string, unknown>;
}

export interface EvidencePayload {
  issueId?: string;
  evidence: string;
  suggestedAction?: string;
}

export interface ApprovalPayload {
  approvalId: string;
  scope: PermissionScope;
  /** What the agent intends to do, in plain language. */
  intent: string;
}

/** Plan task closure gates — persisted on feed items / progress rows (mirror: desktop types). */
export type PlanTaskCompletionGate =
  | "apply-pending"
  | "review-pending"
  | "research-pending"
  | "partial-apply";
