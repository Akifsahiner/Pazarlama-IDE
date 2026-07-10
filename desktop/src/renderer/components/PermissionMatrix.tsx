import { useState } from "react";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import {
  DEFAULT_PERMISSION_POLICY,
  PERMISSION_SCOPE_LABELS,
  type PermissionLevel,
  type PermissionPolicy,
  type PermissionScope,
} from "@shared/types";

const LEVEL_LABEL: Record<PermissionLevel, string> = {
  auto: "Auto",
  ask: "Ask",
  always_ask: "Always ask",
  never: "Never",
};

const LEVEL_TONE: Record<PermissionLevel, string> = {
  auto: "text-ok",
  ask: "text-text-2",
  always_ask: "text-warn",
  never: "text-danger",
};

const ORDER: PermissionScope[] = [
  "read_inspect",
  "create_drafts",
  "modify_local_files",
  "submit_public_forms",
  "publish_send",
  "spend_money",
];

/**
 * Surfaces the active permission policy as "Safe actions: Auto" with an
 * expandable per-scope matrix. Informational for the run (the live gate is the
 * approval prompt); reflects the product default policy.
 */
export function PermissionMatrix({ policy }: { policy?: PermissionPolicy }) {
  const [open, setOpen] = useState(false);
  const effective = policy ?? DEFAULT_PERMISSION_POLICY;

  return (
    <div className="text-mini">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-text-2 transition-colors hover:text-text"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <ShieldCheck size={13} className="text-ok" />
        Safe actions: Auto
      </button>
      {open && (
        <div className="mt-2 space-y-1 rounded-[var(--radius-sm)] border border-line bg-surface-2 p-2">
          {ORDER.map((scope) => (
            <div key={scope} className="flex items-center justify-between gap-3">
              <span className="text-text-2">{PERMISSION_SCOPE_LABELS[scope]}</span>
              <span className={LEVEL_TONE[effective[scope]]}>{LEVEL_LABEL[effective[scope]]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
